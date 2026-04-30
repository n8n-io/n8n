import type { ToolDescriptor } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { readFileSync } from 'fs';
import type ivm from 'isolated-vm';
import path from 'path';
import { transform as sucraseTransform } from 'sucrase';

import { AgentIsolatePool, type AgentIsolateSlot } from './agent-isolate-pool';
import type { ToolExecutor } from '../json-config/from-json-config';

/**
 * Location of the pre-built library bundle (see scripts/bundle-agent-library.mjs).
 *
 * This path resolves the same way whether the current file is running from
 * `src/modules/agents/runtime/` (ts-jest) or `dist/modules/agents/runtime/`
 * (production), because both trees have the same depth under the cli package.
 */
const LIBRARY_BUNDLE_PATH = path.resolve(__dirname, '../../../../dist/agent-library-bundle.js');

/**
 * Sandboxed execution runtime for agent user code.
 *
 * Uses `isolated-vm` (V8 isolates) to run untrusted TypeScript in a confined
 * environment. Libraries (`@n8n/agents`, `zod`) are pre-bundled at build time
 * (scripts/bundle-agent-library.mjs) into `dist/agent-library-bundle.js` and
 * loaded into each isolate context as source code. This avoids module
 * resolution issues with pnpm workspace symlinks and keeps esbuild off the
 * runtime path.
 *
 * The runtime maintains a pool of V8 isolates (`AgentIsolatePool`) to handle
 * concurrent requests without sharing heap memory. Each public method acquires
 * a slot, runs the operation in a fresh context, and releases the slot back.
 * OOM'd isolates are discarded and replenished in the background.
 */
@Service()
export class AgentSecureRuntime {
	constructor(private readonly logger: Logger) {}

	/** Active pool — null until first use. */
	private pool: AgentIsolatePool | null = null;

	/** Serializes pool initialization across concurrent first-callers. */
	private poolInitPromise: Promise<AgentIsolatePool> | null = null;

	/** Set by dispose() to prevent a concurrent getPool() from re-installing a disposed pool. */
	private disposed = false;

	/**
	 * Pre-bundled JS string containing @n8n/agents + zod for injection into
	 * isolates. Read from disk on first use and cached here at the runtime
	 * level so it is never cleared on OOM (the bundle is a plain string,
	 * not bound to any isolate instance).
	 */
	private libraryBundle: string | null = null;

	// ---------------------------------------------------------------------------
	// Internal helpers
	// ---------------------------------------------------------------------------

	private async getPool(): Promise<AgentIsolatePool> {
		if (this.pool) return this.pool;
		this.poolInitPromise ??= (async () => {
			try {
				const ivmModule = (await import('isolated-vm')).default;
				const libraryBundle = this.getLibraryBundle();
				const pool = new AgentIsolatePool(ivmModule, libraryBundle, {
					logger: this.logger,
				});
				await pool.initialize();
				// Guard: dispose() may have run while we were awaiting initialization.
				// If so, discard the freshly-created pool and surface a clear error.
				if (this.disposed) {
					void pool.dispose();
					throw new Error('AgentSecureRuntime was disposed during pool initialization');
				}
				this.pool = pool;
				return pool;
			} catch (e) {
				this.poolInitPromise = null;
				throw e;
			}
		})();
		return await this.poolInitPromise;
	}

	/**
	 * Acquire an isolate slot, run `fn`, and release the slot.
	 *
	 * If the slot's isolate was disposed during execution (OOM), the operation
	 * is retried once with a fresh slot before re-throwing the error.
	 */
	private async withIsolate<T>(fn: (slot: AgentIsolateSlot) => T | Promise<T>): Promise<T> {
		const pool = await this.getPool();
		const slot = await pool.acquire();
		try {
			return await fn(slot);
		} catch (error) {
			if (!slot.isHealthy) {
				// Slot OOM'd during execution — retry once with a fresh slot.
				this.logger.warn(
					'[AgentSecureRuntime] Isolate OOM during execution — retrying with fresh slot',
				);
				const freshSlot = await pool.acquire();
				try {
					return await fn(freshSlot);
				} catch (retryError) {
					if (!freshSlot.isHealthy) {
						// Both slots OOM'd — cap at one retry; both are recycled via release() below.
						this.logger.error(
							'[AgentSecureRuntime] Retry slot also OOM — both isolates will be recycled; not retrying further',
						);
					}
					throw retryError;
				} finally {
					pool.release(freshSlot);
				}
			}
			throw error;
		} finally {
			pool.release(slot);
		}
	}

