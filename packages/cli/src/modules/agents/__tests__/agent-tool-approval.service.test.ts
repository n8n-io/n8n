import type { ApprovalResumePayload } from '@n8n/agents';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { mock } from 'vitest-mock-extended';

import type { Telemetry } from '@/telemetry';

import { AgentToolApprovalService } from '../agent-tool-approval.service';
import { buildAgentConfigurationTelemetryFromConfig } from '../agent-telemetry';
import type { AgentThreadGrantRepository } from '../repositories/agent-thread-grant.repository';

const grants = mock<AgentThreadGrantRepository>();
const telemetry = mock<Telemetry>();
const service = new AgentToolApprovalService(grants, telemetry);
const params = {
	threadId: 'child-thread',
	agentId: 'agent-1',
	telemetry: {
		userId: 'user-1',
		runType: 'test' as const,
		configuration: buildAgentConfigurationTelemetryFromConfig(null),
	},
};
const key = '["tool","notion_search"]';

beforeEach(() => {
	vi.clearAllMocks();
	grants.findKeys.mockImplementation(async () => new Set());
});

it.each<{ decision: ApprovalResumePayload; allowed: boolean; scope: 'once' | 'session' }>([
	{ decision: { approved: true }, allowed: false, scope: 'once' },
	{ decision: { approved: true, scope: 'once' }, allowed: false, scope: 'once' },
	{ decision: { approved: false, scope: 'session' }, allowed: false, scope: 'session' },
	{ decision: { approved: true, scope: 'session' }, allowed: true, scope: 'session' },
])(
	'records the decision and grants only session approvals: $decision',
	async ({ decision, allowed, scope }) => {
		const context = await service.createContext(params);
		await context.onDecision(key, decision);
		expect(context.approvedKeys.has(key)).toBe(allowed);
		if (allowed) expect(grants.grant).toHaveBeenCalledWith('child-thread', key);
		else expect(grants.grant).not.toHaveBeenCalled();
		expect(telemetry.track).toHaveBeenCalledExactlyOnceWith(
			TELEMETRY_EVENT.AGENTS.USER_RESPONDED_TO_AGENT_TOOL_APPROVAL,
			{
				agent_id: 'agent-1',
				user_id: 'user-1',
				run_type: 'test',
				approved: decision.approved,
				scope,
			},
		);
	},
);

it('keeps the allowance unset until the database write succeeds', async () => {
	const pending = createDeferredPromise<undefined>();
	grants.grant.mockReturnValueOnce(pending.promise);
	const context = await service.createContext(params);
	const decision = context.onDecision(key, { approved: true, scope: 'session' });
	expect(context.approvedKeys.has(key)).toBe(false);
	pending.reject(new Error('Database unavailable'));
	await expect(decision).rejects.toThrow('Could not save the session allowance');
	expect(context.approvedKeys.has(key)).toBe(false);
});
