/**
 * Public SDK of the workflow language.
 *
 * Workflow files import these names from `@n8n/workflow-lang`. The compiler
 * reads the types. The functions return their argument, so a workflow file
 * also runs as plain TypeScript in the reference runner.
 */

/** One item that a node reads or writes. */
export type Item = Record<string, unknown>;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';

export interface WebhookOptions {
	path: string;
	method?: HttpMethod;
	/** When the webhook sends its HTTP response. */
	respond?: 'immediately' | 'lastNode' | 'respondNode';
	/** The `webhookId` of the n8n Webhook node. n8n puts it in paths with `:param` segments. */
	webhookId?: string;
	/** The binary property of a request body that is a file (spec section 8.5). The default is `data`. */
	binaryPropertyName?: string;
	/** Also gives the raw body as binary `data`. */
	rawBody?: boolean;
	/** The whole body is one binary property, whatever its content type. */
	binaryData?: boolean;
}

/** A file in n8n's in-memory binary form (spec section 8.5). */
export interface BinaryProperty {
	/** Base64. */
	data: string;
	mimeType: string;
	fileName?: string;
	fileExtension?: string;
	bytes: number;
}

/** The value that `run` receives for a webhook trigger. */
export interface WebhookEvent<TBody> {
	body: TBody;
	headers: Record<string, string>;
	query: Record<string, string>;
	/** Values of the `:param` segments of the path. */
	params?: Record<string, string>;
	method?: string;
	path?: string;
	/** Files of the request, by binary property name. */
	$binary?: Record<string, BinaryProperty>;
}

export type ScheduleUnit = 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

/** A fixed interval, as in the "interval" modes of n8n's Schedule Trigger. */
export interface ScheduleEvery {
	unit: ScheduleUnit;
	value: number;
	/** 0-23. Only for days, weeks and months. */
	atHour?: number;
	/** 0-59. Only for hours, days, weeks and months. */
	atMinute?: number;
	/** 0 (Sunday) to 6. Only for weeks. */
	onWeekdays?: number[];
	/** 1-31. Only for months. */
	onDayOfMonth?: number;
}

/** Give exactly one of `cron` and `every`. All values must be literals. */
export interface ScheduleOptions {
	/** 5 or 6 fields (optional leading seconds), as n8n's Schedule Trigger accepts. */
	cron?: string;
	every?: ScheduleEvery;
	/** IANA time zone name. The default is 'UTC'. */
	timezone?: string;
	/**
	 * A poll trigger (spec 9.8): each run starts quiet and sends no events
	 * until `ctx.polled(items)` finds items. A run that finds nothing leaves no
	 * execution, as v1 starts none when its poll returns nothing.
	 */
	poll?: boolean;
}

/** The value that `run` receives for a schedule trigger. */
export interface ScheduleEvent {
	/** The time of the slot, in milliseconds since the epoch. */
	scheduledAt: number;
}

interface TriggerBase<TEvent> {
	/** Carries the event type. It has no value at run time. */
	readonly event?: TEvent;
}

export interface WebhookTrigger<TEvent> extends TriggerBase<TEvent> {
	kind: 'webhook';
	options: WebhookOptions;
}

export interface ScheduleTrigger<TEvent> extends TriggerBase<TEvent> {
	kind: 'schedule';
	options: ScheduleOptions;
}

export type Trigger<TEvent> = WebhookTrigger<TEvent> | ScheduleTrigger<TEvent>;

export function webhook<TBody = Item>(options: WebhookOptions): Trigger<WebhookEvent<TBody>> {
	return { kind: 'webhook', options };
}

export function schedule(options: ScheduleOptions): Trigger<ScheduleEvent> {
	return { kind: 'schedule', options };
}

export interface CredentialSlot {
	/** The n8n credential type, for example `slackApi`. */
	type: string;
}

export interface RetryPolicy {
	max: number;
	delayMs?: number;
}

interface StepOptions {
	/** Step name. It must be a string literal that is unique in the workflow. */
	name: string;
	/** Optional stable step id. The default is the name. */
	id?: string;
}

