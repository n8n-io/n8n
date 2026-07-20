import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type { MockedFunction } from 'vitest';

vi.mock('../../../utils/eval-agents', async () => {
	const actual: object = await vi.importActual('../../../utils/eval-agents');
	return { ...actual, createEvalAgent: vi.fn(), extractText: vi.fn() };
});

import { createEvalAgent, extractText } from '../../../utils/eval-agents';
import { classifyNodesForSimulation } from '../classify-node-destructiveness.service';

const mockCreateEvalAgent = createEvalAgent as MockedFunction<typeof createEvalAgent>;
const mockExtractText = extractText as MockedFunction<typeof extractText>;

function setupAgentMock(responseText: string) {
	const generate = vi.fn().mockResolvedValue({ messages: [] });
	mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
		typeof createEvalAgent
	>);
	mockExtractText.mockReturnValue(responseText);
}

function setupAgentFailure() {
	const generate = vi.fn().mockRejectedValue(new Error('boom'));
	mockCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
		typeof createEvalAgent
	>);
}

type NodeSpec = {
	name: string;
	type: string;
	parameters?: Record<string, unknown>;
	disabled?: boolean;
};

/** Build a workflow whose nodes form a single main-connection chain. */
function chainWorkflow(nodes: NodeSpec[]): WorkflowJSON {
	const connections: Record<string, unknown> = {};
	for (let i = 0; i < nodes.length - 1; i++) {
		connections[nodes[i].name] = {
			main: [[{ node: nodes[i + 1].name, type: 'main', index: 0 }]],
		};
	}
	return {
		name: 'test',
		nodes: nodes.map((n, i) => ({
			id: `id-${i}`,
			name: n.name,
			type: n.type,
			typeVersion: 1,
			position: [i * 100, 0],
			parameters: n.parameters ?? {},
			...(n.disabled !== undefined ? { disabled: n.disabled } : {}),
		})),
		connections,
		pinData: {},
		settings: {},
	} as unknown as WorkflowJSON;
}

const trigger: NodeSpec = { name: 'Webhook', type: 'n8n-nodes-base.webhook' };

async function classify(nodes: NodeSpec[], mockedNodeNames?: string[]) {
	return await classifyNodesForSimulation({
		workflow: chainWorkflow(nodes),
		mockedNodeNames,
	});
}

function verdictOf(verdicts: Awaited<ReturnType<typeof classify>>, nodeName: string) {
	const verdict = verdicts.find((v) => v.nodeName === nodeName);
	expect(verdict).toBeDefined();
	return verdict!;
}

