import { INodeTypeBaseDescription, INodeTypeData, INodeTypeDescription } from 'n8n-workflow';
import { MANUAL_TRIGGER_NODE_TYPE } from '@/constants';

export const defaultMockNodeTypes: INodeTypeData = {
	[MANUAL_TRIGGER_NODE_TYPE]: {
		sourcePath: '',
		type: {
			description: {
				displayName: 'Manual Trigger',
				name: 'manualTrigger',
				icon: 'fa:mouse-pointer',
				group: ['trigger'],
				version: 1,
				description: 'Runs the flow on clicking a button in n8n',
				eventTriggerDescription: '',
				maxNodes: 1,
				defaults: {
					name: 'When clicking "Execute Workflow"',
					color: '#909298',
				},
				inputs: [],
				outputs: ['main'],
				properties: [
					{
						displayName:
							'This node is where a manual workflow execution starts. To make one, go back to the canvas and click ‘execute workflow’',
						name: 'notice',
						type: 'notice',
						default: '',
					},
				],
			},
		},
	},
};

export const defaultMockNodeTypesArray: INodeTypeDescription[] = Object.values(
	defaultMockNodeTypes,
).map((nodeType) => nodeType.type.description as INodeTypeDescription);
