import type { AgentDbMessage } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import {
	assessRepeatableWork,
	buildRepeatableWorkSection,
	collectWorkSignals,
	hasRepeatableWorkSection,
	readWorkToolCall,
	type PROPOSE_AUTOMATION_TOOL_NAME,
	type WorkToolCall,
} from '@n8n/instance-ai';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { z } from 'zod';

import {
	PARSE_SCHEDULE_CAPABILITY_NAME,
	PROPOSE_AUTOMATION_CAPABILITY_NAME,
} from '@/services/capabilities/capability-scopes';

import { N8nMemory, type N8nMemoryImpl } from '../../agents/integrations/n8n-memory';
import { ASSISTANT_AGENT_ID } from '../assistant-turn-options';
import {
	cleanStoredUserMessage,
	extractThreadContextBlock,
	stripAttachmentManifest,
	withoutAiPreferencesBlock,
} from '../internal-messages';
import { extractTextFromContent } from '../message-parser';

// Type-tied to the name that the package ignores, so a rename on either side fails `pnpm typecheck`.
const PROPOSE_AUTOMATION_TOOL: typeof PROPOSE_AUTOMATION_TOOL_NAME =
	PROPOSE_AUTOMATION_CAPABILITY_NAME;

/** Capabilities that only look something up. A repeat of their calls is not repeated work. */
const LOOKUP_CAPABILITIES: ReadonlySet<string> = new Set([PARSE_SCHEDULE_CAPABILITY_NAME]);

/**
 * Thread metadata key with the time at which the chat used up its nudge. Compaction can move the
 * turn with the section, or the `propose_automation` call, out of the replay window. This key
 * keeps the nudge to one for each chat after that.
 */
export const REPEATABLE_WORK_NUDGED_KEY = 'repeatableWorkNudgedAt';

const nudgedMetadataSchema = z.object({ [REPEATABLE_WORK_NUDGED_KEY]: z.string().datetime() });

/** What a chat history says about the work of a chat. */
interface ChatWork {
	userTexts: string[];
	toolCalls: WorkToolCall[];
	/** An earlier turn already carried a `<repeatable-work>` section. */
	nudged: boolean;
	/** The Assistant already called `propose_automation`, in any state. */
	proposed: boolean;
}

/**
 * Stored user messages keep the blocks and the attachment manifest that the service added, so the
 * text is cleaned first. A schedule in an injected block (for example a workflow name or a file
 * name) must not count as the user's own. Only the leading `<thread-context>` can carry a section
 * that n8n wrote, and its saved AI preferences are the user's own text.
 */
function readUserMessage(content: unknown, chat: ChatWork): void {
	const stored = extractTextFromContent(content);
	const threadContext = extractThreadContextBlock(stored) ?? '';
	chat.nudged ||= hasRepeatableWorkSection(withoutAiPreferencesBlock(threadContext));
	const text = stripAttachmentManifest(cleanStoredUserMessage(stored) ?? '');
	if (text.trim()) chat.userTexts.push(text);
}

function readToolCalls(content: unknown, chat: ChatWork): void {
	if (!Array.isArray(content)) return;
	for (const part of content) {
		const call = readWorkToolCall(part);
		if (call?.toolName === PROPOSE_AUTOMATION_TOOL) chat.proposed = true;
		else if (call && !LOOKUP_CAPABILITIES.has(call.toolName)) chat.toolCalls.push(call);
	}
}

function readChatWork(history: readonly AgentDbMessage[]): ChatWork {
	const chat: ChatWork = { userTexts: [], toolCalls: [], nudged: false, proposed: false };
	for (const message of history) {
		// Custom messages have no role. A message from a tool result is not the user's text.
		if (!('role' in message) || message.origin) continue;
		if (message.role === 'user') readUserMessage(message.content, chat);
		if (message.role === 'assistant') readToolCalls(message.content, chat);
	}
	return chat;
}

function hasUsedNudge(chat: ChatWork): boolean {
	return chat.nudged || chat.proposed;
}

/**
 * Decides whether a normal user turn carries the `<repeatable-work>` section, which tells the
 * Assistant to offer "Make this automatic" once in a chat. The score uses the replay window. The
 * once-per-chat rule also uses a thread metadata key and, before the first nudge, the full history.
 */
@Service()
export class RepeatableWorkNudgeService {
	constructor(
		private readonly logger: Logger,
		private readonly memory: N8nMemory,
	) {}

	/**
	 * The section for a turn with the user's raw `message`, or undefined when the history already
	 * has a `propose_automation` call, already carried the section, or scores below the threshold.
	 */
	resolveTurnSection(message: string, history: readonly AgentDbMessage[]): string | undefined {
		const chat = readChatWork(history);
		if (hasUsedNudge(chat)) return undefined;

		const signals = collectWorkSignals({
			userTexts: [...chat.userTexts, message],
			toolCalls: chat.toolCalls,
		});
		return buildRepeatableWorkSection(assessRepeatableWork(signals));
	}

	/**
	 * The section for a normal turn of a chat, or undefined. The key is set before the section is
	 * returned, so a failed write costs the nudge and never sends it twice. Best effort, like the
	 * other turn context: a failed read costs the section, not the turn.
	 */
	async forTurn(
		threadId: string,
		message: string,
		loadHistory: () => Promise<AgentDbMessage[]>,
	): Promise<string | undefined> {
		try {
			const memory = this.memory.getImplementation(ASSISTANT_AGENT_ID);
			const thread = await memory.getThread(threadId);
			if (nudgedMetadataSchema.safeParse(thread?.metadata).success) return undefined;

			const section = this.resolveTurnSection(message, await loadHistory());
			if (section === undefined) return undefined;

			// The window can miss compacted turns, so the full history decides once for each chat.
			const usedBefore = hasUsedNudge(readChatWork(await memory.getMessages(threadId)));
			await this.recordNudge(memory, threadId);
			return usedBefore ? undefined : section;
		} catch (error) {
			this.logger.warn('Instance AI failed to check the chat for repeatable work', {
				error: getErrorMessage(error),
			});
			return undefined;
		}
	}

	private async recordNudge(memory: N8nMemoryImpl, threadId: string): Promise<void> {
		const nudgedAt = new Date().toISOString();
		await memory.patchThread({
			threadId,
			update: ({ metadata }) => ({
				metadata: { ...metadata, [REPEATABLE_WORK_NUDGED_KEY]: nudgedAt },
			}),
		});
	}
}
