import type { IWorkflowBase } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

/**
 * Workflow producing an execution whose data will be truncated by an instance crash.
 */
export const OOM_WORKFLOW: Partial<IWorkflowBase> = {
	nodes: [
		{
			parameters: {},
			id: '48ce17fe-9651-42ae-910c-48602a00f0bb',
			name: 'When clicking "Test workflow"',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [640, 260],
		},
		{
			parameters: {
				category: 'oom',
				memorySizeValue: 1000,
			},
			id: '07a48151-96d3-45eb-961c-1daf85fbe052',
			name: 'DebugHelper',
			type: 'n8n-nodes-base.debugHelper',
			typeVersion: 1,
			position: [840, 260],
		},
	],
	connections: {
		'When clicking "Test workflow"': {
			main: [
				[
					{
						node: 'DebugHelper',
						type: NodeConnectionType.Main,
						index: 0,
					},
				],
			],
		},
	},
	pinData: {},
};

/**
 * Snapshot of an execution that will be truncated by an instance crash.
 */
export const IN_PROGRESS_EXECUTION_DATA = {
	startData: {},
	resultData: {
		runData: {
			'When clicking "Test workflow"': [
				{
					hints: [],
					startTime: 1716138610153,
					executionTime: 1,
					source: [],
					executionStatus: 'success',
					data: {
						main: [
							[
								{
									json: {},
									pairedItem: {
										item: 0,
									},
								},
							],
						],
					},
				},
			],
		},
		lastNodeExecuted: 'When clicking "Test workflow"',
	},
	executionData: {
		contextData: {},
		nodeExecutionStack: [
			{
				node: {
					parameters: {
						category: 'oom',
						memorySizeValue: 1000,
					},
					id: '07a48151-96d3-45eb-961c-1daf85fbe052',
					name: 'DebugHelper',
					type: 'n8n-nodes-base.debugHelper',
					typeVersion: 1,
					position: [840, 260],
				},
				data: {
					main: [
						[
							{
								json: {},
								pairedItem: {
									item: 0,
								},
							},
						],
					],
				},
				source: {
					main: [
						{
							previousNode: 'When clicking "Test workflow"',
						},
					],
				},
			},
		],
		metadata: {},
		waitingExecution: {},
		waitingExecutionSource: {},
	},
};
