import {
	apiKey,
	arr,
	bool,
	defineAction,
	defineNode,
	int,
	json,
	lit,
	matches,
	obj,
	str,
	union,
	type Http,
	type Infer,
} from '@n8n/node-sdk';

const eventLogApi = apiKey({
	name: 'eventLogApi',
	displayName: 'Event Log API',
	key: 'X-Events-Key',
});

export const credentials = [eventLogApi];

export const node = defineNode({
	id: 'eventLog',
	displayName: 'Event Log',
	credentials: [eventLogApi],
	baseUrl: 'http://127.0.0.1:18090/events/v1',
});

const liveEvent = obj({
	id: str(),
	type: str(),
	actor: str(),
	occurredAt: str(),
	deleted: lit(false),
});

const tombstone = obj({ id: str(), occurredAt: str(), deleted: lit(true) });

const event = union(liveEvent, tombstone);

type Event = Infer<typeof event>;

const page = obj({
	body: obj({ data: arr(event) }),
	headers: json(),
}).with({ additionalProperties: true });

/** The offset of the zone at this UTC time, in milliseconds. */
function zoneOffset(utc: number, timeZone: string): number {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	}).formatToParts(new Date(utc));
	const part = (type: string) => Number(parts.find((entry) => entry.type === type)?.value);
	const wall = Date.UTC(
		part('year'),
		part('month') - 1,
		part('day'),
		part('hour'),
		part('minute'),
		part('second'),
	);
	return wall - utc;
}

/** The API form of a time: UTC, whole seconds. A value without an offset is local in `timeZone`. */
function toUtc(value: string, timeZone: string): string {
	const wall = Date.parse(`${value}Z`);
	const instant = /(Z|[+-]\d{2}:\d{2})$/i.test(value)
		? Date.parse(value)
		: wall - zoneOffset(wall - zoneOffset(wall, timeZone), timeZone);
	return new Date(instant).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

const nextLink = (header: unknown) =>
	typeof header === 'string' ? /<([^>]+)>;\s*rel="next"/.exec(header)?.[1] : undefined;

async function readEvents(
	http: Http,
	request: { url?: string; query?: Record<string, string | number | undefined> },
	keep: (entry: Event) => boolean,
	wanted: number,
	kept: readonly Event[],
): Promise<readonly Event[]> {
	const response = await http.request({ path: '/events', ...request, fullResponse: true });
	if (!matches(page, response)) throw new Error('Events returned an unexpected page');
	const all = [...kept, ...response.body.data.filter(keep)];
	const next = nextLink(response.headers.link);
	return next && all.length < wanted
		? await readEvents(http, { url: next }, keep, wanted, all)
		: all.slice(0, wanted);
}

export const getManyEvents = defineAction({
	node,
	id: 'eventLog.event.getAll',
	action: 'Get many events',
	summary: 'List events in a time range, without deleted events by default.',
	flow: { effect: 'read', cardinality: '1:N', passthrough: 'replace', idempotent: true },
	input: {
		since: str(),
		until: str().optional(),
		timeZone: str().default('UTC'),
		includeDeleted: bool().default(false),
		returnAll: bool().default(false),
		limit: int().with({ minimum: 1 }).default(50),
	},
	output: event,
	async run({ input, http, emit }) {
		const query = {
			occurred_after: toUtc(input.since, input.timeZone),
			occurred_before: input.until ? toUtc(input.until, input.timeZone) : undefined,
			limit: 50,
		};
		const keep = (entry: Event) => input.includeDeleted || !entry.deleted;
		const wanted = input.returnAll ? Infinity : input.limit;
		for (const entry of await readEvents(http, { query }, keep, wanted, [])) emit(entry);
	},
});

export const actions = [getManyEvents];
