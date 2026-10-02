import { matches, t, type Http, type Infer } from '@n8n/node-sdk';

import { events } from '../event-log.node';

const liveEvent = t.obj({
	id: t.str(),
	type: t.str(),
	actor: t.str(),
	occurredAt: t.str(),
	deleted: t.lit(false),
});

const tombstone = t.obj({ id: t.str(), occurredAt: t.str(), deleted: t.lit(true) });

const event = t.union(liveEvent, tombstone);

type Event = Infer<typeof event>;

const page = t
	.obj({
		body: t.obj({ data: t.arr(event) }),
		headers: t.json(),
	})
	.with({ additionalProperties: true });

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

export const getManyEvents = events.action('getAll', {
	action: 'Get many events',
	summary: 'List events in a time range, without deleted events by default.',
	flow: { effect: 'read', cardinality: '1:N', idempotent: true },
	input: {
		since: t.str(),
		until: t.str().optional(),
		timeZone: t.str().default('UTC'),
		includeDeleted: t.bool().default(false),
		returnAll: t.bool().default(false),
		limit: t.int().with({ minimum: 1 }).default(50),
	},
	output: event,
	async *run({ input, http }) {
		const query = {
			occurred_after: toUtc(input.since, input.timeZone),
			occurred_before: input.until ? toUtc(input.until, input.timeZone) : undefined,
			limit: 50,
		};
		const keep = (entry: Event) => input.includeDeleted || !entry.deleted;
		const wanted = input.returnAll ? Infinity : input.limit;
		yield* await readEvents(http, { query }, keep, wanted, []);
	},
});
