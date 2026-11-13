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
	triggers: unknown[];
	compiledAt: string;
}

// Events of `GET /_admin/events` (spec section 9.2).

export interface WfrtStartedEvent {
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

export interface WfrtWaitingEvent {
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

export interface WfrtFinishedEvent {
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
export interface WfrtStaticDataEvent {
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

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
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
