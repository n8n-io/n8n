import { toCredentialType, toTriggerNodeType, toVersionedTriggerType } from '@n8n/node-sdk/host';
import { NotionApi } from 'n8n-nodes-base/dist/credentials/NotionApi.credentials';
import { GithubTrigger } from 'n8n-nodes-base/dist/nodes/Github/GithubTrigger.node';
import { Notion } from 'n8n-nodes-base/dist/nodes/Notion/Notion.node';
import { NotionTrigger } from 'n8n-nodes-base/dist/nodes/Notion/NotionTrigger.node';
import { createHmac } from 'node:crypto';
import type { ICredentialType, IDataObject, IHttpRequestOptions, INodeType } from 'n8n-workflow';

import { repositoryEvent } from '../../nodes/github/actions/repository.event';
import { notionToken } from '../../nodes/notion/credentials';
import { pageAdded } from '../../nodes/notion/actions/data-source.page-added';
import { getUser } from '../../nodes/notion/actions/user.get';
import { versionsOf } from '../../registry';
import {
	actionNode,
	compareRuns,
	runNode,
	type ParityCase,
} from '../../../../nodes-core/src/__tests__/parity/harness';

const projected = (type: Parameters<typeof toCredentialType>[0]) => {
	const result = toCredentialType(type);
	if (!result) throw new Error(`${type.name} has no projection`);
	return result;
};

const USER = '6794760a-1f15-45cd-9c65-0dfe42f5135a';

const userCase = (types: readonly ICredentialType[]): ParityCase => ({
	credential: { data: { apiKey: 'secret_parity' }, types },
	input: [{}],
	routes: [
		{
			method: 'GET',
			url: `https://api.notion.com/v1/users/${USER}`,
			json: { object: 'user', id: USER, type: 'person', name: 'Ada', person: { email: 'a@x.io' } },
		},
	],
});

describe('notion.user.get (declarative) parity with Notion v2 user get', () => {
	it('sends the same request with the projected credential and emits the same item', async () => {
		const legacy = await runNode(
			{
				nodeType: new Notion(),
				type: 'n8n-nodes-base.notion',
				typeVersion: 2.2,
				credential: 'notionApi',
				parameters: { resource: 'user', operation: 'get', userId: USER },
			},
			userCase([new NotionApi()]),
		);
		const next = await runNode(
			actionNode(getUser, { authentication: 'notionApi', user: USER }, 'notionApi'),
			userCase([projected(notionToken)]),
		);
		expect(legacy.error).toBeUndefined();
		expect(legacy.items).toHaveLength(1);
		expect(compareRuns(legacy, next, [])).toEqual({ unexplained: [], stale: [] });
	});
});

interface Page {
	readonly id: string;
	readonly created_time: string;
}

const notionPage = ({ id, created_time }: Page) => ({
	object: 'page',
	id,
	created_time,
	url: `https://www.notion.so/${id}`,
	parent: { type: 'data_source_id', data_source_id: 'ds1' },
	properties: {
		Name: { id: 'title', type: 'title', title: [{ type: 'text', plain_text: `Page ${id}` }] },
		Status: { id: 's', type: 'status', status: { name: 'Open' } },
		Points: { id: 'n', type: 'number', ['number']: 3 },
	},
});

/** A fake Notion query: newest first, filtered by `on_or_after`, at most `page_size` pages. */
const queryNotion = (pages: readonly Page[]) => (options: IHttpRequestOptions) => {
	const body = (options.body ?? {}) as {
		page_size?: number;
		filter?: { created_time?: { on_or_after?: string } };
	};
	const since = Date.parse(body.filter?.created_time?.on_or_after ?? '1970-01-01');
	const found = [...pages]
		.filter((page) => Date.parse(page.created_time) >= since)
		.sort((a, b) => Date.parse(b.created_time) - Date.parse(a.created_time));
	const size = body.page_size ?? 100;
	return {
		results: found.slice(0, size).map(notionPage),
		has_more: found.length > size,
		next_cursor: null,
	};
};

function pollContext(
	parameters: Record<string, unknown>,
	staticData: IDataObject,
	pages: () => readonly Page[],
	sent: IHttpRequestOptions[],
	mode = 'trigger',
) {
	return {
		getNode: () => ({
			name: 'Notion Trigger',
			typeVersion: 1.1,
			credentials: { notionApi: { id: '1' } },
		}),
		getNodeParameter: (name: string, fallback?: unknown) => parameters[name] ?? fallback,
		getWorkflowStaticData: () => staticData,
		getMode: () => mode,
		getCredentials: async () => await Promise.resolve({ apiKey: 'k' }),
		helpers: {
			httpRequestWithAuthentication: async (_type: string, options: IHttpRequestOptions) => {
				sent.push(options);
				return await Promise.resolve(queryNotion(pages())(options));
			},
			returnJsonArray: (items: IDataObject[]) => items.map((json) => ({ json })),
		},
	};
}

