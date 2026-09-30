import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';

const BASE_URL = 'http://127.0.0.1:18090/acme-tasks/v1';

interface TaskPage {
	data: IDataObject[];
	nextCursor: string | null;
}

export class AcmeTasks implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Acme Tasks',
		name: 'acmeTasks',
		icon: 'file:acmeTasks.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'List and create Acme tasks',
		defaults: { name: 'Acme Tasks' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'acmeTasksApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [{ name: 'Task', value: 'task' }],
				default: 'task',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['task'] } },
				options: [
					{
						name: 'Create',
						value: 'create',
						action: 'Create a task',
						description: 'Create a task',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						action: 'Get many tasks',
						description: 'Get many tasks',
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				displayOptions: { show: { operation: ['getAll'] } },
				options: [
					{ name: 'Any', value: 'any' },
					{ name: 'Done', value: 'done' },
					{ name: 'Open', value: 'open' },
				],
				default: 'any',
				description: 'Only return tasks with this status',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: { show: { operation: ['getAll'] } },
				default: false,
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: { show: { operation: ['getAll'], returnAll: [false] } },
				typeOptions: { minValue: 1 },
				default: 50,
				description: 'Max number of results to return',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				required: true,
				displayOptions: { show: { operation: ['create'] } },
				default: '',
			},
			{
				displayName: 'Assignee',
				name: 'assignee',
				type: 'string',
				displayOptions: { show: { operation: ['create'] } },
				default: '',
				description: 'User name of the owner',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const operation = String(this.getNodeParameter('operation', itemIndex));
			try {
				if (operation === 'create') {
					const assignee = String(this.getNodeParameter('assignee', itemIndex, ''));
					const task: IDataObject = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'acmeTasksApi',
						{
							method: 'POST',
							url: `${BASE_URL}/tasks`,
							body: {
								title: String(this.getNodeParameter('title', itemIndex)),
								...(assignee ? { assignee } : {}),
							},
							json: true,
						},
					);
					returnData.push({ json: task, pairedItem: itemIndex });
					continue;
				}
				const status = String(this.getNodeParameter('status', itemIndex, 'any'));
				const returnAll = Boolean(this.getNodeParameter('returnAll', itemIndex, false));
				const limit = returnAll ? Infinity : Number(this.getNodeParameter('limit', itemIndex, 50));
				const tasks: IDataObject[] = [];
				let cursor: string | null = null;
				do {
					const page: TaskPage = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'acmeTasksApi',
						{
							method: 'GET',
							url: `${BASE_URL}/tasks`,
							qs: {
								...(status !== 'any' ? { status } : {}),
								...(cursor ? { cursor } : {}),
								pageSize: Math.min(50, limit - tasks.length),
							},
							json: true,
						},
					);
					tasks.push(...page.data);
					cursor = page.nextCursor;
				} while (cursor && tasks.length < limit);
				for (const task of tasks.slice(0, limit)) {
					returnData.push({ json: task, pairedItem: itemIndex });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: String(error) }, pairedItem: itemIndex });
					continue;
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex });
			}
		}
		return [returnData];
	}
}
