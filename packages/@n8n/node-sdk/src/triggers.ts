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
	type WebhookSetupMethodNames,
} from 'n8n-workflow';

import { credentialDataOf, oauth2OptionsOf, type CredentialKey } from './credentials';
import {
	isHttpError,
	type Http,
	type HttpMethod,
	type HttpRequest,
	type NodeDefinition,
	type RunInput,
} from './define';
import { toProperty } from './properties';
import {
	AUTHENTICATION,
	credentialContextOf,
	credentialDescriptionOf,
	credentialOf,
	credentialTypeOf,
	hasSelector,
	nodeNameOf,
	parameterValue,
	toRequestOptions,
	withResponse,
} from './runtime';
import { obj, type AnySchema, type Infer, type JsonSchema, type Shape } from './schema';
import { applyDefaults, validate } from './validate';

interface TriggerBase<
	S extends Shape,
	O extends AnySchema,
	N extends NodeDefinition,
	C extends N['credentials'][number],
> {
	readonly node: N;
	/** `<node>.<resource>.<event>`, e.g. `github.repository.event`. */
	readonly id: `${N['id']}.${string}`;
	/** Integer major, 1 when omitted. It is the n8n `typeVersion`. */
	readonly version?: number;
	/** The label users pick, e.g. "On repository event". */
	readonly trigger: string;
	/** At most 120 characters. */
	readonly summary: string;
	/** Credentials this trigger accepts, when they differ from the node's. */
	readonly credentials?: readonly C[];
	/** The trigger parameters. */
	readonly input: S;
	/** One emitted item. Every downstream expression reads it. */
	readonly output: O;
}

/** The HTTP request a webhook trigger gets. Header names are lower case. */
export interface WebhookRequest {
	readonly body: IDataObject;
	readonly headers: Readonly<Record<string, string | string[] | undefined>>;
	readonly query: Readonly<Record<string, unknown>>;
}

/** An HMAC of the raw body in a request header. */
export interface Signature<K extends string = string> {
	readonly algorithm: 'sha1' | 'sha256' | 'sha512';
	/** The request header with the signature, e.g. `x-hub-signature-256`. */
	readonly header: string;
	/** The text before the digest, e.g. `sha256=`. */
	readonly prefix?: string;
	readonly encoding?: 'hex' | 'base64';
	/**
	 * `generated`: n8n makes a random secret at registration, sends it in the create request, and
	 * stores it. `{ credential }`: a field of the node's credential, e.g. a signing secret.
	 */
	readonly secret: 'generated' | { readonly credential: K };
}

/** Declarative registration: n8n creates the remote webhook on activation and deletes it after. */
export interface Registration<I> {
	/** `secret` is set when the signature secret is `generated`. */
	create(context: {
		readonly input: I;
		readonly url: string;
		readonly secret: string | undefined;
	}): HttpRequest;
	/** The remote webhook ID in the create response. */
	id(body: unknown): string | undefined;
	delete(context: { readonly input: I; readonly id: string }): HttpRequest;
	/** A request that answers 404 when the remote webhook is gone. Without it, a stored ID counts. */
	check?(context: { readonly input: I; readonly id: string }): HttpRequest;
}

/** The escape hatch for registration, e.g. to adopt a remote webhook that already exists. */
export type WebhookHooks = Readonly<
	Record<WebhookSetupMethodNames, (context: IHookFunctions) => Promise<boolean>>
>;

export interface WebhookTriggerDefinition<
	S extends Shape,
	O extends AnySchema,
	N extends NodeDefinition = NodeDefinition,
	C extends N['credentials'][number] = N['credentials'][number],
> extends TriggerBase<S, O, N, C> {
	readonly endpoint?: {
		readonly method?: HttpMethod;
		/** The path after the webhook URL of the workflow. 'webhook' when not set. */
		readonly path?: string;
		/** `onReceived` answers at once; `lastNode` answers with the data of the last node. */
		readonly respond?: 'onReceived' | 'lastNode';
	};
	readonly verify?: Signature<CredentialKey<C>>;
	readonly register?: Registration<RunInput<S>>;
	readonly hooks?: WebhookHooks;
	/**
	 * The items of one request. An empty list answers 200 and starts no execution, e.g. for a
	 * ping. Without `emit`, the item is the request.
	 */
	emit?(request: WebhookRequest, input: RunInput<S>): ReadonlyArray<Infer<O>>;
	/** The escape hatch: handle the request instead of `verify` and `emit`. */
	handle?(context: IWebhookFunctions): Promise<IWebhookResponseData>;
}

