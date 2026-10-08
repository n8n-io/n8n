import {
	buildTransferPreflight,
	matchCredentials,
	missingNodeTypes,
	type LocalTransferRequirements,
	type RemoteTransferContext,
} from '../transfer-preflight';

const SLACK = { name: 'Team Slack', type: 'slackApi' };
const STRIPE = { name: 'Stripe', type: 'httpHeaderAuth' };
const OPS = { id: 'Xk3pQ9aZ1bC2dE4f', name: 'Ops' };

const complete = (credentials: { name: string; type: string }[]) => ({
	credentials,
	complete: true,
});

const local = (overrides: Partial<LocalTransferRequirements> = {}): LocalTransferRequirements => ({
	workflowName: 'Daily report',
	nodeCount: 3,
	nodeTypes: ['n8n-nodes-base.manualTrigger@1', 'n8n-nodes-base.slack@2.3'],
	credentials: [SLACK],
	subWorkflowCalls: [],
	...overrides,
});

const remote = (overrides: Partial<RemoteTransferContext> = {}): RemoteTransferContext => ({
	nodeTypes: null,
	credentials: complete([SLACK]),
	targetProject: OPS,
	...overrides,
});

describe('matchCredentials', () => {
	it.each([
		['the same name and type', [SLACK], 'matched'],
		['no credential', [], 'needs-set-up'],
		[
			'the same name with another type',
			[{ name: SLACK.name, type: 'slackOAuth2Api' }],
			'needs-set-up',
		],
		[
			'the same type with another name',
			[{ name: 'Other Slack', type: SLACK.type }],
			'needs-set-up',
		],
		['the name in another case', [{ name: 'team slack', type: SLACK.type }], 'needs-set-up'],
		['the name with a trailing space', [{ name: 'Team Slack ', type: SLACK.type }], 'needs-set-up'],
	] as const)('gives the status %s → %s', (_, remoteCredentials, status) => {
		expect(matchCredentials([SLACK], complete([...remoteCredentials]))).toEqual([
			{ ...SLACK, status },
		]);
	});

	it('gives each credential the status unknown when the instance did not list credentials', () => {
		expect(matchCredentials([SLACK, STRIPE], null)).toEqual([
			{ ...STRIPE, status: 'unknown' },
			{ ...SLACK, status: 'unknown' },
		]);
	});

	it('gives a credential that a partial list leaves out the status unknown, not needs-set-up', () => {
		const partial = { credentials: [SLACK], complete: false };

		expect(matchCredentials([SLACK, STRIPE], partial)).toEqual([
			{ ...STRIPE, status: 'unknown' },
			{ ...SLACK, status: 'matched' },
		]);
	});

	it('lists a credential that several nodes use once, sorted by name and then type', () => {
		const nodes = [SLACK, STRIPE, SLACK, { name: 'Stripe', type: 'apiKey' }];

		expect(matchCredentials(nodes, complete([STRIPE]))).toEqual([
			{ name: 'Stripe', type: 'apiKey', status: 'needs-set-up' },
			{ ...STRIPE, status: 'matched' },
			{ ...SLACK, status: 'needs-set-up' },
		]);
	});

	it('keeps two credentials with the same name and different types apart', () => {
		const result = matchCredentials(
			[SLACK, { name: SLACK.name, type: 'slackOAuth2Api' }],
			complete([SLACK]),
		);

		expect(result.map(({ type, status }) => [type, status])).toEqual([
			['slackApi', 'matched'],
			['slackOAuth2Api', 'needs-set-up'],
		]);
	});

	it('does not mistake a name and type pair that joins to the same text', () => {
		// "a|b" + "c" and "a" + "b|c" join to the same string with a naive separator.
		const result = matchCredentials(
			[{ name: 'a|b', type: 'c' }],
			complete([{ name: 'a', type: 'b|c' }]),
		);

		expect(result[0].status).toBe('needs-set-up');
	});

	it('returns no credentials for a workflow without credentials', () => {
		expect(matchCredentials([], complete([SLACK]))).toEqual([]);
	});
});

describe('missingNodeTypes', () => {
	it('returns nothing when the instance lists no node types', () => {
		expect(missingNodeTypes(['a@1'], null)).toEqual([]);
	});

	it('returns the node types that the instance does not list, sorted and once each', () => {
		expect(missingNodeTypes(['c@1', 'a@1', 'b@2', 'c@1'], ['b@2'])).toEqual(['a@1', 'c@1']);
	});

	it('compares the version too', () => {
		expect(missingNodeTypes(['n8n-nodes-base.slack@2.3'], ['n8n-nodes-base.slack@2.2'])).toEqual([
			'n8n-nodes-base.slack@2.3',
		]);
	});

	it('returns nothing when the instance lists every node type', () => {
		expect(missingNodeTypes(['a@1', 'b@1'], ['b@1', 'a@1', 'z@9'])).toEqual([]);
	});
});

describe('buildTransferPreflight', () => {
	it('merges the local requirements with what the instance listed', () => {
		const preflight = buildTransferPreflight(
			local({ credentials: [SLACK, STRIPE] }),
			remote({ credentials: complete([SLACK]) }),
		);

		expect(preflight).toEqual({
			workflowName: 'Daily report',
			moves: { nodes: 3 },
			nodeTypeCheck: 'unknown',
			missingNodeTypes: [],
			credentials: [
				{ ...STRIPE, status: 'needs-set-up' },
				{ ...SLACK, status: 'matched' },
			],
			targetProject: OPS,
			subWorkflowCalls: [],
		});
	});

	it('checks node types when the instance lists them', () => {
		const preflight = buildTransferPreflight(
			local(),
			remote({ nodeTypes: ['n8n-nodes-base.manualTrigger@1'] }),
		);

		expect(preflight.nodeTypeCheck).toBe('checked');
		expect(preflight.missingNodeTypes).toEqual(['n8n-nodes-base.slack@2.3']);
	});

	it('keeps the personal project as null and passes the sub-workflow calls on', () => {
		const calls = [
			{ id: 'wf-2', name: 'Send invoice' },
			{ id: 'wf-3', name: null },
		];

		const preflight = buildTransferPreflight(
			local({ subWorkflowCalls: calls }),
			remote({ targetProject: null }),
		);

		expect(preflight.targetProject).toBeNull();
		expect(preflight.subWorkflowCalls).toEqual(calls);
	});

	it('counts an empty workflow', () => {
		const preflight = buildTransferPreflight(
			local({ nodeCount: 0, nodeTypes: [], credentials: [] }),
			remote(),
		);

		expect(preflight.moves).toEqual({ nodes: 0 });
		expect(preflight.credentials).toEqual([]);
	});
});
