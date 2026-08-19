import { isDnsFailure, isTransportFailure } from './client-request-error';

/**
 * Retry information extracted from a failed outbound HTTP request.
 * Plain data only, so any caller can map it onto its own retry policy.
 */
export type Retryability = {
	/**
	 * `yes` when the failure is proven worth retrying: a 429, 5xx or 408
	 * response, a network error or a DNS error. `no` only for errors marked
	 * with {@link markNonRetryable}, never derived from a status alone.
	 * `unknown` is everything else and the caller decides what to do with it.
	 */
	retryable: 'yes' | 'no' | 'unknown';
	/** HTTP status of the failed request, when one was found on the error. */
	status?: number;
	/** Wait requested by a `Retry-After` header, in ms. Absent when the header is missing or invalid. */
	retryAfterMs?: number;
};

// Symbol.for so the mark survives the package being loaded twice (src and dist).
const NON_RETRYABLE = Symbol.for('n8n.backend-network.non-retryable-error');

/**
 * Marks an error as proven not worth retrying. {@link retryabilityFromError}
 * then returns `no` for it, even when it is wrapped in another error.
 */
export function markNonRetryable<E>(error: E): E {
	if (typeof error === 'object' && error !== null) {
		Object.defineProperty(error, NON_RETRYABLE, {
			value: true,
			enumerable: false,
			configurable: true,
		});
	}
	return error;
}

/**
 * Extracts retry information from anything a failed outbound HTTP call may
 * have thrown, whichever client or wrapper threw it, n8n node errors
 * included. Never throws.
 *
 * @param now Reference time for resolving an HTTP-date `Retry-After` header.
 *   Defaults to the current time.
 */
export function retryabilityFromError(error: unknown, now: Date = new Date()): Retryability {
	try {
		const chain = errorChain(error);
		const status = findStatus(chain);

		let retryAfterMs: number | undefined;
		try {
			retryAfterMs = findRetryAfterMs(chain, now);
		} catch {
			// A broken headers object only costs the delay hint, not the status.
		}

		let retryable: Retryability['retryable'] = 'unknown';
		if (isMarkedNonRetryable(chain)) {
			retryable = 'no';
		} else if (
			(status !== undefined && isRetryableStatus(status)) ||
			chain.some((level) => isTransportFailure(level) || isDnsFailure(level))
		) {
			retryable = 'yes';
		}

		return {
			retryable,
			...(status !== undefined ? { status } : {}),
			...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
		};
	} catch {
		return { retryable: 'unknown' };
	}
}

function isMarkedNonRetryable(chain: UnknownRecord[]): boolean {
	return chain.some((level) => (level as Record<symbol, unknown>)[NON_RETRYABLE] === true);
}

function isRetryableStatus(status: number): boolean {
	return status === 408 || status === 429 || status >= 500;
}

type UnknownRecord = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is UnknownRecord =>
	typeof value === 'object' && value !== null;

const MAX_CHAIN_DEPTH = 5;

/** The keys errors wrap each other under. */
const WRAPPING_KEYS = ['cause', 'errorResponse', 'reason'] as const;

/** The error and the errors it wraps, shallowest first, each visited once. */
function errorChain(error: unknown): UnknownRecord[] {
	if (!isRecord(error)) {
		return [];
	}

	const seen = new Set<UnknownRecord>([error]);
	const chain: UnknownRecord[] = [error];
	let generation: UnknownRecord[] = [error];

	for (let depth = 0; depth < MAX_CHAIN_DEPTH && generation.length > 0; depth++) {
		const next: UnknownRecord[] = [];
		for (const level of generation) {
			for (const key of WRAPPING_KEYS) {
				const wrapped = level[key];
				if (isRecord(wrapped) && !seen.has(wrapped)) {
					seen.add(wrapped);
					next.push(wrapped);
				}
			}
		}
		chain.push(...next);
		generation = next;
	}

	return chain;
}

const responseOf = (level: UnknownRecord): UnknownRecord | undefined =>
	isRecord(level.response) ? level.response : undefined;

/**
 * The HTTP status of the failing response, if any. An `httpCode` anywhere in
 * the chain wins over the other status fields.
 */
function findStatus(chain: UnknownRecord[]): number | undefined {
	let fallback: number | undefined;

	for (const level of chain) {
		const httpCode = toHttpStatus(level.httpCode);
		if (httpCode !== undefined) {
			return httpCode;
		}

		fallback ??=
			toHttpStatus(responseOf(level)?.status) ??
			toHttpStatus(responseOf(level)?.statusCode) ??
			toHttpStatus(level.status) ??
			toHttpStatus(level.statusCode);
	}

	return fallback;
}

/** The value as an HTTP status, or undefined when it cannot be one. */
function toHttpStatus(value: unknown): number | undefined {
	const status =
		typeof value === 'number'
			? value
			: typeof value === 'string' && /^\d+$/.test(value.trim())
				? Number(value.trim())
				: undefined;

	return status !== undefined && Number.isInteger(status) && status >= 100 && status <= 599
		? status
		: undefined;
}

/** The first parseable `Retry-After` in the chain, in ms. */
function findRetryAfterMs(chain: UnknownRecord[], now: Date): number | undefined {
	for (const level of chain) {
		const headers = responseOf(level)?.headers ?? level.headers;
		const parsed = parseRetryAfter(readRetryAfterHeader(headers), now);
		if (parsed !== undefined) {
			return parsed;
		}
	}
	return undefined;
}

/** The `Retry-After` value from a `get()` style or plain headers object. */
function readRetryAfterHeader(headers: unknown): string | undefined {
	if (!isRecord(headers)) {
		return undefined;
	}

	const get = headers.get;
	if (typeof get === 'function') {
		const value: unknown = get.call(headers, 'retry-after');
		return typeof value === 'string' ? value : undefined;
	}

	for (const [key, value] of Object.entries(headers)) {
		if (key.toLowerCase() === 'retry-after') {
			const first: unknown = Array.isArray(value) ? value[0] : value;
			return typeof first === 'string' ? first : undefined;
		}
	}
	return undefined;
}

/**
 * A `Retry-After` value in ms, from the delay-seconds form or the HTTP-date
 * form resolved against `now` and never negative. Undefined for anything else.
 */
function parseRetryAfter(value: string | undefined, now: Date): number | undefined {
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();

	if (/^\d+$/.test(trimmed)) {
		const ms = Number(trimmed) * 1000;
		return Number.isSafeInteger(ms) ? ms : undefined;
	}

	// HTTP-dates contain letters. This keeps Date.parse from reading numeric garbage as a date.
	if (!/[a-z]/i.test(trimmed)) {
		return undefined;
	}
	const dateMs = Date.parse(trimmed);
	return Number.isNaN(dateMs) ? undefined : Math.max(0, dateMs - now.getTime());
}
