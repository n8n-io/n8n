import { isRecord } from '@n8n/utils/is-record';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import {
	NodeOperationError,
	type IDataObject,
	type IHookFunctions,
	type INode,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type IPollFunctions,
	type IWebhookFunctions,
	type IWebhookResponseData,
	UnexpectedError,
} from 'n8n-workflow';

import { credentialDataOf } from './credentials';
import { actionHostsOf, credentialHostsOf, egressOf } from './egress';
import {
	isHttpError,
	pages,
	type Http,
	type NativeEvent,
	type HttpMethod,
	type HttpRequest,
	type RunInput,
	type Trigger,
} from './define';
import {
	AUTHENTICATION,
	baseUrlOf,
	credentialDescriptionOf,
	credentialTypeOf,
	hasSelector,
	nativeRunError,
	nodeNameOf,
	toRequestOptions,
	verifiedBundleOf,
	versionedTypeOf,
	withResponse,
	type FrozenVersion,
} from './runtime';
import { parameterValue, toProperty } from './properties';
import type { Binary, Schema, Shape } from './schema';
import { applyDefaults, readAs, validate } from './validate';

/**
 * What starts a trigger: a service webhook, a poll, the event of a native trigger, or an `event`
 * that a derived legacy trigger gets itself, e.g. from a message queue.
 */
export type TriggerKind = 'webhook' | 'poll' | 'event' | NativeEvent;

/** The HTTP request a webhook trigger gets. Header names are lower case. */
export interface WebhookRequest {
	/** The parsed request body. */
	readonly body: IDataObject;
	/** The request headers, by lower-case name. */
	readonly headers: Readonly<Record<string, string | string[] | undefined>>;
	/** The query parameters of the request URL. */
	readonly query: Readonly<Record<string, unknown>>;
}

/** An HMAC of the raw body in a request header. */
export interface Signature<K extends string = string> {
	/** The HMAC hash function (RFC 2104). */
	readonly algorithm: 'sha1' | 'sha256' | 'sha512';
	/** The request header with the signature, e.g. `x-hub-signature-256`. */
	readonly header: string;
	/** The text before the digest, e.g. `sha256=`. */
	readonly prefix?: string;
	/**
	 * The text encoding of the digest.
	 *
	 * @defaultValue `'hex'`
	 */
	readonly encoding?: 'hex' | 'base64';
	/**
	 * `generated`: n8n makes a random secret at registration, sends it in the create request, and
	 * stores it. `{ credential }`: a field of the node's credential, e.g. a signing secret.
	 */
	readonly secret:
		| 'generated'
		| {
				/** The credential field with the signing secret. */
				readonly credential: K;
		  };
}

/** Declarative registration: n8n creates the remote webhook on activation and deletes it after. */
export interface Registration<I> {
	/** `secret` is set when the signature secret is `generated`. */
	create(context: {
		/** The trigger input. */
		readonly input: I;
		/** The webhook URL of n8n that the service must call. */
		readonly url: string;
		/** The generated signing secret, or `undefined`. */
		readonly secret: string | undefined;
	}): HttpRequest;
	/** The remote webhook ID in the create response. */
	id(body: unknown): string | undefined;
	/** The request that deletes the remote webhook when the workflow stops. */
	delete(context: RegisteredHook<I>): HttpRequest;
	/** A request that answers 404 when the remote webhook is gone. Without it, a stored ID counts. */
	check?(context: RegisteredHook<I>): HttpRequest;
}

/** A remote webhook that n8n created. */
interface RegisteredHook<I> {
	/** The trigger input. */
	readonly input: I;
	/** The remote webhook ID that `id` gave. */
	readonly id: string;
}

/**
 * A webhook trigger: the n8n endpoint, how n8n checks a request, and how n8n creates the
 * remote webhook.
 *
 * @example
 * ```ts
 * webhook: {
 *   verify: { algorithm: 'sha256', header: 'x-hub-signature-256', prefix: 'sha256=', secret: 'generated' },
 *   register: { create, id: (body) => parse(hook, body).id ?? undefined, delete: remove },
 *   emit: (request) => [request.body],
 * },
 * ```
 * @see `docs/credentials-triggers.md`
 */
