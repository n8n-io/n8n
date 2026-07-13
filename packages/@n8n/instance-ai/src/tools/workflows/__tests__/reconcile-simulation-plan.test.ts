import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type {
	NodeSimulationVerdict,
	WorkflowBuildOutcome,
} from '../../../workflow-loop/workflow-loop-state';
import { reconcileSimulationPlan } from '../reconcile-simulation-plan';
import { type CredentialEntry, type CredentialMap } from '../resolve-credentials';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCKED_CREDENTIAL_REASON = 'Credentials are not configured for this node';

function makeCredentialMap(credentials: CredentialEntry[]): CredentialMap {
	const map: CredentialMap = new Map();
	for (const credential of credentials) {
		const entries = map.get(credential.type) ?? [];
		entries.push(credential);
		map.set(credential.type, entries);
	}
	return map;
}

function mockedVerdict(nodeName: string): NodeSimulationVerdict {
	return {
		nodeName,
		verdict: 'simulate',
		reason: MOCKED_CREDENTIAL_REASON,
		confidence: 'high',
		source: 'deterministic',
	};
}

function makeBuildOutcome(overrides: Partial<WorkflowBuildOutcome> = {}): WorkflowBuildOutcome {
	return {
		workItemId: 'wi_1',
		taskId: 'task_1',
		workflowId: 'wf_1',
		submitted: true,
		triggerType: 'manual_or_testable',
		needsUserInput: false,
		summary: 'Built',
		...overrides,
	};
}

interface TestNode {
	name: string;
	type: string;
	parameters?: Record<string, unknown>;
	credentials?: Record<string, unknown>;
}