export interface NodeCall extends StepOptions {
	type: string;
	typeVersion?: number;
	parameters?: Record<string, unknown>;
	items?: Item[];
	idempotent?: boolean;
	retry?: RetryPolicy;
	/** Name of a credential slot of the workflow. */
	credential?: string;
	/**
	 * Where a node with a compiled library version runs. `library` requires the
	 * library node (unsupported parameters are errors); `fallback` runs the v1
	 * node in the fallback host. Without it, the compiler picks the library
	 * node when it supports the call.
	 */
	host?: 'library' | 'fallback';
	/** One item list for each node input. It replaces `items`. Fallback host only. */
	inputs?: Item[][];
	/** `all`: the result has one `{ items }` object for each node output. Fallback host only. */
	outputs?: 'all' | 'first';
	/** The sub-nodes of an AI cluster node. Fallback host only. */
	subNodes?: SubNodeCall[];
	/** The n8n `onError` setting, for nodes that handle errors themselves. */
	onError?: 'stopWorkflow' | 'continueRegularOutput' | 'continueErrorOutput';
	/** Run data of other nodes for the n8n expressions of the node. Fallback host only. */
	runData?: RunData;
	/** Run the `poll` function of a polling trigger once, as a manual run of n8n does. Fallback host only. */
	poll?: boolean;
	/**
	 * The mode of the poll: `manual` (the default) as a manual run of n8n
	 * polls, or `trigger` for a production poll that moves its cursor
	 * (spec 9.8). Fallback host only.
	 */
	pollMode?: 'manual' | 'trigger';
	/**
	 * An AI cluster: after the outputs, the result has `{ subRuns }`, the runs of the
	 * sub-nodes (`{ name: [{ error }] }`). Needs `outputs: 'all'`. Fallback host only.
	 */
	subRuns?: boolean;
	/**
	 * After the outputs, the result has `{ nodeError }` when the whole node failed under
	 * "continue on fail" (v1 passes the input on). Needs `outputs: 'all'`. Fallback host only.
	 */
	reportError?: boolean;
	/** Settings of the workflow for the node, such as `timezone` (`$now`). Fallback host only. */
	settings?: { timezone?: string };
	/**
	 * The step reads or changes the workflow static data (spec 9.7): the
	 * runtime sends it and keeps what the step changed. Fallback host only.
	 */
	staticData?: boolean;
}

/** Outputs of other nodes that n8n expressions read in the fallback host. */
export interface RunData {
	nodes: Array<{
		name: string;
		type: string;
		typeVersion: number;
		parameters: Record<string, unknown>;
	}>;
	/** `[from, output, to, input]`. */
	connections: Array<[string, number, string, number]>;
	/** For each node, its runs; each run has one item list for each output. */
	runs: Record<string, Item[][][]>;
}

/** A sub-node of an AI cluster: it supplies data to `target` over `connection`. */
export interface SubNodeCall {
	name: string;
	type: string;
	typeVersion?: number;
	parameters?: Record<string, unknown>;
	credential?: string;
	/** The n8n connection type, for example `ai_languageModel`. */
	connection: string;
	/** The node that gets the data: the root node or another sub-node. */
	target: string;
	/** The input index on the target, for example 1 for the fallback model of an agent. */
	targetIndex?: number;
	/** More credential slots that the sub-node uses: the nodes of a workflow tool's callee. */
	slots?: string[];
}

export interface HttpCall extends StepOptions {
	method: HttpMethod;
	url: string;
	headers?: Record<string, string>;
	qs?: Record<string, unknown>;
	body?: unknown;
	credential?: string;
	idempotent?: boolean;
	/** Total time limit of the request in ms. The runtime default is 300,000. */
	timeoutMs?: number;
	/**
	 * How `qs` goes into the URL (spec 7.1): `repeat` (the default) or `brackets`, as n8n's
	 * request helpers write it without `useQuerystring` (`sort[0][field]=a`).
	 */
	qsFormat?: 'repeat' | 'brackets';
}

export interface HttpResponse<T> {
	status: number;
	headers: Record<string, string>;
	body: T;
}

export interface CodeCall extends StepOptions {
	code: string;
	items?: Item[];
	/** The language of `code`. The default is JavaScript. */
	language?: 'javaScript' | 'python';
	/** Luxon's default zone in the code (`$now`, `DateTime`). Fallback host only. */
	timezone?: string;
	/** The code calls `$getWorkflowStaticData` (spec 9.7). Fallback host only. */
	staticData?: boolean;
}

export interface WaitCall extends StepOptions {
	/** Wait time in milliseconds. */
	duration?: number;
	/** Resume time in milliseconds since the epoch. */
	until?: number;
}

export interface ApprovalCall extends StepOptions {
	message: string;
	via?: string;
	timeout?: number;
	/**
	 * A node that sends the message (send-and-wait). The fallback host runs it
	 * before the execution waits; its frame has `execution` with the resume URLs.
	 */
	node?: {
		type: string;
		typeVersion?: number;
		parameters?: Record<string, unknown>;
		credential?: string;
	};
}

export interface ApprovalResult {
	approved: boolean;
	by?: string;
	data?: Record<string, unknown>;
}

export interface RespondCall extends StepOptions {
	status?: number;
	body: unknown;
	headers?: Record<string, string>;
	/** A file to send as the response body (base64 `data`). When it is set, the runtime ignores `body`. */
	binary?: { data: string; mimeType?: string; fileName?: string };
}

/**
 * A call of an n8n service (spec 1.2, 9.10): the data tables of the project
 * (`dataTable`) or the deduplication store (`deduplication`). The runtime
 * sends it to the backend (n8n, or the fallback host in the test bed) and
 * records the result, so a replay does not call the service again.
 */
export interface ServiceCall extends StepOptions {
	service: string;
	op: string;
	args?: Record<string, unknown>;
}

