import type { WorkflowResponse } from '../../clients/n8n-client';
import type { TopologySidecar } from '../types';
import { verifyEvalSetupTopology } from '../topology-verifier';

const originalWorkflow: WorkflowResponse = {
	id: 'workflow-1',
	name: 'Original workflow',
	active: false,
	nodes: [
		{
			name: 'Chat Trigger',
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			parameters: {},
		},
		{
			name: 'OpenAI Model',
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			parameters: {},
		},
		{
			name: 'AI Agent',
			type: '@n8n/n8n-nodes-langchain.agent',
			parameters: {
				text: '={{ $json.chatInput }}',
			},
		},
		{
			name: 'Send Slack',
			type: 'n8n-nodes-base.slack',
			parameters: {},
		},
	],
	connections: {
		'Chat Trigger': {
			main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
		},
		'OpenAI Model': {
			ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
		},
		'AI Agent': {
			main: [[{ node: 'Send Slack', type: 'main', index: 0 }]],
		},
	},
};

const sidecar: TopologySidecar = {
	targets: [
		{
			nodeName: 'AI Agent',
			mode: 'required',
			inputColumns: ['input'],
			expectedShape: { chatInput: 'input' },
			expectedOutputColumns: ['expected_output'],
			actualOutputColumns: ['actual_output'],
			sideEffectNodes: ['Send Slack'],
		},
	],
	excludeTargets: [],
	metrics: ['correctness'],
	allowNativeTestRunnerSmoke: false,
};

const sidecarWithoutTargets: TopologySidecar = {
	targets: [],
	excludeTargets: [],
	metrics: ['correctness'],
	allowNativeTestRunnerSmoke: false,
};

function makeUpdatedWorkflow(): WorkflowResponse {
	return {
		id: 'workflow-1',
		name: 'Updated workflow',
		active: false,
		nodes: [
			...originalWorkflow.nodes,
			{
				name: 'Eval Trigger',
				type: 'n8n-nodes-base.evaluationTrigger',
				parameters: {
					source: 'dataTable',
					dataTableId: { __rl: true, mode: 'id', value: 'dt-1' },
					limitRows: false,
				},
			},
			{
				name: 'Eval Shape Bridge - AI Agent',
				type: 'n8n-nodes-base.set',
				parameters: {
					assignments: {
						assignments: [{ name: 'chatInput', value: '={{ $json.input }}', type: 'string' }],
					},
				},
			},
			{
				name: 'Check If Evaluating - AI Agent',
				type: 'n8n-nodes-base.evaluation',
				parameters: {
					operation: 'checkIfEvaluating',
				},
			},
			{
				name: 'Set Outputs - AI Agent',
				type: 'n8n-nodes-base.evaluation',
				parameters: {
					operation: 'setOutputs',
					source: 'dataTable',
					dataTableId: { mode: 'id', value: 'dt-1' },
					outputs: {
						values: [{ outputName: 'actual_output', outputValue: '={{ $json.output }}' }],
					},
				},
			},
			{
				name: 'Set Metrics - AI Agent',
				type: 'n8n-nodes-base.evaluation',
				parameters: {
					operation: 'setMetrics',
					metric: 'correctness',
					expectedAnswer: "={{ $('Eval Trigger').item.json.expected_output }}",
					actualAnswer: '={{ $json.output }}',
				},
			},
		],
		connections: {
			'Chat Trigger': {
				main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
			},
			'Eval Trigger': {
				main: [[{ node: 'Eval Shape Bridge - AI Agent', type: 'main', index: 0 }]],
			},
			'Eval Shape Bridge - AI Agent': {
				main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
			},
			'OpenAI Model': {
				ai_languageModel: [
					[
						{ node: 'AI Agent', type: 'ai_languageModel', index: 0 },
						{
							node: 'Set Metrics - AI Agent',
							type: 'ai_languageModel',
							index: 0,
						},
					],
				],
			},
			'AI Agent': {
				main: [[{ node: 'Check If Evaluating - AI Agent', type: 'main', index: 0 }]],
			},
			'Check If Evaluating - AI Agent': {
				main: [
					[{ node: 'Set Outputs - AI Agent', type: 'main', index: 0 }],
					[{ node: 'Send Slack', type: 'main', index: 0 }],
				],
			},
			'Set Outputs - AI Agent': {
				main: [[{ node: 'Set Metrics - AI Agent', type: 'main', index: 0 }]],
			},
		},
	};
}

