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
import { SharedThreadPolicy } from './sharing/shared-thread-policy';

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
		const parsed = InstanceAiSendMessageRequest.safeParse({ message: '', ...(hostContext ?? {}) });
		const context = parsed.success ? parsed.data : undefined;
		// File bytes travel through the Agents attachment store, not the context.
		const references = context?.attachments?.filter((attachment) => attachment.type !== 'file');
		return toJsonObject({
			runId: `run_${nanoid()}`,
			messageGroupId: `mg_${nanoid()}`,
			timeZone: context?.timeZone ?? defaults.timeZone,
			pushRef: context?.pushRef ?? defaults.pushRef,
			computerUseChannels: context?.computerUseChannels ?? defaults.computerUseChannels,
			buildMode: context?.mode ?? defaults.buildMode,
			promptVersion: context?.promptVersion ?? defaults.promptVersion,
			...(context?.threadArtifacts ? { threadArtifacts: context.threadArtifacts } : {}),
			...(context?.context ? { handoffContext: context.context } : {}),
			...(references?.length ? { attachments: references } : {}),
		});
	}

	/** Cards post the `/instance-ai/confirm` body shape. Tools expect their resume data. */
	normalizeResumeData(resumeData: unknown): unknown {
		const parsed = InstanceAiConfirmRequestDto.safeParse(resumeData);
		return parsed.success ? buildResumeData(toConfirmationData(parsed.data)) : resumeData;
	}
}
