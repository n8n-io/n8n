/**
 * The wire protocol between the compiled workflow runtime and the fallback host.
 *
 * A frame is a 4-byte little-endian length, then that many bytes of UTF-8 JSON.
 * One read can hold part of a frame or many frames.
 */

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;
export interface JsonObject {
	[key: string]: JsonValue;
}

export type StepKind = 'code' | 'node';

export interface StepRequest {
	id: string;
	kind: StepKind;
	/** The step name. */
	step: string;
	/** The idempotency key of the step attempt. */
	key: string;
	/** The options object of the ctx call. */
	args: JsonObject;
	/**
	 * The credential of the slot that `args.credential` names, which the runtime
	 * sends so that n8n does not write credentials to disk.
	 */
	credential?: FrameCredential;
	/** Credentials by slot, for steps that name more than one slot (AI clusters). */
	credentials?: Record<string, FrameCredential>;
	/** The execution of the step: `{ id, mode, resumeUrl, resumeFormUrl }` (spec 9.4). */
	execution?: JsonObject;
}

export interface FrameCredential {
	type: string;
	data: JsonObject;
}

function readFrameCredential(value: JsonValue, label: string, id: string): FrameCredential {
	if (!isJsonObject(value) || typeof value.type !== 'string' || !isJsonObject(value.data)) {
		throw new ProtocolError(`Request ${label} must be { type, data }`, id);
	}
	return { type: value.type, data: value.data };
}

export type StepResponse =
	/** `staticData`: the workflow static data, when the step changed it (spec 9.7). */
	| { id: string; ok: true; result: JsonObject[]; staticData?: JsonObject }
	/**
	 * `retryable`: the step did not fail by itself. The host stopped or lost the
	 * worker that ran it, and the same step can run again.
	 */
	| { id: string; ok: false; error: string; retryable?: boolean };

export const FRAME_HEADER_BYTES = 4;

/** The largest body that the host accepts. A larger length means a corrupt stream. */
export const DEFAULT_MAX_FRAME_BYTES = 64 * 1024 * 1024;

export class ProtocolError extends Error {
	constructor(
		message: string,
		/** The request id, when the frame was JSON with a string id. */
		readonly requestId?: string,
	) {
		super(message);
		this.name = 'ProtocolError';
	}
}

export function encodeFrame(body: unknown): Buffer {
	const payload = Buffer.from(JSON.stringify(body), 'utf8');
	const frame = Buffer.allocUnsafe(FRAME_HEADER_BYTES + payload.length);
	frame.writeUInt32LE(payload.length, 0);
	payload.copy(frame, FRAME_HEADER_BYTES);
	return frame;
}

/**
 * Collects bytes from a stream and returns each complete frame body.
 * The decoder keeps the chunks and joins them only when a frame is complete,
 * so a large frame that arrives in many reads costs one copy.
 */
export class FrameDecoder {
	private chunks: Buffer[] = [];

	private buffered = 0;

	constructor(private readonly maxFrameBytes = DEFAULT_MAX_FRAME_BYTES) {}

	/** Adds one read and returns the bodies of all frames that are now complete. */
	push(chunk: Buffer): Buffer[] {
		if (chunk.length > 0) {
			this.chunks.push(chunk);
			this.buffered += chunk.length;
		}

		const bodies: Buffer[] = [];
		for (;;) {
			if (this.buffered < FRAME_HEADER_BYTES) break;
			const length = this.peekLength();
			if (length > this.maxFrameBytes) {
				throw new ProtocolError(
					`Frame of ${length} bytes is larger than the limit of ${this.maxFrameBytes} bytes`,
				);
			}
			if (this.buffered < FRAME_HEADER_BYTES + length) break;
			const frame = this.take(FRAME_HEADER_BYTES + length);
			bodies.push(frame.subarray(FRAME_HEADER_BYTES));
		}
		return bodies;
	}

	/** Removes and returns the bytes of an incomplete frame. */
	takeRest(): Buffer {
		const rest = Buffer.concat(this.chunks, this.buffered);
		this.chunks = [];
		this.buffered = 0;
		return rest;
	}

	/** The number of bytes that belong to an incomplete frame. */
	get pendingBytes(): number {
		return this.buffered;
	}

	private peekLength(): number {
		const first = this.chunks[0];
		if (first.length >= FRAME_HEADER_BYTES) return first.readUInt32LE(0);
		this.compact();
		return this.chunks[0].readUInt32LE(0);
	}

	private compact(): void {
		this.chunks = [Buffer.concat(this.chunks, this.buffered)];
	}

	private take(count: number): Buffer {
		if (this.chunks[0].length < count) this.compact();
		const first = this.chunks[0];
		const taken = first.subarray(0, count);
		if (first.length === count) {
			this.chunks.shift();
		} else {
			this.chunks[0] = first.subarray(count);
		}
		this.buffered -= count;
		return taken;
	}
}

export function isJsonObject(value: unknown): value is JsonObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Parses and validates one request body. Throws `ProtocolError` on a bad request. */
export function parseRequest(body: Buffer): StepRequest {
	let parsed: unknown;
	try {
		parsed = JSON.parse(body.toString('utf8'));
	} catch {
		throw new ProtocolError('Request is not valid JSON');
	}
	if (!isJsonObject(parsed)) throw new ProtocolError('Request is not a JSON object');

	const { id, kind, step, key, args } = parsed;
	if (typeof id !== 'string') throw new ProtocolError('Request has no string "id"');
	if (kind !== 'code' && kind !== 'node') {
		throw new ProtocolError('Request "kind" must be "code" or "node"', id);
	}
	if (typeof step !== 'string') throw new ProtocolError('Request has no string "step"', id);
	if (typeof key !== 'string') throw new ProtocolError('Request has no string "key"', id);
	if (!isJsonObject(args)) throw new ProtocolError('Request "args" must be an object', id);

	const request: StepRequest = { id, kind, step, key, args };
	if (parsed.credential !== undefined && parsed.credential !== null) {
		request.credential = readFrameCredential(parsed.credential, '"credential"', id);
	}
	if (parsed.credentials !== undefined && parsed.credentials !== null) {
		if (!isJsonObject(parsed.credentials)) {
			throw new ProtocolError('Request "credentials" must be an object', id);
		}
		request.credentials = {};
		for (const [slot, value] of Object.entries(parsed.credentials)) {
			request.credentials[slot] = readFrameCredential(value, `"credentials.${slot}"`, id);
		}
	}
	if (isJsonObject(parsed.execution)) request.execution = parsed.execution;
	return request;
}
