import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { analyzeEvalDataRequirements } from '../eval-data-requirements.service';

const wf = (
	nodes: WorkflowJSON['nodes'],
	connections: WorkflowJSON['connections'] = {},
): WorkflowJSON => ({
	name: 't',
	nodes,
	connections,
	pinData: {},
	settings: {},
});

function workflowWithEvalTopology(): WorkflowJSON {
	return {
		id: 'w1',
		name: 'Support Classifier',
		nodes: [
			{
				id: 'main-trigger',
				name: 'Chat Trigger',
				type: '@n8n/n8n-nodes-langchain.chatTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: 'eval-trigger',
				name: 'Eval Trigger',
				type: 'n8n-nodes-base.evaluationTrigger',
				typeVersion: 4.7,
				position: [0, 240],
				parameters: {
					source: 'dataTable',
					dataTableId: { __rl: true, mode: 'id', value: 'dt-1' },
				},
			},
			{
				id: 'agent',
				name: 'Classifier Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				position: [480, 0],
				parameters: {
					text: '={{ $json.user_message }}',
				},
			},
			{
				id: 'check',
				name: 'Eval Check',
				type: 'n8n-nodes-base.evaluation',
				typeVersion: 4.8,
				position: [740, 0],
				parameters: { operation: 'checkIfEvaluating' },
			},
			{
				id: 'outputs',
				name: 'Eval Set Outputs',
				type: 'n8n-nodes-base.evaluation',
				typeVersion: 4.8,
				position: [980, -120],
				parameters: {
					operation: 'setOutputs',
					outputs: {
						values: [
							{
								outputName: 'actual_answer',
								outputValue: '={{ $json.output }}',
							},
						],
					},
				},
			},
			{
				id: 'metrics',
				name: 'Eval Set Metrics',
				type: 'n8n-nodes-base.evaluation',
				typeVersion: 4.8,
				position: [1200, -120],
				parameters: {
					operation: 'setMetrics',
					metric: 'correctness',
					expectedAnswer: "={{ $('Eval Trigger').item.json.expected_answer }}",
					actualAnswer: '={{ $json.output }}',
				},
			},
			{
				id: 'side-effect',
				name: 'Send Slack',
				type: 'n8n-nodes-base.slack',
				typeVersion: 2,
				position: [980, 120],
				parameters: {},
			},
		],
		connections: {
			'Chat Trigger': {
				main: [[{ node: 'Classifier Agent', type: 'main', index: 0 }]],
			},
			'Eval Trigger': {
				main: [[{ node: 'Classifier Agent', type: 'main', index: 0 }]],
			},
			'Classifier Agent': {
				main: [[{ node: 'Eval Check', type: 'main', index: 0 }]],
			},
			'Eval Check': {
				main: [
					[{ node: 'Eval Set Outputs', type: 'main', index: 0 }],
					[{ node: 'Send Slack', type: 'main', index: 0 }],
				],
			},
			'Eval Set Outputs': {
				main: [[{ node: 'Eval Set Metrics', type: 'main', index: 0 }]],
			},
		},
	};
}

