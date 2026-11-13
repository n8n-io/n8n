import { N8N_NODE_CONFIG } from '../n8n-node.config';
import { parseYaml } from '../spec/parse-yaml';
import { readSpec } from '../spec/read-spec';

const ENVELOPE_YAML = `
tags:
  - name: Workflow
    x-displayName: Workflows
    x-parent: BuildAndRun
  - name: Executions
    x-displayName: Executions
    x-parent: BuildAndRun
  - name: BuildAndRun
    x-displayName: Build and run
`;

const ROUTES_YAML = `
paths:
  /workflows:
    get:
      operationId: getWorkflows
      summary: Retrieve all workflows
      tags: [Workflow]
      parameters:
        - name: name
          in: query
          description: Only workflows with this name.
          schema:
            type: string
        - name: limit
          in: query
          schema:
            type: number
        - name: cursor
          in: query
          schema:
            type: string
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
    post:
      operationId: createWorkflow
      summary: Create a workflow
      tags: [Workflow]
      parameters:
        - name: Idempotency-Key
          in: header
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [name]
              properties:
                id:
                  type: string
                  readOnly: true
                name:
                  type: string
                  description: The workflow name.
                active:
                  type: boolean
                  deprecated: true
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
  /executions/{id}:
    delete:
      operationId: deleteExecution
      summary: Delete an execution
      tags: [Executions]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '204':
          description: Deleted
`;

const ENVELOPE = parseYaml(ENVELOPE_YAML);

const readOperation = (operation: Record<string, unknown>) =>
	readSpec(
		{
			routes: {
				paths: {
					'/workflows': {
						get: {
							operationId: 'getWorkflows',
							summary: 'Summary',
							tags: ['Workflow'],
							responses: {},
							...operation,
						},
					},
				},
			},
			envelope: ENVELOPE,
		},
		N8N_NODE_CONFIG.spec,
	).operations[0];

