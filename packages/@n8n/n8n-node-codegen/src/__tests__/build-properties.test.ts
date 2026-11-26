import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import { buildProperties } from '../build-properties';
import { N8N_NODE_CONFIG } from '../n8n-node.config';
import type { OperationRow } from '../types';
import { asDefault, getTag, getWorkflow, parameter, row, workflowId } from './fixtures';

const PARSED_JSON = '={{ typeof $value === "string" ? $value.parseJson() : $value }}';

const build = (...rows: OperationRow[]) => buildProperties(rows, N8N_NODE_CONFIG.spec);

const named = (properties: INodeProperties[], name: string) =>
	properties.find((property) => property.name === name);

const choicesOf = (property: INodeProperties | undefined) =>
	(property?.options ?? []) as INodePropertyOptions[];

describe('buildProperties', () => {
	it('should give the node a resource selector and each resource an operation selector', () => {
		const properties = build(row('getWorkflow'), row('archiveWorkflow'), getTag);

		expect(
			properties.map((property) => ({
				name: property.name,
				show: property.displayOptions?.show,
				values: choicesOf(property).map((choice) => choice.value),
				default: property.default,
			})),
		).toEqual([
			{ name: 'resource', values: ['tag', 'workflow'], default: 'tag' },
			{
				name: 'operation',
				show: { resource: ['workflow'] },
				values: ['archiveWorkflow', 'getWorkflow'],
				default: 'archiveWorkflow',
			},
			{ name: 'operation', show: { resource: ['tag'] }, values: ['getTag'], default: 'getTag' },
		]);
	});

	it('should send the method and the path, with each path parameter encoded', () => {
		const [, operation] = build(
			row('getWorkflows'),
			row('updateWorkflowTags', {
				method: 'PUT',
				apiPath: '/workflows/{workflowId}/tags',
				parameters: [workflowId],
			}),
		);

		expect(choicesOf(operation).map((choice) => [choice.value, choice.routing?.request])).toEqual([
			['getWorkflows', { method: 'GET', url: '/workflows' }],
			[
				'updateWorkflowTags',
				{
					method: 'PUT',
					url: '=/workflows/{{ toPathSegment($parameter["workflowId"]) }}/tags',
				},
			],
		]);
	});

	it('should make a number path parameter a string field with an empty default', () => {
		const properties = build(
			row('getExecution', {
				apiPath: '/executions/{executionId}',
				parameters: [
					parameter('executionId', {
						location: 'path',
						required: true,
						schema: { type: 'integer', minimum: 1 },
					}),
				],
			}),
		);

		const field = named(properties, 'executionId');
		expect(field).toMatchObject({ type: 'string', default: '' });
		expect(field?.typeOptions).toBeUndefined();
	});

	it('should show a required parameter as a required field and an optional one in Options', () => {
		const properties = build(
			row('createTag', {
				method: 'POST',
				parameters: [
					parameter('name', { location: 'body', required: true }),
					parameter('projectId', { location: 'body' }),
					parameter('dryRun'),
				],
			}),
		);

		expect(named(properties, 'name')).toMatchObject({
			required: true,
			displayOptions: { show: { resource: ['workflow'], operation: ['createTag'] } },
			routing: { send: { type: 'body', property: 'name' } },
		});
		expect(named(properties, 'options')?.options).toEqual([
			expect.objectContaining({
				name: 'dryRun',
				routing: { send: { type: 'query', property: 'dryRun' } },
			}),
			expect.objectContaining({
				name: 'projectId',
				routing: { send: { type: 'body', property: 'projectId' } },
			}),
		]);
	});

	it('should send a field with a request property to that path in the body', () => {
		const properties = build(
			row('addUsersToProject', {
				method: 'POST',
				parameters: [
					parameter('userId', {
						location: 'body',
						required: true,
						property: 'relations[0].userId',
					}),
				],
			}),
		);

		expect(named(properties, 'userId')?.routing).toEqual({
			send: { type: 'body', property: 'relations[0].userId' },
		});
	});

	it('should send a request body that is not an object as the whole body', () => {
		const properties = build(
			row('updateWorkflowTags', {
				method: 'PUT',
				parameters: [
					parameter('body', {
						location: 'wholeBody',
						required: true,
						schema: { type: 'array', items: { type: 'object' } },
					}),
				],
			}),
		);

		expect(named(properties, 'body')).toMatchObject({
			type: 'json',
			default: '[]',
			routing: { request: { body: PARSED_JSON } },
		});
	});

	it('should give a paginated operation Return All and a Limit of at least 1, and send its query on each page', () => {
		const [, operation, returnAll, limit, collection] = build(
			row('getWorkflows', {
				paginated: true,
				parameters: [
					parameter('limit', { schema: { type: 'number', default: 100, maximum: 250 } }),
					parameter('name'),
				],
			}),
		);

		expect(choicesOf(operation)[0].routing?.output).toEqual({
			postReceive: [{ type: 'rootProperty', properties: { property: 'data' } }],
		});
		expect(returnAll).toMatchObject({ name: 'returnAll', type: 'boolean', default: false });
		expect(returnAll.routing).toEqual({
			send: { paginate: '={{ $value }}' },
			operations: {
				pagination: {
					type: 'generic',
					properties: {
						continue: '={{ !!$response.body?.nextCursor }}',
						request: {
							qs: {
								limit: '={{ $request.qs?.["limit"] }}',
								name: '={{ $request.qs?.["name"] }}',
								cursor: '={{ $response.body?.nextCursor }}',
							},
						},
					},
				},
			},
		});
		expect(limit).toMatchObject({
			name: 'limit',
			default: 100,
			description: 'Max number of results to return',
			typeOptions: { minValue: 1, maxValue: 250 },
			displayOptions: { show: { returnAll: [false] } },
		});
		expect(collection.options).toEqual([expect.objectContaining({ name: 'name' })]);
	});

	it('should keep a limit minimum from the spec that is above 1', () => {
		const [, , , limit] = build(
			row('getWorkflows', {
				paginated: true,
				parameters: [parameter('limit', { schema: { type: 'number', default: 100, minimum: 10 } })],
			}),
		);

		expect(limit.typeOptions).toEqual({ minValue: 10 });
	});

	it('should show a required limit of a paginated operation once, as a required field, when Return All is off', () => {
		const properties = build(
			row('getWorkflows', {
				paginated: true,
				parameters: [parameter('limit', { required: true, schema: { type: 'number' } })],
			}),
		);

		expect(properties.filter((property) => property.name === 'limit')).toEqual([
			expect.objectContaining({
				required: true,
				displayOptions: { show: expect.objectContaining({ returnAll: [false] }) },
			}),
		]);
	});

	it('should give each schema type a node field', () => {
		const properties = build(
			row('createWorkflow', {
				method: 'POST',
				parameters: [
					parameter('flag', {
						schema: { type: 'string', enum: ['false', 'true'], default: 'true' },
					}),
					parameter('status', { schema: { type: 'string', enum: ['new', 'done'] } }),
					parameter('role', {
						schema: {
							anyOf: [
								{ type: 'string', enum: ['project:admin', 'project:viewer'] },
								{ type: 'string', minLength: 1 },
							],
						},
					}),
					parameter('name', { schema: { type: 'string', format: 'uuid' } }),
					parameter('count', { schema: { type: 'integer', default: 5, maximum: 10 } }),
					parameter('page', { schema: { type: 'integer', minimum: 1 } }),
					parameter('active', { schema: { type: 'boolean' } }),
					parameter('nodes', { schema: { type: 'array', items: { type: 'object' } } }),
					parameter('settings', { schema: { anyOf: [{ type: 'string' }, { type: 'object' }] } }),
				].map((field) => ({ ...field, required: true })),
			}),
		);

		const fields = properties
			.filter((property) => property.displayOptions?.show?.operation)
			.map((property) => ({
				name: property.name,
				type: property.type,
				default: property.default,
				typeOptions: property.typeOptions,
				value: property.routing?.send?.value,
				values: property.type === 'options' ? choicesOf(property).map((c) => c.value) : undefined,
			}));

		expect(fields).toEqual([
			{ name: 'flag', type: 'boolean', default: true, value: '={{ String($value) }}' },
			{ name: 'status', type: 'options', default: '', values: ['new', 'done'] },
			{
				name: 'role',
				type: 'options',
				default: '',
				values: ['project:admin', 'project:viewer'],
			},
			{ name: 'name', type: 'string', default: '' },
			{ name: 'count', type: 'number', default: 5, typeOptions: { maxValue: 10 } },
			{ name: 'page', type: 'number', default: 1, typeOptions: { minValue: 1 } },
			{ name: 'active', type: 'boolean', default: false },
			{ name: 'nodes', type: 'json', default: '[]', value: PARSED_JSON },
			{ name: 'settings', type: 'json', default: '{}', value: PARSED_JSON },
		]);
	});

	it('should return success for an operation with an empty response', () => {
		const [, operation] = build(row('deleteTag', { method: 'DELETE', emptyResponse: true }));

		expect(choicesOf(operation)[0].routing?.output).toEqual({
			postReceive: [{ type: 'set', properties: { value: '={{ { "success": true } }}' } }],
		});
	});

	it('should mark a deprecated operation in its name and action', () => {
		const [, operation] = build(
			row('activateWorkflow', { summary: 'Publish a workflow', deprecated: true }),
		);

		expect(choicesOf(operation)[0]).toMatchObject({
			name: 'Publish a Workflow (Deprecated)',
			action: 'Publish a workflow (deprecated)',
		});
	});

	it('should select the default resource and the default operation of each resource', () => {
		const properties = buildProperties(
			[row('archiveWorkflow'), asDefault(row('getWorkflows')), asDefault(getTag)],
			N8N_NODE_CONFIG.spec,
			'workflow',
		);

		expect(
			properties
				.filter(({ name }) => name === 'resource' || name === 'operation')
				.map((property) => property.default),
		).toEqual(['workflow', 'getWorkflows', 'getTag']);
	});

	it('should write the display names and the operation names in title case, with ID in upper case', () => {
		const [, operation, versionId] = build(
			row('getWorkflowVersion', {
				summary: 'Retrieve a workflow version',
				parameters: [parameter('workflowVersionId', { required: true })],
			}),
		);

		expect(choicesOf(operation)[0]).toMatchObject({
			name: 'Retrieve a Workflow Version',
			action: 'Retrieve a workflow version',
		});
		expect(versionId.displayName).toBe('Workflow Version ID');
	});

	it('should build no properties when the node has no operations', () => {
		expect(build()).toEqual([]);
	});

	it('should put a field override over the generated field, in the required fields and in Options', () => {
		const properties = build(
			getWorkflow([workflowId, parameter('excludePinnedData', { schema: { type: 'boolean' } })], {
				workflowId: { displayName: 'Workflow', description: 'Workflow to get' },
				excludePinnedData: { displayName: 'Exclude Pinned Data', default: true },
			}),
		);

		expect(named(properties, 'workflowId')).toEqual({
			displayName: 'Workflow',
			name: 'workflowId',
			type: 'string',
			default: '',
			description: 'Workflow to get',
			required: true,
			displayOptions: { show: { resource: ['workflow'], operation: ['getWorkflow'] } },
		});
		expect(named(properties, 'options')?.options).toEqual([
			expect.objectContaining({
				displayName: 'Exclude Pinned Data',
				name: 'excludePinnedData',
				type: 'boolean',
				default: true,
				routing: { send: { type: 'query', property: 'excludePinnedData' } },
			}),
		]);
	});

	it('should send the method from the operation and the URL from the resource locator path field', () => {
		const properties = build(
			row(
				'getWorkflowVersion',
				{
					apiPath: '/workflows/{workflowId}/versions/{workflowVersionId}',
					parameters: [
						workflowId,
						parameter('workflowVersionId', { location: 'path', required: true }),
					],
				},
				{ workflowId: { type: 'resourceLocator', default: { mode: 'list', value: '' } } },
			),
		);

		expect(choicesOf(named(properties, 'operation'))[0].routing?.request).toEqual({
			method: 'GET',
		});
		expect(named(properties, 'workflowId')?.routing).toEqual({
			request: {
				url: '=/workflows/{{ toPathSegment($value) }}/versions/{{ toPathSegment($parameter["workflowVersionId"]) }}',
			},
		});
		expect(named(properties, 'workflowVersionId')?.routing).toBeUndefined();
	});

	it('should send a resource locator field outside the path like any other field', () => {
		const properties = build(
			row(
				'getExecutions',
				{ apiPath: '/executions', parameters: [parameter('workflowId')] },
				{ workflowId: { type: 'resourceLocator', default: { mode: 'list', value: '' } } },
			),
		);

		expect(choicesOf(named(properties, 'operation'))[0].routing?.request).toEqual({
			method: 'GET',
			url: '/executions',
		});
		expect(named(properties, 'options')?.options).toEqual([
			expect.objectContaining({
				type: 'resourceLocator',
				routing: { send: { type: 'query', property: 'workflowId' } },
			}),
		]);
	});
});
