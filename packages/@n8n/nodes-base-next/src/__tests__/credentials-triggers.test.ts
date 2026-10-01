import { toCredentialType, toTriggerNodeType } from '@n8n/node-sdk';
import { createHmac } from 'node:crypto';
import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IDataObject,
	IHttpRequestOptions,
	INodeType,
} from 'n8n-workflow';

import { repositoryEvent } from '../nodes/github/repository.event';
import { notionApi, notionOAuth2Api } from '../nodes/notion/credentials';
import { databasePageAdded } from '../nodes/notion/database-page.added';

// The legacy sources load at run time. A static import makes tsc check nodes-base with the
// settings of this package.
const legacy = async (path: string): Promise<Record<string, new () => unknown>> =>
	(await import(`n8n-nodes-base/${path}`)) as Record<string, new () => unknown>;
const legacyCredential = async (path: string, name: string) =>
	new (await legacy(path))[name]() as ICredentialType;
const legacyNode = async (path: string, name: string) =>
	new (await legacy(path))[name]() as INodeType;

/** The members of a credential type that n8n reads, without class methods. */
const described = ({
	name,
	displayName,
	documentationUrl,
	extends: parents,
	properties,
	test,
}: ICredentialType) => ({
	name,
	displayName,
	documentationUrl,
	extends: parents,
	properties,
	test,
});

describe('Notion credentials in the new format', () => {
	it('project to the legacy notionOAuth2Api', async () => {
		const old = await legacyCredential(
			'credentials/NotionOAuth2Api.credentials',
			'NotionOAuth2Api',
		);
		const projected = toCredentialType(notionOAuth2Api);
		if (!projected) throw new Error('no projection');
		expect(described(projected)).toEqual(described(old));
	});

	it('project to the legacy notionApi and sign requests the same way', async () => {
		const old = await legacyCredential('credentials/NotionApi.credentials', 'NotionApi');
		const projected = toCredentialType(notionApi);
		if (!projected) throw new Error('no projection');
		expect(described(projected)).toEqual(described(old));
		const data: ICredentialDataDecryptedObject = { apiKey: 'secret_1' };
		const requests: IHttpRequestOptions[] = [
			{ url: 'https://api.notion.com/v1/users/me' },
			{ url: 'https://api.notion.com/v1/pages', headers: { 'Notion-Version': '2026-03-11' } },
		];
		for (const request of requests) {
			const sign = async (type: ICredentialType) => {
				if (typeof type.authenticate !== 'function') throw new Error('no authenticate');
				return await type.authenticate(data, { ...request, headers: { ...request.headers } });
			};
			expect(await sign(projected)).toEqual(await sign(old));
		}
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
) {
	return {
		getNode: () => ({
			name: 'Notion Trigger',
			typeVersion: 1.1,
			credentials: { notionApi: { id: '1' } },
		}),
		getNodeParameter: (name: string, fallback?: unknown) => parameters[name] ?? fallback,
		getWorkflowStaticData: () => staticData,
		getMode: () => 'trigger',
		getCredentials: async () => await Promise.resolve({ apiKey: 'k' }),
		helpers: {
			httpRequestWithAuthentication: async (_type: string, options: IHttpRequestOptions) =>
				await Promise.resolve(queryNotion(pages())(options)),
			returnJsonArray: (items: IDataObject[]) => items.map((json) => ({ json })),
		},
	};
}

describe('notion.databasePage.added against the legacy Notion trigger', () => {
	afterEach(() => vi.useRealTimers());

	it('emits the same pages over the same polls', async () => {
		const old = await legacyNode('nodes/Notion/NotionTrigger.node', 'NotionTrigger');
		const next = new (toTriggerNodeType(databasePageAdded))();
		const oldData: IDataObject = {};
		const newData: IDataObject = {};
		const state = { pages: [{ id: 'a', created_time: '2026-10-01T09:00:00.000Z' }] };
		const oldContext = pollContext(
			{ event: 'pageAddedToDatabase', simple: true, dataSourceId: 'ds1', authentication: 'apiKey' },
			oldData,
			() => state.pages,
		);
		const newContext = pollContext(
			{ dataSource: 'ds1', authentication: 'notionApi' },
			newData,
			() => state.pages,
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

	it('registers the same webhook and stores the same static data keys', async () => {
		const old = await legacyNode('nodes/Github/GithubTrigger.node', 'GithubTrigger');
		const next = new (toTriggerNodeType(repositoryEvent))();
		const runs = await Promise.all(
			[
				[old, oldParameters],
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
		expect(Object.keys(newRun?.staticData ?? {}).sort()).toEqual(['webhookId', 'webhookSecret']);
		expect(newRun?.staticData.webhookId).toBe('42');
		// The legacy trigger keeps the numeric ID; the new one keeps text. Both compare as text.
		expect(legacyRun?.staticData.webhookId).toBe(42);
	});

	it('accepts and rejects the same deliveries', async () => {
		const old = await legacyNode('nodes/Github/GithubTrigger.node', 'GithubTrigger');
		const next = new (toTriggerNodeType(repositoryEvent))();
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
			expect(result).toEqual(await deliver(old, oldParameters, body, key));
		}
	});
});
