import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchResult,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';

const BASE_URL = 'http://127.0.0.1:18090/projects/v1';
const APP_URL = 'https://app.projects.test/p/';

interface ProjectPage {
	data: Array<{ id: string; name: string }>;
	nextCursor: string | null;
}

export class Projects implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Projects',
		name: 'projects',
		icon: 'file:projects.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Get projects',
		defaults: { name: 'Projects' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'projectsApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [{ name: 'Project', value: 'project' }],
				default: 'project',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['project'] } },
				options: [
					{
						name: 'Get',
						value: 'get',
						action: 'Get a project',
						description: 'Get a project',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Project',
				name: 'project',
				type: 'resourceLocator',
				required: true,
				displayOptions: { show: { resource: ['project'], operation: ['get'] } },
				default: { mode: 'list', value: '' },
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: { searchListMethod: 'searchProjects', searchable: true },
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'pj_3a00',
					},
					{
						displayName: 'By URL',
						name: 'url',
						type: 'string',
						placeholder: `${APP_URL}pj_3a00`,
						extractValue: { type: 'regex', regex: 'https://app\\.projects\\.test/p/([^/?#]+)' },
					},
				],
			},
		],
	};

	methods = {
		listSearch: {
			async searchProjects(
				this: ILoadOptionsFunctions,
				filter?: string,
				paginationToken?: string,
			): Promise<INodeListSearchResult> {
				const page = (await this.helpers.httpRequestWithAuthentication.call(this, 'projectsApi', {
					method: 'GET',
					url: `${BASE_URL}/projects`,
					qs: {
						...(filter ? { q: filter } : {}),
						...(paginationToken ? { cursor: paginationToken } : {}),
					},
					json: true,
				})) as ProjectPage;
				return {
					results: page.data.map(({ id, name }) => ({ name, value: id, url: `${APP_URL}${id}` })),
					...(page.nextCursor ? { paginationToken: page.nextCursor } : {}),
				};
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[] = [];
		for (const itemIndex of this.getInputData().keys()) {
			try {
				const id = this.getNodeParameter('project', itemIndex, '', { extractValue: true });
				const project = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'projectsApi',
					{
						method: 'GET',
						url: `${BASE_URL}/projects/${encodeURIComponent(String(id))}`,
						json: true,
					},
				)) as IDataObject;
				returnData.push({ json: project, pairedItem: { item: itemIndex } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: itemIndex },
					});
					continue;
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex });
			}
		}
		return [returnData];
	}
}