const DATA_SOURCE = '2a3b4c5d6e7f40818293a4b5c6d7e8f9';

describe('notion.dataSource.pageAdded against the legacy Notion trigger', () => {
	afterEach(() => vi.useRealTimers());

	const frozen = new (toVersionedTriggerType(versionsOf(pageAdded.id)))().getNodeType(1);

	it.each([
		['the source', new (toTriggerNodeType(pageAdded))()],
		['the frozen bundle', frozen],
	])('emits the same pages over the same polls from %s', async (_, next) => {
		const old = new NotionTrigger();
		const [oldData, newData]: IDataObject[] = [{}, {}];
		const [oldSent, newSent]: IHttpRequestOptions[][] = [[], []];
		const state = { pages: [{ id: 'a', created_time: '2026-10-01T09:00:00.000Z' }] };
		const oldContext = pollContext(
			{
				event: 'pageAddedToDatabase',
				simple: true,
				dataSourceId: DATA_SOURCE,
				authentication: 'apiKey',
			},
			oldData,
			() => state.pages,
			oldSent,
		);
		const newContext = pollContext(
			{ dataSource: DATA_SOURCE, authentication: 'notionApi' },
			newData,
			() => state.pages,
			newSent,
		);
		const pollAt = async (time: string, added: Page[]) => {
			vi.useFakeTimers({ now: new Date(time) });
			state.pages = [...state.pages, ...added];
			const ids = async (type: INodeType, context: object) =>
				((await type.poll?.call(context as never)) ?? [[]])[0]?.map(({ json }) => json);
			return [await ids(old, oldContext), await ids(next, newContext)];
		};
		// Activation: older pages are not new.
		expect(await pollAt('2026-10-01T10:00:42Z', [])).toEqual([[], []]);
		const [oldB, newB] = await pollAt('2026-10-01T10:01:30Z', [
			{ id: 'b', created_time: '2026-10-01T10:01:00.000Z' },
		]);
		expect(newB).toEqual(oldB);
		expect(newB).toEqual([{ id: 'b', Name: 'Page b', Status: 'Open', Points: 3 }]);
		// `c` has the minute of `b`, which both triggers already emitted.
		const [oldCD, newCD] = await pollAt('2026-10-01T10:02:10Z', [
			{ id: 'c', created_time: '2026-10-01T10:01:00.000Z' },
			{ id: 'd', created_time: '2026-10-01T10:02:00.000Z' },
		]);
		expect(newCD?.map(({ id }) => id)).toEqual(['d', 'c']);
		expect(newCD).toEqual(oldCD);
		expect(await pollAt('2026-10-01T10:03:05Z', [])).toEqual([[], []]);
		// The legacy trigger probes with page_size 1, then asks again with 10: 7 requests for 4
		// polls. The contract sends one request per poll with page_size 100.
		expect([oldSent.length, newSent.length]).toEqual([7, 4]);
		expect(new Set(newSent.map(({ url }) => url))).toEqual(new Set(oldSent.map(({ url }) => url)));
	});

	it('sends the same request and shows the same page in a manual run', async () => {
		const pages: Page[] = [
			{ id: 'a', created_time: '2026-10-01T09:00:00.000Z' },
			{ id: 'b', created_time: '2026-10-01T10:01:00.000Z' },
		];
		const [oldData, newData]: IDataObject[] = [{}, {}];
		const [oldSent, newSent]: IHttpRequestOptions[][] = [[], []];
		const oldContext = pollContext(
			{
				event: 'pageAddedToDatabase',
				simple: true,
				dataSourceId: DATA_SOURCE,
				authentication: 'apiKey',
			},
			oldData,
			() => pages,
			oldSent,
			'manual',
		);
		const newContext = pollContext(
			{ dataSource: DATA_SOURCE, authentication: 'notionApi' },
			newData,
			() => pages,
			newSent,
			'manual',
		);
		const oldItems = await new NotionTrigger().poll.call(oldContext as never);
		const newItems = await new (toTriggerNodeType(pageAdded))().poll?.call(newContext as never);
		expect(newItems?.[0]?.map(({ json }) => json)).toEqual(oldItems?.[0]?.map(({ json }) => json));
		expect(newItems?.[0]?.map(({ json }) => json)).toEqual([
			{ id: 'b', Name: 'Page b', Status: 'Open', Points: 3 },
		]);
		expect(newSent.map(({ body }) => body)).toEqual(oldSent.map(({ body }) => body));
		expect(newSent[0]?.body).toMatchObject({ page_size: 1 });
		expect(newData).toEqual({});
	});
});

