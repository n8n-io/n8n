import type { IDataObject } from 'n8n-workflow';
import type { CompiledEngineDiagnostic, CompiledNodeTier } from '@n8n/api-types';

/** The suffix of the `wfrt` workflow id that holds the draft version for manual runs. */
export const MANUAL_WORKFLOW_SUFFIX = '~manual';

/** The webhook path prefix that `wfrt` serves, the same as n8n's production prefix. */
export const WFRT_WEBHOOK_PREFIX = '/webhook';

/** A credential slot of a compiled workflow and the n8n credential that fills it. */
export interface CredentialSlotBinding {
	slot: string;
	type: string;
	credentialId: string | null;
	credentialName: string;
}

/**
 * A value that compiled node code needs from the credential of a slot. Without a kind: text
 * that n8n computes with `code`. Kind `flag`: the outcome of one condition, a boolean that
 * node code reads. Kind `guard`: the flags of one node instance, the values of them that
 * were checked against the v1 node, and the name of the node.
 */
export interface CredentialDerivationRequest {
	name: string;
	code: string;
	kind?: 'flag' | 'guard';
	flags?: string[];
	allowed?: string[];
	node?: string;
}

/** The result of converting and compiling one workflow version. */
export interface CompiledArtifact {
	/** Hash of the compiler input. It is the version id that `wfrt` gets. */
	key: string;
	workflowId: string;
	versionId: string;
	ok: boolean;
	diagnostics: CompiledEngineDiagnostic[];
	nodes: Record<string, CompiledNodeTier>;
	/** The `.wfm` module. Not set when `ok` is false. */
	module?: Buffer;
	slots: CredentialSlotBinding[];
	/**
	 * Values that compiled node code needs from the credential of a slot, by slot: n8n computes
	 * each one from the credential data when it builds the credentials document.
	 */
	derivations?: Record<string, CredentialDerivationRequest[]>;
	/**
	 * Tokens that compiled node code needs and that only n8n can make, by slot: n8n makes each
	 * one from the credential data when it builds the credentials document.
	 */
	mints?: Record<string, CredentialMintRequest[]>;
	triggers: unknown[];
	compiledAt: string;
}

/** A token that n8n makes from a credential for compiled node code. */
export interface CredentialMintRequest {
	/** The key of the token under `data.n8nMinted` in the credentials document. */
	name: string;
	/**
	 * `google-service-account-http`: the token of the HTTP Request node, with the scopes of the
	 * credential data. `service` and `scopes` say nothing then.
	 */
	kind: 'google-service-account' | 'google-service-account-http';
	/** The key of the scopes in the scopes table of the Google nodes. */
	service: string;
	scopes: string[];
}

// Events of `GET /_admin/events` (spec section 9.2).

/**
 * The outbox position of a durable event. An older `wfrt` sends none; n8n then
 * works as it did before, without `after=` and without acks.
 */
export interface WfrtOutboxPosition {
	/** The shard that wrote the event. */
	shard?: number;
	/** The number of the event in its shard: 1 and growing, also across restarts. */
	seq?: number;
}

/** The last fully handled seq of each shard. The keys are the shard numbers. */
export type WfrtEventCursor = Record<string, number>;

/** One ack of `POST /_admin/events/ack`. */
export interface WfrtAck {
	shard: number;
	seq: number;
}

export interface WfrtStartedEvent extends WfrtOutboxPosition {
	type: 'started';
	executionId: string;
	workflowId: string;
	versionId: string;
	mode: 'manual' | 'trigger';
	trigger?: unknown;
	at: number;
}

export interface WfrtStepEvent {
	type: 'step';
	executionId: string;
	step: string;
	status: 'started' | 'completed' | 'failed' | 'retrying';
	args?: unknown;
	result?: unknown;
	error?: string;
	at: number;
}

export interface WfrtTraceEvent {
	type: 'trace';
	executionId: string;
	step: string;
	items: unknown;
	at: number;
}

export interface WfrtWaitingEvent extends WfrtOutboxPosition {
	type: 'waiting';
	executionId: string;
	step: string;
	/** Set for an approval: the public resume path `/resume/<executionId>/<effectSeq>`. */
	resumeUrl?: string;
	/** Set for an approval: the signature that every resume of the execution must give. */
	signature?: string;
	/** Set for a timed wait: when `wfrt` resumes the execution itself, in ms. */
	waitTill?: number;
	at: number;
}