function verify(updatedWorkflow = makeUpdatedWorkflow(), topologySidecar = sidecar) {
	return verifyEvalSetupTopology({
		originalWorkflow,
		updatedWorkflow,
		datasetColumns: ['input', 'expected_output'],
		sidecar: topologySidecar,
		expectedDataTableId: 'dt-1',
	});
}

describe('verifyEvalSetupTopology', () => {
	it('passes a valid topology', () => {
		const result = verify();

		expect(result.passed).toBe(true);
		expect(result.findings).toEqual([]);
		expect(result.targetNodeNames).toEqual(['AI Agent']);
	});

	it('detects no-sidecar targets from the original workflow when the updated target is missing', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		updatedWorkflow.nodes = updatedWorkflow.nodes.filter((node) => node.name !== 'AI Agent');

		const result = verify(updatedWorkflow, sidecarWithoutTargets);

		expect(result.targetNodeNames).toEqual(['AI Agent']);
		expect(result.passed).toBe(false);
		expect(result.findings).toEqual(
			expect.arrayContaining([expect.objectContaining({ code: 'target_missing' })]),
		);
	});

	it('fails no-sidecar topology when setOutputs writes only a wrong column', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		const setOutputs = updatedWorkflow.nodes.find((node) => node.name === 'Set Outputs - AI Agent');
		setOutputs!.parameters = {
			operation: 'setOutputs',
			source: 'dataTable',
			dataTableId: { mode: 'id', value: 'dt-1' },
			outputs: {
				values: [{ outputName: 'wrong_output', outputValue: '={{ $json.output }}' }],
			},
		};

		const result = verify(updatedWorkflow, sidecarWithoutTargets);

		expect(result.passed).toBe(false);
		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'set_outputs_actual_column_missing' }),
			]),
		);
	});

	it('fails no-sidecar topology when setMetrics uses the input column as expected answer', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		const setMetrics = updatedWorkflow.nodes.find((node) => node.name === 'Set Metrics - AI Agent');
		setMetrics!.parameters = {
			operation: 'setMetrics',
			metric: 'correctness',
			expectedAnswer: "={{ $('Eval Trigger').item.json.input }}",
			actualAnswer: '={{ $json.output }}',
		};

		const result = verify(updatedWorkflow, sidecarWithoutTargets);

		expect(result.passed).toBe(false);
		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'set_metrics_expected_column_missing' }),
			]),
		);
	});

	it('fails no-sidecar topology when shape bridge never references an input column', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		const bridge = updatedWorkflow.nodes.find(
			(node) => node.name === 'Eval Shape Bridge - AI Agent',
		);
		bridge!.parameters = {
			assignments: {
				assignments: [{ name: 'chatInput', value: '={{ $json.wrong }}', type: 'string' }],
			},
		};

		const result = verify(updatedWorkflow, sidecarWithoutTargets);

		expect(result.passed).toBe(false);
		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'shape_bridge_input_column_missing' }),
			]),
		);
	});

	it('fails when shape bridge is missing', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		updatedWorkflow.connections['Eval Trigger'] = {
			main: [[{ node: 'AI Agent', type: 'main', index: 0 }]],
		};
		delete updatedWorkflow.connections['Eval Shape Bridge - AI Agent'];

		const result = verify(updatedWorkflow);

		expect(result.findings).toEqual(
			expect.arrayContaining([expect.objectContaining({ code: 'shape_bridge_missing' })]),
		);
	});

	it('fails when Eval Trigger directly connects to target while shape bridge exists', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		updatedWorkflow.connections['Eval Trigger'] = {
			main: [
				[
					{ node: 'Eval Shape Bridge - AI Agent', type: 'main', index: 0 },
					{ node: 'AI Agent', type: 'main', index: 0 },
				],
			],
		};

		const result = verify(updatedWorkflow);

		expect(result.passed).toBe(false);
		expect(result.findings).toEqual(
			expect.arrayContaining([expect.objectContaining({ code: 'shape_bridge_bypassed' })]),
		);
	});

	it('fails when shape bridge does not map expected dataset column', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		const bridge = updatedWorkflow.nodes.find(
			(node) => node.name === 'Eval Shape Bridge - AI Agent',
		);
		bridge!.parameters = {
			assignments: {
				assignments: [{ name: 'chatInput', value: '={{ $json.other }}', type: 'string' }],
			},
		};

		const result = verify(updatedWorkflow);

		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'shape_bridge_expected_column_missing' }),
			]),
		);
	});

	it('fails when shape bridge maps expected column from another node item', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		const bridge = updatedWorkflow.nodes.find(
			(node) => node.name === 'Eval Shape Bridge - AI Agent',
		);
		bridge!.parameters = {
			assignments: {
				assignments: [
					{
						name: 'chatInput',
						value: "={{ $('Some Other Node').item.json.input }}",
						type: 'string',
					},
				],
			},
		};

		const result = verify(updatedWorkflow);

		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'shape_bridge_expected_column_missing' }),
			]),
		);
	});

	it('fails when shape bridge mixes another node item JSON with current row JSON', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		const bridge = updatedWorkflow.nodes.find(
			(node) => node.name === 'Eval Shape Bridge - AI Agent',
		);
		bridge!.parameters = {
			assignments: {
				assignments: [
					{
						name: 'chatInput',
						value: "={{ $('Some Other Node').item.json.input + $json.input }}",
						type: 'string',
					},
				],
			},
		};

		const result = verify(updatedWorkflow);

		expect(result.passed).toBe(false);
		expect(result.findings).toEqual(
			expect.arrayContaining([expect.objectContaining({ code: 'shape_bridge_uses_node_json' })]),
		);
	});

	it('fails when extra shape bridge assignment uses node item JSON', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		const bridge = updatedWorkflow.nodes.find(
			(node) => node.name === 'Eval Shape Bridge - AI Agent',
		);
		bridge!.parameters = {
			assignments: {
				assignments: [
					{ name: 'chatInput', value: '={{ $json.input }}', type: 'string' },
					{ name: 'other', value: "={{ $('Some Other Node').item.json }}", type: 'string' },
				],
			},
		};

		const result = verify(updatedWorkflow);

		expect(result.passed).toBe(false);
		expect(result.findings).toEqual(
			expect.arrayContaining([expect.objectContaining({ code: 'shape_bridge_uses_node_json' })]),
		);
	});

	it('fails when shape bridge uses bare node item JSON', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		const bridge = updatedWorkflow.nodes.find(
			(node) => node.name === 'Eval Shape Bridge - AI Agent',
		);
		bridge!.parameters = {
			assignments: {
				assignments: [
					{
						name: 'chatInput',
						value: "={{ $json.input + $('Some Other Node').item.json }}",
						type: 'string',
					},
				],
			},
		};

		const result = verify(updatedWorkflow);

		expect(result.passed).toBe(false);
		expect(result.findings).toEqual(
			expect.arrayContaining([expect.objectContaining({ code: 'shape_bridge_uses_node_json' })]),
		);
	});

	it('fails when shape bridge uses bare node item JSON before logical OR', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		const bridge = updatedWorkflow.nodes.find(
			(node) => node.name === 'Eval Shape Bridge - AI Agent',
		);
		bridge!.parameters = {
			assignments: {
				assignments: [
					{
						name: 'chatInput',
						value: '={{ $("Some Other Node").item.json||$json.input }}',
						type: 'string',
					},
				],
			},
		};

		const result = verify(updatedWorkflow);

		expect(result.passed).toBe(false);
		expect(result.findings).toEqual(
			expect.arrayContaining([expect.objectContaining({ code: 'shape_bridge_uses_node_json' })]),
		);
	});

	it('fails when eval slot can reach a side-effect node', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		updatedWorkflow.connections['Set Metrics - AI Agent'] = {
			main: [[{ node: 'Send Slack', type: 'main', index: 0 }]],
		};

		const result = verify(updatedWorkflow);

		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'eval_branch_reaches_side_effect' }),
			]),
		);
	});

	it('fails when eval slot can reach an original downstream descendant', () => {
		const originalWorkflowWithFormat: WorkflowResponse = {
			...originalWorkflow,
			nodes: [
				...originalWorkflow.nodes,
				{
					name: 'Format',
					type: 'n8n-nodes-base.set',
					parameters: {},
				},
			],
			connections: {
				...originalWorkflow.connections,
				'AI Agent': {
					main: [[{ node: 'Format', type: 'main', index: 0 }]],
				},
				Format: {
					main: [[{ node: 'Send Slack', type: 'main', index: 0 }]],
				},
			},
		};
		const updatedWorkflow = makeUpdatedWorkflow();
		updatedWorkflow.nodes.push({
			name: 'Format',
			type: 'n8n-nodes-base.set',
			parameters: {},
		});
		updatedWorkflow.connections['Check If Evaluating - AI Agent'] = {
			main: [
				[{ node: 'Set Outputs - AI Agent', type: 'main', index: 0 }],
				[{ node: 'Format', type: 'main', index: 0 }],
			],
		};
		updatedWorkflow.connections.Format = {
			main: [[{ node: 'Send Slack', type: 'main', index: 0 }]],
		};
		updatedWorkflow.connections['Set Metrics - AI Agent'] = {
			main: [[{ node: 'Send Slack', type: 'main', index: 0 }]],
		};
		const sidecarWithoutSideEffects: TopologySidecar = {
			...sidecar,
			targets: [{ ...sidecar.targets[0], sideEffectNodes: [] }],
		};

		const result = verifyEvalSetupTopology({
			originalWorkflow: originalWorkflowWithFormat,
			updatedWorkflow,
			datasetColumns: ['input', 'expected_output'],
			sidecar: sidecarWithoutSideEffects,
			expectedDataTableId: 'dt-1',
		});

		expect(result.passed).toBe(false);
		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'eval_branch_reaches_side_effect' }),
			]),
		);
	});

	it('fails when a direct target downstream bypasses checkIfEvaluating', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		updatedWorkflow.connections['AI Agent'] = {
			main: [
				[
					{ node: 'Check If Evaluating - AI Agent', type: 'main', index: 0 },
					{ node: 'Send Slack', type: 'main', index: 0 },
				],
			],
		};

		const result = verify(updatedWorkflow);

		expect(result.passed).toBe(false);
		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'eval_branch_reaches_side_effect' }),
			]),
		);
	});

	it('fails when setOutputs overwrites a ground-truth column', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		const setOutputs = updatedWorkflow.nodes.find((node) => node.name === 'Set Outputs - AI Agent');
		setOutputs!.parameters = {
			operation: 'setOutputs',
			source: 'dataTable',
			dataTableId: { mode: 'id', value: 'dt-1' },
			outputs: {
				values: [{ outputName: 'expected_output', outputValue: '={{ $json.output }}' }],
			},
		};

		const result = verify(updatedWorkflow);

		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'set_outputs_overwrites_expected' }),
			]),
		);
	});

	it('fails when an LLM-judge metric has no ai_languageModel connection', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		updatedWorkflow.connections['OpenAI Model'] = {
			ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]],
		};

		const result = verify(updatedWorkflow);

		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'set_metrics_missing_language_model' }),
			]),
		);
	});

	it('fails when setMetrics has no metric', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		const setMetrics = updatedWorkflow.nodes.find((node) => node.name === 'Set Metrics - AI Agent');
		setMetrics!.parameters = {
			operation: 'setMetrics',
			expectedAnswer: "={{ $('Eval Trigger').item.json.expected_output }}",
			actualAnswer: '={{ $json.output }}',
		};

		const result = verify(updatedWorkflow);

		expect(result.passed).toBe(false);
		expect(result.findings).toEqual(
			expect.arrayContaining([expect.objectContaining({ code: 'set_metrics_missing_metric' })]),
		);
	});

	it('fails when a requested metric is missing from reachable setMetrics nodes', () => {
		const result = verify(makeUpdatedWorkflow(), {
			...sidecar,
			metrics: ['correctness', 'stringSimilarity'],
		});

		expect(result.passed).toBe(false);
		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'set_metrics_requested_metric_missing' }),
			]),
		);
	});

	it('fails when setMetrics expectedAnswer references the wrong Eval Trigger column', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		const setMetrics = updatedWorkflow.nodes.find((node) => node.name === 'Set Metrics - AI Agent');
		setMetrics!.parameters = {
			operation: 'setMetrics',
			metric: 'correctness',
			expectedAnswer: "={{ $('Eval Trigger').item.json.input }}",
			actualAnswer: '={{ $json.output }}',
		};

		const result = verify(updatedWorkflow);

		expect(result.passed).toBe(false);
		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'set_metrics_expected_column_missing' }),
			]),
		);
	});

	it('fails when setMetrics expectedAnswer references expected column outside Eval Trigger path', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		const setMetrics = updatedWorkflow.nodes.find((node) => node.name === 'Set Metrics - AI Agent');
		setMetrics!.parameters = {
			operation: 'setMetrics',
			metric: 'correctness',
			expectedAnswer: "={{ $('Eval Trigger').item.json.input + $json.expected_output }}",
			actualAnswer: '={{ $json.output }}',
		};

		const result = verify(updatedWorkflow);

		expect(result.passed).toBe(false);
		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'set_metrics_expected_column_missing' }),
			]),
		);
	});

	it('fails when setMetrics expectedAnswer uses current item JSON', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		const setMetrics = updatedWorkflow.nodes.find((node) => node.name === 'Set Metrics - AI Agent');
		setMetrics!.parameters = {
			operation: 'setMetrics',
			metric: 'correctness',
			expectedAnswer: "={{ $('Eval Trigger').item.json.expected_output + $json.expected_output }}",
			actualAnswer: '={{ $json.output }}',
		};

		const result = verify(updatedWorkflow);

		expect(result.passed).toBe(false);
		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'set_metrics_expected_uses_current_json' }),
			]),
		);
	});

	it('fails when setMetrics expectedAnswer references another node item JSON', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		const setMetrics = updatedWorkflow.nodes.find((node) => node.name === 'Set Metrics - AI Agent');
		setMetrics!.parameters = {
			operation: 'setMetrics',
			metric: 'correctness',
			expectedAnswer:
				"={{ $('Eval Trigger').item.json.expected_output + $('Some Other Node').item.json.expected_output }}",
			actualAnswer: '={{ $json.output }}',
		};

		const result = verify(updatedWorkflow);

		expect(result.passed).toBe(false);
		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'set_metrics_expected_uses_other_node_json' }),
			]),
		);
	});

	it('fails when setMetrics expectedAnswer references another bare node item JSON', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		const setMetrics = updatedWorkflow.nodes.find((node) => node.name === 'Set Metrics - AI Agent');
		setMetrics!.parameters = {
			operation: 'setMetrics',
			metric: 'correctness',
			expectedAnswer:
				"={{ $('Eval Trigger').item.json.expected_output + $('Some Other Node').item.json }}",
			actualAnswer: '={{ $json.output }}',
		};

		const result = verify(updatedWorkflow);

		expect(result.passed).toBe(false);
		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'set_metrics_expected_uses_other_node_json' }),
			]),
		);
	});

	it('fails when setMetrics expectedAnswer references bare other node item JSON before equality', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		const setMetrics = updatedWorkflow.nodes.find((node) => node.name === 'Set Metrics - AI Agent');
		setMetrics!.parameters = {
			operation: 'setMetrics',
			metric: 'correctness',
			expectedAnswer:
				'={{ $(\'Eval Trigger\').item.json.expected_output + $("Some Other Node").item.json===true }}',
			actualAnswer: '={{ $json.output }}',
		};

		const result = verify(updatedWorkflow);

		expect(result.passed).toBe(false);
		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'set_metrics_expected_uses_other_node_json' }),
			]),
		);
	});

	it('fails when setMetrics expectedAnswer uses bare current item JSON', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		const setMetrics = updatedWorkflow.nodes.find((node) => node.name === 'Set Metrics - AI Agent');
		setMetrics!.parameters = {
			operation: 'setMetrics',
			metric: 'correctness',
			expectedAnswer: '={{ $("Eval Trigger").item.json.expected_output + $json }}',
			actualAnswer: '={{ $json.output }}',
		};

		const result = verify(updatedWorkflow);

		expect(result.passed).toBe(false);
		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'set_metrics_expected_uses_current_json' }),
			]),
		);
	});

	it('fails when setMetrics expectedAnswer mixes expected column with bare Eval Trigger item JSON', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		const setMetrics = updatedWorkflow.nodes.find((node) => node.name === 'Set Metrics - AI Agent');
		setMetrics!.parameters = {
			operation: 'setMetrics',
			metric: 'correctness',
			expectedAnswer:
				"={{ $('Eval Trigger').item.json.expected_output + $('Eval Trigger').item.json }}",
			actualAnswer: '={{ $json.output }}',
		};

		const result = verify(updatedWorkflow);

		expect(result.passed).toBe(false);
		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'set_metrics_expected_extra_trigger_json' }),
			]),
		);
	});

	it('fails when setMetrics expectedAnswer mixes expected column with another Eval Trigger field', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		const setMetrics = updatedWorkflow.nodes.find((node) => node.name === 'Set Metrics - AI Agent');
		setMetrics!.parameters = {
			operation: 'setMetrics',
			metric: 'correctness',
			expectedAnswer:
				"={{ $('Eval Trigger').item.json.expected_output + $('Eval Trigger').item.json.input }}",
			actualAnswer: '={{ $json.output }}',
		};

		const result = verify(updatedWorkflow);

		expect(result.passed).toBe(false);
		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'set_metrics_expected_extra_trigger_json' }),
			]),
		);
	});

	it('fails when setMetrics actualAnswer references Eval Trigger item JSON', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		const setMetrics = updatedWorkflow.nodes.find((node) => node.name === 'Set Metrics - AI Agent');
		setMetrics!.parameters = {
			operation: 'setMetrics',
			metric: 'correctness',
			expectedAnswer: "={{ $('Eval Trigger').item.json.expected_output }}",
			actualAnswer: "={{ $('Eval Trigger').item.json.expected_output }}",
		};

		const result = verify(updatedWorkflow);

		expect(result.passed).toBe(false);
		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'set_metrics_actual_not_from_json' }),
			]),
		);
	});

	it('fails when setMetrics actualAnswer mixes another node item JSON with current item JSON', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		const setMetrics = updatedWorkflow.nodes.find((node) => node.name === 'Set Metrics - AI Agent');
		setMetrics!.parameters = {
			operation: 'setMetrics',
			metric: 'correctness',
			expectedAnswer: "={{ $('Eval Trigger').item.json.expected_output }}",
			actualAnswer: "={{ $('Some Other Node').item.json.output + $json.output }}",
		};

		const result = verify(updatedWorkflow);

		expect(result.passed).toBe(false);
		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'set_metrics_actual_uses_node_json' }),
			]),
		);
	});

	it('fails when setMetrics actualAnswer uses bare node item JSON', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		const setMetrics = updatedWorkflow.nodes.find((node) => node.name === 'Set Metrics - AI Agent');
		setMetrics!.parameters = {
			operation: 'setMetrics',
			metric: 'correctness',
			expectedAnswer: "={{ $('Eval Trigger').item.json.expected_output }}",
			actualAnswer: "={{ $json.output + $('Eval Trigger').item.json }}",
		};

		const result = verify(updatedWorkflow);

		expect(result.passed).toBe(false);
		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'set_metrics_actual_uses_node_json' }),
			]),
		);
	});

	it('fails when setMetrics actualAnswer uses bare node item JSON before logical AND', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		const setMetrics = updatedWorkflow.nodes.find((node) => node.name === 'Set Metrics - AI Agent');
		setMetrics!.parameters = {
			operation: 'setMetrics',
			metric: 'correctness',
			expectedAnswer: "={{ $('Eval Trigger').item.json.expected_output }}",
			actualAnswer: '={{ $("Some Other Node").item.json&&$json.output }}',
		};

		const result = verify(updatedWorkflow);

		expect(result.passed).toBe(false);
		expect(result.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: 'set_metrics_actual_uses_node_json' }),
			]),
		);
	});

	it('passes when expressions use bracket notation for dataset columns', () => {
		const updatedWorkflow = makeUpdatedWorkflow();
		const bridge = updatedWorkflow.nodes.find(
			(node) => node.name === 'Eval Shape Bridge - AI Agent',
		);
		const setMetrics = updatedWorkflow.nodes.find((node) => node.name === 'Set Metrics - AI Agent');
		bridge!.parameters = {
			assignments: {
				assignments: [{ name: 'chatInput', value: '={{ $json["input"] }}', type: 'string' }],
			},
		};
		setMetrics!.parameters = {
			operation: 'setMetrics',
			metric: 'correctness',
			expectedAnswer: '={{ $(\'Eval Trigger\').item.json["expected_output"] }}',
			actualAnswer: '={{ $json["output"] }}',
		};

		const result = verify(updatedWorkflow);

		expect(result.passed).toBe(true);
		expect(result.findings).toEqual([]);
	});
});
