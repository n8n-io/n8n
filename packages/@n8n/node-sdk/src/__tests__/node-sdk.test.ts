import type { IExecuteFunctions } from 'n8n-workflow';

import {
	arr,
	defineAction,
	defineNode,
	exampleOf,
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
	type Action,
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
		expect(description.properties.map((p) => [p.name, p.type, p.required, p.default])).toEqual([
			['project', 'string', true, ''],
			['paging', 'json', true, '{}'],
			['status', 'options', false, ''],
		]);
	});

	it('adds one authentication selector when the node takes several credential types', () => {
		const open = defineNode({
			id: 'web',
			displayName: 'Web',
			credentials: ['a', 'b'],
			authOptional: true,
		});
		const { description } = new (toNodeType({
			...listTasks,
			node: open,
			credentialTypes: ['a', 'b'],
		}))();
		expect(description.properties[0]).toMatchObject({ name: 'authentication', default: 'none' });
		expect(description.credentials).toEqual([
			{ name: 'a', required: false, displayOptions: { show: { authentication: ['a'] } } },
			{ name: 'b', required: false, displayOptions: { show: { authentication: ['b'] } } },
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

	it('treats filled-in defaults of optional fields as unset', async () => {
		const { context, requests } = fakeContext(
			{ project: 'p1', paging: { mode: 'all' }, status: '' },
			[],
		);
		await expect(new NodeType().execute?.call(context)).resolves.toEqual([[]]);
		expect(requests).toHaveLength(2);
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

describe('exampleOf', () => {
	it('builds a value that matches the output schema', () => {
		const schema = obj({ id: str(), tags: arr(str()), paging: variant('mode', { all: {} }) });
		const example = exampleOf(schema.json);
		expect(example).toEqual({ id: 'example', tags: ['example'], paging: { mode: 'all' } });
		expect(validate(example, schema.json)).toEqual([]);
	});
});

describe('generateNodeModule', () => {
	const moduleOf = (...actions: Action[]) =>
		generateNodeModule(
			'todo',
			actions.map((action) => ({
				contract: toContract(action),
				nodeType: `@n8n/nodes-base-next.${action.id}`,
			})),
		);

	const list = variant('mode', {
		name: { name: str().hint('Exact list name') },
		id: { id: str().hint('Numeric list ID') },
	});
	const listAction = (id: string, extra = {}) =>
		defineAction({
			node: todo,
			id,
			action: 'Find tasks',
			summary: 'Find tasks in a list.',
			flow: listTasks.flow,
			output: listTasks.output,
			async run() {},
			input: {
				...extra,
				list,
				sort: variant('by', {
					field: { field: str().hint('Exact field name'), direction: oneOf('asc', 'desc') },
					rank: { field: str().hint('Exact field name'), weight: num() },
				}),
			},
		});

	it('wraps non-literal leaves in Value and keeps selectors literal', () => {
		const text = moduleOf(listTasks);
		expect(text).toContain('project: Value<I, C, string>;');
		expect(text).toContain('status?: "open" | "done";');
		expect(text).toContain('export const todo = {\n task: {\n  /** Get many tasks.');
		expect(text).toContain('contractStep("@n8n/nodes-base-next.todo.task.getAll", config)');
	});

	it('prints short objects without docs on one line', () => {
		expect(moduleOf(listTasks)).toContain(
			'paging: { mode: "all" } | { mode: "limit"; max?: Value<I, C, number> };',
		);
	});

	it('shows the action flow once, on the factory', () => {
		const text = moduleOf(listTasks);
		expect(text).toContain(
			'/** Get many tasks. List tasks in a project. (read, 1:N) */\n  getAll:',
		);
		expect(text.match(/List tasks in a project/g)).toHaveLength(1);
	});

	it('shows a field doc that repeats across union branches on the first branch only', () => {
		const text = moduleOf(listAction('todo.task.search'));
		expect(text.match(/\/\*\* Exact field name \*\//g)).toHaveLength(1);
		expect(text).toContain('/** Numeric list ID */');
	});

	it('prints a field that every union branch shares once, beside the union', () => {
		expect(moduleOf(listAction('todo.task.search'))).toContain(
			' sort: {\n  /** Exact field name */\n  field: Value<I, C, string>;\n } & ({ by: "field"; direction: "asc" | "desc" } | { by: "rank"; weight: Value<I, C, number> });',
		);
	});

	it('shows a field doc that an earlier action shows on the first action only', () => {
		const text = moduleOf(
			listTasks,
			listAction('todo.task.search', { project: str().hint('Project ID') }),
		);
		expect(text.match(/Project ID/g)).toHaveLength(1);
		expect(text).toContain(
			'export type TodoTaskSearchInput<I, C> = {\n project: Value<I, C, string>;',
		);
	});

	it('names a repeated type once and references the name', () => {
		const text = moduleOf(
			listAction('todo.task.search'),
			listAction('todo.task.find', { limit: num() }),
		);
		expect(text).toContain('type TodoTaskSearchList<I, C> = {\n mode: "name";');
		expect(text.match(/list: TodoTaskSearchList<I, C>;/g)).toHaveLength(2);
		expect(text.match(/Exact list name/g)).toHaveLength(1);
		expect(text).toContain('export type TodoTaskFindOutput = TodoTaskSearchOutput;');
	});
});
