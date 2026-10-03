import { matches, path, Schema, t, type Http, type Infer, type JsonSchema } from '@n8n/node-sdk';

const NULLABLE_STRING: JsonSchema = { anyOf: [{ type: 'string' }, { type: 'null' }] };

export const task = t.obj({
	id: t.str(),
	title: t.str(),
	status: t.oneOf('open', 'done'),
	assignee: new Schema<string | null>(NULLABLE_STRING, false),
	createdAt: t.str().with({ format: 'date-time' }),
});

type Task = Infer<typeof task>;

const page = t.obj({
	data: t.arr(task),
	nextCursor: new Schema<string | null>(NULLABLE_STRING, false),
});

export async function listTasks(
	http: Http,
	status: string | undefined,
	limit: number,
	cursor?: string,
): Promise<readonly Task[]> {
	const response = await http.request({
		path: path`/tasks`,
		query: { status, cursor, pageSize: Math.min(50, limit) },
	});
	if (!matches(page, response)) throw new Error('Acme Tasks returned an unexpected page');
	const rest = limit - response.data.length;
	return response.nextCursor && rest > 0
		? [...response.data, ...(await listTasks(http, status, rest, response.nextCursor))]
		: response.data.slice(0, limit);
}