describe('readSpec', () => {
	it('should read the tags, the operations and the parameters of a YAML spec', () => {
		const spec = readSpec(
			{ routes: parseYaml(ROUTES_YAML), envelope: ENVELOPE },
			N8N_NODE_CONFIG.spec,
		);

		const buildAndRun = { name: 'BuildAndRun', displayName: 'Build and run' };
		const workflow = { name: 'Workflow', displayName: 'Workflows', group: buildAndRun };
		const executions = { name: 'Executions', displayName: 'Executions', group: buildAndRun };
		expect(spec).toEqual({
			tags: [workflow, executions],
			operations: [
				{
					operationId: 'createWorkflow',
					summary: 'Create a workflow',
					method: 'POST',
					apiPath: '/workflows',
					tag: workflow,
					deprecated: false,
					paginated: false,
					parameters: [
						{
							name: 'name',
							location: 'body',
							required: true,
							deprecated: false,
							schema: { type: 'string', description: 'The workflow name.' },
							description: 'The workflow name.',
						},
						{
							name: 'active',
							location: 'body',
							required: false,
							deprecated: true,
							schema: { type: 'boolean', deprecated: true },
						},
					],
					blockers: [],
				},
				{
					operationId: 'deleteExecution',
					summary: 'Delete an execution',
					method: 'DELETE',
					apiPath: '/executions/{id}',
					tag: executions,
					deprecated: false,
					paginated: false,
					parameters: [
						{
							name: 'id',
							location: 'path',
							required: true,
							deprecated: false,
							schema: { type: 'string' },
						},
					],
					blockers: [],
				},
				{
					operationId: 'getWorkflows',
					summary: 'Retrieve all workflows',
					method: 'GET',
					apiPath: '/workflows',
					tag: workflow,
					deprecated: false,
					paginated: true,
					parameters: [
						{
							name: 'name',
							location: 'query',
							required: false,
							deprecated: false,
							schema: { type: 'string' },
							description: 'Only workflows with this name.',
						},
					],
					blockers: [],
				},
			],
		});
	});

	it('should mark a deprecated operation', () => {
		expect(readOperation({ deprecated: true }).deprecated).toBe(true);
	});

	it('should read the description and the deprecated mark of a parameter from its schema', () => {
		const operation = readOperation({
			parameters: [
				{
					name: 'offset',
					in: 'query',
					schema: { type: 'number', description: 'Use the cursor.', deprecated: true },
				},
			],
		});

		expect(operation.parameters).toEqual([
			expect.objectContaining({ description: 'Use the cursor.', deprecated: true }),
		]);
	});

	it('should keep the schema keys that it does not know', () => {
		const schema = {
			anyOf: [
				{ type: 'string', minLength: 1 },
				{ type: 'object', additionalProperties: true },
			],
			nullable: true,
			writeOnly: true,
		};
		const operation = readOperation({
			parameters: [{ name: 'filter', in: 'query', schema }],
			requestBody: {
				content: {
					'application/json': { schema: { type: 'object', properties: { staticData: schema } } },
				},
			},
		});

		expect(operation.parameters.map((parameter) => parameter.schema)).toEqual([schema, schema]);
	});

	it('should keep a limit parameter when the operation has no cursor', () => {
		const operation = readOperation({
			parameters: [{ name: 'limit', in: 'query', schema: { type: 'number' } }],
		});

		expect(operation.paginated).toBe(false);
		expect(operation.parameters.map((parameter) => parameter.name)).toEqual(['limit']);
	});

	it('should read a JSON body that is not an object as one parameter', () => {
		const operation = readOperation({
			requestBody: {
				required: true,
				content: { 'application/json': { schema: { type: 'array', items: { type: 'string' } } } },
			},
		});

		expect(operation.parameters).toEqual([
			{
				name: 'body',
				location: 'wholeBody',
				required: true,
				deprecated: false,
				schema: { type: 'array', items: { type: 'string' } },
			},
		]);
	});

	it.each([
		['no summary', { summary: undefined }],
		[
			'header parameter "X-Dry-Run"',
			{ parameters: [{ name: 'X-Dry-Run', in: 'header', schema: { type: 'string' } }] },
		],
		[
			'multipart/form-data request body',
			{ requestBody: { content: { 'multipart/form-data': { schema: { type: 'object' } } } } },
		],
		[
			'application/gzip response',
			{
				responses: {
					'200': { content: { 'application/gzip': {} } },
					'400': { content: { 'application/json': {} } },
				},
			},
		],
	])('should report the blocker "%s"', (blocker, operation) => {
		expect(readOperation(operation).blockers).toEqual([blocker]);
	});

	it('should fail when an operation has a tag without a parent', () => {
		expect(() => readOperation({ tags: ['BuildAndRun'] })).toThrow(
			'"BuildAndRun" is not a tag with a parent',
		);
	});

	it('should fail when an operation has two tags', () => {
		expect(() => readOperation({ tags: ['Workflow', 'Executions'] })).toThrow(
			/Cannot read GET \/workflows:\n- tags: /,
		);
	});

	it('should fail when a path has a key that is not an HTTP method', () => {
		const routes = { paths: { '/workflows': { parameters: [] } } };

		expect(() => readSpec({ routes, envelope: ENVELOPE }, N8N_NODE_CONFIG.spec)).toThrow(
			'the generator does not know "parameters"',
		);
	});

	it('should fail when two operations have the same ID', () => {
		const operation = { operationId: 'getWorkflow', tags: ['Workflow'], responses: {} };
		const routes = { paths: { '/a': { get: operation }, '/b': { post: operation } } };

		expect(() => readSpec({ routes, envelope: ENVELOPE }, N8N_NODE_CONFIG.spec)).toThrow(
			'two operations have the ID "getWorkflow"',
		);
	});

	it('should fail when the parent of a tag is not a tag', () => {
		const envelope = { tags: [{ name: 'Tags', 'x-displayName': 'Tags', 'x-parent': 'Missing' }] };

		expect(() => readSpec({ routes: { paths: {} }, envelope }, N8N_NODE_CONFIG.spec)).toThrow(
			'the tag "Tags" has the parent "Missing"',
		);
	});
});