export interface WfrtFinishedEvent extends WfrtOutboxPosition {
	type: 'finished';
	executionId: string;
	status: 'ok' | 'error' | 'needs_attention' | 'limit' | 'cancelled';
	result?: unknown;
	error?: string;
	/** With `needs_attention`: the step whose effect failed. */
	step?: string;
	at: number;
}

/** `wfrt` dropped events while no client read the stream. */
export interface WfrtDroppedEvent {
	type: 'dropped';
	count: number;
	at: number;
}

/** The static data of a workflow changed (spec section 9.7). */
export interface WfrtStaticDataEvent extends WfrtOutboxPosition {
	type: 'staticData';
	workflowId: string;
	staticData: IDataObject;
	at: number;
}

/** `wfrt` did not keep a static data change: a limit, named in the message. */
export interface WfrtStaticDataRejectedEvent {
	type: 'staticDataRejected';
	message: string;
	at: number;
}

/**
 * A service call of an execution (spec section 9.9). n8n answers it with
 * `POST /_admin/services/<callId>`.
 */
export interface WfrtServiceEvent {
	type: 'service';
	executionId: string;
	workflowId: string;
	step: string;
	callId: string;
	/** Retries of the step. A call with the same `callId` and `attempt` gets the same answer. */
	attempt: number;
	service: string;
	op: string;
	args: unknown;
	at: number;
}

export type WfrtEvent =
	| WfrtServiceEvent
	| WfrtStartedEvent
	| WfrtStepEvent
	| WfrtTraceEvent
	| WfrtWaitingEvent
	| WfrtFinishedEvent
	| WfrtDroppedEvent
	| WfrtStaticDataEvent
	| WfrtStaticDataRejectedEvent;

/** The event kinds that `wfrt` keeps in its outbox, so n8n can resume them. */
export type WfrtDurableEvent =
	| WfrtStartedEvent
	| WfrtWaitingEvent
	| WfrtFinishedEvent
	| WfrtStaticDataEvent;

/** A durable event that carries its outbox position. */
export type WfrtSequencedEvent = WfrtDurableEvent & { shard: number; seq: number };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Whether the event goes to the outbox, so n8n resumes and acks it. */
export function isDurableEvent(event: WfrtEvent): event is WfrtDurableEvent {
	return (
		event.type === 'started' ||
		event.type === 'waiting' ||
		event.type === 'finished' ||
		event.type === 'staticData'
	);
}

/** Whether the event carries its outbox position. Never true for an older `wfrt`. */
export function isSequencedEvent(event: WfrtEvent): event is WfrtSequencedEvent {
	return (
		isDurableEvent(event) &&
		typeof event.shard === 'number' &&
		typeof event.seq === 'number' &&
		Number.isInteger(event.seq)
	);
}

/** Reads the outbox position of an event line; `{}` when the line has none. */
function readPosition(value: Record<string, unknown>): WfrtOutboxPosition {
	const position: WfrtOutboxPosition = {};
	if (typeof value.shard === 'number' && Number.isInteger(value.shard)) {
		position.shard = value.shard;
	}
	if (typeof value.seq === 'number' && Number.isInteger(value.seq)) position.seq = value.seq;
	return position;
}

/** A JSON object, as n8n stores workflow static data. */
export function isDataObject(value: unknown): value is IDataObject {
	return isRecord(value);
}

function isStepStatus(value: unknown): value is WfrtStepEvent['status'] {
	return value === 'started' || value === 'completed' || value === 'failed' || value === 'retrying';
}

function isFinishedStatus(value: unknown): value is WfrtFinishedEvent['status'] {
	return (
		value === 'ok' ||
		value === 'error' ||
		value === 'needs_attention' ||
		value === 'limit' ||
		value === 'cancelled'
	);
}

