import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { analyzeEvalDataRequirements } from '../eval-data-requirements.service';

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
				id: 'bridge',
				name: 'Eval Shape Bridge',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [220, 240],
				parameters: {
					assignments: {
						assignments: [
							{
								id: 'assignment-1',
								name: 'chatInput',
								value: '={{ $json.user_message }}',
								type: 'string',
							},
						],
					},
				},
			},
			{
				id: 'agent',
				name: 'Classifier Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				position: [480, 0],
				parameters: {},
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
				main: [[{ node: 'Eval Shape Bridge', type: 'main', index: 0 }]],
			},
			'Eval Shape Bridge': {
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
	} as unknown as WorkflowJSON;
}

describe('analyzeEvalDataRequirements', () => {
	it('finds the eval DataTable and data columns from eval topology', () => {
		const result = analyzeEvalDataRequirements(workflowWithEvalTopology());

		expect(result.targets).toHaveLength(1);
		expect(result.targets[0]).toMatchObject({
			dataTableId: 'dt-1',
			evaluationTriggerName: 'Eval Trigger',
			targetAgentNodeName: 'Classifier Agent',
			inputColumns: ['user_message'],
			expectedOutputColumns: ['expected_answer'],
			actualOutputColumns: ['actual_answer'],
		});
	});

	it('returns no targets when eval nodes are absent', () => {
		const workflow = {
			name: 'No evals',
			nodes: [],
			connections: {},
		} as unknown as WorkflowJSON;

		const result = analyzeEvalDataRequirements(workflow);

		expect(result.targets).toEqual([]);
		expect(result.reason).toContain('EvaluationTrigger');
	});
});
