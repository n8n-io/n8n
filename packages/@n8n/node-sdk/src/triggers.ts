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
	UserError,
} from 'n8n-workflow';

import {
	isHttpError,
	pages,
	type Action,
	type ContractDocument,
	type ContractEgress,
	type Http,
	type HttpMethod,
	type HttpRequest,
	type LogLevel,
	type NativeEvent,
	type RunInput,
	toContract,
	type Trigger,
} from './define';
import { compatTypeOfManifest, credentialDataOf } from './credentials';
import { reportRefusal, type PermissionRefusalListener } from './egress';
import {
	assertManifestPermissions,
	AUTHENTICATION,
	cachedExecutorOf,
	credentialTypeOf,
	executorOf,
	hostLimitsOf,
	hostRuntime,
	lookupMethodsOf,
	manifestLookupOwnerOf,
	nativeRunError,
	nodeDescriptionOf,
	unsetValueOf,
	verifiedBundleOf,
	versionedTypeOf,
	withCredentialHostsOf,
	type Executor,
	type ExecutorHost,
	type PackedVersion,
	type HostRuntime,
} from './runtime';
import { actionUiSchema } from './manifest';
import { storedFieldOf, type StoredField } from './properties';
import { canonicalJson, Schema, type Shape } from './schema';
import { matches, readAs } from './validate';
import { validate } from './validator';
import { NODE_CONTRACT_VERSION } from './version';

/**
 * What starts a trigger: a service webhook, a poll, the event of a native trigger, or an `event`
 * that a derived legacy trigger gets itself, e.g. from a message queue.
 */
export type TriggerKind = 'webhook' | 'poll' | 'event' | NativeEvent;

