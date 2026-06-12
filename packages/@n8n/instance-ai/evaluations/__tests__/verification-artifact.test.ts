import type { InstanceAiEvalExecutionResult, InstanceAiEvalNodeResult } from '@n8n/api-types';

import type { WorkflowResponse } from '../clients/n8n-client';
import { buildVerificationArtifact } from '../harness/runner';
import type { ExecutionScenario } from '../types';

function makeNodeResult(
	overrides: Partial<InstanceAiEvalNodeResult> = {},
): InstanceAiEvalNodeResult {
	return {
		outputs: {},
		outputCount: 0,
		iterationCount: 0,
		interceptedRequests: [],
		executionMode: 'real',
		...overrides,
	};
}

const scenario: ExecutionScenario = {
	name: 'happy-path',
	description: 'baseline',
	dataSetup: 'three posts, two match the filter',
	successCriteria: 'two posts forwarded downstream',
};

function makeEvalResult(
	nodeResults: Record<string, InstanceAiEvalNodeResult>,
): InstanceAiEvalExecutionResult {
	return {
		executionId: 'exec-1',
		success: true,
		nodeResults,
		errors: [],
		hints: {
			globalContext: '',
			triggerContent: { foo: 1 },
			nodeHints: {},
			warnings: [],
			bypassPinData: {},
		},
		mockedCredentials: [],
	};
}