export interface WebhookConfig<I, Out, K extends string> {
	/** The n8n endpoint that the service calls. */
	readonly endpoint?: {
		/**
		 * The HTTP method that the endpoint takes.
		 *
		 * @defaultValue `'POST'`
		 */
		readonly method?: HttpMethod;
		/**
		 * The path after the webhook URL of the workflow.
		 *
		 * @defaultValue `'webhook'`
		 */
		readonly path?: string;
	};
	/** The HMAC signature that each request must have. n8n refuses a request without it. */
	readonly verify?: Signature<K>;
	/** How n8n creates the remote webhook on activation and deletes it after. */
	readonly register?: Registration<I>;
	/**
	 * The items of one request. An empty list answers 200 and starts no execution, e.g. for a
	 * ping. Without `emit`, the item is the request.
	 */
	emit?(request: WebhookRequest, input: I): readonly Out[];
}

/** Where a poll continues: an item time, or an item ID. */
export type PollCursor<T> =
	| {
			/** The ISO 8601 time of an item, e.g. its creation time. */
			timestamp(item: T): string;
			/** Items with the latest time are kept by key, so the next poll skips them. */
			key(item: T): string;
			/** The first poll starts at the current time, cut to this unit for a coarse API clock. */
			readonly precision?: 'minute' | 'second';
	  }
	| {
			/** The increasing numeric ID of an item. */
			id(item: T): number;
	  };

/**
 * A poll trigger: n8n polls on the Poll Times of the node, keeps a cursor, and emits each new
 * item once.
 *
 * @example
 * ```ts
 * poll: {
 *   request: ({ since }) => ({ path: '/events', query: { since } }),
 *   response: t.obj({ events: t.arr(event) }),
 *   items: (page) => page.events,
 *   cursor: { timestamp: (item) => item.created, key: (item) => item.id },
 * },
 * ```
 * @see `docs/credentials-triggers.md`
 */
export interface PollConfig<I, T, Out, P = unknown> {
	/**
	 * `since` is the cursor (a time or an ID). It is not set in a manual run. `limit` is the most
	 * items the host uses, e.g. 1 in a manual run, so the request can ask for a small page.
	 */
	request(context: {
		/** The trigger input. */
		readonly input: I;
		/** The cursor of the last poll. Not set in a manual run and in the first poll. */
		readonly since: string | undefined;
		/** The page cursor that `next` gave. Not set for the first page. */
		readonly page: string | undefined;
		/** The most items the host uses, e.g. 1 in a manual run. */
		readonly limit: number | undefined;
	}): HttpRequest;
	/**
	 * The schema of one response body. A page fails with its path when a field that `items`,
	 * `next` or `cursor` reads does not match. The n8n log gets the other issues.
	 */
	readonly response: Schema<P, boolean, boolean, unknown>;
	/** The API items of one page, e.g. `(page) => page.results`. */
	items(page: P): readonly T[];
	/** The cursor of the next page of one poll. A missing, null or empty cursor ends the poll. */
	next?(page: P): string | null | undefined;
	/** How the next poll knows where to continue: an item time or an item ID. */
	readonly cursor: PollCursor<T>;
	/**
	 * `skip`: the first poll only sets the cursor. `emit`: it also emits.
	 *
	 * @defaultValue `'skip'`
	 */
	readonly firstRun?: 'skip' | 'emit';
	/** The output item of an API item. The API item itself when not set. */
	map?(item: T, input: I): Out;
}

/** The context methods every trigger entry point has. */
type TriggerContext = IHookFunctions | IPollFunctions | IWebhookFunctions;

function inputOf(trigger: Trigger, context: TriggerContext): RunInput<Shape> {
	const parameters = Object.fromEntries(
		Object.entries(trigger.input)
			.map(([key, schema]): [string, unknown] => {
				const isJson = toProperty(key, schema).type === 'json';
				return [key, parameterValue(context.getNodeParameter(key, undefined), isJson)];
			})
			.filter(([, value]) => value !== undefined && value !== ''),
	);
	const input = applyDefaults(parameters, trigger.inputSchema);
	const issues = validate(input, trigger.inputSchema);
	const isInput = (value: unknown): value is RunInput<Shape> =>
		isRecord(value) && issues.length === 0;
	if (!isInput(input)) throw new NodeOperationError(context.getNode(), issues.join('; '));
	return input;
}

