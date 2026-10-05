import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { InstanceAiConfirmRequestDto } from '@n8n/api-types';
import { buildResumeData, toConfirmationData } from '@n8n/instance-ai/confirmation-payload';
import { isRecord } from '@n8n/utils/is-record';
import { nanoid } from 'nanoid';
import { hasGlobalScope } from '@n8n/permissions';

import { userHasScopes } from '@/permissions.ee/check-access';

import type { AgentExecutionThread } from '../agents/entities/agent-execution-thread.entity';
import type {
	SystemAgentProvider,
	SystemAgentTurn,
	SystemAgentTurnHandle,
	SystemAgentTurnOptions,
} from '../agents/system-agents/system-agent.types';
import { N8nMemory } from '../agents/integrations/n8n-memory';
import {
	ASSISTANT_AGENT_ID,
	ASSISTANT_AGENT_NAME,
	ASSISTANT_TURN_DEFAULTS_KEY,
	toJsonObject,
	type AssistantTurnDefaults,
} from './assistant-turn-options';
import { InstanceAiService } from './instance-ai.service';

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
	) {}

	async authorize(user: User, projectId: string): Promise<boolean> {
		if (!hasGlobalScope(user, 'instanceAi:message')) return false;
		// The working project must be one the user can read.
		return await userHasScopes(user, ['project:read'], false, { projectId });
	}

	async prepareTurn(turn: SystemAgentTurn): Promise<SystemAgentTurnHandle> {
		return await this.instanceAiService.prepareAssistantTurn(turn);
	}

	/** A chat message starts a new message group and reuses the thread's turn defaults. */
	async chatTurnOptions(
		_user: User,
		thread: AgentExecutionThread,
	): Promise<SystemAgentTurnOptions> {
		const memoryThread = await this.memory
			.getImplementation(ASSISTANT_AGENT_ID)
			.getThread(thread.id);
		const defaults = memoryThread?.metadata?.[ASSISTANT_TURN_DEFAULTS_KEY];
		return toJsonObject({
			...(isRecord(defaults) ? (defaults as AssistantTurnDefaults) : {}),
			runId: `run_${nanoid()}`,
			messageGroupId: `mg_${nanoid()}`,
		});
	}

	/** Cards post the `/instance-ai/confirm` body shape. Tools expect their resume data. */
	normalizeResumeData(resumeData: unknown): unknown {
		const parsed = InstanceAiConfirmRequestDto.safeParse(resumeData);
		return parsed.success ? buildResumeData(toConfirmationData(parsed.data)) : resumeData;
	}
}