/** Where a polling trigger continues: an item time, an item ID, or a token from the response. */
export type PollCursor<T> =
	| {
			timestamp(item: T): string;
			/** Items with the latest time are kept by key, so the next poll skips them. */
			key(item: T): string;
			/** The first poll starts at the current time, cut to this unit for a coarse API clock. */
			readonly precision?: 'minute' | 'second';
	  }
	| { id(item: T): number }
	| { token(body: unknown): string | undefined };

export interface PollConfig<I, T, Out> {
	/** `since` is the cursor (a time, an ID, or a token). It is not set in a manual run. */
	request(context: {
		readonly input: I;
		readonly since: string | undefined;
		readonly page: string | undefined;
	}): HttpRequest;
	items(body: unknown): readonly T[];
	/** The next page of one poll. */
	next?(body: unknown): string | undefined;
	readonly cursor: PollCursor<T>;
	/** 'skip' (the default): the first poll only sets the cursor. 'emit': it also emits. */
	readonly firstRun?: 'skip' | 'emit';
	/** The output item of an API item. The API item itself when not set. */
	map?(item: T, input: I): Out;
}

export interface CustomPollContext<I> {
	readonly input: I;
	readonly http: Http;
	readonly state: Readonly<IDataObject>;
	readonly manual: boolean;
}

export interface CustomPollResult<Out> {
	readonly items: readonly Out[];
	readonly state: IDataObject;
}

/** The escape hatch: one poll. n8n stores the returned state and emits the items. */
export type CustomPoll<I, Out> = (context: CustomPollContext<I>) => Promise<CustomPollResult<Out>>;

export interface PollingTriggerDefinition<
	S extends Shape,
	O extends AnySchema,
	T,
	N extends NodeDefinition = NodeDefinition,
	C extends N['credentials'][number] = N['credentials'][number],
> extends TriggerBase<S, O, N, C> {
	readonly poll: PollConfig<RunInput<S>, T, Infer<O>> | CustomPoll<RunInput<S>, Infer<O>>;
}

interface TriggerFields {
	readonly version: number;
	readonly inputSchema: JsonSchema;
	readonly credentialTypes: readonly string[];
}

export type WebhookTrigger<S extends Shape = Shape, O extends AnySchema = AnySchema> = Omit<
	WebhookTriggerDefinition<S, O>,
	'version'
> &
	TriggerFields & { readonly kind: 'webhook' };

export type PollingTrigger<S extends Shape = Shape, O extends AnySchema = AnySchema> = Omit<
	PollingTriggerDefinition<S, O, unknown>,
	'version' | 'poll'
> &
	TriggerFields & {
		readonly kind: 'poll';
		// A method, so a trigger with a narrow input still counts as a `Trigger`.
		readonly poll:
			| PollConfig<RunInput<S>, unknown, Infer<O>>
			| { custom(context: CustomPollContext<RunInput<S>>): Promise<CustomPollResult<Infer<O>>> };
	};

export type Trigger = WebhookTrigger | PollingTrigger;

const triggerFields = <S extends Shape>(definition: {
	readonly version?: number;
	readonly input: S;
	readonly credentials?: ReadonlyArray<{ readonly name: string }>;
	readonly node: NodeDefinition;
}): TriggerFields => ({
	version: definition.version ?? 1,
	inputSchema: obj(definition.input).json,
	credentialTypes: (definition.credentials ?? definition.node.credentials).map(({ name }) => name),
});

export function defineWebhookTrigger<
	S extends Shape,
	O extends AnySchema,
	N extends NodeDefinition,
	C extends N['credentials'][number] = N['credentials'][number],
>(definition: WebhookTriggerDefinition<S, O, N, C>): WebhookTrigger<S, O> {
	return { ...definition, ...triggerFields(definition), kind: 'webhook' };
}

export function definePollingTrigger<
	S extends Shape,
	O extends AnySchema,
	T,
	N extends NodeDefinition,
	C extends N['credentials'][number] = N['credentials'][number],
