import { NodeConnectionTypes } from 'n8n-workflow';
import type { INodeUi } from './Interface';
import type { WorkflowDataCreate } from '@n8n/rest-api-client/api/workflows';

export const SAMPLE_SUBWORKFLOW_TRIGGER_ID = 'c055762a-8fe7-4141-a639-df2372f30060';
export const SAMPLE_SUBWORKFLOW_WORKFLOW: WorkflowDataCreate = {
	name: 'My Sub-Workflow',
	nodes: [
		{
			id: SAMPLE_SUBWORKFLOW_TRIGGER_ID,
			typeVersion: 1.1,
			name: 'When Executed by Another Workflow',
			type: 'n8n-nodes-base.executeWorkflowTrigger',
			position: [260, 340],
			parameters: {},
		},
		{
			id: 'b5942df6-0160-4ef7-965d-57583acdc8aa',
			name: 'Replace me with your logic',
			type: 'n8n-nodes-base.noOp',
			position: [520, 340],
			parameters: {},
		},
	] as INodeUi[],
	connections: {
		'When Executed by Another Workflow': {
			main: [
				[
					{
						node: 'Replace me with your logic',
						type: NodeConnectionTypes.Main,
						index: 0,
					},
				],
			],
		},
	},
	settings: {
		executionOrder: 'v1',
	},
	pinData: {},
};

export const SAMPLE_EVALUATION_WORKFLOW: WorkflowDataCreate = {
	name: 'My Evaluation Sub-Workflow',
	nodes: [
		{
			parameters: {
				inputSource: 'passthrough',
			},
			id: 'c20c82d6-5f71-4fb6-a398-a10a6e6944c5',
			name: 'When called by a test run',
			type: 'n8n-nodes-base.executeWorkflowTrigger',
			typeVersion: 1.1,
			position: [80, 440],
		},
		{
			parameters: {},
			id: '4e14d09a-2699-4659-9a20-e4f4965f473e',
			name: 'Replace me',
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
			position: [340, 440],
		},
		{
			parameters: {
				metrics: {
					assignments: [
						{
							name: 'latency',
							value:
								'={{(() => {\n  const newExecutionRuns = Object.values($json.newExecution)\n    .reduce((acc, node) => {\n      acc.push(node.runs.filter(run => run.output.main !== undefined))\n      return acc\n    }, []).flat()\n\n  const latency = newExecutionRuns.reduce((acc, run) => acc + run.executionTime, 0)\n\n  return latency\n})()}}',
							type: 'number',
							id: '1ebc15e9-f079-4d1f-a08d-d4880ea0ddb5',
						},
					],
				},
			},
			type: 'n8n-nodes-base.evaluationMetrics',
			id: '33e2e94a-ec48-4e7b-b750-f56718d5105c',
			name: 'Return metric(s)',
			typeVersion: 1,
			position: [600, 440],
		},
		{
			parameters: {
				content:
					"### 1. Receive execution data\n\nThis workflow will be passed:\n- The benchmark execution (`$json.originalExecution`)\n- The evaluation execution (`$json.newExecution`) produced by re-running the workflow using trigger data from benchmark execution\n\n\nWe've pinned some example data to get you started",
				height: 458,
				width: 257,
				color: 7,
			},
			id: '55e5e311-e285-4000-bd1e-900bc3a07da3',
			name: 'Sticky Note',
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [0, 140],
		},
		{
			parameters: {
				content:
					'### 2. Evaluation logic\n\nReplace with logic to perform the tests you want to perform.\n\nE.g. compare against benchmark data, use LLMs to evaluate sentiment, compare token usage, and more.',
				height: 459,
				width: 237,
				color: 7,
			},
			id: 'ea74e341-ff9c-456a-83f0-c10758f0844a',
			name: 'Sticky Note1',
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [280, 140],
		},
		{
			parameters: {
				content:
					'### 3. Return metrics\n\nDefine evaluation metrics you want to show on your report.\n\n__Note:__ Metrics need to be numeric',
				height: 459,
				width: 217,
				color: 7,
			},
			id: '9b3c3408-19e1-43d5-b2bb-29d61bd129b8',
			name: 'Sticky Note2',
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [540, 140],
		},
		{
			parameters: {
				content:
					'## Evaluation workflow\nThis workflow is used to define evaluation logic and calculate metrics. You can compare against benchmark executions, use LLMs to evaluate, or write any other logic you choose.',
				height: 105,
				width: 754,
			},
			id: '0fc1356e-6238-4557-a920-e50806c1ec13',
			name: 'Sticky Note3',
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [0, 0],
		},
	],
	connections: {
		'When called by a test run': {
			main: [
				[
					{
						node: 'Replace me',
						type: NodeConnectionTypes.Main,
						index: 0,
					},
				],
			],
		},
		'Replace me': {
			main: [
				[
					{
						node: 'Return metric(s)',
						type: NodeConnectionTypes.Main,
						index: 0,
					},
				],
			],
		},
	},
	pinData: {
		'When called by a test run': [
			{
				json: {
					newExecution: {},
					originalExecution: {},
				},
			},
		],
	},
	settings: {
		executionOrder: 'v1',
	},
};
