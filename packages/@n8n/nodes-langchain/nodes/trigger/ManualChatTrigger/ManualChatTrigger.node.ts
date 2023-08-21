import type {
	ITriggerFunctions,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
} from 'n8n-workflow';

export class ManualChatTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Manual Chat Trigger',
		name: 'manualChatTrigger',
		icon: 'fa:mouse-pointer',
		group: ['trigger'],
		version: 1,
		description: 'Runs the flow on new manual chat message',
		eventTriggerDescription: '',
		maxNodes: 1,
		defaults: {
			name: 'On new manual Chat Message',
			color: '#909298',
		},

		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName:
					'This node is where a manual chat workflow execution starts. To make one, go back to the canvas and click ‘Chat’',
				name: 'notice',
				type: 'notice',
				default: '',
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const manualTriggerFunction = async () => {
			this.emit([this.helpers.returnJsonArray([{}])]);
		};

		return {
			manualTriggerFunction,
		};
	}
}