function hookContext(options: {
	parameters: Record<string, unknown>;
	staticData: IDataObject;
	sent: unknown[];
	request?: { body: IDataObject; headers: Record<string, string>; rawBody: Buffer };
}) {
	const { request } = options;
	const reply = async (method: unknown, url: unknown, body: unknown) => {
		options.sent.push({ method, url, body });
		return await Promise.resolve(
			method === 'POST' ? { id: 42, active: true, events: ['push'] } : {},
		);
	};
	const response = { status: () => response, send: () => response, end: () => response };
	return {
		getNode: () => ({ name: 'GitHub Trigger', credentials: { githubApi: { id: '1' } } }),
		getWorkflow: () => ({ id: 'w1' }),
		getNodeParameter: (name: string, fallback?: unknown) => options.parameters[name] ?? fallback,
		getWorkflowStaticData: () => options.staticData,
		getNodeWebhookUrl: () => 'https://n8n.example.com/webhook/abc/webhook',
		getCredentials: async () =>
			await Promise.resolve({ server: 'https://api.github.com', accessToken: 't' }),
		getBodyData: () => request?.body ?? {},
		getHeaderData: () => request?.headers ?? {},
		getQueryData: () => ({}),
		getRequestObject: () => ({
			rawBody: request?.rawBody,
			header: (name: string) => request?.headers[name.toLowerCase()],
		}),
		getResponseObject: () => response,
		logger: { warn: () => {} },
		helpers: {
			// The legacy trigger sends `uri`; the new one sends `url`.
			requestWithAuthentication: async (
				_type: string,
				o: { method: string; uri: string; body: unknown },
			) => await reply(o.method, o.uri, o.body),
			httpRequestWithAuthentication: async (_type: string, o: IHttpRequestOptions) =>
				await reply(o.method, o.url, o.body),
			returnJsonArray: (items: IDataObject[]) => items.map((json) => ({ json })),
		},
	};
}

describe('github.repository.event against the legacy GitHub trigger', () => {
	const shared = { owner: 'acme', repository: 'app', events: ['push'] };
	const oldParameters = { ...shared, authentication: 'accessToken', options: {} };
	const newParameters = { ...shared, authentication: 'githubApi' };
	const next = new (toTriggerNodeType(repositoryEvent))();

	it('registers the same webhook and stores the legacy static data keys it reads', async () => {
		const runs = await Promise.all(
			[
				[new GithubTrigger(), oldParameters],
				[next, newParameters],
			].map(async ([type, parameters]) => {
				const sent: unknown[] = [];
				const staticData: IDataObject = {};
				const context = hookContext({
					parameters: parameters as Record<string, unknown>,
					staticData,
					sent,
				});
				await (type as INodeType).webhookMethods?.default?.create.call(context as never);
				return { sent, staticData };
			}),
		);
		const [legacyRun, newRun] = runs;
		const secretFree = (run: typeof legacyRun) =>
			JSON.parse(JSON.stringify(run?.sent).replace(/[0-9a-f]{64}/g, 'SECRET')) as unknown;
		expect(secretFree(newRun)).toEqual(secretFree(legacyRun));
		// `webhookEvents` is a known difference: the legacy trigger stores it and never reads it.
		expect(Object.keys(newRun?.staticData ?? {}).sort()).toEqual(
			Object.keys(legacyRun?.staticData ?? {})
				.filter((key) => key !== 'webhookEvents')
				.sort(),
		);
		expect(Object.keys(newRun?.staticData ?? {}).sort()).toEqual(['webhookId', 'webhookSecret']);
		expect(newRun?.staticData.webhookId).toBe('42');
		// The legacy trigger keeps the numeric ID; the new one keeps text. Both compare as text.
		expect(legacyRun?.staticData.webhookId).toBe(42);
	});

	it('accepts and rejects the same deliveries', async () => {
		const deliver = async (
			type: INodeType,
			parameters: Record<string, unknown>,
			body: IDataObject,
			key: string,
		) => {
			const rawBody = Buffer.from(JSON.stringify(body));
			const signature = `sha256=${createHmac('sha256', key).update(rawBody).digest('hex')}`;
			const headers = { 'x-hub-signature-256': signature, 'x-github-event': 'issues' };
			const context = hookContext({
				parameters,
				staticData: { webhookId: '42', webhookSecret: 'stored' },
				sent: [],
				request: { body, headers, rawBody },
			});
			return await type.webhook?.call(context as never);
		};
		const cases: Array<[IDataObject, string, unknown]> = [
			[
				{ action: 'opened', issue: { ['number']: 1 } },
				'stored',
				{ workflowData: [[expect.anything()]] },
			],
			[{ hook_id: 42, zen: 'Keep it simple' }, 'stored', { webhookResponse: 'OK' }],
			[{ action: 'opened' }, 'forged', { noWebhookResponse: true }],
		];
		for (const [body, key, expected] of cases) {
			const result = await deliver(next, newParameters, body, key);
			expect(result).toEqual(expected);
			expect(result).toEqual(await deliver(new GithubTrigger(), oldParameters, body, key));
		}
	});
});
