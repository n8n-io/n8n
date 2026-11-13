import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';

/** Has no `poll()`: the loader builds it from `description.trigger`. */
export class E2eTestDeclarativePollingTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'E2E Test Declarative Polling Trigger',
		name: 'e2eTestDeclarativePollingTrigger',
		icon: 'fa:play',
		group: ['trigger'],
		version: 1,
		description: 'Dummy declarative polling trigger for e2e testing',
		subtitle: '={{$parameter["url"]}}',
		defaults: {
			name: 'E2E Test Declarative Polling Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				description: 'GET endpoint to poll. Expected to return JSON of shape { "items": [...] }.',
			},
		],
		trigger: {
			type: 'polling',
			routing: {
				request: {
					method: 'GET',
					url: '={{ $parameter.url }}',
					qs: { since: '={{ $cursor.value }}' },
				},
				output: {
					postReceive: [{ type: 'rootProperty', properties: { property: 'items' } }],
				},
			},
			cursor: { type: 'id', field: 'id' },
		},
	};
}
