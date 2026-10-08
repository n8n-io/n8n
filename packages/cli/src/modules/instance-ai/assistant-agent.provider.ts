import type { User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import {
	InstanceAiConfirmRequestDto,
	InstanceAiSendMessageRequest,
	type InstanceAiFileAttachment,
} from '@n8n/api-types';
import { buildResumeData, toConfirmationData } from '@n8n/instance-ai/confirmation-payload';
import { isRecord } from '@n8n/utils/is-record';
import { nanoid } from 'nanoid';
import { hasGlobalScope } from '@n8n/permissions';
import type { z } from 'zod';

import { userHasScopes } from '@/permissions.ee/check-access';

import type { AgentExecutionThread } from '../agents/entities/agent-execution-thread.entity';
import type {
	SystemAgentProvider,
	SystemAgentSharingPolicy,
	SystemAgentTurn,
	SystemAgentTurnHandle,
	SystemAgentTurnOptions,
} from '../agents/system-agents/system-agent.types';
import { AgentChatAttachmentService } from '../agents/agent-chat-attachment.service';
import { N8nMemory } from '../agents/integrations/n8n-memory';
import {
	ASSISTANT_AGENT_ID,
	ASSISTANT_AGENT_NAME,
	ASSISTANT_TURN_DEFAULTS_KEY,
	toJsonObject,
	type AssistantTurnDefaults,
} from './assistant-turn-options';
import { InstanceAiSettingsService } from './instance-ai-settings.service';
import { InstanceAiService } from './instance-ai.service';
import { RunTargetService } from './run-target/run-target.service';
import { SharedThreadPolicy } from './sharing/shared-thread-policy';

type ChatRequest = z.infer<typeof InstanceAiSendMessageRequest>;

/** The client's chat request, or `undefined` when it does not parse. */
function parseChatRequest(hostContext: Record<string, unknown> | undefined): ChatRequest | undefined {
	const parsed = InstanceAiSendMessageRequest.safeParse({ message: '', ...(hostContext ?? {}) });
	return parsed.success ? parsed.data : undefined;
}

/** The turn settings of a chat message. The message's own values win over the thread defaults. */
function chatSettings(context: ChatRequest | undefined, defaults: AssistantTurnDefaults) {
	const own: Partial<ChatRequest> = context ?? {};
	return {
		timeZone: own.timeZone ?? defaults.timeZone,
		pushRef: own.pushRef ?? defaults.pushRef,
		computerUseChannels: own.computerUseChannels ?? defaults.computerUseChannels,
		buildMode: own.mode ?? defaults.buildMode,
		promptVersion: own.promptVersion ?? defaults.promptVersion,
	};
}

/** The thread artifacts, hand-off context and attachment references of a chat message. */
function chatContextFields(context: ChatRequest | undefined) {
	// File bytes travel through the Agents attachment store, not the context.
	const references = context?.attachments?.filter((attachment) => attachment.type !== 'file');
	return {
		...(context?.threadArtifacts ? { threadArtifacts: context.threadArtifacts } : {}),
		...(context?.context ? { handoffContext: context.context } : {}),
		...(references?.length ? { attachments: references } : {}),
	};
}

/**
 * The n8n Assistant as an instance agent. The Agents runtime runs it; this
 * module only builds each turn and grants the Assistant its services.
 */
@Service()
export class AssistantAgentProvider implements SystemAgentProvider {
	readonly agentId = ASSISTANT_AGENT_ID;

	readonly name = ASSISTANT_AGENT_NAME;

	constructor(
		private readonly instanceAiService: InstanceAiService,
		private readonly memory: N8nMemory,
		private readonly attachments: AgentChatAttachmentService,
		private readonly settings: InstanceAiSettingsService,
	) {}

	/** What teammates can do in a chat that its owner shared with the team project. */
	get sharing(): SystemAgentSharingPolicy {
		return Container.get(SharedThreadPolicy);
	}

	/** Loaded here, not in the constructor, which already takes the four dependencies it may take. */
	private get runTargets(): RunTargetService {
		return Container.get(RunTargetService);
	}

	/**
	 * Every use of the Assistant through the Agents routes and queue asks this: send, read,
	 * answer, and each queued turn of the owner. So turning the Assistant off stops them all.
	 */
	async authorize(user: User, projectId: string): Promise<boolean> {
		if (!this.settings.isInstanceAiEnabled()) return false;
		if (!hasGlobalScope(user, 'instanceAi:message')) return false;
		// The working project must be one the user can read.
		return await userHasScopes(user, ['project:read'], false, { projectId });
	}

	async prepareTurn(turn: SystemAgentTurn): Promise<SystemAgentTurnHandle> {
		if (turn.type === 'start') await this.postRunTargetNotice(turn);
		if (turn.type === 'start' && turn.attachments.length > 0) {
			// The model input refers to the stored files; the Agents runtime loads
			// their bytes per model call. The bytes loaded here stay in memory for
			// tools that read file content (parse-file) and are never persisted.
			const files = await this.loadFileAttachments(turn);
			const existing = Array.isArray(turn.options.attachments) ? turn.options.attachments : [];
			turn.options = {
				...turn.options,
				attachments: [...existing, ...files],
				fileRefsHandledByHost: true,
			};
		}
		return await this.instanceAiService.prepareAssistantTurn(turn);
	}

	/** The notice of a turn is posted before the turn runs, so the model and the chat both see it. */
	private async postRunTargetNotice(turn: Extract<SystemAgentTurn, { type: 'start' }>) {
		const notice = turn.options.runTargetNotice;
		if (typeof notice === 'string') await this.runTargets.postTurnNotice(turn, notice);
	}

	private async loadFileAttachments(turn: Extract<SystemAgentTurn, { type: 'start' }>) {
		const files: InstanceAiFileAttachment[] = [];
		for (const ref of turn.attachments) {
			const attachment = await this.attachments.getForAgent(ref.id, {
				agentId: ASSISTANT_AGENT_ID,
				projectId: turn.thread.projectId,
				userId: turn.user.id,
			});
			if (!attachment) continue;
			const chunks: Buffer[] = [];
			for await (const chunk of await this.attachments.getStream(attachment)) {
				chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
			}
			files.push({
				type: 'file',
				data: Buffer.concat(chunks).toString('base64'),
				mimeType: ref.mimeType,
				fileName: ref.fileName,
			});
		}
		return files;
	}

	/** A chat message starts a new message group and reuses the thread's turn defaults. */
	/**
	 * A chat message starts a new message group. The client sends its context
	 * (time zone, push ref, hand-off, artifacts) as `hostContext`. Missing
	 * values fall back to the thread's last user turn.
	 */
	async chatTurnOptions(
		_user: User,
		thread: AgentExecutionThread,
		hostContext?: Record<string, unknown>,
	): Promise<SystemAgentTurnOptions> {
		const memoryThread = await this.memory
			.getImplementation(ASSISTANT_AGENT_ID)
			.getThread(thread.id);
		const stored = memoryThread?.metadata?.[ASSISTANT_TURN_DEFAULTS_KEY];
		const defaults = isRecord(stored) ? (stored as AssistantTurnDefaults) : {};
		const context = parseChatRequest(hostContext);
		const chatRunTarget = await this.runTargets.forChatTurn(thread, stored, context);
		return toJsonObject({
			runId: `run_${nanoid()}`,
			messageGroupId: `mg_${nanoid()}`,
			...chatSettings(context, defaults),
			runTarget: chatRunTarget.runTarget,
			...(chatRunTarget.notice ? { runTargetNotice: chatRunTarget.notice } : {}),
			...chatContextFields(context),
		});
	}

	/** Cards post the `/instance-ai/confirm` body shape. Tools expect their resume data. */
	normalizeResumeData(resumeData: unknown): unknown {
		const parsed = InstanceAiConfirmRequestDto.safeParse(resumeData);
		return parsed.success ? buildResumeData(toConfirmationData(parsed.data)) : resumeData;
	}
}