describe('classifyNodesForSimulation', () => {
	beforeEach(() => vi.clearAllMocks());

	it('classifies transform nodes as execute without calling the LLM', async () => {
		const verdicts = await classify([trigger, { name: 'Set', type: 'n8n-nodes-base.set' }]);
		expect(verdictOf(verdicts, 'Set')).toMatchObject({
			verdict: 'execute',
			confidence: 'high',
			source: 'deterministic',
		});
		expect(mockCreateEvalAgent).not.toHaveBeenCalled();
	});

	it('classifies unambiguous write operations as simulate deterministically', async () => {
		const verdicts = await classify([
			trigger,
			{
				name: 'Insert Row',
				type: 'n8n-nodes-base.dataTable',
				parameters: { operation: 'insert', dataTableId: 'dt1' },
			},
		]);
		expect(verdictOf(verdicts, 'Insert Row')).toMatchObject({
			verdict: 'simulate',
			confidence: 'high',
			source: 'deterministic',
		});
		expect(mockCreateEvalAgent).not.toHaveBeenCalled();
	});

	it('classifies unambiguous read operations as execute deterministically', async () => {
		const verdicts = await classify([
			trigger,
			{
				name: 'Get Rows',
				type: 'n8n-nodes-base.dataTable',
				parameters: { operation: 'getAll' },
			},
		]);
		expect(verdictOf(verdicts, 'Get Rows')).toMatchObject({
			verdict: 'execute',
			source: 'deterministic',
		});
	});

	it('forces simulate for nodes with mocked credentials, even read operations', async () => {
		const verdicts = await classify(
			[
				trigger,
				{ name: 'Get Rows', type: 'n8n-nodes-base.slack', parameters: { operation: 'get' } },
			],
			['Get Rows'],
		);
		expect(verdictOf(verdicts, 'Get Rows')).toMatchObject({
			verdict: 'simulate',
			source: 'deterministic',
			reason: 'Credentials are not configured for this node',
		});
	});

	it('excludes triggers, sticky notes, disabled nodes, and nodes outside the main flow', async () => {
		const workflow = chainWorkflow([
			trigger,
			{ name: 'Set', type: 'n8n-nodes-base.set' },
			{ name: 'Disabled', type: 'n8n-nodes-base.set', disabled: true },
		]);
		// Sticky note and an unconnected sub-node-style entry
		workflow.nodes.push(
			{
				id: 'sticky',
				name: 'Note',
				type: 'n8n-nodes-base.stickyNote',
				typeVersion: 1,
				position: [0, 200],
				parameters: {},
			} as unknown as WorkflowJSON['nodes'][number],
			{
				id: 'model',
				name: 'Model',
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				typeVersion: 1,
				position: [0, 300],
				parameters: {},
			} as unknown as WorkflowJSON['nodes'][number],
		);
		const verdicts = await classifyNodesForSimulation({ workflow });
		expect(verdicts.map((v) => v.nodeName)).toEqual(['Set']);
	});

	it('classifies HTTP GET as execute deterministically', async () => {
		const verdicts = await classify([
			trigger,
			{
				name: 'Fetch',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { method: 'GET', url: 'https://api.example.com/items' },
			},
		]);
		expect(verdictOf(verdicts, 'Fetch')).toMatchObject({
			verdict: 'execute',
			source: 'deterministic',
		});
		expect(mockCreateEvalAgent).not.toHaveBeenCalled();
	});

	it('sends non-GET HTTP requests to the LLM and respects its execute verdict', async () => {
		setupAgentMock(
			JSON.stringify({
				Search: { verdict: 'execute', reason: 'POST to a search endpoint', confidence: 'high' },
			}),
		);
		const verdicts = await classify([
			trigger,
			{
				name: 'Search',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { method: 'POST', url: 'https://api.example.com/search' },
			},
		]);
		expect(verdictOf(verdicts, 'Search')).toMatchObject({
			verdict: 'execute',
			source: 'llm',
			confidence: 'high',
		});
		expect(mockCreateEvalAgent).toHaveBeenCalledTimes(1);
	});

	it('classifies IO-free Code nodes as execute deterministically', async () => {
		const verdicts = await classify([
			trigger,
			{
				name: 'Transform',
				type: 'n8n-nodes-base.code',
				parameters: { jsCode: 'return items.map(i => ({ json: { n: i.json.n * 2 } }));' },
			},
		]);
		expect(verdictOf(verdicts, 'Transform')).toMatchObject({
			verdict: 'execute',
			source: 'deterministic',
		});
		expect(mockCreateEvalAgent).not.toHaveBeenCalled();
	});

	it('falls back to simulate when the LLM call fails', async () => {
		setupAgentFailure();
		const verdicts = await classify([
			trigger,
			{
				name: 'Custom',
				type: 'n8n-nodes-community.someNode',
				parameters: {},
			},
		]);
		expect(verdictOf(verdicts, 'Custom')).toMatchObject({
			verdict: 'simulate',
			confidence: 'low',
			source: 'fallback',
		});
	});

	it('falls back to simulate for nodes the LLM response omits', async () => {
		setupAgentMock(
			JSON.stringify({
				Known: { verdict: 'execute', reason: 'reads data', confidence: 'high' },
			}),
		);
		const verdicts = await classify([
			trigger,
			{ name: 'Known', type: 'n8n-nodes-community.a', parameters: {} },
			{ name: 'Omitted', type: 'n8n-nodes-community.b', parameters: {} },
		]);
		expect(verdictOf(verdicts, 'Known').verdict).toBe('execute');
		expect(verdictOf(verdicts, 'Omitted')).toMatchObject({
			verdict: 'simulate',
			source: 'fallback',
		});
	});

	it('returns a plan with fallback verdicts even when the LLM path throws before the call', async () => {
		// A throw outside the LLM call's own try/catch (here: JSON.stringify on
		// circular parameters while building the prompt) must not abort the whole
		// plan — the plan is the only source of verification pin data.
		const circular: Record<string, unknown> = { method: 'POST' };
		circular.self = circular;
		const verdicts = await classify([
			trigger,
			{ name: 'Transform', type: 'n8n-nodes-base.set', parameters: {} },
			{ name: 'Post', type: 'n8n-nodes-base.httpRequest', parameters: circular },
		]);
		expect(verdictOf(verdicts, 'Transform').verdict).toBe('execute');
		expect(verdictOf(verdicts, 'Post')).toMatchObject({
			verdict: 'simulate',
			confidence: 'low',
			source: 'fallback',
		});
	});

	it('falls back to simulate on malformed LLM output', async () => {
		setupAgentMock('not json');
		const verdicts = await classify([
			trigger,
			{ name: 'Custom', type: 'n8n-nodes-community.someNode', parameters: {} },
		]);
		expect(verdictOf(verdicts, 'Custom')).toMatchObject({
			verdict: 'simulate',
			source: 'fallback',
		});
	});

	it('returns an empty plan for a trigger-only workflow', async () => {
		const verdicts = await classify([trigger]);
		expect(verdicts).toEqual([]);
		expect(mockCreateEvalAgent).not.toHaveBeenCalled();
	});

	it('classifies mid-workflow form pages as simulate', async () => {
		const verdicts = await classify([
			trigger,
			{
				name: 'Approval Form',
				type: 'n8n-nodes-base.form',
				parameters: { formFields: { values: [{ fieldLabel: 'Approved?' }] } },
			},
		]);
		expect(verdictOf(verdicts, 'Approval Form')).toMatchObject({
			verdict: 'simulate',
			source: 'deterministic',
		});
		expect(mockCreateEvalAgent).not.toHaveBeenCalled();
	});

	it('executes short time-interval waits to preserve pass-through data', async () => {
		const verdicts = await classify([
			trigger,
			{
				name: 'Brief Pause',
				type: 'n8n-nodes-base.wait',
				parameters: { resume: 'timeInterval', amount: 30, unit: 'seconds' },
			},
		]);
		expect(verdictOf(verdicts, 'Brief Pause')).toMatchObject({
			verdict: 'execute',
			source: 'deterministic',
		});
	});

	it('simulates a default wait node (1 hour time interval)', async () => {
		const verdicts = await classify([
			trigger,
			{ name: 'Wait', type: 'n8n-nodes-base.wait', parameters: {} },
		]);
		expect(verdictOf(verdicts, 'Wait')).toMatchObject({
			verdict: 'simulate',
			source: 'deterministic',
		});
	});

	it('simulates waits that resume on webhook or form', async () => {
		const verdicts = await classify([
			trigger,
			{ name: 'Wait Hook', type: 'n8n-nodes-base.wait', parameters: { resume: 'webhook' } },
			{ name: 'Wait Form', type: 'n8n-nodes-base.wait', parameters: { resume: 'form' } },
		]);
		expect(verdictOf(verdicts, 'Wait Hook').verdict).toBe('simulate');
		expect(verdictOf(verdicts, 'Wait Form').verdict).toBe('simulate');
		expect(mockCreateEvalAgent).not.toHaveBeenCalled();
	});

	it('classifies destructive-by-type nodes as simulate', async () => {
		const verdicts = await classify([
			trigger,
			{ name: 'Send Email', type: 'n8n-nodes-base.emailSend', parameters: {} },
		]);
		expect(verdictOf(verdicts, 'Send Email')).toMatchObject({
			verdict: 'simulate',
			source: 'deterministic',
		});
	});
});
