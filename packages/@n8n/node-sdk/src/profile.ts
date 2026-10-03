import { Readable } from 'node:stream';

import type { NodeContractVersion } from './version';

/** Where a bundle runs: in the n8n process, or in the wasm sandbox. */
export type RunPath = 'in_process' | 'sandbox';

/** A timed step of a contract run. Times are epoch milliseconds with a fraction. */
export type RunPhase =
	| {
			/** The host picks the version and makes its executor. */
			readonly name: 'load';
			/** The start time. */
			readonly startMs: number;
			/** The end time. */
			readonly endMs: number;
			/** The executor of the version was in the cache, so no bundle loaded. */
			readonly cached: boolean;
	  }
	| {
			/** The executor reads the stored credential and the base URL. */
			readonly name: 'credential';
			/** The start time. */
			readonly startMs: number;
			/** The end time. */
			readonly endMs: number;
			/** The credential type name, e.g. `notionApi`. */
			readonly credentialType: string;
			/** The auth scheme kind of the credential, e.g. `apply`, or `compat` for a legacy type. */
			readonly scheme: string;
	  }
	| {
			/** The host starts the sandbox sidecar, until the `[initialize]` answer. */
			readonly name: 'sandboxStart';
			/** The start time. */
			readonly startMs: number;
			/** The end time. */
			readonly endMs: number;
			/** The compiled guest was in the cache, so the sidecar did not compile it. */
			readonly compileCached: boolean;
	  };

/** One HTTP attempt of a contract run. A retry is a new attempt. */
export interface RunRequest {
	/** The start time, epoch milliseconds. */
	readonly startMs: number;
	/** The end time, epoch milliseconds. */
	readonly endMs: number;
	/** The input item the request is for. A batch run uses 0. */
	readonly itemIndex: number;
	/** The HTTP method. */
	readonly method: string;
	/** `http` or `https`. */
	readonly scheme: string;
	/** The host name. The path and the query are not kept: they can hold IDs and keys. */
	readonly host: string;
	/** The port, also when the URL has the default port. */
	readonly port: number;
	/** The path of a declarative binding, e.g. `/v1/pages/{page}`. A `run()` request has none. */
	readonly template?: string;
	/** The page number of a `list` binding, from 1. */
	readonly page?: number;
	/** 0 for the first attempt, then the number of the retry. */
	readonly resendCount: number;
	/** The HTTP status, when the response or the error has one. */
	readonly status?: number;
	/** The HTTP status as text, or the error code or name, when the attempt failed. */
	readonly errorType?: string;
	/**
	 * The size of the request body: the bytes of a text or binary body, or the JSON size of an
	 * object body. Absent for a stream body without a length.
	 */
	readonly requestBytes?: number;
	/**
	 * The size of the response body: the `content-length` of a full response, else the size of a
	 * text or byte body. Absent for a parsed body: n8n does not give its wire size.
	 */
	readonly responseBytes?: number;
	/** The `RunRpc.id` of the guest call that sent the attempt. Set only in the sandbox. */
	readonly rpc?: number;
	/** The request body as `payloadOf` gives it. Set only with a payload capture mode. */
	readonly requestBody?: string;
	/** The response body as `payloadOf` gives it, also of an HTTP error. Set only with a payload capture mode. */
	readonly responseBody?: string;
}

/**
 * What a run profile keeps of the data of a run, for development only. `shape`: the keys, the
 * types and the sizes. `redacted`: the values without the secrets of the credential.
 */
export type PayloadCapture = 'shape' | 'redacted';

/** The input and output items of a run as `payloadOf` gives them. */
export interface RunPayloads {
	/** The capture mode that made the texts. */
	readonly capture: PayloadCapture;
	/** The input of the first 20 items. */
	readonly inputs: readonly string[];
	/** The first 20 output items, in the order the run validated them. */
	readonly outputs: readonly string[];
}

/** Who sends a JSON-RPC request: the host calls an export, the guest calls an import. */
export type RpcDirection = 'host_to_guest' | 'guest_to_host';

