import { SandboxAcquisitionError } from './errors';
import type { SandboxProvider } from './types';

const UNAVAILABLE_NETWORK_ERROR_CODES = new Set([
	'ECONNREFUSED',
	'ECONNRESET',
	'ECONNABORTED',
	'ENOTFOUND',
	'EAI_AGAIN',
	'EHOSTUNREACH',
	'ENETUNREACH',
	'EPIPE',
	'ETIMEDOUT',
	'UND_ERR_CONNECT_TIMEOUT',
	'UND_ERR_SOCKET',
]);

const UNAVAILABLE_ERROR_NAMES = new Set([
	'TimeoutError',
	'DaytonaConnectionError',
	'DaytonaTimeoutError',
]);

const MAX_CAUSE_DEPTH = 5;

function readNumber(value: unknown, key: string): number | undefined {
	if (typeof value !== 'object' || value === null) return undefined;
	const field: unknown = Reflect.get(value, key);
	return typeof field === 'number' ? field : undefined;
}

function readString(value: unknown, key: string): string | undefined {
	if (typeof value !== 'object' || value === null) return undefined;
	const field: unknown = Reflect.get(value, key);
	return typeof field === 'string' ? field : undefined;
}

function isUnavailableStatus(status: number): boolean {
	// The n8n sandbox client reports a request without a response as status 0.
	return status === 0 || status === 408 || status === 429 || status >= 500;
}

/** Reads a status code from a failure class such as `DaytonaError:502`. */
function isUnavailableFailureClass(failureClass: string): boolean {
	const [name, status] = failureClass.split(':');
	if (UNAVAILABLE_ERROR_NAMES.has(name)) return true;
	if (status === undefined) return false;
	const statusCode = Number(status);
	return Number.isInteger(statusCode) && isUnavailableStatus(statusCode);
}

function classifyOne(error: unknown): boolean | undefined {
	if (!(error instanceof Error)) return false;
	// Subclasses carry a definite outcome. A sandbox that is not ready still holds the
	// thread's files, and a name conflict cannot be solved on another provider.
	if (error instanceof SandboxAcquisitionError && error.constructor !== SandboxAcquisitionError) {
		return false;
	}
	if (UNAVAILABLE_ERROR_NAMES.has(error.name)) return true;

	const code = readString(error, 'code');
	if (code && UNAVAILABLE_NETWORK_ERROR_CODES.has(code)) return true;

	const status = readNumber(error, 'statusCode') ?? readNumber(error, 'status');
	if (status !== undefined) return isUnavailableStatus(status);

	if (error instanceof SandboxAcquisitionError && error.cause === undefined) {
		return isUnavailableFailureClass(error.failureClass);
	}
	return undefined;
}

/**
 * Whether a sandbox failure shows that the provider is down or unreachable, so a
 * fallback provider can take over. Network failures, timeouts, 5xx, 408 and 429
 * responses qualify. Authentication, quota, validation and configuration failures
 * do not: another provider would only hide them from the operator. A user abort
 * does not qualify either.
 */
export function isSandboxProviderUnavailableError(error: unknown): boolean {
	let current: unknown = error;
	for (let depth = 0; depth < MAX_CAUSE_DEPTH && current !== undefined; depth++) {
		const outcome = classifyOne(current);
		if (outcome !== undefined) return outcome;
		current = current instanceof Error ? current.cause : undefined;
	}
	return false;
}

/** A short failure label for logs and telemetry, such as `DaytonaError:502` or `ECONNREFUSED`. */
export function getSandboxFailureClass(error: unknown): string {
	if (error instanceof SandboxAcquisitionError) return error.failureClass;
	if (!(error instanceof Error)) return typeof error;
	const code = readString(error, 'code');
	if (code) return code;
	const status = readNumber(error, 'statusCode') ?? readNumber(error, 'status');
	if (status !== undefined) return `${error.name}:${status}`;
	return error.name;
}

export interface SandboxProviderHealthOptions {
	/** Unavailable failures in a row that open the circuit of a provider. */
	failureThreshold?: number;
	/** First time a provider is skipped after its circuit opens. */
	baseCooldownMs?: number;
	/** Upper limit for the cooldown, which doubles each time a test request fails. */
	maxCooldownMs?: number;
	now?: () => number;
}

type ProviderState = {
	consecutiveFailures: number;
	cooldownMs: number;
	/** Set while the circuit is open. The provider is skipped until this time. */
	openUntil?: number;
};

/**
 * In-process circuit breaker for each sandbox provider. After repeated unavailable
 * failures, the provider is skipped for a cooldown, so requests go straight to the
 * fallback instead of waiting for the full retry budget of a provider that is down.
 * After the cooldown, one request tests the provider again.
 */
export class SandboxProviderHealth {
	private readonly states = new Map<SandboxProvider, ProviderState>();

	private readonly failureThreshold: number;

	private readonly baseCooldownMs: number;

	private readonly maxCooldownMs: number;

	private readonly now: () => number;

	constructor(options: SandboxProviderHealthOptions = {}) {
		this.failureThreshold = Math.max(1, options.failureThreshold ?? 3);
		this.baseCooldownMs = Math.max(0, options.baseCooldownMs ?? 60_000);
		this.maxCooldownMs = Math.max(this.baseCooldownMs, options.maxCooldownMs ?? 10 * 60_000);
		this.now = options.now ?? Date.now;
	}

	/**
	 * Whether a request can use the provider. When the cooldown of an open circuit
	 * ends, this lets one request through to test the provider and starts a new
	 * cooldown for the other requests.
	 */
	isAvailable(provider: SandboxProvider): boolean {
		const state = this.states.get(provider);
		if (state?.openUntil === undefined) return true;
		const now = this.now();
		if (now < state.openUntil) return false;
		state.openUntil = now + state.cooldownMs;
		return true;
	}

	isOpen(provider: SandboxProvider): boolean {
		const state = this.states.get(provider);
		return state?.openUntil !== undefined && this.now() < state.openUntil;
	}

	/** The provider answered. Close its circuit. */
	recordAvailable(provider: SandboxProvider): void {
		this.states.delete(provider);
	}

	/**
	 * The provider failed with an unavailable error.
	 * Returns true when this failure opened the circuit.
	 */
	recordUnavailable(provider: SandboxProvider): boolean {
		const state = this.states.get(provider) ?? {
			consecutiveFailures: 0,
			cooldownMs: this.baseCooldownMs,
		};
		this.states.set(provider, state);
		state.consecutiveFailures++;

		if (state.openUntil !== undefined) {
			// A failed test request: wait longer before the next test.
			state.cooldownMs = Math.min(state.cooldownMs * 2, this.maxCooldownMs);
			state.openUntil = this.now() + state.cooldownMs;
			return false;
		}
		if (state.consecutiveFailures < this.failureThreshold) return false;
		state.openUntil = this.now() + state.cooldownMs;
		return true;
	}
}
