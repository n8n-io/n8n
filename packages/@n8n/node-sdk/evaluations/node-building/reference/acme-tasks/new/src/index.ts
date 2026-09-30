import {
	arr,
	bool,
	defineAction,
	defineCredential,
	defineNode,
	int,
	matches,
	obj,
	oneOf,
	Schema,
	str,
	type Http,
	type Infer,
	type JsonSchema,
} from '@n8n/node-sdk';

export const credentials = [
	defineCredential({
		name: 'acmeTasksApi',
		displayName: 'Acme Tasks API',
		properties: [
			{ name: 'apiKey', displayName: 'API Key', type: 'string', typeOptions: { password: true } },
		],
		authenticate: { headers: { 'X-Acme-Key': '={{$credentials.apiKey}}' } },
	}),
];

export const node = defineNode({
	id: 'acmeTasks',
	displayName: 'Acme Tasks',
	credentials: ['acmeTasksApi'],
	baseUrl: 'http://127.0.0.1:18090/acme-tasks/v1',
});

const NULLABLE_STRING: JsonSchema = { anyOf: [{ type: 'string' }, { type: 'null' }] };

const task = obj({
	id: str(),
	title: str(),
	status: oneOf('open', 'done'),
	assignee: new Schema<string | null>(NULLABLE_STRING, false),
	createdAt: str().with({ format: 'date-time' }),
});

type Task = Infer<typeof task>;

const page = obj({
	data: arr(task),
	nextCursor: new Schema<string | null>(NULLABLE_STRING, false),
});

async function listTasks(
	http: Http,
	status: string | undefined,
	limit: number,
	cursor?: string,
): Promise<readonly Task[]> {
	const response = await http.request({
		path: '/tasks',
		query: { status, cursor, pageSize: Math.min(50, limit) },
	});
	if (!matches(page, response)) throw new Error('Acme Tasks returned an unexpected page');
	const rest = limit - response.data.length;
	return response.nextCursor && rest > 0
		? [...response.data, ...(await listTasks(http, status, rest, response.nextCursor))]
		: response.data.slice(0, limit);
}

export const getManyTasks = defineAction({
	node,
	id: 'acmeTasks.task.getAll',
	action: 'Get many tasks',
	summary: 'List Acme tasks, optionally filtered by status.',
	flow: { effect: 'read', cardinality: '1:N', passthrough: 'replace', idempotent: true },
	input: {
		status: oneOf('any', 'open', 'done').default('any'),
		returnAll: bool().default(false),
		limit: int().with({ minimum: 1 }).default(50),
	},
	output: task,
	async run({ input, http, emit }) {
		const status = input.status === 'any' ? undefined : input.status;
		const limit = input.returnAll ? Infinity : (input.limit ?? 50);
		for (const item of await listTasks(http, status, limit)) emit(item);
	},
});

export const createTask = defineAction({
	node,
	id: 'acmeTasks.task.create',
	action: 'Create a task',
	summary: 'Create an Acme task.',
	flow: { effect: 'write', cardinality: 'per-item', passthrough: 'replace' },
	input: { title: str().with({ minLength: 1 }), assignee: str().optional() },
	output: task,
	async run({ input, http, emit }) {
		const created = await http.request({
			method: 'POST',
			path: '/tasks',
			body: { title: input.title, ...(input.assignee ? { assignee: input.assignee } : {}) },
		});
		if (!matches(task, created)) throw new Error('Acme Tasks returned an unexpected task');
		emit(created);
	},
});

export const actions = [getManyTasks, createTask];