describe('analyzeEvalDataRequirements', () => {
	it('finds the eval DataTable and data columns from eval topology', () => {
		const result = analyzeEvalDataRequirements(workflowWithEvalTopology());

		expect(result.targets).toHaveLength(1);
		expect(result.targets[0]).toMatchObject({
			dataTableId: 'dt-1',
			evaluationTriggerName: 'Eval Trigger',
			targetNodeName: 'Classifier Agent',
			inputColumns: ['user_message'],
			expectedOutputColumns: ['expected_answer'],
			actualOutputColumns: ['actual_answer'],
			expectedToActualPairs: [{ expectedColumn: 'expected_answer', actualField: 'output' }],
		});
	});

	it('returns no targets when eval nodes are absent', () => {
		const workflow = {
			name: 'No evals',
			nodes: [],
			connections: {},
		};

		const result = analyzeEvalDataRequirements(workflow);

		expect(result.targets).toEqual([]);
		expect(result.reason).toContain('EvaluationTrigger');
	});

	it('uses analyzeAgentInputColumns to derive inputColumns from agent parameters', () => {
		const workflow = wf(
			[
				{
					name: 'EvalTrig',
					type: 'n8n-nodes-base.evaluationTrigger',
					typeVersion: 1,
					parameters: { dataTableId: { value: 'dt-1' } },
					position: [0, 0],
					id: 't',
				},
				{
					name: 'Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 1,
					parameters: { text: '={{ $json.user_query }}' },
					position: [200, 0],
					id: 'a',
				},
			],
			{
				EvalTrig: { main: [[{ node: 'Agent', type: 'main', index: 0 }]] },
			},
		);

		const result = analyzeEvalDataRequirements(workflow);
		expect(result.targets[0].inputColumns).toEqual(['user_query']);
		expect(result.targets[0].targetNodeName).toBe('Agent');
	});

	it('uses reachable root AI nodes as targets even when they are not agents', () => {
		const workflow = wf(
			[
				{
					name: 'EvalTrig',
					type: 'n8n-nodes-base.evaluationTrigger',
					typeVersion: 1,
					parameters: { dataTableId: { value: 'dt-1' } },
					position: [0, 0],
					id: 't',
				},
				{
					name: 'LLM Chain',
					type: '@n8n/n8n-nodes-langchain.chainLlm',
					typeVersion: 1,
					parameters: { prompt: '={{ $json.user_query }}' },
					position: [200, 0],
					id: 'c',
				},
			],
			{
				EvalTrig: { main: [[{ node: 'LLM Chain', type: 'main', index: 0 }]] },
			},
		);

		const result = analyzeEvalDataRequirements(workflow);
		expect(result.targets[0].targetNodeName).toBe('LLM Chain');
		expect(result.targets[0].inputColumns).toEqual(['user_query']);
	});

	it('extracts expectedToActualPairs from setMetrics nodes', () => {
		const workflow = wf(
			[
				{
					name: 'EvalTrig',
					type: 'n8n-nodes-base.evaluationTrigger',
					typeVersion: 1,
					parameters: { dataTableId: { value: 'dt-1' } },
					position: [0, 0],
					id: 't',
				},
				{
					name: 'Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 1,
					parameters: { text: '={{ $json.user_query }}' },
					position: [200, 0],
					id: 'a',
				},
				{
					name: 'Metric',
					type: 'n8n-nodes-base.evaluation',
					typeVersion: 1,
					parameters: {
						operation: 'setMetrics',
						expectedAnswer: "={{ $('EvalTrig').item.json.expected_response }}",
						actualAnswer: '={{ $json.output }}',
					},
					position: [400, 0],
					id: 'm',
				},
			],
			{
				EvalTrig: { main: [[{ node: 'Agent', type: 'main', index: 0 }]] },
				Agent: { main: [[{ node: 'Metric', type: 'main', index: 0 }]] },
			},
		);

		const result = analyzeEvalDataRequirements(workflow);
		expect(result.targets[0].expectedToActualPairs).toEqual([
			{ expectedColumn: 'expected_response', actualField: 'output' },
		]);
	});

	it('extracts expected output columns from $json references in expectedAnswer', () => {
		const workflow = wf(
			[
				{
					name: 'EvalTrig',
					type: 'n8n-nodes-base.evaluationTrigger',
					typeVersion: 1,
					parameters: { dataTableId: { value: 'dt-1' } },
					position: [0, 0],
					id: 't',
				},
				{
					name: 'Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 1,
					parameters: { text: '={{ $json.user_query }}' },
					position: [200, 0],
					id: 'a',
				},
				{
					name: 'Metric',
					type: 'n8n-nodes-base.evaluation',
					typeVersion: 1,
					parameters: {
						operation: 'setMetrics',
						expectedAnswer: '={{ $json.expected_response }}',
						actualAnswer: '={{ $json.output }}',
					},
					position: [400, 0],
					id: 'm',
				},
			],
			{
				EvalTrig: { main: [[{ node: 'Agent', type: 'main', index: 0 }]] },
				Agent: { main: [[{ node: 'Metric', type: 'main', index: 0 }]] },
			},
		);

		const result = analyzeEvalDataRequirements(workflow);
		expect(result.targets[0].expectedOutputColumns).toEqual(['expected_response']);
		expect(result.targets[0].expectedToActualPairs).toEqual([
			{ expectedColumn: 'expected_response', actualField: 'output' },
		]);
	});

	it('does not treat actualAnswer named refs as expected output columns', () => {
		const workflow = wf(
			[
				{
					name: 'EvalTrig',
					type: 'n8n-nodes-base.evaluationTrigger',
					typeVersion: 1,
					parameters: { dataTableId: { value: 'dt-1' } },
					position: [0, 0],
					id: 't',
				},
				{
					name: 'Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 1,
					parameters: { text: '={{ $json.user_query }}' },
					position: [200, 0],
					id: 'a',
				},
				{
					name: 'Metric',
					type: 'n8n-nodes-base.evaluation',
					typeVersion: 1,
					parameters: {
						operation: 'setMetrics',
						expectedAnswer: "={{ $('EvalTrig').item.json.expected_response }}",
						actualAnswer: "={{ $('Agent').item.json.output }}",
					},
					position: [400, 0],
					id: 'm',
				},
			],
			{
				EvalTrig: { main: [[{ node: 'Agent', type: 'main', index: 0 }]] },
				Agent: { main: [[{ node: 'Metric', type: 'main', index: 0 }]] },
			},
		);

		const result = analyzeEvalDataRequirements(workflow);
		expect(result.targets[0].expectedOutputColumns).toEqual(['expected_response']);
	});

	it('returns empty inputColumns when no root AI node is reachable from the trigger', () => {
		const workflow = wf(
			[
				{
					name: 'EvalTrig',
					type: 'n8n-nodes-base.evaluationTrigger',
					typeVersion: 1,
					parameters: { dataTableId: { value: 'dt-2' } },
					position: [0, 0],
					id: 't',
				},
				{
					name: 'SomeNode',
					type: 'n8n-nodes-base.set',
					typeVersion: 1,
					parameters: { value: '={{ $json.col }}' },
					position: [200, 0],
					id: 's',
				},
			],
			{
				EvalTrig: { main: [[{ node: 'SomeNode', type: 'main', index: 0 }]] },
			},
		);

		const result = analyzeEvalDataRequirements(workflow);
		expect(result.targets).toHaveLength(1);
		expect(result.targets[0].inputColumns).toEqual([]);
		expect(result.targets[0].targetNodeName).toBeUndefined();
	});

	it('returns no targets when workflow nodes are absent', () => {
		const workflow = {
			name: 'Malformed workflow',
			connections: {},
		} as WorkflowJSON;

		const result = analyzeEvalDataRequirements(workflow);

		expect(result.targets).toEqual([]);
		expect(result.reason).toContain('EvaluationTrigger');
	});
});