/** The request of a library node to an n8n service (`ServiceCall` without the step options). */
export interface ServiceRequest {
	service: string;
	op: string;
	args?: Record<string, unknown>;
}

/** The execution context. Each call except `now`, `random` and `trace` is a durable step. */
export interface Ctx {
	node<T = Item>(call: NodeCall): Promise<T[]>;
	http<T = unknown>(call: HttpCall): Promise<HttpResponse<T>>;
	code<T = Item>(call: CodeCall): Promise<T[]>;
	wait(call: WaitCall): Promise<void>;
	approval(call: ApprovalCall): Promise<ApprovalResult>;
	respond(call: RespondCall): Promise<void>;
	service<T = unknown>(call: ServiceCall): Promise<T>;
	now(): number;
	random(): number;
	/**
	 * Reports the output items of a node that runs as glue code. It does not
	 * suspend and is not logged. It has an effect only when the execution
	 * runs with tracing on (spec section 9.3).
	 */
	trace(name: string, items: unknown): void;
	/** n8n's `$execution`: the id, the mode and the resume URLs (spec 9.5). Glue. */
	execution(): ExecutionInfo;
	/** n8n's `$vars`, as they were when the execution started (spec 9.5). Glue. */
	vars(): Record<string, string>;
	/**
	 * n8n's `$getWorkflowStaticData(type)` (spec 9.7): `global`, or `node`
	 * with the node name. Changes persist when a production run ends with
	 * `ok` or `error`. Glue.
	 */
	staticData(type: 'global' | 'node', node?: string): Record<string, unknown>;
	/**
	 * The items of a poll (spec 9.8). True when there are some: the run then
	 * reports `started` with them as the trigger output. False when there are
	 * none: return, and the run leaves no execution. Glue.
	 */
	polled(items: unknown[]): boolean;
}

export interface ExecutionInfo {
	/** The n8n execution id for a manual run, `wfrt-<n>` for a trigger run. */
	id: string;
	/** n8n's `$execution.mode`. */
	mode: 'test' | 'production';
	/** Resumes the approval that the execution waits for now. */
	resumeUrl: string;
	resumeFormUrl: string;
}

export interface WorkflowDefinition<TEvent> {
	triggers: Array<Trigger<TEvent>>;
	credentials?: Record<string, CredentialSlot>;
	durability?: 'full' | 'steps';
	/** IANA time zones that code formats dates in (\`Date.zoneOffset\`). The runtime loads their data. */
	zones?: string[];
	run: (ctx: Ctx, trigger: TEvent) => Promise<unknown>;
}

export function workflow<TEvent>(
	definition: WorkflowDefinition<TEvent>,
): WorkflowDefinition<TEvent> {
	return definition;
}

/** The request that a library node sends. */
export interface HttpRequest {
	method: string;
	url: string;
	headers: Record<string, string>;
	qs: Record<string, unknown>;
	body: unknown;
	credential?: string;
	/** A `multipart/form-data` body (spec 7.1); the runtime makes the boundary. Not with `body`. */
	multipart?: MultipartPart[];
	/** How `qs` goes into the URL (spec 7.1): `repeat` (the default) or `brackets`. */
	qsFormat?: 'repeat' | 'brackets';
}

/** A part of a multipart body: a text field, or a file (`binary`, n8n's binary form). */
export type MultipartPart =
	| { name: string; value: string }
	| {
			name: string;
			binary: { data: string; id?: string; mimeType?: string; fileName?: string };
	  };

/** The context of a library node. Its calls run under the step of the `ctx.node` call. */
export interface NodeCtx {
	http<T = unknown>(request: HttpRequest): Promise<HttpResponse<T>>;
	/** A call of an n8n service (`ServiceRequest`); the result is the service's JSON. */
	service<T = unknown>(request: ServiceRequest): Promise<T>;
	/** The workflow static data, as `Ctx.staticData` (spec 9.7). Library polls keep their cursor there. */
	staticData(type: 'global' | 'node', node?: string): Record<string, unknown>;
}

/**
 * The operations and parameters that a library node supports. The compiler
 * rejects a `ctx.node` call with literal parameters outside this list
 * (`WL060`).
 */
export interface NodeSupport {
	/** The resource when a call names none. */
	resource?: string;
	/** The operation of each resource when a call names none. */
	operation?: Record<string, string>;
	/**
	 * Supported operations, keyed `resource.operation` (or `operation` for a
	 * node without resources), with the parameter names each one accepts. A
	 * name `options.limit` accepts the member `limit` of the object `options`.
	 */
	operations: Record<string, string[]>;
}

export interface NodeDefinition<TParameters> {
	type: string;
	version: number;
	supports?: NodeSupport;
	run: (
		ctx: NodeCtx,
		parameters: TParameters,
		items: Item[] | undefined,
		credential: string | undefined,
	) => Promise<Item[]>;
}

export function defineNode<TParameters>(
	definition: NodeDefinition<TParameters>,
): NodeDefinition<TParameters> {
	return definition;
}