	/**
	 * Load the pre-built `@n8n/agents` + `zod` CJS bundle from disk.
	 *
	 * The bundle is produced at build time by `scripts/bundle-agent-library.mjs`
	 * and loaded into each isolate context as source code, making
	 * `require('@n8n/agents')` and `require('zod')` work inside the sandbox
	 * without needing filesystem access or module resolution.
	 *
	 * Cached after the first read so repeated pool initialisations (e.g. after
	 * dispose + re-init) don't re-hit the disk.
	 */
	private getLibraryBundle(): string {
		if (this.libraryBundle) return this.libraryBundle;

		try {
			this.libraryBundle = readFileSync(LIBRARY_BUNDLE_PATH, 'utf8');
		} catch (e) {
			throw new Error(
				`Agent library bundle not found at ${LIBRARY_BUNDLE_PATH}. ` +
					"Run 'pnpm build' in packages/cli to generate it.",
				{ cause: e instanceof Error ? e : undefined },
			);
		}
		return this.libraryBundle;
	}

	/**
	 * Strip TypeScript types and convert ESM imports to CommonJS using sucrase.
	 *
	 * sucrase is a pure-JS transpiler (no native binary), so it works in the
	 * Docker image where esbuild's platform-specific binary is absent.
	 */
	private compileTs(tsCode: string): string {
		const { code } = sucraseTransform(tsCode, {
			transforms: ['typescript', 'imports'],
		});
		return code;
	}

