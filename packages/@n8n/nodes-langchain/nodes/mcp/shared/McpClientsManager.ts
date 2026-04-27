import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Service } from '@n8n/di';

import type { McpTool } from './types';

const DEFAULT_CACHE_TTL_MS = 300_000;
const DEFAULT_CACHE_MAX_SIZE = 500;
const EVICTION_INTERVAL_MS = 30_000;

const ttlMs = parseInt(process.env.N8N_MCP_CLIENT_CACHE_TTL_MS ?? '', 10) || DEFAULT_CACHE_TTL_MS;
const maxSize =
	parseInt(process.env.N8N_MCP_CLIENT_CACHE_MAX_SIZE ?? '', 10) || DEFAULT_CACHE_MAX_SIZE;

export interface McpCacheLogger {
	warn(message: string, meta?: object): void;
	debug(message: string, meta?: object): void;
}

interface CachedClient {
	client: Client;
	mcpTools: McpTool[];
	createdAt: number;
	lastUsedAt: number;
}

interface GetOrConnectOpts {
	logger?: McpCacheLogger;
	cancelSignal?: AbortSignal;
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
 *   - Idle entries (older than TTL on `lastUsedAt`) and overflow entries
 *     (beyond max size) are swept periodically.
 *   - On process exit, all live transports are closed.
 */
@Service()
export class McpClientsManager {
	private readonly activeClients = new Map<string, CachedClient>();

	private readonly pendingConnections = new Map<
		string,
		Promise<{ client: Client; mcpTools: McpTool[] }>
	>();

	private cleanupTimer: NodeJS.Timeout;

	private readonly exitHandler = () => this.shutdown();

	constructor() {
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

	/** Test-only: drop all entries without closing (caller responsibility). */
	clearForTests(): void {
		this.activeClients.clear();
		this.pendingConnections.clear();
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
			const now = Date.now();
			this.activeClients.set(key, {
				client: result.client,
				mcpTools: result.mcpTools,
				createdAt: now,
				lastUsedAt: now,
			});
			this.attachTransportLifecycle(result.client, key, opts.logger);
			opts.onExecutionCancellation?.(() => this.remove(key, opts.logger));
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
		void entry.client.close().catch((error) => {
			logger?.warn('McpClientsManager: failed to close cached client', { cacheKey: key, error });
		});
	}

	/** Evict idle entries (TTL on lastUsedAt) and enforce max cache size. */
	evictStale(logger?: McpCacheLogger): void {
		if (this.activeClients.size === 0) return;
		const now = Date.now();

		let idleEvicted = 0;
		for (const [key, entry] of this.activeClients) {
			if (now - entry.lastUsedAt > ttlMs) {
				this.remove(key, logger);
				idleEvicted++;
			}
		}
		if (idleEvicted > 0) {
			logger?.debug('McpClientsManager: evicted idle clients', { count: idleEvicted });
		}

		// Map preserves insertion order, which matches createdAt order since
		// entries are only inserted (never re-set) with Date.now() timestamps.
		if (this.activeClients.size > maxSize) {
			let excess = this.activeClients.size - maxSize;
			let oldestEvicted = 0;
			for (const [key] of this.activeClients) {
				if (excess <= 0) break;
				this.remove(key, logger);
				excess--;
				oldestEvicted++;
			}
			logger?.debug('McpClientsManager: evicted oldest clients (max size)', {
				count: oldestEvicted,
			});
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
		const prevOnClose = client.onclose;
		client.onclose = () => {
			logger?.debug('McpClientsManager: transport closed, evicting cache entry', { cacheKey: key });
			this.activeClients.delete(key);
			try {
				prevOnClose?.();
			} catch (error) {
				logger?.warn('McpClientsManager: chained onclose threw', { error });
			}
		};

		const prevOnError = client.onerror;
		client.onerror = (error: Error) => {
			logger?.warn('McpClientsManager: transport error, evicting cache entry', {
				cacheKey: key,
				error,
			});
			this.activeClients.delete(key);
			try {
				prevOnError?.(error);
			} catch (chained) {
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