/** Reads one event line. Returns `undefined` for a line that is not a known event. */
export function parseWfrtEvent(line: string): WfrtEvent | undefined {
	let value: unknown;
	try {
		value = JSON.parse(line);
	} catch {
		return undefined;
	}
	if (!isRecord(value) || typeof value.type !== 'string') return undefined;
	if (value.type === 'dropped') {
		return {
			type: 'dropped',
			count: typeof value.count === 'number' ? value.count : 0,
			at: typeof value.at === 'number' ? value.at : Date.now(),
		};
	}
	if (value.type === 'staticData') {
		if (typeof value.workflowId !== 'string' || !isDataObject(value.staticData)) return undefined;
		return {
			...readPosition(value),
			type: 'staticData',
			workflowId: value.workflowId,
			staticData: value.staticData,
			at: typeof value.at === 'number' ? value.at : Date.now(),
		};
	}
	if (value.type === 'staticDataRejected') {
		return {
			type: 'staticDataRejected',
			message: typeof value.message === 'string' ? value.message : '',
			at: typeof value.at === 'number' ? value.at : Date.now(),
		};
	}
	const executionId =
		typeof value.executionId === 'number' ? String(value.executionId) : value.executionId;
	if (typeof executionId !== 'string') return undefined;
	const at = typeof value.at === 'number' ? value.at : Date.now();
	const step = typeof value.step === 'string' ? value.step : undefined;

	switch (value.type) {
		case 'service':
			if (typeof value.callId !== 'string' || typeof value.op !== 'string') return undefined;
			return {
				type: 'service',
				executionId,
				workflowId: typeof value.workflowId === 'string' ? value.workflowId : '',
				step: step ?? '',
				callId: value.callId,
				attempt: typeof value.attempt === 'number' ? value.attempt : 0,
				service: typeof value.service === 'string' ? value.service : '',
				op: value.op,
				args: value.args,
				at,
			};
		case 'started':
			return {
				...readPosition(value),
				type: 'started',
				executionId,
				workflowId: String(value.workflowId ?? ''),
				versionId: String(value.versionId ?? ''),
				mode: value.mode === 'manual' ? 'manual' : 'trigger',
				trigger: value.trigger,
				at,
			};
		case 'step':
			if (step === undefined || !isStepStatus(value.status)) return undefined;
			return {
				type: 'step',
				executionId,
				step,
				status: value.status,
				args: value.args,
				result: value.result,
				error: typeof value.error === 'string' ? value.error : undefined,
				at,
			};
		case 'trace':
			if (step === undefined) return undefined;
			return { type: 'trace', executionId, step, items: value.items, at };
		case 'waiting':
			if (step === undefined) return undefined;
			return {
				...readPosition(value),
				type: 'waiting',
				executionId,
				step,
				resumeUrl: typeof value.resumeUrl === 'string' ? value.resumeUrl : undefined,
				signature: typeof value.signature === 'string' ? value.signature : undefined,
				waitTill: typeof value.waitTill === 'number' ? value.waitTill : undefined,
				at,
			};
		case 'finished':
			if (!isFinishedStatus(value.status)) return undefined;
			return {
				...readPosition(value),
				type: 'finished',
				executionId,
				status: value.status,
				result: value.result,
				error: typeof value.error === 'string' ? value.error : undefined,
				step,
				at,
			};
		default:
			return undefined;
	}
}

/**
 * The end of the error text of `wfrt` for a limit that the v1 engine does not have. The
 * fallback host runs the node code of v1, so the node runs there without the limit.
 * `(limit: binary-max-file)`: a response is larger than `--binary-max-file-mb`.
 * The `sql` effect (spec 9.10 of the workflow language) and the Postgres library node end a
 * call that has no exact native form with one of the `sql-` markers, before a statement is
 * committed: a result larger than `--sql-max-result-kb`, a column type or a value without a
 * native form, a text that is not one command with bind values, a credential with an SSH
 * tunnel or a certificate, and an input that the library node cannot send with bind values.
 * `(limit: smtp-host)`: the `smtp` effect cannot send a message as nodemailer sends it. It
 * ends the call before it writes the MAIL command.
 */
const HOST_LIMIT_MARKERS = [
	'(limit: binary-max-file)',
	'(limit: sql-max-result)',
	'(limit: sql-type)',
	'(limit: sql-statement)',
	'(limit: sql-credential)',
	'(limit: sql-host)',
	'(limit: smtp-host)',
];

/**
 * The end of the step name of the fallback-host form of a compiled node (`HOST_STEP` of the
 * converter). A compiled node that reaches a limit that v1 does not have, and that sent no
 * request that v1 sends once, runs in the host in the same run, under this step name.
 */
export const HOST_STEP_SUFFIX = ' (fallback host)';

/**
 * The service of the data that n8n keeps for the execution that runs (spec section 9.9):
 * `setCustomData` (the Execution Data node) and `setTimeSaved` (the Time Saved node).
 */
export const EXECUTION_SERVICE = 'execution';

/** True when the error of a step says that the node must run in the fallback host. */
export function needsFallbackHost(message: string | undefined): boolean {
	if (!message) return false;
	// A compiled node can put the text of `wfrt` into the error that it throws.
	return HOST_LIMIT_MARKERS.some((marker) => message.includes(marker));
}
