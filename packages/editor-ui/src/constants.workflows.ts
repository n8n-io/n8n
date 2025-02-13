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

export const SAMPLE_ERROR_WORKFLOW: IWorkflowDataCreate = {
	name: 'Simple error workflow',
	nodes: [
		{
			parameters: {},
			type: 'n8n-nodes-base.errorTrigger',
			typeVersion: 1,
			position: [-240, -20],
			id: 'f271d47d-14cb-4049-9aee-39ea3c970ee4',
			name: 'Error Trigger',
		},
		{
			parameters: {
				subject: '=Workflow error - There was an issue with "{{ $json.workflow.name }}" ',
				message:
					'=<h3>Error details</h3>\n<p>Your workflow {{ $json.workflow.name }} hit an error whilst trying to execute.</p>\n\n<code>{{ $json.execution.error.message }}</code>\n\n<p><a href="{{ $json.execution.url }}">View failed execution details</a></p>',
				options: {},
			},
			type: 'n8n-nodes-base.gmail',
			typeVersion: 2.1,
			position: [-20, -20],
			id: 'd3012288-9d31-4944-b2e5-29c8397a3269',
			name: 'Gmail',
			webhookId: 'e715f939-6016-4a49-a456-7fa6c9b38940',
		},
		{
			parameters: {
				content:
					'## Error workflow example\nHere is a simple error workflow that is setup to use Gmail to send a notification when a workflow fails. It will include the error information and a link to the failed execution to find out more information.',
				height: 140,
				width: 400,
			},
			type: 'n8n-nodes-base.stickyNote',
			position: [-680, -100],
			typeVersion: 1,
			id: '9bc3819b-7f80-40ca-9c30-7ed6140fb01f',
			name: 'Sticky Note',
		},
		{
			parameters: {
				content:
					"\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nDon't want to use **Gmail**? Simply exchange this with the a different node that can send notifications such as slack or Microsoft Outlook.",
				height: 333,
				width: 246,
				color: 7,
			},
			id: '958f3f26-049e-4699-9432-7bd6d9e7b10f',
			name: 'Sticky Note1',
			type: 'n8n-nodes-base.stickyNote',
			typeVersion: 1,
			position: [-80, -80],
		},
		{
			parameters: {
				content:
					"### Steps to complete\n- [ ] Open the gmail node and select a credential\n- [ ] Set the 'to' field to an email to receive notifications\n- [ ] Save this error workflow\n- [ ] Select this error workflow in the settings of production workflows so it's called when they hit an error",
				height: 200,
				width: 400,
			},
			type: 'n8n-nodes-base.stickyNote',
			position: [-680, 60],
			typeVersion: 1,
			id: '994363f7-8d65-4921-8db7-f5a230732f4c',
			name: 'Sticky Note2',
		},
	],
	pinData: {},
	connections: {
		'Error Trigger': {
			main: [
				[
					{
						node: 'Gmail',
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