/** One JSON-RPC request or notification between the host and the sandbox guest, with its answer. */
export interface RunRpc {
	/** The number of the message in the run, from 1, in the order the messages start. */
	readonly id: number;
	/** The JSON-RPC method, e.g. `action.item-run.[take]` or `http.request`. */
	readonly method: string;
	/** Who sends the request. */
	readonly direction: RpcDirection;
	/** The start time, epoch milliseconds. */
	readonly startMs: number;
	/** The end time: the answer, or the send of a notification. */
	readonly endMs: number;
	/** The UTF-8 size of the request line. */
	readonly requestBytes: number;
	/** The UTF-8 size of the answer line. Absent for a notification and for a lost answer. */
	readonly responseBytes?: number;
	/** The host time to encode its message: the request it sends, or its answer to the guest. */
	readonly encodeMs?: number;
	/** The host time to decode the message it gets: the answer, or the request of the guest. */
	readonly decodeMs?: number;
	/** The JSON-RPC error code of an error answer, or the error name when no answer came. */
	readonly errorType?: string;
}

/** What one execution of a contract node did, as plain data. The host turns it into spans or metrics. */
export interface RunProfile {
	/** The action id, e.g. `notion.databasePage.getAll`. */
	readonly action: string;
	/** The semver of the version that ran. */
	readonly version: string;
	/** The hash of the bundle that ran. */
	readonly bundleHash: string;
	/** The Node Contract version of the bundle. */
	readonly nodeContract: NodeContractVersion;
	/** Where the bundle ran. Absent when the executor loader did not tell. */
	readonly path?: RunPath;
	/** The start time, epoch milliseconds. */
	readonly startMs: number;
	/** The end time, epoch milliseconds. */
	readonly endMs: number;
	/** The error name, when the run failed. */
	readonly errorType?: string;
	/** The load, credential and sandbox start steps, in order. */
	readonly phases: readonly RunPhase[];
	/** The first 200 attempts, in order. */
	readonly requests: readonly RunRequest[];
	/** All attempts, also the ones `requests` does not keep. */
	readonly requestCount: number;
	/** The first 200 JSON-RPC requests and notifications of a sandbox run, in the order they ended. */
	readonly rpcs: readonly RunRpc[];
	/** All JSON-RPC requests and notifications, also the ones `rpcs` does not keep. */
	readonly rpcCount: number;
	/** The attempts that are retries. */
	readonly retryCount: number;
	/** The first attempts of the pages of `list` bindings. */
	readonly pageCount: number;
	/** The input items of the run. */
	readonly inputItems: number;
	/** The output items of all outputs. */
	readonly outputItems: number;
	/** The sum of the time to read, default and validate the input of each item. */
	readonly inputMs: number;
	/** The sum of the time to validate each output item. */
	readonly outputValidateMs: number;
	/** The distinct output issues that passed on with a warning. */
	readonly driftIssues: number;
	/** The input and output items. Set only with a payload capture mode. */
	readonly payloads?: RunPayloads;
}

/** The node run of a profile: the host finds its trace span from these. */
export interface RunProfileMeta {
	/** The n8n execution id. */
	readonly executionId: string;
	/** The name of the workflow node. */
	readonly nodeName: string;
}

/** Gets the profile of each contract node execution. It runs before n8n ends the node run. */
export type RunProfileListener = (meta: RunProfileMeta, profile: RunProfile) => void;

// One slot: the host sets it once at start, as the executor loader.
const listeners = new Map<
	'listener',
	{ readonly listener: RunProfileListener; readonly payloads?: PayloadCapture }
>();

/**
 * Sets the listener of run profiles. Without one, the runtime records nothing. With `payloads`,
 * the profile also keeps the input, the output and the HTTP bodies of each run, cut to 2048
 * characters each. Use it in development only: the data goes to the listener.
 */
