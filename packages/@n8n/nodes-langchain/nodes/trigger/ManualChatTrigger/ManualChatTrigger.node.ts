import {
	type ITriggerFunctions,
	type INodeType,
	type INodeTypeDescription,
	type ITriggerResponse,
	NodeConnectionType,
} from 'n8n-workflow';

export class ManualChatTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Manual Chat Trigger',
		name: 'manualChatTrigger',
		icon: 'fa:comments',
		group: ['trigger'],
		version: [1, 1.1],
		description: 'Runs the flow on new manual chat message',
		eventTriggerDescription: '',
		maxNodes: 1,
		hidden: true,
		defaults: {
			name: 'On new manual Chat Message',
			color: '#909298',
		},
		codex: {
			categories: ['Core Nodes'],
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.manualchattrigger/',
					},
				],
			},
			subcategories: {
				'Core Nodes': ['Other Trigger Nodes'],
			},
		},
		inputs: [],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName:
					'This node is where a manual chat workflow execution starts. To make one, go back to the canvas and click ‘Chat’',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				displayName: 'Chat and execute workflow',
				name: 'openChat',
				type: 'button',
				typeOptions: {
					action: 'openChat',
				},
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
