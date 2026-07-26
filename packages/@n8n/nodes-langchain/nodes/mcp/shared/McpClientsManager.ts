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
	/** Guards late-firing handlers against acting on a replacement under the same key. */
	epoch: number;
	detachLifecycle: () => void;
}

interface GetOrConnectOpts {
	logger?: McpCacheLogger;
	/** Lifecycle callbacks are registered on connect and on cache hits; concurrent waiters' opts are ignored. */
	onExecutionCancellation?: (handler: () => void) => void;
	onExecutionFinish?: (handler: () => void) => void;
}

/**
 * Cache of live MCP clients across tool calls within a single execution.
 * Required for stateful MCP servers (e.g. Playwright) — keeping the
 * transport open between Agent V3 tool calls preserves the server-side
 * session that would otherwise be torn down per call.
 *
 * Entries are closed when their execution ends or is cancelled — the cache
 * key embeds the execution id, so an entry is dead weight afterwards. The
 * idle-TTL sweep is the backstop for paused (waiting) executions and
 * contexts without lifecycle hooks. On process exit, close is best-effort
 * only, since async work cannot complete during the `exit` event.
 */
@Service()
export class McpClientsManager {
	private readonly activeClients = new Map<string, CachedClient>();

	private readonly pendingConnections = new Map<
		string,
		Promise<{ client: Client; mcpTools: McpTool[] }>
	>();

	private readonly cleanupTimer: NodeJS.Timeout;

	private connectionEpoch = 0;

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
			this.registerLifecycleCleanup(key, cached.epoch, opts);
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
			const epoch = ++this.connectionEpoch;
			this.activeClients.set(key, {
				client: result.client,
				mcpTools: result.mcpTools,
				lastUsedAt: Date.now(),
				epoch,
				detachLifecycle: this.attachTransportLifecycle(result.client, key, epoch, opts.logger),
			});
			this.enforceMaxSize();
			this.registerLifecycleCleanup(key, epoch, opts);
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
		entry.detachLifecycle();
		void entry.client.close().catch((error: unknown) => {
			logger?.warn('McpClientsManager: failed to close cached client', { cacheKey: key, error });
		});
	}

	/**
	 * Close the entry when its execution is cancelled or finishes. Must run on
	 * cache hits too: a resumed (previously waiting) execution gets fresh
	 * lifecycle hooks, and the finish handler registered by the run that
	 * connected intentionally skipped the `waiting` transition and never fires
	 * again. Duplicate registrations within one run are harmless — the handler
	 * is epoch-guarded and `remove` is idempotent.
	 */
	private registerLifecycleCleanup(key: string, epoch: number, opts: GetOrConnectOpts): void {
		const closeIfCurrent = () => this.removeIfCurrent(key, epoch, opts.logger);
		opts.onExecutionCancellation?.(closeIfCurrent);
		opts.onExecutionFinish?.(closeIfCurrent);
	}

	/** A later reconnect under the same key owns its own cleanup — evict only while `epoch` is current. */
	private removeIfCurrent(key: string, epoch: number, logger?: McpCacheLogger): void {
		if (this.activeClients.get(key)?.epoch === epoch) {
			this.remove(key, logger);
		}
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
		let excess = this.activeClients.size - Math.max(1, this.config.cacheMaxSize);
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
	 *
	 * Returns a detach function restoring the original handlers; it must run
	 * before any close, because closing aborts the open listener stream, which
	 * the SDK reports via `onerror` — a still-attached handler would log a
	 * spurious transport error and re-enter the manager.
	 */
	private attachTransportLifecycle(
		client: Client,
		key: string,
		epoch: number,
		logger?: McpCacheLogger,
	): () => void {
		const prevOnClose = client.onclose;
		const prevOnError = client.onerror;
		const detach = () => {
			// Restore only handlers that are still ours — never clobber ones chained on later.
			if (client.onclose === onClose) client.onclose = prevOnClose;
			if (client.onerror === onError) client.onerror = prevOnError;
		};

		const onClose = () => {
			logger?.debug('McpClientsManager: transport closed, evicting cache entry', { cacheKey: key });
			detach();
			// The transport is already closed — evict without re-closing.
			if (this.activeClients.get(key)?.epoch === epoch) {
				this.activeClients.delete(key);
			}
			try {
				prevOnClose?.();
			} catch (error: unknown) {
				logger?.warn('McpClientsManager: chained onclose threw', { error });
			}
		};

		const onError = (error: Error) => {
			logger?.warn('McpClientsManager: transport error, closing client', {
				cacheKey: key,
				error,
			});
			detach();
			if (this.activeClients.get(key)?.epoch === epoch) {
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

		client.onclose = onClose;
		client.onerror = onError;
		return detach;
	}

	shutdown(): void {
		clearInterval(this.cleanupTimer);
		process.off('exit', this.exitHandler);
		for (const key of [...this.activeClients.keys()]) {
			this.remove(key);
		}
	}
}
