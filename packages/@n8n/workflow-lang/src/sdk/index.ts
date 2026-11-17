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
	/** A manual run of n8n: the `webhookUrl` of the trigger item, or an empty text for none. */
	webhookUrl?: string;
	/** A manual run of n8n: `test`, or the `executionMode` of the trigger item, or an empty text. */
	executionMode?: string;
	/** The payload of the token that the Webhook node of n8n checked (JWT authentication). */
	jwtPayload?: Item;
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
	/**
	 * Fallback host only. The answers of the GET requests that a library node received before
	 * it handed the node over to the host: `{ method, url, qs, response: { status, headers,
	 * body } }` for each request, in the order of the requests. The host gives each answer once
	 * to the v1 node for the same request, and sends each other request.
	 */
	replay?: unknown[];
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
	/**
	 * Basic auth of this call. The values can hold credential templates
	 * (`{{$credentials.user}}`); the runtime fills them and writes the header. It replaces
	 * the basic auth that the credential injects.
	 */
	basicAuth?: { user: string; password: string };
	idempotent?: boolean;
	/** Total time limit of the request in ms. The runtime default is 300,000. */
	timeoutMs?: number;
	/**
	 * How `qs` goes into the URL (spec 7.1): `repeat` (the default) or `brackets`, as n8n's
	 * request helpers write it without `useQuerystring` (`sort[0][field]=a`).
	 */
	qsFormat?: 'repeat' | 'brackets';
	/** Stores the body of a 2xx response as binary data; the body is `{ $binary: BinaryHandle }`. */
	responseBinary?: ResponseBinary;
}

export interface HttpResponse<T> {
	status: number;
	headers: Record<string, string>;
	body: T;
}

/**
 * A binary value (spec 7.1): metadata and the id of the bytes in the binary data store of n8n.
 * The bytes are never in the JSON. Code can read the metadata, and can give the handle to an
 * effect: in `$binary` of an item, as `binary` of a multipart part, or as `body: { $binary }`.
 */
export interface BinaryHandle {
	id: string;
	/** The name of the store, as n8n writes it: `filesystem-v2`. */
	data: string;
	mimeType: string;
	fileType?: string;
	fileName?: string;
	fileExtension?: string;
	/** The size as text, as n8n writes it: `1.34 kB`. */
	fileSize: string;
	bytes: number;
}

/**
 * `responseBinary` of an `http` call (spec 7.1): the runtime streams the body of a 2xx response to
 * the binary data store, and the `body` of the result is `{ $binary: BinaryHandle }`.
 */
