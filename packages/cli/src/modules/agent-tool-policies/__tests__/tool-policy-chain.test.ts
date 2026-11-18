import type { ToolPolicy } from '@n8n/api-types';
import type { PolicedSession, PreToolExecutionContext } from '@n8n/decorators';

import { collectToolPolicies, type LoadAgentToolPolicy } from '../tool-policy-chain';

const policy = (id: string): ToolPolicy => ({
	defaultAction: 'allow',
	rules: [{ id, action: 'deny', tools: [{ kind: 'category', value: 'sendsDataOut' }] }],
});

function context(threadId: string | null, sessions: PolicedSession[], delegated = true) {
	const sessionHistory = vi.fn<PreToolExecutionContext['sessionHistory']>(async () => sessions);
	const ctx: PreToolExecutionContext = {
		agentId: 'child',
		projectId: 'project-1',
		threadId,
		agentExecutionId: null,
		runId: 'run-1',
		toolCallId: 'call-1',
		tool: { name: 'Send_Email' },
		input: {},
		resumed: false,
		delegated,
		toolPolicy: null,
		loadAgentToolPolicy: async () => await Promise.resolve(null),
		runToolCalls: () => [],
		sessionHistory,
	};
	return { ctx, sessionHistory };
}

const session = (threadId: string, agentId: string | null): PolicedSession => ({
	threadId,
	agentId,
	toolCalls: [],
});

describe('collectToolPolicies', () => {
	const policies: Record<string, ToolPolicy> = {
		parent: policy('parent-rule'),
		root: policy('root-rule'),
	};
	const load = vi.fn<LoadAgentToolPolicy>(async (agentId) => policies[agentId]);

	beforeEach(() => load.mockClear());

	it('returns the own policy first, then the policy of each parent up to the root', async () => {
		const { ctx } = context('t-child', [
			session('t-child', 'child'),
			session('t-parent', 'parent'),
			session('t-root', 'root'),
		]);

		const chain = await collectToolPolicies(ctx, policy('own-rule'), load);

		expect(chain.map((entry) => entry.source)).toEqual([
			{ kind: 'agent', agentId: 'child' },
			{ kind: 'agent', agentId: 'parent' },
			{ kind: 'agent', agentId: 'root' },
		]);
		expect(chain[1].policy).toBe(policies.parent);
	});

	it('skips agents without a policy, sessions without an agent, and repeated agents', async () => {
		const { ctx } = context('t-child', [
			session('t-child', 'child'),
			session('t-none', 'no-policy'),
			session('t-workflow', null),
			session('t-parent', 'parent'),
			session('t-parent-again', 'parent'),
			session('t-child-again', 'child'),
		]);

		const chain = await collectToolPolicies(ctx, undefined, load);

		expect(chain.map((entry) => entry.source)).toEqual([{ kind: 'agent', agentId: 'parent' }]);
		expect(load.mock.calls.map(([agentId]) => agentId)).toEqual(['no-policy', 'parent']);
	});

	it('reads no history for a run that no agent delegated', async () => {
		const { ctx, sessionHistory } = context('t-top', [], false);

		const chain = await collectToolPolicies(ctx, policy('own-rule'), load);

		expect(chain).toHaveLength(1);
		expect(sessionHistory).not.toHaveBeenCalled();
		expect(load).not.toHaveBeenCalled();
	});
});
