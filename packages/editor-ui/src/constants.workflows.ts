import { NodeConnectionType } from 'n8n-workflow';
import type { INodeUi, WorkflowDataWithTemplateId } from './Interface';

export const SAMPLE_SUBWORKFLOW_WORKFLOW: WorkflowDataWithTemplateId = {
	name: 'My Sub-Workflow',
	meta: {
		templateId: 'VMiAxXa3lCAizGB5f7dVZQSFfg3FtHkdTKvLuupqBls=',
	},
	nodes: [
		{
			id: 'c055762a-8fe7-4141-a639-df2372f30060',
			typeVersion: 1.1,
			name: 'Workflow Input Trigger',
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
		'Workflow Input Trigger': {
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