const credentialTypeIn = (trigger: Trigger, context: TriggerContext) =>
	credentialTypeOf(
		trigger,
		context.getNode(),
		hasSelector(trigger) ? context.getNodeParameter(AUTHENTICATION, undefined) : undefined,
	);

/** An HTTP client with the node's credential applied, as actions get it. */
async function httpOf(trigger: Trigger, context: TriggerContext): Promise<Http> {
	const type = credentialTypeIn(trigger, context);
	const data = type ? await context.getCredentials(type) : {};
	const baseUrl = await baseUrlOf(trigger.node, type, async () => await Promise.resolve(data));
	const node = context.getNode();
	// A trigger declares no egress: it reaches the base URL hosts, with the credential hosts.
	const policy = {
		...actionHostsOf(undefined, {}, [trigger.node.baseUrl, baseUrl]),
		credential: type
			? credentialHostsOf(
					trigger.node.credential?.types.find(({ name }) => name === type),
					data,
					{ surface: trigger.node.displayName, baseUrl },
				)
			: undefined,
	};
	function request(
		options: HttpRequest & { readonly response: 'binary'; readonly fullResponse?: false },
	): Promise<Binary>;
	function request(options: HttpRequest): Promise<unknown>;
	async function request(options: HttpRequest): Promise<unknown> {
		// The trigger runtime has no binary store.
		if (options.response === 'binary') {
			throw new UnexpectedError(`${trigger.id} is a trigger, and a trigger has no binary data`);
		}
		const built = toRequestOptions(options, baseUrl);
		const allowedDomains = egressOf(policy, built.url, { node, actionId: trigger.id });
		const requestOptions = allowedDomains === undefined ? built : { ...built, allowedDomains };
		try {
			const response: unknown = type
				? await context.helpers.httpRequestWithAuthentication.call(context, type, requestOptions)
				: await context.helpers.httpRequest(requestOptions);
			return response;
		} catch (error) {
			throw withResponse(error);
		}
	}
	return { request };
}

// Validated JSON is n8n item data; `isRecord` from @n8n/utils types the values as unknown.
const isDataObject = (value: unknown): value is IDataObject =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** Each item checked against `output`, as n8n emits it. */
function outputItems(trigger: Trigger, items: readonly unknown[], node: INode) {
	return items.map((item, index): INodeExecutionData => {
		const issues = validate(item, trigger.output.json, { path: `output[${index}]` });
		if (issues.length > 0 || !isDataObject(item)) {
			throw new NodeOperationError(
				node,
				`Output does not match the contract: ${issues.join('; ') || 'not an object'}`,
			);
		}
		return { json: item };
	});
}

const textOf = (value: unknown) =>
	typeof value === 'string' && value.length > 0 ? value : undefined;

async function secretOf(
	trigger: Trigger,
	signature: Signature,
	context: IWebhookFunctions,
): Promise<string | undefined> {
	if (signature.secret === 'generated') {
		return textOf(context.getWorkflowStaticData('node')[WEBHOOK_SECRET]);
	}
	const type = credentialTypeIn(trigger, context);
	const value = trigger.node.credential?.types.find(({ name }) => name === type);
	if (!type || !value) return undefined;
	const data = credentialDataOf(value, await context.getCredentials(type));
	return textOf(data[signature.secret.credential]);
}

