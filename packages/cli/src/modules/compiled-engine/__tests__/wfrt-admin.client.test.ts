/**
 * The admin client of `wfrt`: it resumes the durable events of the outbox from
 * n8n's cursor, and it acks the events that n8n handled.
 */
import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { CompiledEngineConfig } from '../compiled-engine.config';
import type { WfrtEvent } from '../compiled-engine.types';
import { WfrtAdminClient, afterQuery } from '../wfrt-admin.client';

/** A stream answer that gives `lines`, then ends. */
function responseOf(lines: string[]): Response {
	const body = (async function* () {
		for (const line of lines) yield Buffer.from(`${line}\n`);
	})();
	return { ok: true, status: 200, body, text: async () => '' } as unknown as Response;
}

function setup(answers: Response[]) {
	const config = mock<CompiledEngineConfig>({ adminPort: 5690, port: 5691 });
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const client = new WfrtAdminClient(config, logger);
	client.setSecret('secret');
	const fetchMock = vi.fn(async () => answers.shift() ?? responseOf([]));
	vi.stubGlobal('fetch', fetchMock);
	return { client, fetchMock };
}

/** The URL and the body of one `fetch` call. */
function callOf(fetchMock: ReturnType<typeof vi.fn>, index: number) {
	const [url, init] = fetchMock.mock.calls[index] as [string, RequestInit];
	return { url, method: init.method, body: init.body };
}

describe('afterQuery', () => {
	it('names each shard with its handled seq, in shard order', () => {
		expect(afterQuery({ '1': 4, '0': 12 })).toBe('?after=0:12,1:4');
	});

	it('sends nothing without a seq, as an older wfrt needs', () => {
		expect(afterQuery({})).toBe('');
		expect(afterQuery(undefined)).toBe('');
		expect(afterQuery({ '0': 0 })).toBe('');
	});
});

describe('WfrtAdminClient', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('resumes the stream after the stored cursor', async () => {
		const { client, fetchMock } = setup([
			responseOf([
				'{"type":"finished","executionId":"w-1","status":"ok","shard":0,"seq":7,"at":1}',
				'{"type":"step","executionId":"w-1","step":"IF","status":"started","at":2}',
			]),
		]);
		const events: WfrtEvent[] = [];

		await client.streamEvents(
			new AbortController().signal,
			() => {},
			(e) => events.push(e),
			{
				'0': 6,
				'2': 1,
			},
		);

		expect(callOf(fetchMock, 0)).toMatchObject({
			url: 'http://127.0.0.1:5690/_admin/events?after=0:6,2:1',
		});
		expect(events).toHaveLength(2);
		expect(events[0]).toMatchObject({ type: 'finished', shard: 0, seq: 7 });
		// A best-effort event carries no outbox position.
		expect(events[1]).not.toHaveProperty('seq');
	});

	it('sends no query when n8n has no cursor yet', async () => {
		const { client, fetchMock } = setup([responseOf([])]);
		await client.streamEvents(
			new AbortController().signal,
			() => {},
			() => {},
			{},
		);
		expect(callOf(fetchMock, 0).url).toBe('http://127.0.0.1:5690/_admin/events');
	});

	it('acks the handled seqs of each shard', async () => {
		const answer = { ok: true, status: 204, text: async () => '' } as unknown as Response;
		const { client, fetchMock } = setup([answer]);

		await client.ackEvents([
			{ shard: 0, seq: 7 },
			{ shard: 1, seq: 2 },
		]);

		const call = callOf(fetchMock, 0);
		expect(call.url).toBe('http://127.0.0.1:5690/_admin/events/ack');
		expect(call.method).toBe('POST');
		expect(JSON.parse(String(call.body))).toEqual({
			acks: [
				{ shard: 0, seq: 7 },
				{ shard: 1, seq: 2 },
			],
		});
	});

	it('sends a credentials-only update to the credentials of the workflow', async () => {
		const answer = {
			ok: true,
			status: 200,
			text: async () => '{"ok":true}',
		} as unknown as Response;
		const { client, fetchMock } = setup([answer]);

		await client.putWorkflowCredentials('wf1~manual', { sa: { data: { t: 'new' } } });

		const call = callOf(fetchMock, 0);
		expect(call.url).toBe('http://127.0.0.1:5690/_admin/workflows/wf1~manual/credentials');
		expect(call.method).toBe('PUT');
		expect(JSON.parse(String(call.body))).toEqual({ sa: { data: { t: 'new' } } });
	});

	it('sends no request for an empty list of acks', async () => {
		const { client, fetchMock } = setup([]);
		await client.ackEvents([]);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});

describe('the workload class of a load', () => {
	const upload = {
		versionId: 'v1',
		module: Buffer.from('m'),
		active: true,
		webhookPrefix: '/webhook',
		saveData: false,
		credentials: {},
		resumeUrlBase: '/resume',
		resumeFormUrlBase: '/form',
	};

	it('sends no class without the setting', async () => {
		const { client, fetchMock } = setup([]);
		await client.putWorkflow('wf1', upload);
		expect(JSON.parse(String(callOf(fetchMock, 0).body))).not.toHaveProperty('class');
	});

	it('sends the class of the workflow from the setting', async () => {
		const config = mock<CompiledEngineConfig>({
			adminPort: 5690,
			port: 5691,
			workloadClasses: 'critical=wf1;background=wf2',
		});
		const logger = mock<Logger>();
		logger.scoped.mockReturnValue(logger);
		const client = new WfrtAdminClient(config, logger);
		const fetchMock = vi.fn(async () => responseOf([]));
		vi.stubGlobal('fetch', fetchMock);
		await client.putWorkflow('wf1', upload);
		await client.putWorkflow('wf2~manual', upload);
		await client.putWorkflow('wf3', upload);
		const classes = [0, 1, 2].map(
			(index) => JSON.parse(String(callOf(fetchMock, index).body)).class as string,
		);
		expect(classes).toEqual(['critical', 'background', 'default']);
	});
});
