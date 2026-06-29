import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpClientConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import type { McpTool } from './types';

const EVICTION_INTERVAL_MS = 30_000;

export interface McpCacheLogger {
	warn(message: string, meta?: object): void;
	debug(message: string, meta?: object): void;
}

interface CachedClient {
	client: Client;
	mcpTools: McpTool[];
	lastUsedAt: number;
}

interface GetOrConnectOpts {
	logger?: McpCacheLogger;
	onExecutionCancellation?: (handler: () => void) => void;
}

/**
 * Cache of live MCP clients across tool calls within a single execution.
 * Required for stateful MCP servers (e.g. Playwright) — keeping the
 * transport open between Agent V3 tool calls preserves the server-side
 * session that would otherwise be torn down per call.
 *
 * Lifecycle:
 *   - `getOrConnect` returns a cached entry or runs the factory once
 *     (with concurrent-miss dedup via in-flight Promise map).
 *   - Transport `onclose`/`onerror` evict the entry automatically.
 *   - Idle entries (older than TTL on `lastUsedAt`) are swept periodically, and
 *     the cache is capped at max size (oldest evicted) on insert and on sweep.
 *   - On process exit, cached clients are dropped (close is best-effort only,
 *     since async work cannot complete during the `exit` event).
 */
@Service()
export class McpClientsManager {
	private readonly activeClients = new Map<string, CachedClient>();

	private readonly pendingConnections = new Map<
		string,
		Promise<{ client: Client; mcpTools: McpTool[] }>
	>();

	private readonly cleanupTimer: NodeJS.Timeout;

	private readonly exitHandler = () => this.shutdown();

	constructor(private readonly config: McpClientConfig) {
		this.cleanupTimer = setInterval(() => this.evictStale(), EVICTION_INTERVAL_MS);
		this.cleanupTimer.unref();
		process.on('exit', this.exitHandler);
	}

	/** Test-only: total entries currently held. */
	get size(): number {
		return this.activeClients.size;
	}

	/** Test-only: peek a cached entry. */
	getEntry(key: string): CachedClient | undefined {
		return this.activeClients.get(key);
	}

	async getOrConnect(
		key: string,
		factory: () => Promise<{ client: Client; mcpTools: McpTool[] }>,
		opts: GetOrConnectOpts = {},
	): Promise<{ client: Client; mcpTools: McpTool[] }> {
		const cached = this.activeClients.get(key);
		if (cached) {
			opts.logger?.debug('McpClientsManager: cache hit', { cacheKey: key });
			cached.lastUsedAt = Date.now();
			return { client: cached.client, mcpTools: cached.mcpTools };
		}

		const inFlight = this.pendingConnections.get(key);
		if (inFlight) {
			opts.logger?.debug('McpClientsManager: awaiting in-flight connection', { cacheKey: key });
			return await inFlight;
		}

		opts.logger?.debug('McpClientsManager: cache miss, connecting', { cacheKey: key });
		const pending = factory();
		this.pendingConnections.set(key, pending);
		try {
			const result = await pending;
			this.activeClients.set(key, {
				client: result.client,
				mcpTools: result.mcpTools,
				lastUsedAt: Date.now(),
			});
			this.enforceMaxSize();
			this.attachTransportLifecycle(result.client, key, opts.logger);
			// Close on cancellation, but only if this entry still holds the client we
			// just connected — a later reconnect under the same key (after eviction)
			// registers its own handler and owns cleanup of its own client.
			opts.onExecutionCancellation?.(() => {
				if (this.activeClients.get(key)?.client === result.client) {
					this.remove(key, opts.logger);
				}
			});
			return result;
		} finally {
			this.pendingConnections.delete(key);
		}
	}

	/** Refresh idle timer for an entry — call after long-running tool calls. */
	refresh(key: string): void {
		const entry = this.activeClients.get(key);
		if (entry) entry.lastUsedAt = Date.now();
	}

	/** Close + remove cache entry. Safe to call multiple times. */
	remove(key: string, logger?: McpCacheLogger): void {
		const entry = this.activeClients.get(key);
		if (!entry) return;

		this.activeClients.delete(key);
		void entry.client.close().catch((error: unknown) => {
			logger?.warn('McpClientsManager: failed to close cached client', { cacheKey: key, error });
		});
	}

	/** Evict idle entries (TTL on lastUsedAt) and enforce max cache size. */
	evictStale(): void {
		if (this.activeClients.size === 0) return;
		const now = Date.now();

		for (const [key, entry] of this.activeClients) {
			if (now - entry.lastUsedAt > this.config.cacheTtl) {
				this.remove(key);
			}
		}

		this.enforceMaxSize();
	}

	/** Evict oldest entries until the cache is within `cacheMaxSize`. */
	private enforceMaxSize(): void {
		// Map iteration follows insertion order, so the oldest entries come first.
		let excess = this.activeClients.size - this.config.cacheMaxSize;
		for (const [key] of this.activeClients) {
			if (excess <= 0) break;
			this.remove(key);
			excess--;
		}
	}

	/**
	 * Wire transport-level lifecycle so cache evicts when the server drops
	 * the connection or transport errors out — prevents handing dead clients
	 * back to subsequent tool calls. The MCP SDK's Protocol class exposes
	 * `onclose`/`onerror` as plain assignable fields (no setter side effects),
	 * so chaining via captured `prev*` is safe.
	 */
	private attachTransportLifecycle(client: Client, key: string, logger?: McpCacheLogger): void {
		// Only evict if this entry still holds `client`; a late-firing handler from a
		// client already replaced by a reconnect under the same key must not drop the
		// live replacement.
		const evictIfCurrent = () => {
			if (this.activeClients.get(key)?.client === client) {
				this.activeClients.delete(key);
			}
		};

		const prevOnClose = client.onclose;
		client.onclose = () => {
			logger?.debug('McpClientsManager: transport closed, evicting cache entry', { cacheKey: key });
			evictIfCurrent();
			try {
				prevOnClose?.();
			} catch (error: unknown) {
				logger?.warn('McpClientsManager: chained onclose threw', { error });
			}
		};

		const prevOnError = client.onerror;
		client.onerror = (error: Error) => {
			logger?.warn('McpClientsManager: transport error, evicting cache entry', {
				cacheKey: key,
				error,
			});
			if (this.activeClients.get(key)?.client === client) {
				// `remove` deletes the entry and closes the client.
				this.remove(key, logger);
			} else {
				// Entry already replaced by a reconnect — close just this orphaned
				// client without disturbing the live replacement.
				void client.close().catch((closeError: unknown) => {
					logger?.warn('McpClientsManager: failed to close errored client', {
						cacheKey: key,
						error: closeError,
					});
				});
			}
			try {
				prevOnError?.(error);
			} catch (chained: unknown) {
				logger?.warn('McpClientsManager: chained onerror threw', { error: chained });
			}
		};
	}

	shutdown(): void {
		clearInterval(this.cleanupTimer);
		process.off('exit', this.exitHandler);
		for (const key of [...this.activeClients.keys()]) {
			this.remove(key);
		}
	}
}
