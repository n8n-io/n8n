import { NodeConnectionType } from 'n8n-workflow';
import type { INodeUi, IWorkflowDataCreate } from './Interface';

export const SAMPLE_SUBWORKFLOW_WORKFLOW: IWorkflowDataCreate = {
	name: 'My Sub-Workflow',
	nodes: [
		{
			id: 'c055762a-8fe7-4141-a639-df2372f30060',
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
						type: NodeConnectionType.Main,
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

export const SAMPLE_EVALUATION_WORKFLOW: IWorkflowDataCreate = {
	name: 'My Evaluation Sub-Workflow',
	nodes: [
		{
			parameters: {
				inputSource: 'passthrough',
			},
			id: 'ad3156ed-3007-4a09-8527-920505339812',
			name: 'When called by a test run',
			type: 'n8n-nodes-base.executeWorkflowTrigger',
			typeVersion: 1.1,
			position: [620, 380],
		},
		{
			parameters: {},
			id: '5ff0deaf-6ec9-4a0f-a906-70f1d8375e7c',
			name: 'Replace me',
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
			position: [860, 380],
		},
		{
			parameters: {
				assignments: {
					assignments: [
						{
							id: 'a748051d-ebdb-4fcf-aaed-02756130ce2a',
							name: 'my_metric',
							value: 1,
							type: 'number',
						},
					],
				},
				options: {},
			},
			id: '2cae7e85-7808-4cab-85c0-d233f47701a1',
			name: 'Return metric(s)',
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [1100, 380],
		},
		{
			parameters: {
				content:
					"### 1. Receive execution data\n\nThis workflow will be passed:\n- A past execution from the test\n- The execution produced by re-running it\n\n\nWe've pinned some example data to get you started",
				height: 438,
				width: 217,
				color: 7,
			},
			id: 'ecb90156-30a3-4a90-93d5-6aca702e2f6b',
			name: 'Sticky Note',
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [560, 105],
		},
		{
			parameters: {
				content: '### 2. Compare actual and expected result\n',
				height: 439,
				width: 217,
				color: 7,
			},
			id: '556464f8-b86d-41e2-9249-ca6d541c9147',
			name: 'Sticky Note1',
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [800, 104],
		},
		{
			parameters: {
				content: '### 3. Return metrics\n\nMetrics should always be numerical',
				height: 439,
				width: 217,
				color: 7,
			},
			id: '04c96a00-b360-423a-90a6-b3943c7d832f',
			name: 'Sticky Note2',
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [1040, 104],
		},
		{
			parameters: {
				content:
					'## Evaluation workflow\nThis workflow is used to check whether a single past execution being tested gives similar results when re-run',
				height: 105,
				width: 694,
			},
			id: '2250a6ec-7c4f-45e4-8dfe-c4b50c98b34b',
			name: 'Sticky Note3',
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [560, -25],
		},
	],
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
	connections: {
		'When called by a test run': {
			[NodeConnectionType.Main]: [
				[
					{
						node: 'Replace me',
						type: NodeConnectionType.Main,
						index: 0,
					},
				],
			],
		},
		'Replace me': {
			[NodeConnectionType.Main]: [
				[
					{
						node: 'Return metric(s)',
						type: NodeConnectionType.Main,
						index: 0,
					},
				],
			],
		},
	},
	settings: {
		executionOrder: 'v1',
	},
};