	/**
	 * Safely parse a JSON string that originated from the sandbox.
	 *
	 * Two protections over a bare `JSON.parse`:
	 *  1. Validates the value is a string before parsing (ivm's copySync can in
	 *     theory return non-strings if the sandbox assigns a non-string to
	 *     module.exports — this makes the failure explicit rather than a
	 *     confusing "unexpected token" downstream).
	 *  2. Uses a reviver that drops `__proto__` keys. Modern V8 does not allow
	 *     `JSON.parse` to directly write `Object.prototype`, but a sandbox-crafted
	 *     payload containing `{"__proto__": {...}}` could still poison objects
	 *     downstream when the result is spread or passed to `Object.assign` / a
	 *     deep-merge utility. Dropping the key at parse time removes the vector
	 *     before the data ever reaches host code.
	 *     Note: `ivm.copySync` (structured clone) already strips `__proto__` across
	 *     the isolate boundary, so this is belt-and-suspenders protection.
	 */
	private parseSandboxJson<T>(raw: unknown, context: string): T {
		if (typeof raw !== 'string') {
			throw new Error(
				`Sandbox (${context}) produced a non-string result: ${typeof raw}. Expected JSON string.`,
			);
		}
		try {
			return JSON.parse(raw, (key, value) => (key === '__proto__' ? undefined : (value as T))) as T;
		} catch (e) {
			throw new Error(
				`Sandbox (${context}) produced invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
			);
		}
	}

	/**
	 * Run code in the isolate and return the result.
	 */
	private runInContext<T>(context: ivm.Context, slot: AgentIsolateSlot, code: string): T {
		// Set up module.exports
		context.evalSync('var module = { exports: {} }; var exports = module.exports;', {
			timeout: 5000,
		});

		const script = slot.isolate.compileScriptSync(code);
		script.runSync(context, { timeout: 5000 });
		script.release();

		// Extract module.exports via reference + copy
		const ref = context.global.getSync('module', { reference: true });
		const moduleObj = ref.copySync() as { exports: T };
		ref.release();

		return moduleObj.exports;
	}

	// ---------------------------------------------------------------------------
	// Public API
	// ---------------------------------------------------------------------------

	/**
	 * Run a standalone tool TypeScript file in a sandbox, call describe() on the
	 * exported Tool instance, and return the ToolDescriptor JSON.
	 *
	 * Expects `export default new Tool(...)` pattern (no .build() call needed).
	 */
	async describeToolSecurely(tsCode: string): Promise<ToolDescriptor> {
		const jsCode = this.compileTs(tsCode);

		return await this.withIsolate(
			// eslint-disable-next-line @typescript-eslint/require-await -- `withIsolate` expects a Promise-returning callback
			async (slot) => {
				const context = slot.createContext();
				try {
					const wrapper = `
					var __me = {};
					var __mod = { exports: __me };
					(function(exports, require, module) {
						${jsCode}
					})(__me, require, __mod);

					var __exported = __mod.exports.default || __mod.exports;

					if (!__exported || typeof __exported !== 'object' || typeof __exported.describe !== 'function') {
						throw new Error('No Tool found. Export a Tool as default: export default new Tool(...);');
					}

					module.exports = JSON.stringify(__exported.describe());
				`;

					const resultJson = this.runInContext<string>(context, slot, wrapper);
					return this.parseSandboxJson<ToolDescriptor>(resultJson, 'describeToolSecurely');
				} finally {
					context.release();
				}
			},
		);
	}

	/**
	 * Execute a standalone tool's handler in the sandbox.
	 * The tool code must follow `export default new Tool(...)` pattern.
	 */
	async executeToolInIsolate(toolCode: string, input: unknown, ctx: unknown): Promise<unknown> {
		const jsCode = this.compileTs(toolCode);

		return await this.withIsolate(async (slot) => {
			const context = slot.createContext();
			try {
				const setupCode = `
					var __me = {};
					var __mod = { exports: __me };
					(function(exports, require, module) {
						${jsCode}
					})(__me, require, __mod);

					globalThis.__exportedTool = __mod.exports.default || __mod.exports;
					if (!globalThis.__exportedTool || typeof globalThis.__exportedTool !== 'object') {
						throw new Error('No Tool found');
					}
				`;
				const setupScript = slot.isolate.compileScriptSync(setupCode);
				setupScript.runSync(context, { timeout: 5000 });
				setupScript.release();

				const serializedArgs = JSON.stringify({ input, ctx });

				const invokeCode = `
					(async function() {
						var tool = globalThis.__exportedTool;
						var handlerFn = tool.handlerFn || (tool.build ? tool.build().handler : null);
						if (!handlerFn) {
							var built = tool.build ? tool.build() : tool;
							handlerFn = built.handler;
						}
						if (!handlerFn) throw new Error('Tool has no handler');

						var args = ${serializedArgs};
						var suspendPayload = { called: false, data: null };
						var ctx = Object.assign({}, args.ctx || {}, {
							suspend: function(payload) {
								suspendPayload.called = true;
								suspendPayload.data = payload;
								return Promise.resolve({ suspended: true });
							},
						});

						var result = await handlerFn(args.input, ctx);

						if (suspendPayload.called) {
							return JSON.stringify({ __suspend: true, payload: suspendPayload.data });
						}
						return JSON.stringify(result);
					})()
				`;

				const resultJson = (await context.eval(invokeCode, {
					timeout: 5000,
					promise: true,
					copy: true,
				})) as string;

				const parsed = this.parseSandboxJson<Record<string, unknown>>(
					resultJson,
					'executeToolInIsolate',
				);

				if (parsed?.__suspend) {
					return {
						[Symbol.for('n8n.agent.suspend')]: true,
						payload: parsed.payload,
					};
				}

				return parsed;
			} finally {
				context.release();
			}
		});
	}

	/**
	 * Create a ToolExecutor for use with buildFromJson().
	 * @param toolsByName Map of tool name -> TypeScript source code
	 */
	createToolExecutor(toolsByName: Record<string, string>): ToolExecutor {
		return {
			executeTool: async (toolName: string, input: unknown, ctx: unknown) => {
				const toolCode = toolsByName[toolName];
				if (!toolCode) {
					throw new Error(`Tool "${toolName}" not found in tools map`);
				}
				return await this.executeToolInIsolate(toolCode, input, ctx);
			},
		};
	}

	/**
	 * Dispose the pool and all underlying V8 isolates. Safe to call multiple times.
	 */
	dispose(): void {
		this.disposed = true;
		const poolPromise = this.poolInitPromise;
		this.pool = null;
		this.poolInitPromise = null;

		if (poolPromise) {
			void poolPromise.then(async (pool) => await pool.dispose()).catch(() => {});
		}
		// Note: libraryBundle is intentionally NOT cleared — it is a plain JS string
		// independent of isolate state and can be reused if the pool is re-initialized.
	}
}
