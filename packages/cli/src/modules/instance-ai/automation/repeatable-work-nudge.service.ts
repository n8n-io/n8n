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

import { PROPOSE_AUTOMATION_CAPABILITY_NAME } from '@/services/capabilities/capability-scopes';

import { cleanStoredUserMessage, extractThreadContextBlock } from '../internal-messages';
import { extractTextFromContent } from '../message-parser';

// Type-tied to the name that the package ignores, so a rename on either side fails `pnpm typecheck`.
const PROPOSE_AUTOMATION_TOOL: typeof PROPOSE_AUTOMATION_TOOL_NAME =
	PROPOSE_AUTOMATION_CAPABILITY_NAME;

/** What the replayed history says about the work of a chat. */
interface ChatWork {
	userTexts: string[];
	toolCalls: WorkToolCall[];
	/** An earlier turn already carried a `<repeatable-work>` section. */
	nudged: boolean;
	/** The Assistant already called `propose_automation`, in any state. */
	proposed: boolean;
}

/**
 * Stored user messages keep the blocks that the service added, so the text is cleaned first. A
 * schedule in an injected block (for example a workflow name) must not count as the user's own.
 * Only the leading `<thread-context>` can carry a section that n8n wrote.
 */
function readUserMessage(content: unknown, chat: ChatWork): void {
	const stored = extractTextFromContent(content);
	chat.nudged ||= hasRepeatableWorkSection(extractThreadContextBlock(stored) ?? '');
	const text = cleanStoredUserMessage(stored);
	if (text?.trim()) chat.userTexts.push(text);
}

function readToolCalls(content: unknown, chat: ChatWork): void {
	if (!Array.isArray(content)) return;
	for (const part of content) {
		const call = readWorkToolCall(part);
		if (call?.toolName === PROPOSE_AUTOMATION_TOOL) chat.proposed = true;
		else if (call) chat.toolCalls.push(call);
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

/**
 * Decides whether a normal user turn carries the `<repeatable-work>` section, which tells the
 * Assistant to offer "Make this automatic" once. The decision uses the replay window of the chat:
 * after compaction, an earlier section or `propose_automation` call can be out of that window.
 */
@Service()
export class RepeatableWorkNudgeService {
	constructor(private readonly logger: Logger) {}

	/**
	 * The section for a turn with the user's raw `message`, or undefined when the chat already
	 * has a `propose_automation` call, already carried the section, or scores below the threshold.
	 */
	resolveTurnSection(message: string, history: readonly AgentDbMessage[]): string | undefined {
		const chat = readChatWork(history);
		if (chat.nudged || chat.proposed) return undefined;

		const signals = collectWorkSignals({
			userTexts: [...chat.userTexts, message],
			toolCalls: chat.toolCalls,
		});
		return buildRepeatableWorkSection(assessRepeatableWork(signals));
	}

	/** Best effort, like the other turn context: a failed history read costs the section, not the turn. */
	async forTurn(
		message: string,
		loadHistory: () => Promise<AgentDbMessage[]>,
	): Promise<string | undefined> {
		try {
			return this.resolveTurnSection(message, await loadHistory());
		} catch (error) {
			this.logger.warn('Instance AI failed to check the chat for repeatable work', {
				error: getErrorMessage(error),
			});
			return undefined;
		}
	}
}
