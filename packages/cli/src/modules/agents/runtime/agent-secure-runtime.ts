import type { ToolDescriptor } from '@n8n/agents';

import type { ToolExecutor } from '../json-config/from-json-config';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type ivm from 'isolated-vm';

import { AgentIsolatePool, type AgentIsolateSlot } from './agent-isolate-pool';

/**
 * Sandboxed execution runtime for agent user code.
 *
 * Uses `isolated-vm` (V8 isolates) to run untrusted TypeScript in a confined
 * environment. Libraries (`@n8n/agents`, `zod`) are pre-bundled into a single
 * JS string at startup and loaded into each isolate context as source code.
 * This avoids module resolution issues with pnpm workspace symlinks.
 *
 * Pattern inspired by Budibase's jsRunner:
 * https://github.com/Budibase/budibase/tree/master/packages/server/src/jsRunner
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
	 * isolates. Cached here at the runtime level so it is never cleared on OOM
	 * (the bundle is a plain string, not bound to any isolate instance).
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
				const libraryBundle = await this.getLibraryBundle();
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
	 * Pre-bundle @n8n/agents and zod into a single CJS string using esbuild.
	 * This runs once and is cached — subsequent calls return the cached bundle.
	 *
	 * The bundle is loaded into each isolate context as source code, making
	 * `require('@n8n/agents')` and `require('zod')` work inside the sandbox
	 * without needing filesystem access or module resolution.
	 */
	private async getLibraryBundle(): Promise<string> {
		if (this.libraryBundle) return this.libraryBundle;

		const esbuild = await import('esbuild');

		// Build a shim that only imports the builder classes needed for
		// describe() and handler execution — NOT the full runtime (which pulls
		// in MCP SDK, AI provider SDKs, database drivers, etc.).
		// We import from the specific source files to avoid the barrel export
		// that drags in everything.
		// Normalize to forward slashes so paths are valid JS string literals on Windows.
		// Windows backslashes (e.g. C:\Users\...) would be misread as escape sequences
		// (\U → U, \n → newline, etc.) when esbuild parses the shim as JavaScript.
		const toSlash = (p: string) => p.replace(/\\/g, '/');

		const agentsPath = toSlash(require.resolve('@n8n/agents'));
		const agentsSrcDir = agentsPath.replace(/dist\/index\.js$/, 'dist/');

		const shim = `
			const { Tool } = require('${agentsSrcDir}sdk/tool');
			const zod = require('zod');

			globalThis.__modules = {
				'@n8n/agents': { Tool },
				'zod': zod,
			};
		`;

		const result = await esbuild.build({
			stdin: { contents: shim, loader: 'js', resolveDir: process.cwd() },
			bundle: true,
			format: 'cjs',
			target: 'es2022',
			platform: 'node',
			write: false,
			// Tree-shake: only include what's reachable from the shim
			treeShaking: true,
			// Stub out Node built-ins, native modules, and packages that need
			// runtime capabilities (network, filesystem, child processes) which
			// don't exist in the V8 isolate.
			external: [
				'node:*',
				'pg',
				'better-sqlite3',
				'@libsql/client',
				'ajv',
				'child_process',
				'fs',
				'path',
				'os',
				'net',
				'http',
				'https',
				'tls',
				'stream',
				'crypto',
				'events',
				'util',
				'buffer',
				'url',
				'querystring',
				'cross-spawn',
				'@modelcontextprotocol/*',
				'@ai-sdk/*',
				'@opentelemetry/*',
				'langsmith/*',
			],
			define: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				'process.env.NODE_ENV': '"production"',
			},
		});

		if (result.errors.length > 0) {
			throw new Error(`Failed to bundle libraries: ${result.errors.map((e) => e.text).join('\n')}`);
		}

		this.libraryBundle = result.outputFiles[0].text;
		const sizeKB = (this.libraryBundle.length / 1024).toFixed(1);
		const sizeMB = (this.libraryBundle.length / (1024 * 1024)).toFixed(2);
		this.logger.info(`[AgentSecureRuntime] Library bundle built: ${sizeKB} KB (${sizeMB} MB)`);
		return this.libraryBundle;
	}

	/**
	 * Compile TypeScript to CommonJS JavaScript via esbuild.
	 */
	private async compileTs(tsCode: string): Promise<string> {
		const esbuild = await import('esbuild');
		const result = await esbuild.transform(tsCode, {
			loader: 'ts',
			format: 'cjs',
			target: 'es2022',
		});
		return result.code;
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
	 * Uses the Budibase pattern: set result on a global, then copy it out.
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
		const jsCode = await this.compileTs(tsCode);

		return await this.withIsolate(async (slot) => {
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
		});
	}

	/**
	 * Execute a standalone tool's handler in the sandbox.
	 * The tool code must follow `export default new Tool(...)` pattern.
	 */
	async executeToolInIsolate(toolCode: string, input: unknown, ctx: unknown): Promise<unknown> {
		const jsCode = await this.compileTs(toolCode);

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