function makeWorkflow(nodes: TestNode[]): WorkflowJSON {
	// Wire every node as a main-flow destination so classification considers it.
	const connections = Object.fromEntries(
		nodes.map((node, index) => [
			index === 0 ? 'Trigger' : nodes[index - 1].name,
			{ main: [[{ node: node.name, type: 'main', index: 0 }]] },
		]),
	);
	return { name: 'Test Workflow', nodes, connections } as unknown as WorkflowJSON;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('reconcileSimulationPlan', () => {
	it('returns undefined when the outcome has no mocked credentials', async () => {
		const patch = await reconcileSimulationPlan({
			buildOutcome: makeBuildOutcome(),
			workflow: makeWorkflow([]),
			availableCredentials: makeCredentialMap([]),
		});

		expect(patch).toBeUndefined();
	});

	it('returns undefined while the mocked node still has no credential', async () => {
		const patch = await reconcileSimulationPlan({
			buildOutcome: makeBuildOutcome({
				mockedNodeNames: ['Notion'],
				mockedCredentialTypes: ['notionApi'],
				mockedCredentialsByNode: { Notion: ['notionApi'] },
				nodeSimulationPlan: [mockedVerdict('Notion')],
			}),
			workflow: makeWorkflow([
				{ name: 'Notion', type: 'n8n-nodes-base.notion', parameters: { operation: 'get' } },
			]),
			availableCredentials: makeCredentialMap([]),
		});

		expect(patch).toBeUndefined();
	});

	it('returns undefined when the assigned credential id is unknown', async () => {
		const patch = await reconcileSimulationPlan({
			buildOutcome: makeBuildOutcome({
				mockedNodeNames: ['Notion'],
				mockedCredentialsByNode: { Notion: ['notionApi'] },
				nodeSimulationPlan: [mockedVerdict('Notion')],
			}),
			workflow: makeWorkflow([
				{
					name: 'Notion',
					type: 'n8n-nodes-base.notion',
					parameters: { operation: 'get' },
					credentials: { notionApi: { id: 'deleted-cred', name: 'Gone' } },
				},
			]),
			availableCredentials: makeCredentialMap([
				{ id: 'other-cred', name: 'Other', type: 'notionApi' },
			]),
		});

		expect(patch).toBeUndefined();
	});

	it('flips a safe node to execute and clears its mock bookkeeping once credentials are configured', async () => {
		const patch = await reconcileSimulationPlan({
			buildOutcome: makeBuildOutcome({
				mockedNodeNames: ['Notion'],
				mockedCredentialTypes: ['notionApi'],
				mockedCredentialsByNode: { Notion: ['notionApi'] },
				nodeSimulationPlan: [mockedVerdict('Notion')],
				simulationFixtures: { Notion: [{ page: 'mock' }] },
				setupRequirement: {
					status: 'required',
					reason: 'mocked-credentials',
					guidance: 'Route the workflow through setup so the user can add real credentials.',
				},
			}),
			workflow: makeWorkflow([
				{
					name: 'Notion',
					type: 'n8n-nodes-base.notion',
					parameters: { operation: 'get' },
					credentials: { notionApi: { id: 'cred-1', name: 'Notion' } },
				},
			]),
			availableCredentials: makeCredentialMap([
				{ id: 'cred-1', name: 'Notion', type: 'notionApi' },
			]),
		});

		expect(patch).toBeDefined();
		expect(patch?.nodeSimulationPlan).toEqual([
			expect.objectContaining({ nodeName: 'Notion', verdict: 'execute' }),
		]);
		expect(patch?.simulationFixtures).toBeUndefined();
		expect(patch?.mockedNodeNames).toBeUndefined();
		expect(patch?.mockedCredentialTypes).toBeUndefined();
		expect(patch?.mockedCredentialsByNode).toBeUndefined();
		expect(patch?.setupRequirement).toEqual({ status: 'not_required' });
	});

	it('keeps a destructive node simulated with an honest reason and keeps its fixture', async () => {
		const patch = await reconcileSimulationPlan({
			buildOutcome: makeBuildOutcome({
				mockedNodeNames: ['Gmail'],
				mockedCredentialsByNode: { Gmail: ['gmailOAuth2'] },
				nodeSimulationPlan: [mockedVerdict('Gmail')],
				simulationFixtures: { Gmail: [{ messageId: 'mock' }] },
			}),
			workflow: makeWorkflow([
				{
					name: 'Gmail',
					type: 'n8n-nodes-base.gmail',
					parameters: { operation: 'send' },
					credentials: { gmailOAuth2: { id: 'cred-1', name: 'Gmail' } },
				},
			]),
			availableCredentials: makeCredentialMap([
				{ id: 'cred-1', name: 'Gmail', type: 'gmailOAuth2' },
			]),
		});

		expect(patch?.nodeSimulationPlan).toEqual([
			expect.objectContaining({ nodeName: 'Gmail', verdict: 'simulate' }),
		]);
		expect(patch?.nodeSimulationPlan?.[0]?.reason).not.toBe(MOCKED_CREDENTIAL_REASON);
		expect(patch?.simulationFixtures).toEqual({ Gmail: [{ messageId: 'mock' }] });
		expect(patch?.mockedNodeNames).toBeUndefined();
	});

	it('treats an AI Gateway-managed credential as configured', async () => {
		const patch = await reconcileSimulationPlan({
			buildOutcome: makeBuildOutcome({
				mockedNodeNames: ['Notion'],
				mockedCredentialsByNode: { Notion: ['notionApi'] },
				nodeSimulationPlan: [mockedVerdict('Notion')],
			}),
			workflow: makeWorkflow([
				{
					name: 'Notion',
					type: 'n8n-nodes-base.notion',
					parameters: { operation: 'get' },
					credentials: { notionApi: { id: null, name: '', __aiGatewayManaged: true } },
				},
			]),
			availableCredentials: makeCredentialMap([]),
		});

		expect(patch?.nodeSimulationPlan).toEqual([
			expect.objectContaining({ nodeName: 'Notion', verdict: 'execute' }),
		]);
		expect(patch?.mockedCredentialsByNode).toBeUndefined();
	});

	it('only clears the satisfied node and preserves unrelated verdicts', async () => {
		const formVerdict: NodeSimulationVerdict = {
			nodeName: 'Form',
			verdict: 'simulate',
			reason: 'Displays a form page and waits for a user submission',
			confidence: 'high',
			source: 'deterministic',
		};
		const patch = await reconcileSimulationPlan({
			buildOutcome: makeBuildOutcome({
				mockedNodeNames: ['Notion', 'Slack'],
				mockedCredentialTypes: ['notionApi', 'slackApi'],
				mockedCredentialsByNode: { Notion: ['notionApi'], Slack: ['slackApi'] },
				nodeSimulationPlan: [formVerdict, mockedVerdict('Notion'), mockedVerdict('Slack')],
				simulationFixtures: { Form: [{ field: 'x' }], Notion: [{ page: 'mock' }] },
				setupRequirement: {
					status: 'required',
					reason: 'mocked-credentials',
					guidance: 'Route the workflow through setup so the user can add real credentials.',
				},
			}),
			workflow: makeWorkflow([
				{ name: 'Form', type: 'n8n-nodes-base.form', parameters: {} },
				{
					name: 'Notion',
					type: 'n8n-nodes-base.notion',
					parameters: { operation: 'get' },
					credentials: { notionApi: { id: 'cred-1', name: 'Notion' } },
				},
				{ name: 'Slack', type: 'n8n-nodes-base.slack', parameters: { operation: 'send' } },
			]),
			availableCredentials: makeCredentialMap([
				{ id: 'cred-1', name: 'Notion', type: 'notionApi' },
			]),
		});

		expect(patch?.nodeSimulationPlan).toEqual([
			formVerdict,
			expect.objectContaining({ nodeName: 'Notion', verdict: 'execute' }),
			mockedVerdict('Slack'),
		]);
		expect(patch?.simulationFixtures).toEqual({ Form: [{ field: 'x' }] });
		expect(patch?.mockedNodeNames).toEqual(['Slack']);
		expect(patch?.mockedCredentialTypes).toEqual(['slackApi']);
		expect(patch?.mockedCredentialsByNode).toEqual({ Slack: ['slackApi'] });
		expect(patch?.setupRequirement).toBeUndefined();
	});
});
