import {
	arr,
	matches,
	obj,
	oneOf,
	Schema,
	str,
	type Http,
	type Infer,
	type JsonSchema,
} from '@n8n/node-sdk';

const NULLABLE_STRING: JsonSchema = { anyOf: [{ type: 'string' }, { type: 'null' }] };

export const task = obj({
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

export async function listTasks(
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
