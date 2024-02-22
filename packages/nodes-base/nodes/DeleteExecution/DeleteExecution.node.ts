import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestOptions,
	JsonObject
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export class DeleteExecution implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Delete Execution',
		name: 'deleteExecution',
		icon: 'file:deleteExecution.png',
		group: ['organization'],
		version: 1,
		description: 'Delete Execution',
		defaults: {
			name: 'Delete Execution',
			color: '#b0b0b0',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'n8nApi',
				required: true,
			},
		],
		properties: [],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const executionId = this.getExecutionId();

		const method = 'DELETE';

		type N8nApiCredentials = {
			apiKey: string;
			baseUrl: string;
		};

		const credentials = (await this.getCredentials('n8nApi')) as N8nApiCredentials;
		const baseUrl = credentials.baseUrl;

		const url = `${baseUrl}/executions/${executionId}`;

		const options: IHttpRequestOptions = {
			method,
			url
		};
	
		try {
			await this.helpers.requestWithAuthentication.call(this, 'n8nApi', options);
		} catch (error) {
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}

		return [items];
	}
}