>(definition: PollingTriggerDefinition<S, O, T, N, C>): PollingTrigger<S, O> {
	const { poll } = definition;
	return {
		...definition,
		...triggerFields(definition),
		kind: 'poll',
		poll: typeof poll === 'function' ? { custom: poll } : poll,
	};
}

/** The trigger document the AI builder reads: the config input, the effect, and the typed output. */
export interface TriggerContract {
	readonly id: string;
	readonly version: number;
	readonly node: string;
	readonly trigger: string;
	readonly summary: string;
	/** A trigger starts an execution; it reads no items. */
	readonly effect: 'trigger';
	readonly source: 'webhook' | 'poll';
	readonly credentials: readonly string[];
	readonly input: JsonSchema;
	readonly output: JsonSchema;
}

export const toTriggerContract = (trigger: Trigger): TriggerContract => ({
	id: trigger.id,
	version: trigger.version,
	node: trigger.node.id,
	trigger: trigger.trigger,
	summary: trigger.summary,
	effect: 'trigger',
	source: trigger.kind,
	credentials: trigger.credentialTypes,
	input: trigger.inputSchema,
	output: trigger.output.json,
});

/** The context methods every trigger entry point has. */
type TriggerContext = IHookFunctions | IPollFunctions | IWebhookFunctions;

function inputOf<S extends Shape>(
	trigger: { readonly input: S; readonly inputSchema: JsonSchema },
	context: TriggerContext,
): RunInput<S> {
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
	const isInput = (value: unknown): value is RunInput<S> => isRecord(value) && issues.length === 0;
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
	const value = credentialOf(trigger, type);
	const oauth2 = value ? oauth2OptionsOf(value) : undefined;
	const { baseUrl } = await credentialContextOf(
		trigger,
		type,
		async (name) => await context.getCredentials(name),
	);
	return {
		request: async (request) => {
			const options = toRequestOptions(request, baseUrl);
			try {
				const response: unknown = type
					? await context.helpers.httpRequestWithAuthentication.call(
							context,
							type,
							options,
							oauth2 ? { oauth2 } : undefined,
						)
					: await context.helpers.httpRequest(options);
				return response;
			} catch (error) {
				throw withResponse(error);
			}
		},
	};
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
	trigger: WebhookTrigger,
	signature: Signature,
	context: IWebhookFunctions,
): Promise<string | undefined> {
	if (signature.secret === 'generated') {
		return textOf(context.getWorkflowStaticData('node').webhookSecret);
	}
	const type = credentialTypeIn(trigger, context);
	const value = credentialOf(trigger, type);
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
	trigger: WebhookTrigger,
	context: IWebhookFunctions,
): Promise<IWebhookResponseData> {
	if (trigger.handle) return await trigger.handle(context);
	const { verify } = trigger;
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
	const items = trigger.emit ? trigger.emit(request, inputOf(trigger, context)) : [request];
	if (items.length === 0) return { webhookResponse: 'OK' };
	return { workflowData: [outputItems(trigger, items, context.getNode())] };
}

// The static data keys of the legacy triggers, so a ported trigger reads what they stored.
const WEBHOOK_ID = 'webhookId';
const WEBHOOK_SECRET = 'webhookSecret';

function registrationHooks(trigger: WebhookTrigger, registration: Registration<RunInput<Shape>>) {
	const generated = trigger.verify?.secret === 'generated';
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
			const data = context.getWorkflowStaticData('node');
			const id = storedId(context);
			if (id === undefined || (generated && !textOf(data[WEBHOOK_SECRET]))) return false;
			if (!registration.check) return true;
			const http = await httpOf(trigger, context);
			try {
				await http.request(registration.check({ input: inputOf(trigger, context), id }));
				return true;
			} catch (error) {
				if (!isHttpError(error) || error.status !== 404) throw error;
				forget(data);
				return false;
			}
		},
		async create(context: IHookFunctions) {
			const url = context.getNodeWebhookUrl('default');
			if (!url) throw new NodeOperationError(context.getNode(), 'The node has no webhook URL');
			const secret = generated ? randomBytes(32).toString('hex') : undefined;
			const http = await httpOf(trigger, context);
			const body = await http.request(
				registration.create({ input: inputOf(trigger, context), url, secret }),
			);
			const id = registration.id(body);
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
			const id = storedId(context);
			if (id === undefined) return true;
			const http = await httpOf(trigger, context);
			try {
				await http.request(registration.delete({ input: inputOf(trigger, context), id }));
			} catch {
				// Like the legacy triggers: keep the ID, so a later deactivation tries again.
				return false;
			}
			forget(context.getWorkflowStaticData('node'));
			return true;
		},
	} satisfies WebhookHooks;
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
	lastBody: unknown,
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
	if ('id' in cursor) {
		const mark = since === undefined ? -Infinity : Number(since);
		const fresh = items.filter((item) => cursor.id(item) > mark);
		const latest = Math.max(mark, ...items.map((item) => cursor.id(item)));
		return { fresh, state: Number.isFinite(latest) ? { cursor: String(latest) } : state };
	}
	const token = cursor.token(lastBody) ?? state.cursor;
	return { fresh: items, state: token === undefined ? {} : { cursor: token } };
}

