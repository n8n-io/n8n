import {
	IDataObject,
	IWebhookFunctions,
	INodeTypeDescription,
	INodeType,
	IWebhookResponseData,
} from 'n8n-workflow';

export class ClassNameReplace implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'DisplayNameReplace',
		name: 'N8nNameReplace',
		group: ['trigger'],
		version: 1,
		description: 'NodeDescriptionReplace',
		defaults: {
			name: 'DisplayNameReplace',
			color: '#885577',
		},
		inputs: [],
		outputs: ['main'],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				// Each webhook property can either be hardcoded
				// like the above ones or referenced from a parameter
				// like the "path" property bellow
				path: '={{$parameter["path"]}}',
			},
		],
		properties: [
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				default: '',
				placeholder: '',
				required: true,
				description: 'The path to listen to',
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		// The data to return and so start the workflow with
		const returnData: IDataObject[] = [];
		returnData.push({
			headers: this.getHeaderData(),
			params: this.getParamsData(),
			query: this.getQueryData(),
			body: this.getBodyData(),
		});

		return {
			workflowData: [this.helpers.returnJsonArray(returnData)],
		};
	}
}