export interface ResponseBinary {
	/** The file name. Without it: the `Content-Disposition` header, else the path of the URL. */
	fileName?: string;
	/** The MIME type. Without it: the `Content-Type` header. */
	mimeType?: string;
	/**
	 * A rule that decides after the head of the response: the body is stored only when the
	 * content type has one of these texts and none of `inlineTypes` (the `includes` of
	 * JavaScript). Another response has its usual body. `fileName` and `mimeType` are not read.
	 */
	storeTypes?: string[] | string;
	/** With `storeTypes`: a content type with one of these texts is never stored. */
	inlineTypes?: string[] | string;
	/** Stores the body of a response of each status, not only 200 to 299. */
	anyStatus?: boolean;
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
 * A call of an n8n service (spec 1.2, 9.9): the data tables of the project
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

/** A bind value of a SQL statement. Node code turns an object into JSON text itself. */
export type SqlValue = string | number | boolean | null;

/**
 * One SQL command. `text` holds `$1..$n`; the runtime sends `values` as bind values.
 * With `simple: true`, the runtime sends `text` as it is with the simple query protocol,
 * as the v1 node does. The text can then hold more than one command, and `values` must be
 * absent. The database runs the text as it is, so only a formatter that equals pg-promise
 * writes a value into it.
 */
export interface SqlStatement {
	text: string;
	values?: SqlValue[];
	simple?: true;
	/**
	 * In the mode `independently`: when a statement fails, the later statements with the same
	 * `group` do not run, and each has the entry `{ skipped: true }`. Without `group`, a
	 * statement is a group of its own. The MySQL node uses it: v1 drops the other statements
	 * of an item after a failure.
	 */
	group?: number;
}

/**
 * The request of a `sql` effect (spec 9.10). The runtime opens the connection from the
 * credential of the slot. Code never reads the connection values.
 */
export interface SqlRequest {
	/** Name of a credential slot of the workflow. */
	credential: string;
	/**
	 * `mysql` (spec 9.11): each statement has `simple: true` and no `values`, because the v1
	 * MySQL node sends only text that its driver formatted on the client.
	 */
	dialect: 'postgres' | 'mysql';
	/**
	 * `single` (the default): one statement runs alone; more than one run in one transaction.
	 * `transaction`: always one transaction. `independently`: each statement alone, and a
	 * failure does not stop the next statement.
	 */
	mode?: 'single' | 'independently' | 'transaction';
	statements: SqlStatement[];
	/**
	 * Postgres: `int8` and `numeric` columns as text (the default) or as numbers. MySQL:
	 * `numbers` (the default) gives a BIGINT as a number when it is a safe integer and as
	 * text when it is not; `text` gives it as text always.
	 */
	largeNumbers?: 'text' | 'numbers';
	/** MySQL only: a DECIMAL column as text (the default) or as a number. */
	decimals?: 'text' | 'numbers';
	/** `text` (the default): a `date` column is its wire text. `legacy`: a `date` column sends the call to the host. */
	dates?: 'text' | 'legacy';
	connectTimeoutMs?: number;
	/** Total time limit in ms. The runtime default is 300,000. */
	timeoutMs?: number;
}

export interface SqlCall extends StepOptions, SqlRequest {}

/**
 * A database error. Postgres: the fields of the error response of the server as
 * node-postgres names them. MySQL: `code` (the name that mysql2 has for `errno`), `errno`,
 * `sqlState` and `sqlMessage`, as mysql2 names them.
 */
export interface SqlError {
	message: string;
	errno?: number;
	sqlState?: string;
	sqlMessage?: string;
	length?: number;
	severity?: string;
	code?: string;
	detail?: string;
	hint?: string;
	position?: string;
	internalPosition?: string;
	internalQuery?: string;
	where?: string;
	schema?: string;
	table?: string;
	column?: string;
	dataType?: string;
	constraint?: string;
	file?: string;
	line?: string;
	routine?: string;
}

/** The OK packet of a MySQL command that gives no rows. mysql2 reads `changedRows` from `info`. */
export interface SqlOk {
	affectedRows: number | string;
	insertId: number | string;
	info: string;
	serverStatus: number;
	warningStatus: number;
}

/**
 * The rows of one statement, keyed by column name. MySQL: `command` is `SELECT` for a
 * result set and `OK` for an OK packet, which has `ok` and no rows.
 */
export interface SqlRows {
	command: string;
	rowCount: number | null;
	rows: Item[];
	ok?: SqlOk;
}

/** The result of a statement with `simple: true`: the rows of each command that completed, in order. */
export interface SqlSets {
	sets: SqlRows[];
}

export interface SqlFailure {
	error: SqlError;
}

/**
 * MySQL, mode `independently`: the entry of a statement that did not run after a failure in
 * its `group`. It is in the place of an entry of `SqlResult.results`.
 */
export interface SqlSkipped {
	skipped: true;
}

/**
 * The result of a `sql` effect. A database error is data, not a throw. `results` is in
 * statement order; in the modes `single` and `transaction` it ends with the first failure.
 * `connect`: the connection failed, and `results` is empty.
 */
export interface SqlResult {
	results: Array<SqlRows | SqlSets | SqlFailure>;
	connect?: SqlError;
}

/**
 * One file of a message of the `smtp` effect: a binary property of an item. `data` is the
 * content in base64, or the mode name of n8n's binary data store with the file in `id`: the
 * runtime then reads the stored file.
 */
export interface SmtpAttachment {
	/** The file name. The runtime takes the content type from it, as nodemailer does. */
	filename: string;
	/** The content id of an inline file. */
	cid?: string;
	data: string;
	id?: string;
}

/**
 * The request of an `smtp` effect: the fields of one message for one SMTP connection. The
 * runtime reads host, port, TLS settings, user and password from the credential of the
 * slot. Code never reads them. The runtime builds the message from the fields as
 * nodemailer 10 builds it for the Send Email node of n8n (`MailComposer`), and sends it as
 * nodemailer does: EHLO, STARTTLS when the server offers it, AUTH PLAIN or LOGIN, the
 * envelope from the headers, DATA, and no QUIT. A field that is empty is a field that is
 * not set. The Message-ID, the Date header and the MIME boundaries have the format of
 * nodemailer, with the random bytes and the clock of the runtime.
 */
export interface SmtpRequest {
	/** Name of a credential slot of the workflow, with a credential of the type `smtp`. */
	credential: string;
	/** The addresses of the From, To, Cc, Bcc and Reply-To headers, as the node gives them. */
	from?: string;
	to?: string;
	cc?: string;
	bcc?: string;
	replyTo?: string;
	subject?: string;
	text?: string;
	html?: string;
	attachments?: SmtpAttachment[];
	/** True: a certificate that cannot be checked is taken (the option of the node). */
	allowUnauthorizedCerts?: boolean;
}

export interface SmtpCall extends StepOptions, SmtpRequest {}

/** One recipient that the server refused, as nodemailer reports it. */
export interface SmtpRejected {
	message: string;
	code: string;
	response: string;
	responseCode?: number;
	command: string;
	recipient: string;
}

/** The `info` of nodemailer. */
export interface SmtpSent {
	accepted: string[];
	rejected: string[];
	/** The lines of the last EHLO reply after the first. Absent when there is none. */
	ehlo?: string[];
	rejectedErrors?: SmtpRejected[];
	envelopeTime: number;
	messageTime: number;
	/** The bytes of the message on the wire. */
	messageSize: number;
	/** The last reply of the server. */
	response: string;
	/** The sender (false when the message has none) and the recipients of the envelope. */
	envelope: { from: string | false; to: string[] };
	messageId: string;
}

/** An error of nodemailer. It is data, not a throw. */
export interface SmtpFailure {
	error: {
		message: string;
		code: string;
		response?: string;
		responseCode?: number;
		command: string;
		rejected?: string[];
		rejectedErrors?: SmtpRejected[];
	};
}

export type SmtpResult = SmtpSent | SmtpFailure;

/** The execution context. Each call except `now`, `random` and `trace` is a durable step. */
export interface Ctx {
	node<T = Item>(call: NodeCall): Promise<T[]>;
	http<T = unknown>(call: HttpCall): Promise<HttpResponse<T>>;
	code<T = Item>(call: CodeCall): Promise<T[]>;
	wait(call: WaitCall): Promise<void>;
	approval(call: ApprovalCall): Promise<ApprovalResult>;
	respond(call: RespondCall): Promise<void>;
	service<T = unknown>(call: ServiceCall): Promise<T>;
	sql(call: SqlCall): Promise<SqlResult>;
	smtp(call: SmtpCall): Promise<SmtpResult>;
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
	/** Basic auth of this call (spec 7.1). The values can hold credential templates. */
	basicAuth?: { user: string; password: string };
	/**
	 * `false`: the credential fills templates only; what it injects is not added (spec 7.1).
	 * `'redirect'`: the request after a redirect: the query parameters of the credential are
	 * not added again. `'redirectOtherOrigin'`: such a request to another origin without
	 * authentication: also no basic auth and no `Authorization`, `Proxy-Authorization` or
	 * `Cookie` header of the credential.
	 */
	inject?: boolean | 'redirect' | 'redirectOtherOrigin';
	/** `false`: the runtime gives a redirect response to the caller and does not follow it. */
	followRedirects?: boolean;
	/**
	 * The request helper of n8n whose default `accept` header a request without one gets:
	 * `'legacy'` (`helpers.request`) or `'request'` (`helpers.httpRequest`). `json` is the
	 * `json` option of that request. Without `acceptAs` the runtime uses its own default.
	 */
	acceptAs?: 'legacy' | 'request';
	json?: unknown;
	/** Stores the body of a 2xx response as binary data; the body is `{ $binary: BinaryHandle }`. */
	responseBinary?: ResponseBinary;
	/**
	 * `true`: the runtime does not renew an OAuth2 credential after a response of this request
	 * (`skipTokenRefresh` of the OAuth2 options of n8n-core).
	 */
	skipTokenRefresh?: boolean;
	/**
	 * The statuses that mean "the token expired" for this request, when the OAuth2 credential
	 * has none of its own (`tokenExpiredStatusCode` of the OAuth2 options of n8n-core). The
	 * default is 401.
	 */
	tokenExpiredStatusCode?: number | number[];
	/**
	 * `true`: the runtime applies the allowed domains of the credential to this request, as
	 * the HTTP Request node of n8n does. A request to another host fails, and nothing is sent.
	 *
	 * `{ own, target }`: the rule of a routed node of n8n (`routing-node.ts`). `own` is the host
	 * of the base URL in the description of the node, and `target` is the URL of the request
	 * before the hooks of the node. When `target` goes to `own`, the runtime adds `own` to the
	 * allowed domains, and the mode `none` lets the request pass. `own` is a constant that the
	 * node compiler writes into the module from the description of the node. The data of a
	 * workflow cannot change it, so a workflow cannot add a host of its choice.
	 */
	allowedDomains?: boolean | { own: string; target?: string };
	/** Total time limit of the request in ms (spec 7.1). The runtime default is 300,000. */
	timeoutMs?: number;
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
	/** SQL statements on the database of a credential slot (spec 9.10). Values are bind values. */
	sql(request: SqlRequest): Promise<SqlResult>;
	/** One message over SMTP, with the server and the login of a credential slot. */
	smtp(request: SmtpRequest): Promise<SmtpResult>;
	/** The workflow static data, as `Ctx.staticData` (spec 9.7). Library polls keep their cursor there. */
	staticData(type: 'global' | 'node', node?: string): Record<string, unknown>;
	/** A number in [0, 1) from the execution PRNG, as `Ctx.random`. Glue. */
	random(): number;
	/**
	 * A pause of `duration` milliseconds inside the step of the `ctx.node` call
	 * (spec 4.2). A timer ends it: the execution suspends and no thread waits.
	 * It has no step of its own and no result.
	 */
	wait(call: { duration: number }): Promise<void>;
	/**
	 * The outcome of one condition on the credential of the slot. n8n computes it where the
	 * credential is stored; the module names it by `id`, a constant `f` and eight hex digits.
	 * It gives no other value of the credential. It throws when the flag is not there. Glue.
	 */
	credentialFlag(slot: string | undefined, id: string): boolean;
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

/** The answer of a failed request: the status and the body as `NodeCtx.http` gives them. */
export interface FailedResponse {
	status: number;
	body: unknown;
}

export interface ApiErrorOptions {
	/**
	 * The request helper of the v1 node. `request` (the default): `helpers.httpRequest` and
	 * `helpers.httpRequestWithAuthentication`; the error of v1 has the body as
	 * `response.data`. `legacy`: `helpers.request`, `helpers.requestWithAuthentication` and
	 * `helpers.requestOAuth2`; the error of v1 has the body as `error` and the message
	 * `<status> - <body as JSON>`. `object`: the v1 node gives the NodeApiError an object of
	 * its own (`response.body` here), with the status as `statusCode`.
	 */
	helper?: 'request' | 'legacy' | 'object';
	/** The `message` option of the NodeApiError of the v1 node. It replaces the status message. */
	message?: string;
	/** The `description` option of the NodeApiError of the v1 node. */
	description?: string;
	/** The index of the item, for a v1 node that adds ` (item N)` to the message. */
	itemSuffix?: number;
	/**
	 * `true`: the v1 node catches the NodeApiError and throws a NodeOperationError with its
	 * message and description. That error has no `httpCode`.
	 */
	operationError?: boolean;
}

/** The error of a failed request: the NodeApiError of n8n-workflow as the engine carries it. */
export interface ApiError extends Error {
	/** The HTTP status as text. */
	httpCode?: string;
	description?: unknown;
	/**
	 * True when the v1 node throws this error outside its own handling of a failed item
	 * (`this.continueOnFail()`). Under a continue setting, n8n's engine then drops the output
	 * of the node and passes all input items on output 0 (`handleNodeExecutionError`).
	 */
	wholeNode?: boolean;
}

/** The keys of a message in an error answer, in the order of n8n-workflow (POSSIBLE_ERROR_MESSAGE_KEYS). */
const API_ERROR_MESSAGE_KEYS = [
	'cause',
	'error',
	'message',
	'Message',
	'msg',
	'messages',
	'description',
	'reason',
	'detail',
	'details',
	'errors',
	'errorMessage',
	'errorMessages',
	'ErrorMessage',
	'error_message',
	'_error_message',
	'errorDescription',
	'error_description',
	'error_summary',
	'error_info',
	'title',
	'text',
	'field',
	'err',
	'type',
];

/** The message of the NodeApiError of n8n-workflow for an HTTP status (STATUS_CODE_MESSAGES). */
export function apiStatusMessage(status: number): string {
	if (status === 400) return 'Bad request - please check your parameters';
	if (status === 401) return 'Authorization failed - please check your credentials';
	if (status === 402) return 'Payment required - perhaps check your payment details?';
	if (status === 403) return 'Forbidden - perhaps check your credentials?';
	if (status === 404) return 'The resource you are requesting could not be found';
	if (status === 405) {
		return 'Method not allowed - please check you are using the right HTTP method';
	}
	if (status === 429) return 'The service is receiving too many requests from you';
	if (status === 500) return 'The service was not able to process your request';
	if (status === 502) return 'Bad gateway - the service failed to handle your request';
	if (status === 503) {
		return 'Service unavailable - try again later or consider setting this node to retry automatically (in the node settings)';
	}
	if (status === 504) return 'Gateway timed out - perhaps try again later?';
	if (status >= 400 && status < 500) {
		return 'Your request is invalid or could not be processed by the service';
	}
	if (status >= 500 && status < 600) return 'The service failed to process your request';
	return '';
}

function apiErrorRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The outcome of one key in `findProperty` of n8n-workflow: `done` when the search ends with `text`. */
interface ApiErrorFound {
	done: boolean;
	text: string | null;
}

/**
 * `findProperty` of the NodeError of n8n-workflow without traversal keys: the first text
 * under a message key of `source`. null when there is none.
 */
function apiErrorProperty(source: Record<string, unknown>): string | null {
	for (const key of API_ERROR_MESSAGE_KEYS) {
		const found = apiErrorValue(source[key]);
		if (found.done) return found.text;
	}
	return null;
}

function apiErrorValue(given: unknown): ApiErrorFound {
	let value: unknown = given;
	if (!value) return { done: false, text: null };
	if (typeof value === 'string') {
		const text: string = value;
		try {
			value = JSON.parse(text);
		} catch (error) {
			return { done: true, text };
		}
		if (typeof value === 'string') return { done: true, text: value };
	}
	if (typeof value === 'number') return { done: true, text: String(value) };
	if (Array.isArray(value)) {
		const texts: string[] = [];
		for (const member of value) {
			if (typeof member === 'string') texts.push(member);
			else if (typeof member === 'number') texts.push(String(member));
			else if (apiErrorRecord(member) && Object.keys(member).length > 0) {
				const inner = apiErrorProperty(member);
				if (inner !== null) texts.push(inner);
			}
		}
		return { done: true, text: texts.length === 0 ? null : texts.join(' | ') };
	}
	if (apiErrorRecord(value) && Object.keys(value).length > 0) {
		const inner = apiErrorProperty(value);
		if (inner) return { done: true, text: inner };
	}
	return { done: false, text: null };
}

/**
 * The error of a library node for a failed request. It is the NodeApiError that the v1
 * node gives for the same answer: the message for the status (or `options.message`), the
 * description from the body, and `httpCode`. A node that the node compiler compiled from
 * the v1 source gives the same object (`__apiError`).
 */
export function apiError(response: FailedResponse, options?: ApiErrorOptions): ApiError {
	const status = response.status;
	const body = response.body;
	const legacy = options !== undefined && options.helper === 'legacy';
	const direct = options !== undefined && options.helper === 'object';
	const raw = legacy
		? String(status) + ' - ' + JSON.stringify(body)
		: 'Request failed with status code ' + String(status);
	let description: unknown = options !== undefined ? options.description : undefined;
	if (direct && !description && apiErrorRecord(body) && body.description) {
		description = body.description;
	}
	if (!legacy && !direct && apiErrorRecord(body)) {
		const inner = body.error;
		if (body.message) description = body.message;
		else if (apiErrorRecord(inner) && inner.message) description = inner.message;
	}
	if (!description) {
		// v1 searches the error of the HTTP client: its `error` (the body, legacy only), then its message.
		const found: ApiErrorFound =
			legacy || direct ? apiErrorValue(body) : { done: false, text: null };
		description = found.done ? found.text : direct ? null : raw;
	}
	let message = apiStatusMessage(status);
	if (options !== undefined && options.message !== undefined && options.message !== '') {
		message = options.message;
	}
	if (message === '') message = raw;
	const same = description === message;
	if (options !== undefined && options.itemSuffix !== undefined) {
		message = message + ' (item ' + String(options.itemSuffix) + ')';
	}
	const failure: ApiError = new Error(message);
	if (options !== undefined && options.operationError === true) {
		failure.name = 'NodeOperationError';
	} else {
		failure.name = 'NodeApiError';
		failure.httpCode = String(status);
	}
	if (description && !same) failure.description = description;
	return failure;
}

/**
 * The error of a library node that needs no request: the NodeOperationError of the v1 node,
 * with its `description`. It has no `httpCode`.
 */
export function operationError(message: string, description?: string): ApiError {
	const failure: ApiError = new Error(message);
	failure.name = 'NodeOperationError';
	if (description !== undefined && description !== '') failure.description = description;
	return failure;
}

/** An `operationError` that the v1 node throws outside its handling of a failed item. */
export function wholeNodeError(message: string): ApiError {
	const failure = operationError(message);
	failure.wholeNode = true;
	return failure;
}
