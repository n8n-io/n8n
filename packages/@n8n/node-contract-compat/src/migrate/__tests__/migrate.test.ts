import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { defineNode, t } from '@n8n/node-sdk';
import { compat, credential } from '@n8n/node-sdk/credentials';
import { toNodeType } from '@n8n/node-sdk/host';

import { migrateVersion } from '../../index';

const tasks = defineNode({
	id: 'tasks',
	displayName: 'Tasks',
	credential: credential({ types: [compat('tasksApi'), compat('tasksOAuth2Api')] }),
	baseUrl: 'https://tasks.test',
});

const listTasks = tasks.resource('task').action('getAll', {
	action: 'Get many tasks',
	summary: 'List the tasks of a project.',
	flow: { effect: 'read', cardinality: '1:N' },
	input: { project: t.str(), limit: t.int().optional() },
	output: t.obj({ id: t.str() }),
	async *run({ input, http }) {
		const body = await http.request({ path: `/projects/${input.project}/tasks` });
		yield* Array.isArray(body) ? body : [];
	},
});

const contract = new (toNodeType(listTasks))();

const show = (resource: string[], operation?: string[]) => ({
	displayOptions: { show: { resource, ...(operation ? { operation } : {}) } },
});

const legacyProperties: INodeProperties[] = [
	{
		displayName: 'Authentication',
		name: 'authentication',
		type: 'options',
		options: [
			{ name: 'API Key', value: 'apiKey' },
			{ name: 'OAuth2', value: 'oAuth2' },
		],
		default: 'apiKey',
	},
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Task', value: 'task' },
			{ name: 'Project', value: 'project' },
		],
		default: 'task',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		...show(['task']),
		options: [
			{ name: 'Create', value: 'create', action: 'Create a task' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many tasks' },
		],
		default: 'create',
	},
	{
		displayName: 'Project',
		name: 'projectId',
		type: 'string',
		default: '',
		...show(['task'], ['create', 'getAll']),
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		...show(['task'], ['getAll']),
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		displayOptions: { show: { resource: ['task'], operation: ['getAll'], returnAll: [false] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 10,
		...show(['project'], ['search']),
	},
];

const legacyDescription: INodeTypeDescription = {
	displayName: 'Tasks',
	name: 'tasks',
	group: ['input'],
	version: 3,
	defaultVersion: 3,
	description: 'Tasks',
	defaults: { name: 'Tasks' },
	inputs: ['main'],
	outputs: ['main'],
	credentials: [
		{ name: 'tasksApi', required: true, displayOptions: { show: { authentication: ['apiKey'] } } },
		{
			name: 'tasksOAuth2Api',
			required: true,
			displayOptions: { show: { authentication: ['oAuth2'] } },
		},
	],
	properties: legacyProperties,
};

const legacyOutput: INodeExecutionData[][] = [[{ json: { legacy: true } }]];

const legacyOf = (description: Partial<INodeTypeDescription> = {}): INodeType => ({
	description: { ...legacyDescription, ...description },
	methods: { loadOptions: { getProjects: async () => [] } },
	execute: vi.fn(async () => legacyOutput),
});

const slot = { resource: 'task', operation: 'getAll', action: contract };

const composed = (legacy = legacyOf()) => migrateVersion({ legacy, version: 4, slots: [slot] });

const propertiesOf = (type: INodeType) =>
	type.description.properties.map(({ name, displayOptions }) => [name, displayOptions?.show]);

describe('migrateVersion', () => {
	it('hides the legacy fields of the owned slot and shows the action fields there only', () => {
		const owned = { resource: ['task'], operation: ['getAll'] };
		expect(propertiesOf(composed())).toEqual([
			['authentication', undefined],
			['resource', undefined],
			['operation', { resource: ['task'] }],
			['projectId', { resource: ['task'], operation: ['create'] }],
			['limit', { resource: ['project'], operation: ['search'] }],
			['project', owned],
			['limit', owned],
		]);
	});

	it('keeps the legacy description and labels the owned operation with the action name', () => {
		const { description } = composed();
		expect(description).toMatchObject({ name: 'tasks', displayName: 'Tasks', version: 4 });
		const operation = description.properties.find(({ name }) => name === 'operation');
		expect(operation?.options).toEqual([
			{ name: 'Create', value: 'create', action: 'Create a task' },
			{ name: 'Get Many', value: 'getAll', action: 'Get many tasks' },
		]);
	});

	it('keeps the legacy credentials, their selector and the legacy methods', () => {
		const legacy = legacyOf();
		const type = composed(legacy);
		expect(type.description.credentials).toEqual(legacyDescription.credentials);
		expect(type.methods).toBe(legacy.methods);
	});

	it('rejects an action credential that the legacy node does not have', () => {
		const credentials = [{ name: 'tasksApi', required: true }];
		expect(() => composed(legacyOf({ credentials }))).toThrow(
			'tasks has no credential tasksOAuth2Api, which a migrated action uses',
		);
	});

	it('rejects an action field that has the name of a legacy field on the same slot', () => {
		const project: INodeProperties = {
			displayName: 'Project',
			name: 'project',
			type: 'string',
			default: '',
			...show(['task']),
		};
		expect(() => composed(legacyOf({ properties: [...legacyProperties, project] }))).toThrow(
			'The field "project" of task.getAll has the name of a legacy field on the same slot',
		);
	});

	it('rejects a slot that the legacy node has no operation for', () => {
		const missing = { ...slot, operation: 'delete' };
		expect(() => migrateVersion({ legacy: legacyOf(), version: 4, slots: [missing] })).toThrow(
			'tasks has no operation task.delete',
		);
	});

	it('rejects a legacy field of the owned slot that shows for more than one resource', () => {
		const shared: INodeProperties = {
			displayName: 'Fields',
			name: 'fields',
			type: 'string',
			default: '',
			...show(['task', 'project'], ['getAll']),
		};
		expect(() => composed(legacyOf({ properties: [...legacyProperties, shared] }))).toThrow(
			'Cannot hide "fields" for task.getAll: it shows for more than one resource',
		);
	});

	describe('execute', () => {
		const contextOf = (parameters: Record<string, unknown>) => {
			const requests: unknown[] = [];
			const context = {
				getInputData: () => [{ json: {} }],
				getNode: () => ({
					id: '1',
					name: 'Tasks',
					type: 'tasks',
					typeVersion: 4,
					position: [0, 0],
					parameters: {},
					credentials: { tasksApi: { id: '1', name: 'Tasks account' } },
				}),
				getNodeParameter: (name: string) => parameters[name],
				getCredentials: async () => ({}),
				continueOnFail: () => false,
				getExecutionCancelSignal: () => undefined,
				helpers: {
					httpRequestWithAuthentication: async (
						credentialType: string,
						options: { url: string },
					) => {
						requests.push({ credentialType, url: options.url });
						return [{ id: 't1' }];
					},
				},
			} as unknown as IExecuteFunctions;
			return { context, requests };
		};

		it('runs the owned slot with the contract executor and the node credential', async () => {
			const legacy = legacyOf();
			const parameters = {
				resource: 'task',
				operation: 'getAll',
				authentication: 'apiKey',
				project: 'p1',
			};
			const { context, requests } = contextOf(parameters);
			const output = await composed(legacy).execute?.call(context);
			expect(output).toEqual([[{ json: { id: 't1' }, pairedItem: { item: 0 } }]]);
			expect(requests).toEqual([
				{ credentialType: 'tasksApi', url: 'https://tasks.test/projects/p1/tasks' },
			]);
			expect(legacy.execute).not.toHaveBeenCalled();
		});

		it('runs every other slot with the legacy execute', async () => {
			const legacy = legacyOf();
			const { context, requests } = contextOf({ resource: 'task', operation: 'create' });
			expect(await composed(legacy).execute?.call(context)).toBe(legacyOutput);
			expect(legacy.execute).toHaveBeenCalledTimes(1);
			expect(requests).toEqual([]);
		});
	});
});