export const setRunProfileListener = (
	listener: RunProfileListener | undefined,
	payloads?: PayloadCapture,
) => {
	if (listener) listeners.set('listener', { listener, payloads });
	else listeners.delete('listener');
};

/** The listener of run profiles and its payload capture mode, if the host set one. */
export const runProfileListener = () => listeners.get('listener');

/** The profile keeps this many attempts and this many JSON-RPC messages, so a long run does not hold memory. */
const MAX_PROFILED = 200;

/** The profile keeps the payloads of this many input items and this many output items. */
export const MAX_PAYLOADS = 20;

/** The most characters of one payload text. A longer text is cut and ends with `…`. */
export const MAX_PAYLOAD_LENGTH = 2048;

/** A payload text shows a deeper subtree as `…`. Each level is one generator on the stack. */
const MAX_PAYLOAD_DEPTH = 64;

/** The parts of the payload text of `value`, in order. The caller stops to read at its limit, so a cycle ends. */
function* payloadParts(
	value: unknown,
	capture: PayloadCapture,
	redact: (text: string) => string,
	depth = 0,
): Generator<string> {
	const shape = capture === 'shape';
	if (typeof value === 'string') {
		// Redacted before the cut, so the cut cannot keep a part of a secret.
		yield shape
			? `string(${value.length})`
			: JSON.stringify(redact(value).slice(0, MAX_PAYLOAD_LENGTH));
	} else if (typeof value === 'number' || typeof value === 'bigint') {
		yield shape ? typeof value : redact(String(value));
	} else if (value === null || value === undefined || typeof value === 'boolean') {
		yield shape && typeof value === 'boolean' ? 'boolean' : String(value);
	} else if (typeof value !== 'object') {
		yield typeof value;
	} else if (value instanceof Uint8Array) {
		yield `bytes(${value.byteLength})`;
	} else if (depth >= MAX_PAYLOAD_DEPTH) {
		yield '…';
	} else if (Array.isArray(value)) {
		if (shape) {
			yield `array(${value.length})`;
			if (value.length === 0) return;
			yield '<';
			yield* payloadParts(value[0], capture, redact, depth + 1);
			yield '>';
			return;
		}
		yield '[';
		for (const [index, entry] of value.entries()) {
			if (index > 0) yield ',';
			yield* payloadParts(entry, capture, redact, depth + 1);
		}
		yield ']';
	} else if (
		Object.getPrototypeOf(value) !== Object.prototype &&
		Object.getPrototypeOf(value) !== null
	) {
		// A class instance, e.g. a stream or a date, is not JSON data.
		yield (typeof value.constructor === 'function' && value.constructor.name) || 'object';
	} else {
		yield '{';
		for (const [index, [key, entry]] of Object.entries(value).entries()) {
			yield `${index > 0 ? ',' : ''}${JSON.stringify(redact(key))}:`;
			yield* payloadParts(entry, capture, redact, depth + 1);
		}
		yield '}';
	}
}

/**
 * The text of a value for a run profile, at most `MAX_PAYLOAD_LENGTH` characters plus `…`.
 * `redact` removes the secrets of the credential from each key and value.
 */
export function payloadOf(
	value: unknown,
	capture: PayloadCapture,
	redact: (text: string) => string,
): string {
	const parts: string[] = [];
	const size = { length: 0 };
	for (const part of payloadParts(value, capture, redact)) {
		parts.push(part);
		size.length += part.length;
		if (size.length > MAX_PAYLOAD_LENGTH) return `${parts.join('').slice(0, MAX_PAYLOAD_LENGTH)}…`;
	}
	return parts.join('');
}

/** Epoch milliseconds with a fraction, from the monotonic clock. */
const now = () => performance.timeOrigin + performance.now();

/** The JSON or byte size of a body. A failure gives no size: the request layer reports it. */
export function bytesOf(value: unknown): number | undefined {
	if (value === undefined || value === null || value instanceof Readable) return undefined;
	if (typeof value === 'string') return Buffer.byteLength(value);
	if (value instanceof Uint8Array) return value.byteLength;
	try {
		const text = JSON.stringify(value);
		return text === undefined ? undefined : Buffer.byteLength(text);
	} catch {
		return undefined;
	}
}