const MAX_PAGES = 100;

async function fetchPages<I, T, Out>(
	config: PollConfig<I, T, Out>,
	http: Http,
	input: I,
	since: string | undefined,
	page?: string,
	count = 1,
): Promise<{ readonly items: readonly T[]; readonly body: unknown }> {
	const body = await http.request(config.request({ input, since, page }));
	const items = config.items(body);
	const next = config.next?.(body);
	if (!next || next === page || count >= MAX_PAGES) return { items, body };
	const rest = await fetchPages(config, http, input, since, next, count + 1);
	return { items: [...items, ...rest.items], body: rest.body };
}

async function runPoll(
	trigger: PollingTrigger,
	context: IPollFunctions,
): Promise<INodeExecutionData[][] | null> {
	const input = inputOf(trigger, context);
	const http = await httpOf(trigger, context);
	const data = context.getWorkflowStaticData('node');
	const manual = context.getMode() === 'manual';
	const node = context.getNode();
	const emitted = (items: readonly unknown[]) =>
		items.length > 0 ? [outputItems(trigger, items, node)] : null;
	const { poll } = trigger;
	if ('custom' in poll) {
		const result = await poll.custom({ input, http, state: data, manual });
		// n8n persists the static data object, so the new state goes into it.
		Object.assign(data, result.state);
		return emitted(result.items);
	}
	const toOutput = (item: unknown) => (poll.map ? poll.map(item, input) : item);
	if (manual) {
		// Like the legacy triggers: a manual run shows the newest item and keeps the cursor.
		const body = await http.request(poll.request({ input, since: undefined, page: undefined }));
		return emitted(poll.items(body).slice(0, 1).map(toOutput));
	}
	const state = pollStateOf(data);
	const since = sinceOf(poll.cursor, state, Date.now());
	const { items, body } = await fetchPages(poll, http, input, since);
	const next = advance(poll.cursor, items, since, body, state);
	const isFirst = state.cursor === undefined;
	Object.assign(data, { cursor: next.state.cursor, seen: next.state.seen ?? [] });
	return emitted(isFirst && poll.firstRun !== 'emit' ? [] : next.fresh.map(toOutput));
}

const triggerDescription = (trigger: Trigger): INodeTypeDescription => {
	const { selector, credentials } = credentialDescriptionOf(trigger);
	return {
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
};

/** The n8n node type of a trigger: webhook methods and `webhook()`, or `poll()`. */
export function toTriggerNodeType(trigger: Trigger): new () => INodeType {
	const base = triggerDescription(trigger);
	if (trigger.kind === 'poll') {
		// `polling` makes the node loader add the Poll Times parameter; core schedules the polls.
		const description: INodeTypeDescription = { ...base, polling: true };
		return class implements INodeType {
			description = description;

			async poll(this: IPollFunctions) {
				return await runPoll(trigger, this);
			}
		};
	}
	const { endpoint = {} } = trigger;
	const description: INodeTypeDescription = {
		...base,
		webhooks: [
			{
				name: 'default',
				httpMethod: endpoint.method ?? 'POST',
				responseMode: endpoint.respond ?? 'onReceived',
				path: endpoint.path ?? 'webhook',
			},
		],
	};
	const hooks =
		trigger.hooks ?? (trigger.register ? registrationHooks(trigger, trigger.register) : undefined);
	return class implements INodeType {
		description = description;

		webhookMethods = hooks
			? {
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
				}
			: undefined;

		async webhook(this: IWebhookFunctions) {
			return await handleWebhook(trigger, this);
		}
	};
}