describe('buildVerificationArtifact', () => {
	it('splits artifact into a workflow block (cacheable) and a scenario block (fresh)', () => {
		const wf: WorkflowResponse = {
			id: 'w1',
			name: 'pipeline',
			active: false,
			versionId: 'v1',
			nodes: [
				{
					id: 'a',
					name: 'Trigger',
					type: 'n8n-nodes-base.scheduleTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: { Trigger: { main: [[]] } },
		};
		const artifact = buildVerificationArtifact(scenario, makeEvalResult({}), [wf]);
		expect(artifact.workflowContext).toContain('Workflow structure');
		expect(artifact.workflowContext).toContain('Trigger');
		expect(artifact.workflowContext).toContain('Connections');
		expect(artifact.scenarioContext).toContain('happy-path');
		expect(artifact.scenarioContext).toContain('Execution trace');
		expect(artifact.scenarioContext).not.toContain('Workflow structure');
	});

	it('labels Filter branches with downstream node names so verifier can tell where items went', () => {
		const wf: WorkflowResponse = {
			id: 'w1',
			name: 'pipeline',
			active: false,
			versionId: 'v1',
			nodes: [
				{
					id: 'a',
					name: 'Filter',
					type: 'n8n-nodes-base.filter',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'b',
					name: 'Aggregate Posts',
					type: 'n8n-nodes-base.aggregate',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {
				Filter: {
					main: [[{ node: 'Aggregate Posts', type: 'main', index: 0 }], []],
				},
			},
		};
		const evalResult = makeEvalResult({
			Filter: makeNodeResult({
				outputs: {
					main: [[{ json: { id: 1, kept: true } }], [{ json: { id: 2, dropped: true } }]],
				},
				outputCount: 2,
				iterationCount: 1,
			}),
		});

		const artifact = buildVerificationArtifact(scenario, evalResult, [wf]);

		expect(artifact.scenarioContext).toContain('Output [main branch 0] → Aggregate Posts');
		expect(artifact.scenarioContext).toContain(
			'Output [main branch 1] → (no downstream connection)',
		);
		expect(artifact.scenarioContext).toContain('"id": 1');
		expect(artifact.scenarioContext).toContain('"id": 2');
	});

	it('renders Switch branches per route with their downstream targets', () => {
		const wf: WorkflowResponse = {
			id: 'w1',
			name: 'router',
			active: false,
			versionId: 'v1',
			nodes: [
				{
					id: 'a',
					name: 'Switch',
					type: 'n8n-nodes-base.switch',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'b',
					name: 'Slack',
					type: 'n8n-nodes-base.slack',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'c',
					name: 'Email',
					type: 'n8n-nodes-base.emailSend',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {
				Switch: {
					main: [
						[{ node: 'Slack', type: 'main', index: 0 }],
						[{ node: 'Email', type: 'main', index: 0 }],
					],
				},
			},
		};
		const evalResult = makeEvalResult({
			Switch: makeNodeResult({
				outputs: { main: [[{ json: { route: 'a' } }], [{ json: { route: 'b' } }]] },
				outputCount: 2,
				iterationCount: 1,
			}),
		});

		const artifact = buildVerificationArtifact(scenario, evalResult, [wf]);

		expect(artifact.scenarioContext).toContain('Output [main branch 0] → Slack');
		expect(artifact.scenarioContext).toContain('Output [main branch 1] → Email');
	});

	it('renders AI sub-node outputs under their non-main connection type', () => {
		const wf: WorkflowResponse = {
			id: 'w1',
			name: 'agent',
			active: false,
			versionId: 'v1',
			nodes: [
				{
					id: 'a',
					name: 'OpenAI Chat Model',
					type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'b',
					name: 'AI Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {
				'OpenAI Chat Model': {
					ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
				},
			},
		};
		const evalResult = makeEvalResult({
			'OpenAI Chat Model': makeNodeResult({
				outputs: { ai_languageModel: [[{ json: { reply: 'hi' } }]] },
				outputCount: 1,
				iterationCount: 1,
			}),
		});

		const artifact = buildVerificationArtifact(scenario, evalResult, [wf]);

		expect(artifact.scenarioContext).toContain('Output [ai_languageModel branch 0] → AI Agent');
		expect(artifact.scenarioContext).toContain('"reply": "hi"');
	});

	it('flags truncation and reports the full count', () => {
		const wf: WorkflowResponse = {
			id: 'w1',
			name: 'big-output',
			active: false,
			versionId: 'v1',
			nodes: [
				{
					id: 'a',
					name: 'HTTP',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: { HTTP: { main: [[]] } },
		};
		const evalResult = makeEvalResult({
			HTTP: makeNodeResult({
				outputs: { main: [Array.from({ length: 10 }, (_, i) => ({ json: { i } }))] },
				outputCount: 42,
				truncated: true,
				iterationCount: 1,
			}),
		});

		const artifact = buildVerificationArtifact(scenario, evalResult, [wf]);

		expect(artifact.scenarioContext).toContain('full count across all branches: 42');
	});

	it('keeps pinned trigger nodes out of "Did not run" (they have synthetic input, no runData)', () => {
		const wf: WorkflowResponse = {
			id: 'w1',
			name: 'scheduled-pipeline',
			active: false,
			versionId: 'v1',
			nodes: [
				{
					id: 'a',
					name: 'Schedule Trigger',
					type: 'n8n-nodes-base.scheduleTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: { 'Schedule Trigger': { main: [[]] } },
		};
		const evalResult = makeEvalResult({
			'Schedule Trigger': makeNodeResult({ executionMode: 'pinned' }),
		});

		const artifact = buildVerificationArtifact(scenario, evalResult, [wf]);

		expect(artifact.scenarioContext).toContain(
			'**Pinned nodes** (synthetic input): Schedule Trigger',
		);
		expect(artifact.scenarioContext).toContain('**Did not run** (no execution data): none');
	});

	it('tags loop iterations and first-error iteration in the trace header', () => {
		const wf: WorkflowResponse = {
			id: 'w1',
			name: 'loop',
			active: false,
			versionId: 'v1',
			nodes: [
				{
					id: 'a',
					name: 'Loop',
					type: 'n8n-nodes-base.splitInBatches',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
		};
		const evalResult = makeEvalResult({
			Loop: makeNodeResult({
				outputs: { main: [[{ json: { i: 4 } }]] },
				outputCount: 1,
				iterationCount: 5,
				firstErrorIteration: 3,
			}),
		});

		const artifact = buildVerificationArtifact(scenario, evalResult, [wf]);

		expect(artifact.scenarioContext).toContain('ran 5×');
		expect(artifact.scenarioContext).toContain('first error at iter 3');
	});
});