/** Collects the profile of one contract node execution. */
export interface RunRecorder {
	/** Epoch milliseconds with a fraction. */
	now(): number;
	/** Tells where the bundle runs. */
	path(path: RunPath): void;
	/** Adds a phase. */
	phase(phase: RunPhase): void;
	/** Adds an HTTP attempt. */
	request(request: RunRequest): void;
	/** Adds a JSON-RPC request or notification of the sandbox. */
	rpc(rpc: RunRpc): void;
	/** The payload capture mode of the run. Absent: the run records no payload. */
	readonly payloads?: PayloadCapture;
	/** Adds the time to make the input of one item. The recorder calls `payload` only for an item it keeps. */
	input(ms: number, payload?: () => string): void;
	/** Adds the time to validate one output item. The recorder calls `payload` only for an item it keeps. */
	output(ms: number, payload?: () => string): void;
	/** Sets the count of output issues that passed on. */
	drift(issues: number): void;
}

type Identity = Pick<RunProfile, 'action' | 'version' | 'bundleHash' | 'nodeContract'>;

/** The end of a run: its output items, or the name of the error it failed with. */
type Outcome = { readonly outputItems: number } | { readonly errorType: string };

/** A recorder of one run that starts now, and the function that ends it. */
export function runRecorder(inputItems: number, payloads?: PayloadCapture) {
	const startMs = now();
	const phases: RunPhase[] = [];
	const requests: RunRequest[] = [];
	const rpcs: RunRpc[] = [];
	const inputs: string[] = [];
	const outputs: string[] = [];
	const keep = (list: string[], payload: (() => string) | undefined) => {
		if (payload && list.length < MAX_PAYLOADS) list.push(payload());
	};
	const totals: { path?: RunProfile['path'] } & Record<
		'requests' | 'rpcs' | 'retries' | 'pages' | 'inputMs' | 'outputMs' | 'drift',
		number
	> = {
		requests: 0,
		rpcs: 0,
		retries: 0,
		pages: 0,
		inputMs: 0,
		outputMs: 0,
		drift: 0,
	};
	const recorder: RunRecorder = {
		now,
		...(payloads ? { payloads } : {}),
		path: (path) => {
			totals.path = path;
		},
		phase: (phase) => {
			phases.push(phase);
		},
		request: (request) => {
			totals.requests += 1;
			if (request.resendCount > 0) totals.retries += 1;
			else if (request.page !== undefined) totals.pages += 1;
			if (requests.length < MAX_PROFILED) requests.push(request);
		},
		rpc: (rpc) => {
			totals.rpcs += 1;
			if (rpcs.length < MAX_PROFILED) rpcs.push(rpc);
		},
		input: (ms, payload) => {
			totals.inputMs += ms;
			keep(inputs, payload);
		},
		output: (ms, payload) => {
			totals.outputMs += ms;
			keep(outputs, payload);
		},
		drift: (issues) => {
			totals.drift = issues;
		},
	};
	const profile = (identity: Identity, outcome: Outcome): RunProfile => ({
		...identity,
		...(totals.path ? { path: totals.path } : {}),
		startMs,
		endMs: now(),
		...('errorType' in outcome ? { errorType: outcome.errorType } : {}),
		phases: [...phases],
		requests: [...requests],
		requestCount: totals.requests,
		rpcs: [...rpcs],
		rpcCount: totals.rpcs,
		retryCount: totals.retries,
		pageCount: totals.pages,
		inputItems,
		outputItems: 'outputItems' in outcome ? outcome.outputItems : 0,
		inputMs: totals.inputMs,
		outputValidateMs: totals.outputMs,
		driftIssues: totals.drift,
		...(payloads
			? { payloads: { capture: payloads, inputs: [...inputs], outputs: [...outputs] } }
			: {}),
	});
	return { recorder, profile };
}