function signatureMatches(signature: Signature, secret: string, context: IWebhookFunctions) {
	const { rawBody } = context.getRequestObject();
	const header = context.getHeaderData()[signature.header.toLowerCase()];
	const prefix = signature.prefix ?? '';
	if (!Buffer.isBuffer(rawBody) || typeof header !== 'string' || !header.startsWith(prefix)) {
		return false;
	}
	const digest = createHmac(signature.algorithm, secret)
		.update(rawBody)
		.digest(signature.encoding ?? 'hex');
	const expected = Buffer.from(digest);
	const actual = Buffer.from(header.slice(prefix.length));
	return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function handleWebhook(
	trigger: Trigger,
	config: WebhookConfig<RunInput<Shape>, unknown, string>,
	context: IWebhookFunctions,
): Promise<IWebhookResponseData> {
	const { verify } = config;
	if (verify) {
		const secret = await secretOf(trigger, verify, context);
		if (!secret || !signatureMatches(verify, secret, context)) {
			// Like the legacy GitHub trigger: no execution, and the sender sees 401.
			context.getResponseObject().status(401).send('Unauthorized').end();
			return { noWebhookResponse: true };
		}
	}
	const query = context.getQueryData();
	const request: WebhookRequest = {
		body: context.getBodyData(),
		headers: context.getHeaderData(),
		query: isRecord(query) ? query : {},
	};
	const items = config.emit ? config.emit(request, inputOf(trigger, context)) : [request];
	if (items.length === 0) return { webhookResponse: 'OK' };
	return { workflowData: [outputItems(trigger, items, context.getNode())] };
}

// The static data keys of the legacy triggers, so a ported trigger reads what they stored.
const WEBHOOK_ID = 'webhookId';
const WEBHOOK_SECRET = 'webhookSecret';

/** The n8n webhook methods of a trigger. Without `register`, n8n has nothing to set up. */
function webhookHooks(
	trigger: Trigger,
	{ register, verify }: WebhookConfig<RunInput<Shape>, unknown, string>,
) {
	const generated = verify?.secret === 'generated';
	const forget = (data: IDataObject) => {
		delete data[WEBHOOK_ID];
		delete data[WEBHOOK_SECRET];
	};
	const storedId = (context: IHookFunctions) => {
		const id = context.getWorkflowStaticData('node')[WEBHOOK_ID];
		return typeof id === 'string' || typeof id === 'number' ? String(id) : undefined;
	};
	return {
		async checkExists(context: IHookFunctions) {
			if (!register) return true;
			const data = context.getWorkflowStaticData('node');
			const id = storedId(context);
			if (id === undefined || (generated && !textOf(data[WEBHOOK_SECRET]))) return false;
			if (!register.check) return true;
			const http = await httpOf(trigger, context);
			try {
				await http.request(register.check({ input: inputOf(trigger, context), id }));
				return true;
			} catch (error) {
				if (!isHttpError(error) || error.status !== 404) throw error;
				forget(data);
				return false;
			}
		},
		async create(context: IHookFunctions) {
			if (!register) return true;
			const url = context.getNodeWebhookUrl('default');
			if (!url) throw new NodeOperationError(context.getNode(), 'The node has no webhook URL');
			const secret = generated ? randomBytes(32).toString('hex') : undefined;
			const http = await httpOf(trigger, context);
			const body = await http.request(
				register.create({ input: inputOf(trigger, context), url, secret }),
			);
			const id = register.id(body);
			if (!id) {
				throw new NodeOperationError(context.getNode(), 'The create response has no webhook ID');
			}
			Object.assign(context.getWorkflowStaticData('node'), {
				[WEBHOOK_ID]: id,
				...(secret ? { [WEBHOOK_SECRET]: secret } : {}),
			});
			return true;
		},
		async delete(context: IHookFunctions) {
			if (!register) return true;
			const id = storedId(context);
			if (id === undefined) return true;
			const http = await httpOf(trigger, context);
			try {
				await http.request(register.delete({ input: inputOf(trigger, context), id }));
			} catch {
				// Like the legacy triggers: keep the ID, so a later deactivation tries again.
				return false;
			}
			forget(context.getWorkflowStaticData('node'));
			return true;
		},
	};
}

/** The poll state in static data. */
interface PollState {
	readonly cursor?: string;
	readonly seen?: readonly string[];
}

const pollStateOf = (data: IDataObject): PollState => ({
	...(typeof data.cursor === 'string' ? { cursor: data.cursor } : {}),
	...(Array.isArray(data.seen)
		? { seen: data.seen.filter((key): key is string => typeof key === 'string') }
		: {}),
});

const UNIT_MS: Readonly<Record<'minute' | 'second', number>> = { minute: 60_000, second: 1_000 };

/** The `since` of the next request: the stored cursor, or the start of the first poll. */
function sinceOf<T>(cursor: PollCursor<T>, state: PollState, now: number): string | undefined {
	if (state.cursor !== undefined || !('timestamp' in cursor)) return state.cursor;
	const unit = cursor.precision ? UNIT_MS[cursor.precision] : 1;
	return new Date(Math.floor(now / unit) * unit).toISOString();
}

/** The new items and the next state, from the items of one poll. */
function advance<T>(
	cursor: PollCursor<T>,
	items: readonly T[],
	since: string | undefined,
	state: PollState,
): { readonly fresh: readonly T[]; readonly state: PollState } {
	if ('timestamp' in cursor) {
		const sinceMs = Date.parse(since ?? '');
		const seen = new Set(state.seen ?? []);
		const timeOf = (item: T) => Date.parse(cursor.timestamp(item));
		const fresh = items.filter((item) => timeOf(item) >= sinceMs && !seen.has(cursor.key(item)));
		const latest = Math.max(sinceMs, ...items.map(timeOf));
		const atLatest = items
			.filter((item) => timeOf(item) === latest)
			.map((item) => cursor.key(item));
		// An item at the old cursor time can come again, so keep the old keys until time moves.
		const keys = latest === sinceMs ? [...new Set([...seen, ...atLatest])] : atLatest;
		return { fresh, state: { cursor: new Date(latest).toISOString(), seen: keys } };
	}
	const mark = since === undefined ? -Infinity : Number(since);
	const fresh = items.filter((item) => cursor.id(item) > mark);
	const latest = Math.max(mark, ...items.map((item) => cursor.id(item)));
	return { fresh, state: Number.isFinite(latest) ? { cursor: String(latest) } : state };
}

const MAX_PAGES = 100;

type HostPoll = PollConfig<RunInput<Shape>, unknown, unknown>;

/** A poll as the host gets it: a bundle frozen before `response` existed has none. */
type FrozenPoll = Omit<HostPoll, 'response'> & Partial<Pick<HostPoll, 'response'>>;

async function fetchPages(
	poll: FrozenPoll,
	pageOf: (body: unknown) => unknown,
	http: Http,
	input: RunInput<Shape>,
	since: string | undefined,
): Promise<readonly unknown[]> {
	const fetched = pages(http, {
		page: pageOf,
		request: (page) => poll.request({ input, since, page, limit: undefined }),
		items: (page) => poll.items(page),
		next: (page) => poll.next?.(page),
		maxPages: MAX_PAGES,
	});
	const items: unknown[] = [];
	for await (const item of fetched) items.push(item);
	return items;
}

async function runPoll(
	trigger: Trigger,
	poll: FrozenPoll,
	context: IPollFunctions,
): Promise<INodeExecutionData[][] | null> {
	const { response } = poll;
	const pageOf = (body: unknown) => {
		if (!response) return body;
		// The cursor reads each item, so its fields must match too.
		const { cursor } = poll;
		const read = (page: unknown) => [
			poll.next?.(page),
			poll
				.items(page)
				.map((item) =>
					'id' in cursor ? cursor.id(item) : [cursor.timestamp(item), cursor.key(item)],
				),
		];
		const { value, drift } = readAs(response, body, { path: 'page', read });
		if (drift.length > 0) {
			context.logger.warn(
				`The response of ${trigger.id} does not match its contract, so check the fields: ${drift.join('; ')}`,
			);
		}
		return value;
	};
	const input = inputOf(trigger, context);
	const http = await httpOf(trigger, context);
	const data = context.getWorkflowStaticData('node');
	const node = context.getNode();
	const emitted = (items: readonly unknown[]) =>
		items.length > 0 ? [outputItems(trigger, items, node)] : null;
	const toOutput = (item: unknown) => (poll.map ? poll.map(item, input) : item);
	if (context.getMode() === 'manual') {
		// Like the legacy triggers: a manual run shows the newest item and keeps the cursor.
		const body = await http.request(
			poll.request({ input, since: undefined, page: undefined, limit: 1 }),
		);
		return emitted(poll.items(pageOf(body)).slice(0, 1).map(toOutput));
	}
	const state = pollStateOf(data);
	const since = sinceOf(poll.cursor, state, Date.now());
	const items = await fetchPages(poll, pageOf, http, input, since);
	const next = advance(poll.cursor, items, since, state);
	const isFirst = state.cursor === undefined;
	// n8n persists the static data object, so the new state goes into it.
	Object.assign(data, { cursor: next.state.cursor, seen: next.state.seen ?? [] });
	return emitted(isFirst && poll.firstRun !== 'emit' ? [] : next.fresh.map(toOutput));
}

/** The n8n description of a trigger. `polling` makes n8n add Poll Times and schedule polls. */
export function triggerDescriptionOf(trigger: Trigger): INodeTypeDescription {
	if (trigger.kind === 'native') throw nativeRunError(trigger);
	const { selector, credentials } = credentialDescriptionOf(trigger);
	const base: INodeTypeDescription = {
		displayName: `${trigger.node.displayName}: ${trigger.trigger}`,
		name: nodeNameOf(trigger.id),
		group: ['trigger'],
		version: trigger.version,
		description: trigger.summary,
		defaults: { name: trigger.trigger },
		inputs: [],
		outputs: ['main'],
		credentials,
		properties: [
			...selector,
			...Object.entries(trigger.input).map(([name, schema]) => toProperty(name, schema)),
		],
	};
	if (trigger.poll) return { ...base, polling: true };
	return {
		...base,
		webhooks: [
			{
				name: 'default',
				httpMethod: trigger.webhook.endpoint?.method ?? 'POST',
				responseMode: 'onReceived',
				path: trigger.webhook.endpoint?.path ?? 'webhook',
			},
		],
	};
}

/** The n8n entry points of a trigger: `poll()`, or `webhook()` with its webhook methods. */
export function triggerMethodsOf(
	trigger: Trigger,
): Pick<INodeType, 'poll' | 'webhook' | 'webhookMethods'> {
	if (trigger.kind === 'native') throw nativeRunError(trigger);
	if (trigger.poll) {
		const { poll } = trigger;
		return {
			async poll(this: IPollFunctions) {
				return await runPoll(trigger, poll, this);
			},
		};
	}
	const config = trigger.webhook;
	const hooks = webhookHooks(trigger, config);
	return {
		webhookMethods: {
			default: {
				async checkExists(this: IHookFunctions) {
					return await hooks.checkExists(this);
				},
				async create(this: IHookFunctions) {
					return await hooks.create(this);
				},
				async delete(this: IHookFunctions) {
					return await hooks.delete(this);
				},
			},
		},
		async webhook(this: IWebhookFunctions) {
			return await handleWebhook(trigger, config, this);
		},
	};
}

/** An n8n node type for one trigger. */
export function toTriggerNodeType(trigger: Trigger): new () => INodeType {
	const description = triggerDescriptionOf(trigger);
	const methods = triggerMethodsOf(trigger);
	return class implements INodeType {
		description = description;

		poll = methods.poll;

		webhook = methods.webhook;

		webhookMethods = methods.webhookMethods;
	};
}

type TriggerMethods = ReturnType<typeof triggerMethodsOf>;

/** Trigger entry points by bundle hash. A bundle loads on its first call only. */
const loaded = new Map<string, Promise<TriggerMethods>>();

async function loadTrigger(frozen: FrozenVersion): Promise<TriggerMethods> {
	const trigger = await verifiedBundleOf(frozen);
	if (!('kind' in trigger)) throw new UnexpectedError(`${trigger.id} is an action, not a trigger`);
	return triggerMethodsOf(trigger);
}

async function methodsOf(frozen: FrozenVersion) {
	const { bundleHash } = frozen.manifest;
	const methods = loaded.get(bundleHash) ?? loadTrigger(frozen);
	loaded.set(bundleHash, methods);
	return await methods;
}

/** One frozen trigger version. Each entry point loads the bundle, then calls the trigger's own. */
function frozenTriggerType(frozen: FrozenVersion): INodeType {
	const { description } = frozen.manifest;
	if (description.polling) {
		return {
			description,
			async poll(this: IPollFunctions) {
				const { poll } = await methodsOf(frozen);
				return (await poll?.call(this)) ?? null;
			},
		};
	}
	const hook = (name: 'checkExists' | 'create' | 'delete') =>
		async function (this: IHookFunctions) {
			const { webhookMethods } = await methodsOf(frozen);
			return (await webhookMethods?.default?.[name].call(this)) ?? true;
		};
	return {
		description,
		webhookMethods: {
			default: { checkExists: hook('checkExists'), create: hook('create'), delete: hook('delete') },
		},
		async webhook(this: IWebhookFunctions) {
			const { webhook } = await methodsOf(frozen);
			if (!webhook) throw new UnexpectedError(`${frozen.manifest.id} has no webhook`);
			return await webhook.call(this);
		},
	};
}

/** The versioned node type of a trigger, from its frozen versions. */
export const toVersionedTriggerType = (versions: readonly FrozenVersion[]) =>
	versionedTypeOf(versions, frozenTriggerType);
