import {
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type IPollFunctions,
} from 'n8n-workflow';

interface PollResponseBody {
	items?: IDataObject[];
}

export class E2eTestPollingTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'E2E Test Polling Trigger',
		name: 'e2eTestPollingTrigger',
		icon: 'fa:play',
		group: ['trigger'],
		version: 1,
		description: 'Dummy polling trigger for e2e testing',
		subtitle: '={{$parameter["url"]}}',
		defaults: {
			name: 'E2E Test Polling Trigger',
		},
		polling: true,
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
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const url = this.getNodeParameter('url') as string;

		let body: PollResponseBody;
		try {
			body = (await this.helpers.httpRequest({
				method: 'GET',
				url,
				json: true,
			})) as PollResponseBody;
		} catch (error) {
			throw new NodeOperationError(this.getNode(), error as Error);
		}

		if (!body.items?.length) return null;

		return [this.helpers.returnJsonArray(body.items)];
	}
}
