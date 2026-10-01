import { isRecord } from '@n8n/utils/is-record';
import { createHmac } from 'node:crypto';
import type {
	IDataObject,
	IHookFunctions,
	IHttpRequestOptions,
	INodeType,
	IPollFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';

import {
	arr,
	compat,
	custom,
	definePollingTrigger,
	defineNode,
	defineWebhookTrigger,
	generateNodeModule,
	int,
	json,
	list,
	obj,
	oneOf,
	str,
	toTriggerContract,
	toTriggerNodeType,
} from '../index';

const hooksApi = compat('hooksApi', {
	fields: { server: str().default('https://hooks.test') },
	baseUrl: ({ server }) => server,
});
const signingApi = custom({
	name: 'signingApi',
	displayName: 'Signing API',
	secrets: { token: str(), signingSecret: str() },
	async authenticate({ token }, request) {
		return await Promise.resolve({ ...request, headers: { ...request.headers, token } });
	},
});
const hooks = defineNode({ id: 'hooks', displayName: 'Hooks', credentials: [hooksApi] });
const signed = defineNode({ id: 'signed', displayName: 'Signed', credentials: [signingApi] });

const event = obj({ action: str(), repo: str() });

const repoEvent = defineWebhookTrigger({
	node: hooks,
	id: 'hooks.repo.event',
	trigger: 'On repository event',
	summary: 'Starts on each repository event.',
	input: { repo: str(), events: arr(oneOf('push', 'issues')).default(['push']) },
	output: event,
	verify: { algorithm: 'sha256', header: 'X-Signature', prefix: 'sha256=', secret: 'generated' },
	register: {
		create: ({ input, url, secret }) => ({
			method: 'POST',
			path: `/repos/${input.repo}/hooks`,
			body: { url, secret, events: input.events },
		}),
		id: (body) => (isRecord(body) && typeof body.id === 'number' ? String(body.id) : undefined),
		check: ({ input, id }) => ({ path: `/repos/${input.repo}/hooks/${id}` }),
		delete: ({ input, id }) => ({ method: 'DELETE', path: `/repos/${input.repo}/hooks/${id}` }),
	},
	// A delivery without an action is the ping that confirms the webhook.
	emit: ({ body }, { repo }) =>
		typeof body.action === 'string' ? [{ action: body.action, repo }] : [],
});

interface Reply {
	readonly status?: number;
	readonly body?: unknown;
}

/** A fake of the n8n trigger contexts. It answers requests from `replies` by `METHOD url`. */
function fakeContext(options: {
	parameters: Record<string, unknown>;
	replies?: Record<string, Reply>;
	staticData?: IDataObject;
	credentials?: Record<string, IDataObject>;
	mode?: 'manual' | 'trigger';
	request?: { body: IDataObject; headers: Record<string, string>; rawBody: Buffer };
}) {
	const staticData = options.staticData ?? {};
	const sent: Array<[string, IHttpRequestOptions, unknown]> = [];
	const responses: unknown[] = [];
	const response = {
		status: (code: number) => {
			responses.push(code);
			return response;
		},
		send: (text: string) => {
			responses.push(text);
			return response;
		},
		end: () => response,
	};
	const credentials = options.credentials ?? {};
	const context = {
		getNode: () => ({
			name: 'Trigger',
			credentials: Object.fromEntries(
				Object.keys(credentials).map((type) => [type, { id: '1', name: type }]),
			),
		}),
		getNodeParameter: (name: string, fallback: unknown) => options.parameters[name] ?? fallback,
		getWorkflowStaticData: () => staticData,
		getNodeWebhookUrl: () => 'https://n8n.test/webhook/abc/webhook',
		getCredentials: async (type: string) => await Promise.resolve(credentials[type] ?? {}),
		getMode: () => options.mode ?? 'trigger',
		getBodyData: () => options.request?.body ?? {},
		getHeaderData: () => options.request?.headers ?? {},
		getQueryData: () => ({}),
		getRequestObject: () => ({ rawBody: options.request?.rawBody }),
		getResponseObject: () => response,
		helpers: {
			httpRequestWithAuthentication: async (
				type: string,
				request: IHttpRequestOptions,
				extra: unknown,
			) => {
				sent.push([type, request, extra]);
				const reply = options.replies?.[`${request.method} ${request.url}`] ?? {};
				if ((reply.status ?? 200) >= 400) {
					throw Object.assign(new Error(`Request failed with ${reply.status}`), {
						response: { status: reply.status, headers: {}, data: reply.body },
					});
				}
				return await Promise.resolve(reply.body);
			},
		},
	};
	return { context, staticData, sent, responses };
}

// The runtime reads only the members the fake has.
const asHook = (context: object) => context as IHookFunctions;
const asWebhook = (context: object) => context as IWebhookFunctions;
const asPoll = (context: object) => context as IPollFunctions;

const instance = (trigger: Parameters<typeof toTriggerNodeType>[0]): INodeType =>
	new (toTriggerNodeType(trigger))();

const signature = (secret: string, body: Buffer) =>
	`sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

describe('defineWebhookTrigger', () => {
	const parameters = { repo: 'acme/app' };
	const credentials = { hooksApi: { server: 'https://ghe.acme.test' } };

	it('projects a trigger node type with a webhook and the trigger contract', () => {
		const { description } = instance(repoEvent);
		expect(description).toMatchObject({
			name: 'hooksRepoEvent',
			group: ['trigger'],
			inputs: [],
			outputs: ['main'],
			credentials: [{ name: 'hooksApi', required: true }],
			webhooks: [
				{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'webhook' },
			],
		});
		expect(description.properties.map(({ name, type }) => [name, type])).toEqual([
			['repo', 'string'],
			['events', 'json'],
		]);
		expect(toTriggerContract(repoEvent)).toMatchObject({
			id: 'hooks.repo.event',
			effect: 'trigger',
			source: 'webhook',
			credentials: ['hooksApi'],
			output: event.json,
		});
	});

	it('creates the remote webhook with a generated secret and stores its ID', async () => {
		const fake = fakeContext({
			parameters,
			credentials,
			replies: { 'POST https://ghe.acme.test/repos/acme/app/hooks': { body: { id: 7 } } },
		});
		expect(
			await instance(repoEvent).webhookMethods?.default?.create.call(asHook(fake.context)),
		).toBe(true);
		const [type, request] = fake.sent[0] ?? [];
		expect(type).toBe('hooksApi');
		expect(request?.body).toEqual({
			url: 'https://n8n.test/webhook/abc/webhook',
			secret: expect.stringMatching(/^[0-9a-f]{64}$/),
			events: ['push'],
		});
		expect(fake.staticData).toEqual({
			webhookId: '7',
			webhookSecret: expect.stringMatching(/^[0-9a-f]{64}$/),
		});
	});

	it('checks the stored webhook and forgets it when the API answers 404', async () => {
		const methods = instance(repoEvent).webhookMethods?.default;
		const none = fakeContext({ parameters, credentials });
		expect(await methods?.checkExists.call(asHook(none.context))).toBe(false);
		expect(none.sent).toEqual([]);

		const staticData = { webhookId: '7', webhookSecret: 's' };
		const live = fakeContext({ parameters, credentials, staticData: { ...staticData } });
		expect(await methods?.checkExists.call(asHook(live.context))).toBe(true);

		const gone = fakeContext({
			parameters,
			credentials,
			staticData: { ...staticData },
			replies: { 'GET https://ghe.acme.test/repos/acme/app/hooks/7': { status: 404 } },
		});
		expect(await methods?.checkExists.call(asHook(gone.context))).toBe(false);
		expect(gone.staticData).toEqual({});
	});

	it('deletes the remote webhook, and keeps the ID when the delete fails', async () => {
		const methods = instance(repoEvent).webhookMethods?.default;
		const ok = fakeContext({ parameters, credentials, staticData: { webhookId: '7' } });
		expect(await methods?.delete.call(asHook(ok.context))).toBe(true);
		expect(ok.sent[0]?.[1]).toMatchObject({
			method: 'DELETE',
			url: 'https://ghe.acme.test/repos/acme/app/hooks/7',
		});
		expect(ok.staticData).toEqual({});
		const failed = fakeContext({
			parameters,
			credentials,
			staticData: { webhookId: '7' },
			replies: { 'DELETE https://ghe.acme.test/repos/acme/app/hooks/7': { status: 500 } },
		});
		expect(await methods?.delete.call(asHook(failed.context))).toBe(false);
		expect(failed.staticData).toEqual({ webhookId: '7' });
	});

	it('verifies the signature, emits typed items, and answers a ping without an execution', async () => {
		const deliver = async (body: IDataObject, sign: (raw: Buffer) => string) => {
			const rawBody = Buffer.from(JSON.stringify(body));
			const fake = fakeContext({
				parameters,
				staticData: { webhookId: '7', webhookSecret: 'secret' },
				request: { body, rawBody, headers: { 'x-signature': sign(rawBody) } },
			});
			return { fake, result: await instance(repoEvent).webhook?.call(asWebhook(fake.context)) };
		};
		const valid = await deliver({ action: 'opened' }, (raw) => signature('secret', raw));
		expect(valid.result).toEqual({
			workflowData: [[{ json: { action: 'opened', repo: 'acme/app' } }]],
		});
		const ping = await deliver({ zen: 'hi' }, (raw) => signature('secret', raw));
		expect(ping.result).toEqual({ webhookResponse: 'OK' });
		const forged = await deliver({ action: 'opened' }, (raw) => signature('wrong', raw));
		expect(forged.result).toEqual({ noWebhookResponse: true });
		expect(forged.fake.responses).toEqual([401, 'Unauthorized']);
	});

	it('reads the signing secret from a credential field', async () => {
		const trigger = defineWebhookTrigger({
			node: signed,
			id: 'signed.event.received',
			trigger: 'On event',
			summary: 'Starts on each signed event.',
			input: {},
			output: json(),
			verify: {
				algorithm: 'sha256',
				header: 'x-sig',
				encoding: 'base64',
				secret: { credential: 'signingSecret' },
			},
			emit: ({ body }) => [body],
		});
		const body = { ok: true };
		const rawBody = Buffer.from(JSON.stringify(body));
		const digest = createHmac('sha256', 'from-credential').update(rawBody).digest('base64');
		const fake = fakeContext({
			parameters: {},
			credentials: { signingApi: { token: 't', signingSecret: 'from-credential' } },
			request: { body, rawBody, headers: { 'x-sig': digest } },
		});
		expect(await instance(trigger).webhook?.call(asWebhook(fake.context))).toEqual({
			workflowData: [[{ json: { ok: true } }]],
		});
	});

	it('takes custom hooks and a custom handler as escape hatches', async () => {
		const calls: string[] = [];
		const trigger = defineWebhookTrigger({
			node: hooks,
			id: 'hooks.custom.event',
			trigger: 'On custom event',
			summary: 'Starts on a custom event.',
			input: {},
			output: json(),
			endpoint: { method: 'GET', path: 'custom', respond: 'lastNode' },
			hooks: {
				checkExists: async () => await Promise.resolve(calls.push('check') < 0),
				create: async () => await Promise.resolve(calls.push('create') > 0),
				delete: async () => await Promise.resolve(calls.push('delete') > 0),
			},
			handle: async (context) =>
				await Promise.resolve({ workflowData: [[{ json: context.getBodyData() }]] }),
		});
		const type = instance(trigger);
		const fake = fakeContext({
			parameters: {},
			request: { body: { a: 1 }, headers: {}, rawBody: Buffer.from('') },
		});
		await type.webhookMethods?.default?.checkExists.call(asHook(fake.context));
		await type.webhookMethods?.default?.create.call(asHook(fake.context));
		expect(calls).toEqual(['check', 'create']);
		expect(await type.webhook?.call(asWebhook(fake.context))).toEqual({
			workflowData: [[{ json: { a: 1 } }]],
		});
		expect(type.description.webhooks).toEqual([
			{ name: 'default', httpMethod: 'GET', responseMode: 'lastNode', path: 'custom' },
		]);
	});

	it('types the trigger config', () => {
		const base = {
			node: signed,
			id: 'signed.event.typed',
			trigger: 'On event',
			summary: 'Starts on each event.',
			input: { repo: str() },
			output: event,
		} as const;
		defineWebhookTrigger({
			...base,
			// @ts-expect-error the credential has no field `signingSecrte`
			verify: { algorithm: 'sha256', header: 'x', secret: { credential: 'signingSecrte' } },
		});
		defineWebhookTrigger({
			...base,
			// @ts-expect-error an emitted item must match `output`
			emit: () => [{ action: 1, repo: 'r' }],
		});
		defineWebhookTrigger({
			...base,
			register: {
				create: ({ input, url }) => ({
					method: 'POST',
					// @ts-expect-error the input has no field `repository`
					path: `/${input.repository}`,
					body: { url },
				}),
				id: () => '1',
				delete: ({ id }) => ({ method: 'DELETE', path: `/${id}` }),
			},
		});
		expect(base.id).toBe('signed.event.typed');
	});
});

const page = obj({ id: str(), created: str(), title: str() });
const pageApi = compat('pageApi');
const pages = defineNode({
	id: 'pages',
	displayName: 'Pages',
	credentials: [pageApi],
	baseUrl: 'https://pages.test',
});

interface RawPage {
	readonly id: string;
	readonly created_time: string;
	readonly title: string;
}

const rawPages = (body: unknown): RawPage[] =>
	list(isRecord(body) ? body.results : undefined).flatMap((entry) =>
		isRecord(entry) &&
		typeof entry.id === 'string' &&
		typeof entry.created_time === 'string' &&
		typeof entry.title === 'string'
			? [{ id: entry.id, created_time: entry.created_time, title: entry.title }]
			: [],
	);

const pageAdded = definePollingTrigger({
	node: pages,
	id: 'pages.page.added',
	trigger: 'On page added',
	summary: 'Starts when a page is added.',
	input: { database: str() },
	output: page,
	poll: {
		request: ({ input, since, page: cursor }) => ({
			method: 'POST',
			path: `/databases/${input.database}/query`,
			body: { since, start_cursor: cursor },
		}),
		items: rawPages,
		next: (body) => (isRecord(body) && typeof body.next === 'string' ? body.next : undefined),
		cursor: {
			timestamp: (item) => item.created_time,
			key: (item) => item.id,
			precision: 'minute',
		},
		map: (item) => ({ id: item.id, created: item.created_time, title: item.title }),
	},
});

const queryUrl = 'POST https://pages.test/databases/db1/query';
const results = (...items: Array<[string, string]>) => ({
	results: items.map(([id, created_time]) => ({ id, created_time, title: id })),
});

describe('definePollingTrigger', () => {
	beforeEach(() => vi.useFakeTimers({ now: new Date('2026-10-01T10:00:42Z') }));
	afterEach(() => vi.useRealTimers());

	const poll = async (staticData: IDataObject, replies: Record<string, Reply>, mode?: 'manual') => {
		const fake = fakeContext({
			parameters: { database: 'db1' },
			credentials: { pageApi: {} },
			staticData,
			replies,
			mode,
		});
		const items = await instance(pageAdded).poll?.call(asPoll(fake.context));
		return { items, fake };
	};

	it('projects a polling node type; core adds the poll times', () => {
		const { description } = instance(pageAdded);
		expect(description).toMatchObject({ polling: true, group: ['trigger'], inputs: [] });
		expect(toTriggerContract(pageAdded).source).toBe('poll');
	});

	it('sets the cursor on the first poll, then emits new items once, by time and key', async () => {
		const staticData: IDataObject = {};
		const first = await poll(staticData, { [queryUrl]: { body: results() } });
		expect(first.items).toBeNull();
		// Cut to the minute, like the legacy Notion trigger.
		expect(first.fake.sent[0]?.[1].body).toEqual({ since: '2026-10-01T10:00:00.000Z' });
		expect(staticData).toEqual({ cursor: '2026-10-01T10:00:00.000Z', seen: [] });

		const body = results(['b', '2026-10-01T10:05:00.000Z'], ['a', '2026-10-01T10:05:00.000Z']);
		const second = await poll(staticData, { [queryUrl]: { body } });
		expect(second.items).toEqual([
			[
				{ json: { id: 'b', created: '2026-10-01T10:05:00.000Z', title: 'b' } },
				{ json: { id: 'a', created: '2026-10-01T10:05:00.000Z', title: 'a' } },
			],
		]);
		expect(staticData).toEqual({ cursor: '2026-10-01T10:05:00.000Z', seen: ['b', 'a'] });

		// The API repeats items at the cursor time; only `c` is new.
		const third = await poll(staticData, {
			[queryUrl]: {
				body: results(['c', '2026-10-01T10:05:00.000Z'], ['b', '2026-10-01T10:05:00.000Z']),
			},
		});
		expect(third.items?.[0]?.map(({ json: item }) => item.id)).toEqual(['c']);
		expect(staticData.seen).toEqual(['b', 'a', 'c']);
	});

	it('follows pages within one poll', async () => {
		const staticData: IDataObject = { cursor: '2026-10-01T10:00:00.000Z' };
		const fake = fakeContext({
			parameters: { database: 'db1' },
			credentials: { pageApi: {} },
			staticData,
			replies: {},
		});
		const answers = [
			{ ...results(['a', '2026-10-01T10:01:00.000Z']), next: 'p2' },
			results(['b', '2026-10-01T10:02:00.000Z']),
		];
		fake.context.helpers.httpRequestWithAuthentication = async (type, request, extra) => {
			fake.sent.push([type, request, extra]);
			return await Promise.resolve(answers[fake.sent.length - 1]);
		};
		const items = await instance(pageAdded).poll?.call(asPoll(fake.context));
		expect(items?.[0]?.map(({ json: item }) => item.id)).toEqual(['a', 'b']);
		expect(fake.sent.map(([, request]) => request.body)).toEqual([
			{ since: '2026-10-01T10:00:00.000Z' },
			{ since: '2026-10-01T10:00:00.000Z', start_cursor: 'p2' },
		]);
	});

	it('emits the newest item in a manual run and keeps the cursor', async () => {
		const staticData: IDataObject = { cursor: '2026-10-01T09:00:00.000Z', seen: [] };
		const body = results(['new', '2026-10-01T10:00:00.000Z'], ['old', '2026-10-01T08:00:00.000Z']);
		const { items, fake } = await poll(staticData, { [queryUrl]: { body } }, 'manual');
		expect(items?.[0]?.map(({ json: item }) => item.id)).toEqual(['new']);
		expect(fake.sent[0]?.[1].body).toEqual({});
		expect(staticData).toEqual({ cursor: '2026-10-01T09:00:00.000Z', seen: [] });
	});

	it('supports an ID watermark and a response token', async () => {
		const numbered = definePollingTrigger({
			node: pages,
			id: 'pages.event.new',
			trigger: 'On new event',
			summary: 'Starts on each new event.',
			input: {},
			output: obj({ id: int() }),
			poll: {
				request: ({ since }) => ({ path: '/events', query: { after: since } }),
				items: (body) => list(body).flatMap((id) => (typeof id === 'number' ? [{ id }] : [])),
				cursor: { id: (item) => item.id },
				firstRun: 'emit',
			},
		});
		const staticData: IDataObject = {};
		const fake = fakeContext({
			parameters: {},
			credentials: { pageApi: {} },
			staticData,
			replies: { 'GET https://pages.test/events': { body: [3, 5, 4] } },
		});
		const items = await instance(numbered).poll?.call(asPoll(fake.context));
		expect(items?.[0]?.map(({ json: item }) => item.id)).toEqual([3, 5, 4]);
		expect(staticData).toEqual({ cursor: '5', seen: [] });
		expect(await instance(numbered).poll?.call(asPoll(fake.context))).toBeNull();

		const tokens = definePollingTrigger({
			node: pages,
			id: 'pages.change.new',
			trigger: 'On change',
			summary: 'Starts on each change.',
			input: {},
			output: obj({ change: str() }),
			poll: {
				request: ({ since }) => ({ path: '/changes', query: { token: since } }),
				items: (body) =>
					list(isRecord(body) ? body.changes : undefined).flatMap((change) =>
						typeof change === 'string' ? [{ change }] : [],
					),
				cursor: {
					token: (body) =>
						isRecord(body) && typeof body.token === 'string' ? body.token : undefined,
				},
			},
		});
		const tokenData: IDataObject = {};
		const tokenFake = fakeContext({
			parameters: {},
			credentials: { pageApi: {} },
			staticData: tokenData,
			replies: { 'GET https://pages.test/changes': { body: { changes: ['x'], token: 't2' } } },
		});
		// The first poll only takes the start token.
		expect(await instance(tokens).poll?.call(asPoll(tokenFake.context))).toBeNull();
		expect(tokenData.cursor).toBe('t2');
		const next = await instance(tokens).poll?.call(asPoll(tokenFake.context));
		expect(next).toEqual([[{ json: { change: 'x' } }]]);
		expect(tokenFake.sent[1]?.[1].qs).toEqual({ token: 't2' });
	});

	it('runs a custom poll and stores the state it returns', async () => {
		const trigger = definePollingTrigger({
			node: pages,
			id: 'pages.custom.poll',
			trigger: 'On custom poll',
			summary: 'Starts on a custom poll.',
			input: {},
			output: obj({ n: int() }),
			poll: async ({ state }) => {
				const n = typeof state.n === 'number' ? state.n + 1 : 1;
				return await Promise.resolve({ items: [{ n }], state: { n } });
			},
		});
		const staticData: IDataObject = {};
		const fake = fakeContext({ parameters: {}, credentials: { pageApi: {} }, staticData });
		await instance(trigger).poll?.call(asPoll(fake.context));
		const second = await instance(trigger).poll?.call(asPoll(fake.context));
		expect(second).toEqual([[{ json: { n: 2 } }]]);
		expect(staticData).toEqual({ n: 2 });
	});

	it('types the poll config by the API item', () => {
		definePollingTrigger({
			node: pages,
			id: 'pages.page.typed',
			trigger: 'On page',
			summary: 'Starts on a page.',
			input: {},
			output: page,
			poll: {
				request: () => ({ path: '/pages' }),
				items: rawPages,
				// @ts-expect-error the API item has no field `created`
				cursor: { timestamp: (item) => item.created, key: (item) => item.id },
			},
		});
		expect(pageAdded.kind).toBe('poll');
	});
});

describe('generateNodeModule with triggers', () => {
	it('emits a trigger factory that starts a flow with the typed output', () => {
		const text = generateNodeModule(
			'hooks',
			[],
			[{ contract: toTriggerContract(repoEvent), nodeType: '@n8n/nodes-base-next.hooksRepoEvent' }],
		);
		expect(text).toContain(
			"import { contractStep, trigger, type Flow, type OutputOf, type Step, type Value } from '@n8n/workflow-sdk/next';",
		);
		// Trigger parameters are plain values: there is no input item for a lambda to read.
		expect(text).toContain(
			'export type HooksRepoEventInput = { repo: string; events?: Array<"push" | "issues"> };',
		);
		expect(text).toContain('export type HooksRepoEventOutput = { action: string; repo: string };');
		expect(text).toContain(
			'): Flow<HooksRepoEventOutput, Record<N, HooksRepoEventOutput>> =>\n   trigger<N, HooksRepoEventOutput>({ name, type: "@n8n/nodes-base-next.hooksRepoEvent", version: 1, parameters, sample }),',
		);
	});
});
