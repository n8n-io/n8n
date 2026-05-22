import type { Daytona, DaytonaConfig } from '@daytonaio/sdk';
import { getJwtExpiry } from '@n8n/utils';
import { UnexpectedError } from 'n8n-workflow';

import { loadDaytona } from './lazy-daytona';
import type { Logger } from '../logger';

const DEFAULT_REFRESH_SKEW_MS = 5 * 60 * 1000;
const DECODE_FALLBACK_TTL_MS = 30 * 60 * 1000;

export interface DaytonaAuthManagerOptions {
	apiUrl?: string;
	/** Static API key for direct mode. Mutually exclusive with `getAuthToken`. */
	staticApiKey?: string;
	/** Per-call token resolver for proxy mode (short-lived JWT). Mutually exclusive with `staticApiKey`. */
	getAuthToken?: () => Promise<string>;
	/**
	 * Skew (ms) applied to JWT expiry — refresh fires when the cached token's
	 * remaining lifetime falls below this threshold. Default: 5 minutes.
	 * Only meaningful in proxy mode.
	 */
	refreshSkewMs?: number;
	/** Optional logger — refresh events are emitted at debug level. */
	logger?: Logger;
	/** Optional sandbox name surfaced in log metadata for traceability. */
	sandboxName?: string;
	/** Override for tests. */
	now?: () => number;
}

/**
 * Owns the Daytona client and its (possibly short-lived) auth token.
 *
 * In **direct mode** (`staticApiKey`), the client is instantiated once and reused forever.
 *
 * In **proxy mode** (`getAuthToken`), the manager fetches a fresh JWT, decodes its `exp` claim,
 * and proactively refreshes within a 5-minute skew window. Refresh is single-flight so concurrent
 * callers share one in-flight token request. On rotation, `clientGeneration` increments so
 * downstream consumers (e.g. `DaytonaSandbox`) can detect they need to refetch any objects bound
 * to the old client.
 *
 * If the token isn't a JWT or its `exp` claim is missing/malformed, we assume a 30-minute TTL
 * — well under the expected 1-hour TTL, so we refresh defensively.
 */
export class DaytonaAuthManager {
	private readonly options: DaytonaAuthManagerOptions;
	private readonly now: () => number;
	private readonly refreshSkewMs: number;
	private client?: Daytona;
	private expiresAt = 0;
	private pendingRefresh?: Promise<void>;
	private generation = 0;

	constructor(options: DaytonaAuthManagerOptions) {
		const hasStatic = options.staticApiKey !== undefined;
		const hasCallback = options.getAuthToken !== undefined;
		if (hasStatic === hasCallback) {
			throw new UnexpectedError(
				'DaytonaAuthManager requires exactly one of staticApiKey or getAuthToken',
			);
		}
		this.options = options;
		this.now = options.now ?? Date.now;
		this.refreshSkewMs =
			options.refreshSkewMs !== undefined && options.refreshSkewMs > 0
				? options.refreshSkewMs
				: DEFAULT_REFRESH_SKEW_MS;
		if (hasStatic) {
			this.expiresAt = Number.POSITIVE_INFINITY;
		}
	}

	async getClient(): Promise<Daytona> {
		if (this.client && this.now() + this.refreshSkewMs < this.expiresAt) {
			return this.client;
		}
		await this.refresh();
		if (!this.client) {
			throw new UnexpectedError('DaytonaAuthManager.refresh did not set a client');
		}
		return this.client;
	}

	getGeneration(): number {
		return this.generation;
	}

	private async refresh(): Promise<void> {
		if (this.pendingRefresh) {
			await this.pendingRefresh;
			return;
		}
		this.pendingRefresh = this.doRefresh().finally(() => {
			this.pendingRefresh = undefined;
		});
		await this.pendingRefresh;
	}

	private async doRefresh(): Promise<void> {
		const { Daytona } = loadDaytona();
		const apiKey = this.options.getAuthToken
			? await this.options.getAuthToken()
			: this.options.staticApiKey;
		const connection: DaytonaConfig = { apiKey, apiUrl: this.options.apiUrl };

		let decodedFromJwt = false;
		if (this.options.getAuthToken && apiKey) {
			const expSeconds = getJwtExpiry(apiKey);
			decodedFromJwt = expSeconds !== undefined;
			this.expiresAt =
				expSeconds !== undefined ? expSeconds * 1000 : this.now() + DECODE_FALLBACK_TTL_MS;
		} else {
			this.expiresAt = Number.POSITIVE_INFINITY;
		}

		this.client = new Daytona(connection);
		this.generation += 1;

		// Static mode runs once and isn't worth logging.
		if (this.options.getAuthToken) {
			const ttlMs = this.expiresAt - this.now();
			this.options.logger?.debug('Daytona auth token refreshed', {
				sandboxName: this.options.sandboxName,
				generation: this.generation,
				expiresInMs: ttlMs,
				expirySource: decodedFromJwt ? 'jwt-exp' : 'fallback',
			});
		}
	}
}
