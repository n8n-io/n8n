import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';

import { userHasScopes } from '@/permissions.ee/check-access';

import type {
	SystemAgentProvider,
	SystemAgentTurn,
	SystemAgentTurnHandle,
} from '../agents/system-agents/system-agent.types';
import { ASSISTANT_AGENT_ID, ASSISTANT_AGENT_NAME } from './assistant-turn-options';
import { InstanceAiService } from './instance-ai.service';

/**
 * The n8n Assistant as an instance agent. The Agents runtime runs it; this
 * module only builds each turn and grants the Assistant its services.
 */
@Service()
export class AssistantAgentProvider implements SystemAgentProvider {
	readonly agentId = ASSISTANT_AGENT_ID;

	readonly name = ASSISTANT_AGENT_NAME;

	constructor(private readonly instanceAiService: InstanceAiService) {}

	async authorize(user: User, projectId: string): Promise<boolean> {
		if (!hasGlobalScope(user, 'instanceAi:message')) return false;
		// The working project must be one the user can read.
		return await userHasScopes(user, ['project:read'], false, { projectId });
	}

	async prepareTurn(turn: SystemAgentTurn): Promise<SystemAgentTurnHandle> {
		return await this.instanceAiService.prepareAssistantTurn(turn);
	}
}
