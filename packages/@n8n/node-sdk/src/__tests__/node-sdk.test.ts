import type { IExecuteFunctions } from 'n8n-workflow';

import {
	arr,
	defineAction,
	defineNode,
	generateNodeModule,
	lintContract,
	num,
	obj,
	oneOf,
	str,
	toContract,
	toNodeType,
	validate,
	variant,
	type Infer,
} from '../index';

const todo = defineNode({
	id: 'todo',
	displayName: 'Todo',
	credentials: ['todoApi'],
	baseUrl: 'https://todo.test',
});

const listTasks = defineAction({
	node: todo,
	id: 'todo.task.getAll',
	action: 'Get many tasks',
	summary: 'List tasks in a project.',
	flow: { effect: 'read', cardinality: '1:N', passthrough: 'replace', idempotent: true },
	input: {
		project: str().hint('Project ID'),
		paging: variant('mode', { all: {}, limit: { max: num().default(50) } }),
		status: oneOf('open', 'done').optional(),
	},
	output: obj({ id: str(), title: str(), tags: arr(str()) }),
	async run({ input, http, emit }) {
		const max = input.paging.mode === 'limit' ? input.paging.max : undefined;
		const body = await http.request({ path: `/projects/${input.project}/tasks`, query: { max } });
		const tasks = Array.isArray(body) ? body : [];
		for (const task of tasks) emit(task);
	},
});

describe('schema builders', () => {
	it('infer variant, optional, and default fields', () => {
		type Paging = Infer<ReturnType<typeof pagingSchema>>;
		const pagingSchema = () => variant('mode', { all: {}, limit: { max: num().default(50) } });
		const all: Paging = { mode: 'all' };
		const limited: Paging = { mode: 'limit' };
		// @ts-expect-error `max` belongs to the limit branch only
		const wrong: Paging = { mode: 'all', max: 5 };
		expect([all, limited, wrong]).toHaveLength(3);
	});

	it('emits a closed JSON Schema with a discriminated union', () => {
		expect(toContract(listTasks).input).toEqual({
			type: 'object',
			properties: {
				project: { type: 'string', 'x-n8n-hint': 'Project ID' },
				paging: {
					type: 'object',
					discriminator: { propertyName: 'mode' },
					oneOf: [
						{
							type: 'object',
							properties: { mode: { const: 'all', 'x-n8n-literal': true } },
							required: ['mode'],
							additionalProperties: false,
						},
						{
							type: 'object',
							properties: {
								mode: { const: 'limit', 'x-n8n-literal': true },
								max: { type: 'number', default: 50 },
							},
							required: ['mode'],
							additionalProperties: false,
						},
					],
				},
				status: { enum: ['open', 'done'] },
			},
			required: ['project', 'paging'],
			additionalProperties: false,
		});
		expect(lintContract(toContract(listTasks))).toEqual([]);
	});

	it('validates values and names the failing path', () => {
		const { inputSchema } = listTasks;
		expect(validate({ project: 'p1', paging: { mode: 'all' } }, inputSchema)).toEqual([]);
		expect(validate({ project: 'p1', paging: { mode: 'some' }, extra: 1 }, inputSchema)).toEqual([
			'input.paging: needs "mode" set to one of "all", "limit"',
			'input: unknown field(s) extra. Allowed: project, paging, status',
		]);
		expect(
			validate({ project: '={{ $json.id }}', paging: { mode: 'all' } }, inputSchema, {
				allowExpressions: true,
			}),
		).toEqual([]);
	});
});

function fakeContext(
	parameters: Record<string, unknown>,
	response: unknown,
	continueOnFail = false,
) {
	const requests: unknown[] = [];
	const context = {
		getInputData: () => [{ json: {} }, { json: {} }],
		getNode: () => ({ name: 'Tasks', credentials: { todoApi: { id: '1', name: 'Todo' } } }),
		getNodeParameter: (name: string) => parameters[name],
		continueOnFail: () => continueOnFail,
		helpers: {
			httpRequestWithAuthentication: async (credentialType: string, options: unknown) => {
				requests.push([credentialType, options]);
				return response;
			},
		},
	};
	// The runtime reads only these members.
	return { context: context as unknown as IExecuteFunctions, requests };
}

describe('toNodeType', () => {
	const NodeType = toNodeType(listTasks);

	it('describes the node from the contract', () => {
		const { description } = new NodeType();
		expect(description.name).toBe('todoTaskGetAll');
		expect(description.credentials).toEqual([{ name: 'todoApi', required: true }]);
		expect(description.properties.map((p) => [p.name, p.type, p.required])).toEqual([
			['project', 'string', true],
			['paging', 'json', true],
			['status', 'options', false],
		]);
	});

	it('runs per item, applies the credential, and pairs output items', async () => {
		const { context, requests } = fakeContext(
			{ project: 'p1', paging: '{"mode":"limit","max":2}' },
			[{ id: 't1', title: 'Write', tags: [] }],
		);
		const execute = new NodeType().execute;
		const result = await execute?.call(context);
		expect(result).toEqual([
			[
				{ json: { id: 't1', title: 'Write', tags: [] }, pairedItem: { item: 0 } },
				{ json: { id: 't1', title: 'Write', tags: [] }, pairedItem: { item: 1 } },
			],
		]);
		expect(requests[0]).toEqual([
			'todoApi',
			expect.objectContaining({
				method: 'GET',
				url: 'https://todo.test/projects/p1/tasks',
				qs: { max: 2 },
			}),
		]);
	});

	it('fails an item whose output breaks the contract, or continues with an error item', async () => {
		const bad = [{ id: 1 }];
		const { context } = fakeContext({ project: 'p1', paging: { mode: 'all' } }, bad);
		await expect(new NodeType().execute?.call(context)).rejects.toThrow(
			'Output does not match the contract',
		);
		const lenient = fakeContext({ project: 'p1', paging: { mode: 'all' } }, bad, true);
		const result = await new NodeType().execute?.call(lenient.context);
		expect(JSON.stringify(result)).toContain('output.id: must be string');
	});
});

describe('generateNodeModule', () => {
	it('wraps non-literal leaves in Value and keeps selectors literal', () => {
		const text = generateNodeModule('todo', [
			{ contract: toContract(listTasks), nodeType: '@n8n/nodes-base-next.todoTaskGetAll' },
		]);
		expect(text).toContain('project: Value<I, C, string>;');
		expect(text).toContain('mode: "limit";');
		expect(text).toContain('max?: Value<I, C, number>;');
		expect(text).toContain('status?: "open" | "done";');
		expect(text).toContain('export const todo = {\n\ttask: {\n\t\t/** Get many tasks.');
		expect(text).toContain('contractStep("@n8n/nodes-base-next.todoTaskGetAll", config)');
	});
});
