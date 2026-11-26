import type { AgentAttentionFlagType, DismissAgentAttentionFlagsDto } from '@n8n/api-types';
import { Service } from '@n8n/di';

import {
	AgentAttentionFlagRepository,
	type AgentAttentionFlagScope,
} from './repositories/agent-attention-flag.repository';
import { AgentRepository } from './repositories/agent.repository';
import { getAgentOrThrow } from './utils/get-agent-or-throw';

@Service()
export class AgentAttentionFlagsService {
	constructor(
		private readonly flags: AgentAttentionFlagRepository,
		private readonly agents: AgentRepository,
	) {}

	async list(scope: AgentAttentionFlagScope, type?: AgentAttentionFlagType) {
		await getAgentOrThrow(this.agents, scope.agentId, scope.projectId);
		return await this.flags.list(scope, type);
	}

	async dismiss(scope: AgentAttentionFlagScope, payload: DismissAgentAttentionFlagsDto) {
		await getAgentOrThrow(this.agents, scope.agentId, scope.projectId);
		await this.flags.dismiss(scope, payload.type, payload.flagIds);
		return { success: true };
	}
}
