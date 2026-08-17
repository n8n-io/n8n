import { type AgentSandboxPrincipal, hashAgentSandboxPrincipal } from '../agent-sandbox-principal';

describe('hashAgentSandboxPrincipal', () => {
	it('produces stable hashes for every principal kind', () => {
		const cases: Array<[AgentSandboxPrincipal, string]> = [
			[{ type: 'n8n-user', userId: 'user/123:raw' }, 'Gt4H3q6RzhJe9cTxQm6be0AdIZQlifuy3w9OPSykmYo'],
			[
				{
					type: 'integration-user',
					connectionId: 'connection/raw:id',
					platform: 'slack',
					platformUserId: 'U/raw:123',
				},
				'7Zqe0BHA0mDnH7Ci9p-Zy7W2uVPQhf_4h01KkKpHnlU',
			],
			[
				{ type: 'workflow-session', workflowId: 'workflow|one', sessionId: 'session|two' },
				'U1yUIOzcWHMbn3uOWB_UKJCbW1yZ_aqsOZJl_o3omc0',
			],
			[
				{
					type: 'workflow-execution',
					workflowId: 'workflow-1',
					executionId: 'execution-1',
				},
				'5PiyOW90m1b3G7sUBU89WQEDdW7jT8E2rnaqMtRilc4',
			],
			[{ type: 'scheduled-task', taskId: 'task-1' }, 'zNDZ3KUSonoPGuBjyiJ1huc8pr8psw4zGbu7t5vlJFA'],
		];

		for (const [principal, expectedHash] of cases) {
			expect(hashAgentSandboxPrincipal(principal)).toBe(expectedHash);
		}
	});

	it('does not collide when delimiter characters move between fields', () => {
		const first = hashAgentSandboxPrincipal({
			type: 'integration-user',
			connectionId: 'a',
			platform: 'b|c',
			platformUserId: 'd',
		});
		const second = hashAgentSandboxPrincipal({
			type: 'integration-user',
			connectionId: 'a|b',
			platform: 'c',
			platformUserId: 'd',
		});

		expect(first).toBe('f1q_0RPATJAPJMFC_AVuRad38wcVRFv0MfTsU_k1K90');
		expect(second).toBe('U1sl-BmMZxJ_coVScXBuMDpW3mI4oQZOUbi2-xYbn0c');
	});
});
