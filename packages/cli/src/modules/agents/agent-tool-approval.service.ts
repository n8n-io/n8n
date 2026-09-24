import type { ToolApprovalContext } from '@n8n/agents';
import { Service } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { OperationalError } from 'n8n-workflow';

import { Telemetry } from '@/telemetry';

import type { StartExecutionParams } from './agent-execution.service';
import { AgentThreadGrantRepository } from './repositories/agent-thread-grant.repository';

@Service()
export class AgentToolApprovalService {
	constructor(
		private readonly grants: AgentThreadGrantRepository,
		private readonly telemetry: Telemetry,
	) {}

	async createContext({
		threadId,
		agentId,
		telemetry,
	}: Pick<
		StartExecutionParams,
		'threadId' | 'agentId' | 'telemetry'
	>): Promise<ToolApprovalContext> {
		const approvedKeys = await this.grants.findKeys(threadId);
		return {
			approvedKeys,
			onDecision: async (grantKey, decision) => {
				if (telemetry) {
					this.telemetry.track(TELEMETRY_EVENT.AGENTS.USER_RESPONDED_TO_AGENT_TOOL_APPROVAL, {
						agent_id: agentId,
						user_id: telemetry.userId,
						run_type: telemetry.runType,
						approved: decision.approved,
						scope: decision.scope ?? 'once',
					});
				}
				if (!decision.approved || decision.scope !== 'session') return;
				try {
					await this.grants.grant(threadId, grantKey);
				} catch (error) {
					throw new OperationalError('Could not save the session allowance. Try again.', {
						cause: error,
					});
				}
				approvedKeys.add(grantKey);
			},
		};
	}
}