/** The HTTP request a webhook trigger gets. Header names are lower case. */
export interface WebhookRequest {
	/** The parsed request body. n8n fails a request whose body is not a JSON object. */
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

/** The n8n endpoint that the service of a webhook trigger calls. */
export interface WebhookEndpoint {
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
	readonly endpoint?: WebhookEndpoint;
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
 *   request: ({ since }) => ({ path: path`/events`, query: { since } }),
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

// ── The trigger run: the bundle code of one call, in this process or in the sandbox guest ─

/**
 * One call of the trigger interface, as the host gives it to the trigger run: the WIT function
 * and its parameters. `at` is the time of a poll in ms, from the host clock.
 * The state of a webhook is the remote webhook ID.
 */
export type TriggerCall =
	| {
			readonly call: 'poll';
			readonly at: number;
			readonly state?: IDataObject;
			readonly limit?: number;
	  }
	| { readonly call: 'activate'; readonly url: string; readonly secret?: string }
	| { readonly call: 'check' | 'deactivate'; readonly state: string }
	| {
			readonly call: 'webhook';
			readonly state?: string;
			readonly request: {
				readonly body: IDataObject;
				readonly headers: IDataObject;
				readonly query: IDataObject;
			};
	  };

// Validated JSON is n8n item data; `isRecord` from @n8n/utils types the values as unknown.
const isDataObject = (value: unknown): value is IDataObject =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const textOf = (value: unknown) =>
	typeof value === 'string' && value.length > 0 ? value : undefined;

const objectOf = (value: unknown): IDataObject => (isDataObject(value) ? value : {});

/** The trigger call in the item of a trigger run. */
export function triggerCallOf(json: unknown): TriggerCall {
	const value = objectOf(json);
	const { call, state, url, secret, limit, at, request } = value;
	const id = textOf(state);
	if (call === 'poll' && typeof at === 'number') {
		return {
			call,
			at,
			...(isDataObject(state) ? { state } : {}),
			...(typeof limit === 'number' ? { limit } : {}),
		};
	}
	if (call === 'activate' && typeof url === 'string') {
		const generated = textOf(secret);
		return { call, url, ...(generated === undefined ? {} : { secret: generated }) };
	}
	if ((call === 'check' || call === 'deactivate') && id !== undefined) return { call, state: id };
	if (call === 'webhook' && isDataObject(request)) {
		return {
			call,
			...(id === undefined ? {} : { state: id }),
			request: {
				body: objectOf(request.body),
				headers: objectOf(request.headers),
				query: objectOf(request.query),
			},
		};
	}
	const name = typeof call === 'string' ? call : 'without a name';
	throw new UnexpectedError(`The trigger call ${name} has other parameters`);
}

/** What a trigger call reads: the same in this process and in the sandbox guest. */
export interface TriggerRunContext {
	/** The validated trigger input. */
	readonly input: RunInput<Shape>;
	/** The HTTP client of the host, with the egress and the credential of the node. */
	readonly http: Http;
	/** Writes to the n8n log. */
	log(level: LogLevel, message: string): void;
}

const isHeaderValue = (value: unknown): value is string | string[] =>
	typeof value === 'string' ||
	(Array.isArray(value) && value.every((entry) => typeof entry === 'string'));

const webhookRequestOf = ({ body, headers, query }: IDataObject): WebhookRequest => ({
	body: objectOf(body),
	headers: Object.fromEntries(
		Object.entries(objectOf(headers)).filter((entry): entry is [string, string | string[]] =>
			isHeaderValue(entry[1]),
		),
	),
	query: objectOf(query),
});

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

/** A poll as the host gets it: a bundle packed before `response` existed has none. */
type PackedPoll = Omit<HostPoll, 'response'> & Partial<Pick<HostPoll, 'response'>>;

async function fetchPages(
	poll: PackedPoll,
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

async function pollOnce(
	id: string,
	poll: PackedPoll,
	call: Extract<TriggerCall, { readonly call: 'poll' }>,
	{ input, http, log }: TriggerRunContext,
) {
	const { response, cursor } = poll;
	const pageOf = (body: unknown) => {
		if (!response) return body;
		// The cursor reads each item, so its fields must match too.
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
			log(
				'warn',
				`The response of ${id} does not match its contract, so check the fields: ${drift.join('; ')}`,
			);
		}
		return value;
	};
	const toOutput = (item: unknown) => (poll.map ? poll.map(item, input) : item);
	const { limit } = call;
	if (limit !== undefined) {
		// A sample, e.g. of a manual run: the newest items of one small page. The state stays.
		const body = await http.request(
			poll.request({ input, since: undefined, page: undefined, limit }),
		);
		return {
			items: poll.items(pageOf(body)).slice(0, limit).map(toOutput),
			state: call.state ?? {},
		};
	}
	const state = pollStateOf(call.state ?? {});
	const since = sinceOf(cursor, state, call.at);
	const items = await fetchPages(poll, pageOf, http, input, since);
	const next = advance(cursor, items, since, state);
	const isFirst = state.cursor === undefined;
	return {
		items: isFirst && poll.firstRun !== 'emit' ? [] : next.fresh.map(toOutput),
		state: {
			...(next.state.cursor === undefined ? {} : { cursor: next.state.cursor }),
			seen: next.state.seen ?? [],
		},
	};
}

/**
 * Runs one trigger call with the run context of the host. A poll gives `{ items, state }`,
 * `activate` gives `{ state }` (the remote webhook ID, or `null` without registration),
 * `check` gives `{ exists }`, and `webhook` gives `{ items }`.
 */
export async function runTriggerCall(
	trigger: Trigger,
	call: TriggerCall,
	context: TriggerRunContext,
): Promise<Record<string, unknown>> {
	const { input, http } = context;
	const refuse = () =>
		new UnexpectedError(`${trigger.id} is a ${trigger.kind} trigger, so it has no ${call.call}`);
	if (trigger.poll) {
		if (call.call !== 'poll') throw refuse();
		return await pollOnce(trigger.id, trigger.poll, call, context);
	}
	if (!trigger.webhook) throw refuse();
	const { register, emit } = trigger.webhook;
	switch (call.call) {
		case 'activate': {
			if (!register) return { state: null };
			const { url, secret } = call;
			const body = await http.request(register.create({ input, url, secret }));
			const id = register.id(body);
			if (!id) throw new UserError('The create response has no webhook ID');
			return { state: id };
		}
		case 'check':
			if (!register?.check) return { exists: true };
			try {
				await http.request(register.check({ input, id: call.state }));
				return { exists: true };
			} catch (error) {
				if (!isHttpError(error) || error.status !== 404) throw error;
				return { exists: false };
			}
		case 'deactivate':
			if (register) await http.request(register.delete({ input, id: call.state }));
			return {};
		case 'webhook': {
			const request = webhookRequestOf(call.request);
			return { items: emit ? emit(request, input) : [request] };
		}
		case 'poll':
			throw refuse();
	}
}

/**
 * The flow and the output of the action that runs trigger calls: one call is its one item, and
 * the call result is its one output item. The host checks the trigger items.
 */
export const TRIGGER_RUN: Pick<Action, 'flow' | 'output'> = {
	flow: { effect: 'read', cardinality: 'per-item' },
	output: new Schema<Record<string, unknown>>({ type: 'object' }, false),
};

/**
 * The action that runs the calls of a trigger. Each trigger request gets what an action request
 * gets: the egress, the admin input hosts, the response limit, the refusal report, the retries
 * and the redaction. `egress` comes from the manifest: the hosts of the node base URL.
 */
export function triggerRunOf(trigger: Trigger, egress: ContractEgress | undefined): Action {
	if (trigger.kind === 'native') throw nativeRunError(trigger);
	const { id, version, operation, resource, node, summary, input, inputSchema } = trigger;
	return {
		id,
		version,
		operation,
		...(resource === undefined ? {} : { resource }),
		node,
		action: trigger.trigger,
		summary,
		input,
		inputSchema,
		credentialTypes: trigger.credentialTypes,
		scopes: trigger.scopes,
		...TRIGGER_RUN,
		egress: egress ?? { hosts: [] },
		run: async (context) => {
			if (!('item' in context)) throw new UnexpectedError(`${id} runs one trigger call at a time`);
			return await runTriggerCall(trigger, triggerCallOf(context.item.json), context);
		},
	};
}

/**
 * Refuses a webhook bundle that checks another signature than its manifest. The host checks the
 * signature of the manifest, so a manifest without one must not hide the one of the bundle.
 */
export function assertWebhookSignature(
	{ id, semver, contract }: Pick<PackedVersion['manifest'], 'id' | 'semver' | 'contract'>,
	verify: unknown,
	onRefusal: PermissionRefusalListener | undefined,
) {
	if (canonicalJson(verify ?? null) === canonicalJson(contract.verify ?? null)) return;
	const message = `The bundle of ${id}@${semver} checks another webhook signature than its manifest`;
	reportRefusal(onRefusal, { action: id, version: semver, permission: 'manifest', message });
	throw new UserError(message);
}

/**
 * The executor of a packed trigger version with its bundle in this process. The egress comes
 * from the manifest, as for an action, and the bundle must grant what its manifest grants.
 */
export async function loadTriggerExecutor(
	packed: PackedVersion,
	runtime: HostRuntime,
): Promise<Executor> {
	const exported = await verifiedBundleOf(packed, runtime.nodeContractRange);
	if (!('kind' in exported))
		throw new UnexpectedError(`${exported.id} is an action, not a trigger`);
	assertManifestPermissions(packed.manifest, exported, runtime.reportRefusal);
	if (exported.kind === 'webhook') {
		assertWebhookSignature(packed.manifest, exported.webhook.verify, runtime.reportRefusal);
	}
	const trigger = await withCredentialHostsOf(exported, runtime.credentialManifestOf);
	return executorOf(triggerRunOf(trigger, packed.manifest.contract.egress));
}

// ── The host: the n8n entry points of a trigger node ────────────────────────────────────

/** The context methods every trigger entry point has. */
type TriggerContext = IHookFunctions | IPollFunctions | IWebhookFunctions;

/** The executor host of one trigger call: the call is its one item. `fieldOf`, see `storedFieldOf`. */
const triggerHostOf = (
	context: TriggerContext,
	call: TriggerCall,
	fieldOf: (name: string) => StoredField,
	runtime: HostRuntime,
): ExecutorHost => {
	const node = context.getNode();
	// A webhook call sends no request. Without a credential, n8n reads no credential per delivery.
	const bare = call.call === 'webhook';
	return {
		...hostLimitsOf(runtime),
		items: [{ json: call }],
		node: bare ? { ...node, credentials: {} } : node,
		parameter: (name) => {
			if (bare && name === AUTHENTICATION) return 'none';
			const { path, read } = fieldOf(name);
			return read(context.getNodeParameter(path, unsetValueOf(name, path)));
		},
		request: async (options, type) => {
			const response: unknown = type
				? await context.helpers.httpRequestWithAuthentication.call(context, type, options)
				: await context.helpers.httpRequest(options);
			return response;
		},
		...(bare ? {} : { credentialData: async (type: string) => await context.getCredentials(type) }),
		continueOnFail: () => false,
		log: (level, message) => context.logger[level](message, { node: node.name }),
	};
};

/** Each item checked against the output of the contract, as n8n emits it. */
function outputItems(contract: ContractDocument, items: unknown, node: INode) {
	if (!Array.isArray(items)) throw new UnexpectedError(`${contract.id} gave no list of items`);
	return items.map((item: unknown, index): INodeExecutionData => {
		const issues = validate(item, contract.output, { path: `output[${index}]` });
		if (issues.length > 0 || !isDataObject(item)) {
			throw new NodeOperationError(
				node,
				`Output does not match the contract: ${issues.join('; ') || 'not an object'}`,
			);
		}
		return { json: item };
	});
}

const credentialTypeIn = (contract: ContractDocument, context: TriggerContext) =>
	credentialTypeOf(
		{ credentialTypes: contract.credentials },
		context.getNode(),
		contract.credentials.length > 1 || contract.credentialOptional === true
			? context.getNodeParameter(AUTHENTICATION, undefined)
			: undefined,
	);

// The static data keys of the legacy triggers, so a ported trigger reads what they stored.
const WEBHOOK_ID = 'webhookId';
const WEBHOOK_SECRET = 'webhookSecret';

const storedId = (data: IDataObject) => {
	const id = data[WEBHOOK_ID];
	return typeof id === 'string' || typeof id === 'number' ? String(id) : undefined;
};

/**
 * The signing secret: the generated one in static data, or the stored credential field. The
 * credential manifest of the host renames the fields and fills the defaults, as for a request.
 */
async function secretOf(
	contract: ContractDocument,
	signature: Signature,
	data: IDataObject,
	context: IWebhookFunctions,
	runtime: HostRuntime,
): Promise<string | undefined> {
	if (signature.secret === 'generated') return textOf(data[WEBHOOK_SECRET]);
	const type = credentialTypeIn(contract, context);
	if (!type) return undefined;
	const stored = await context.getCredentials(type);
	const manifest = await runtime.credentialManifestOf(type);
	const fields = manifest ? credentialDataOf(compatTypeOfManifest(manifest), stored) : stored;
	return textOf(fields[signature.secret.credential]);
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

/**
 * The n8n entry points of a trigger. Each one runs one call with the executor of the trigger, in
 * this process or in the sandbox. The host keeps the state, generates the webhook secret and
 * checks the webhook signature of the contract.
 */
function triggerTypeOf(
	contract: ContractDocument,
	description: INodeTypeDescription,
	executor: () => Promise<Executor>,
	fieldOf: (name: string) => StoredField,
	runtime: HostRuntime,
): INodeType {
	const run = async (context: TriggerContext, call: TriggerCall) => {
		const [[result] = []] = await (await executor())(
			triggerHostOf(context, call, fieldOf, runtime),
		);
		if (!result) throw new UnexpectedError(`${contract.id} gave no result for ${call.call}`);
		return result.json;
	};
	if (contract.trigger === 'poll') {
		return {
			description,
			async poll(this: IPollFunctions) {
				const data = this.getWorkflowStaticData('node');
				// Like the legacy triggers: a manual run shows the newest item and keeps the cursor.
				const manual = this.getMode() === 'manual';
				const known = Object.keys(data).length > 0 ? { state: data } : {};
				const { items, state } = await run(this, {
					call: 'poll',
					at: Date.now(),
					...(manual ? { limit: 1 } : known),
				});
				// n8n persists the static data object, so the new state goes into it.
				if (!manual && isDataObject(state)) Object.assign(data, state);
				const emitted = outputItems(contract, items, this.getNode());
				return emitted.length > 0 ? [emitted] : null;
			},
		};
	}
	const generated = contract.verify?.secret === 'generated';
	const forget = (data: IDataObject) => {
		delete data[WEBHOOK_ID];
		delete data[WEBHOOK_SECRET];
	};
	return {
		description,
		webhookMethods: {
			default: {
				async checkExists(this: IHookFunctions) {
					const data = this.getWorkflowStaticData('node');
					const id = storedId(data);
					if (id === undefined || (generated && !textOf(data[WEBHOOK_SECRET]))) return false;
					const { exists } = await run(this, { call: 'check', state: id });
					if (exists === true) return true;
					forget(data);
					return false;
				},
				async create(this: IHookFunctions) {
					const url = this.getNodeWebhookUrl('default');
					if (!url) throw new NodeOperationError(this.getNode(), 'The node has no webhook URL');
					const secret = generated ? randomBytes(32).toString('hex') : undefined;
					const { state } = await run(this, {
						call: 'activate',
						url,
						...(secret ? { secret } : {}),
					});
					if (typeof state === 'string') {
						Object.assign(this.getWorkflowStaticData('node'), {
							[WEBHOOK_ID]: state,
							...(secret ? { [WEBHOOK_SECRET]: secret } : {}),
						});
					}
					return true;
				},
				async delete(this: IHookFunctions) {
					const data = this.getWorkflowStaticData('node');
					const id = storedId(data);
					if (id === undefined) return true;
					try {
						await run(this, { call: 'deactivate', state: id });
					} catch {
						// Like the legacy triggers: keep the ID, so a later deactivation tries again.
						return false;
					}
					forget(data);
					return true;
				},
			},
		},
		async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
			const data = this.getWorkflowStaticData('node');
			const { verify } = contract;
			if (verify) {
				const secret = await secretOf(contract, verify, data, this, runtime);
				if (!secret || !signatureMatches(verify, secret, this)) {
					// Like the legacy GitHub trigger: no execution, and the sender sees 401.
					this.getResponseObject().status(401).send('Unauthorized').end();
					return { noWebhookResponse: true };
				}
			}
			const body: unknown = this.getBodyData();
			// `WebhookRequest.body` is an object, so a list or a text body fails here, not as `{}`.
			if (!isDataObject(body)) {
				throw new NodeOperationError(
					this.getNode(),
					'The webhook request body is not a JSON object',
				);
			}
			const id = storedId(data);
			const query = this.getQueryData();
			const { items } = await run(this, {
				call: 'webhook',
				...(id === undefined ? {} : { state: id }),
				request: {
					body,
					headers: this.getHeaderData(),
					query: isDataObject(query) ? query : {},
				},
			});
			const emitted = outputItems(contract, items, this.getNode());
			if (emitted.length === 0) return { webhookResponse: 'OK' };
			return { workflowData: [emitted] };
		},
	};
}

/** An n8n node type for one trigger, with its bundle in this process. */
export function toTriggerNodeType(
	trigger: Trigger,
	runtime: HostRuntime = hostRuntime(),
): new () => INodeType {
	const contract = toContract(trigger);
	const executor = executorOf(triggerRunOf(trigger, contract.egress));
	const ui = matches(actionUiSchema, trigger.ui) ? trigger.ui : undefined;
	const type = triggerTypeOf(
		contract,
		nodeDescriptionOf({ contract, nodeContract: NODE_CONTRACT_VERSION, ui }),
		async () => await Promise.resolve(executor),
		storedFieldOf(contract.input, ui),
		runtime,
	);
	const { id, node, version, credentialTypes } = trigger;
	const owner = { id, node, version, credentialTypes, egress: contract.egress ?? { hosts: [] } };
	return class implements INodeType {
		description = type.description;

		methods = lookupMethodsOf(contract, ui, async () => await Promise.resolve(owner), runtime);

		poll = type.poll;

		webhook = type.webhook;

		webhookMethods = type.webhookMethods;
	};
}

/**
 * One packed trigger version. Its bundle loads at the first call, with the executor loader of
 * the host: in this process or in the sandbox, by origin.
 */
const packedTriggerType = (packed: PackedVersion, runtime: HostRuntime): INodeType => {
	const type = triggerTypeOf(
		packed.manifest.contract,
		nodeDescriptionOf(packed.manifest),
		async () => (await cachedExecutorOf(packed, loadTriggerExecutor, runtime)).executor,
		storedFieldOf(packed.manifest.contract.input, packed.manifest.ui),
		runtime,
	);
	const methods = lookupMethodsOf(
		packed.manifest.contract,
		packed.manifest.ui,
		async () => await manifestLookupOwnerOf(packed.manifest, runtime.credentialManifestOf),
		runtime,
	);
	return methods ? { ...type, methods } : type;
};

/** The versioned node type of a trigger, from its packed versions. Every call uses `runtime`. */
export const toVersionedTriggerType = (versions: readonly PackedVersion[], runtime: HostRuntime) =>
	versionedTypeOf(
		versions,
		(packed) => packedTriggerType(packed, runtime),
		runtime.nodeContractRange,
	);
