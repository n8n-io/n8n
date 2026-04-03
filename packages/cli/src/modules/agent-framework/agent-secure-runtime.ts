import type { AgentSchema, HandlerExecutor } from '@n8n/agents';
import { Service } from '@n8n/di';
import type ivm from 'isolated-vm';
import type { ZodType } from 'zod';

import { SANDBOX_POLYFILLS } from './sandbox-polyfills';

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
 */
@Service()
export class AgentSecureRuntime {
	private isolate: ivm.Isolate | null = null;

	/** Cached ivm module — loaded on first async getIsolate() call. */
	private ivmModule: typeof ivm | null = null;

	/** Serializes concurrent getIsolate() calls to prevent leaking duplicate isolates. */
	private isolateInitPromise: Promise<ivm.Isolate> | null = null;

	/** Pre-bundled JS string containing @n8n/agents + zod for injection into isolates. */
	private libraryBundle: string | null = null;

	/**
	 * Compiled form of the library bundle.
	 *
	 * `compileScriptSync` converts the ~4 MB JS string into V8 bytecode once.
	 * The resulting `ivm.Script` can be run in any context of the same isolate
	 * without recompilation. This avoids re-paying the V8 parse+compile cost
	 * (which is significant for a 4 MB bundle) on every `createContext` call.
	 *
	 * Must be cleared whenever the isolate is reset (OOM rebuild) because
	 * `Script` objects are bound to a specific isolate instance.
	 */
	private bundleScript: ivm.Script | null = null;

	private async getIsolate(): Promise<ivm.Isolate> {
		if (this.isolate) {
			if (this.isolate.isDisposed) {
				// The isolate was disposed externally вЂ” most commonly because it hit
				// the memory limit and isolated-vm disposed it automatically.
				// Clear all derived state so everything is rebuilt from scratch.
				this.isolate = null;
				this.isolateInitPromise = null;
				this.libraryBundle = null;
				this.bundleScript = null; // Script objects are bound to a specific isolate
			} else {
				return this.isolate;
			}
		}
		if (!this.isolateInitPromise) {
			this.isolateInitPromise = (async () => {
				try {
					this.ivmModule = (await import('isolated-vm')).default;
					// FIXME(concurrency): all concurrent describe/handler invocations share a
					// single V8 isolate. Each call gets its own Context (so code is isolated),
					// but V8 heap memory and GC pressure are shared. Under high concurrency
					// one slow handler can delay GC for all others. A proper fix would maintain
					// an isolate pool or move to per-request isolates.
					this.isolate = new this.ivmModule.Isolate({ memoryLimit: 32 });
					return this.isolate;
				} catch (e) {
					this.isolateInitPromise = null;
					throw e;
				}
			})();
		}
		return await this.isolateInitPromise;
	}

	/**
	 * Sync isolate access — only valid after the first async getIsolate() call.
	 * Throws a clear error when the isolate was disposed between the async
	 * warm-up and this sync call (e.g. OOM on a concurrent request).
	 */
	private getIsolateSync(): ivm.Isolate {
		if (!this.isolate || !this.ivmModule) {
			throw new Error('Isolate not initialized — call an async method first');
		}
		if (this.isolate.isDisposed) {
			throw new Error(
				'The V8 isolate was disposed (likely OOM). ' +
					'Call describeSecurely or executeInModule to reinitialise it.',
			);
		}
		return this.isolate;
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

		// Also include WorkflowTool from the CLI's types — user code imports
		// it as `import { WorkflowTool } from '@n8n/agents'` and the existing
		// direct-mode compile injects it into the sandboxed agents module.
		const workflowToolPath = toSlash(require.resolve('./types/workflow-tool'));

		const zodToJsonSchemaPath = toSlash(require.resolve('zod-to-json-schema'));

		const shim = `
			const { Agent } = require('${agentsSrcDir}sdk/agent');
			const { Tool } = require('${agentsSrcDir}sdk/tool');
			const { Memory } = require('${agentsSrcDir}sdk/memory');
			const { Eval } = require('${agentsSrcDir}sdk/eval');
			const { Guardrail } = require('${agentsSrcDir}sdk/guardrail');
			const { Telemetry } = require('${agentsSrcDir}sdk/telemetry');
			const { providerTools } = require('${agentsSrcDir}sdk/provider-tools');
			const { WorkflowTool } = require('${workflowToolPath}');
			const zod = require('zod');
			const zodToJsonSchema = require('${zodToJsonSchemaPath}');

			globalThis.__modules = {
				'@n8n/agents': { Agent, Tool, Memory, Eval, Guardrail, Telemetry, providerTools, WorkflowTool },
				'zod': zod,
				'zod-to-json-schema': zodToJsonSchema,
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
			],
			define: {
				'process.env.NODE_ENV': '"production"',
			},
		});

		if (result.errors.length > 0) {
			throw new Error(`Failed to bundle libraries: ${result.errors.map((e) => e.text).join('\n')}`);
		}

		this.libraryBundle = result.outputFiles[0].text;
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
	 * Create a fresh isolate context with the library bundle loaded and
	 * a sandboxed `require` that resolves from it.
	 */
	private createContext(isolate: ivm.Isolate, libraryBundle: string): ivm.Context {
		const context = isolate.createContextSync();
		const jail = context.global;

		// Make `global` available (some CJS code references it)
		jail.setSync('global', jail.derefInto());

		// Stub Web APIs that don't exist in bare V8 but may be referenced
		// by bundled code paths (streaming, etc.). These are never actually
		// called during describe() — they're just needed to not throw at
		// module evaluation time.
		context.evalSync(SANDBOX_POLYFILLS, { timeout: 5000 });

		// Set up a global require BEFORE loading the bundle — esbuild's CJS
		// output calls `require()` for external modules at load time. We need
		// this to exist before the bundle evaluates.
		// Known modules (@n8n/agents, zod) will be populated after the bundle
		// loads. Unknown modules (Node built-ins, native packages) get empty stubs.
		context.evalSync(
			`
			globalThis.__modules = {};
			globalThis.require = function(id) {
				if (globalThis.__modules[id]) {
					return globalThis.__modules[id];
				}
				// Return empty stub for unknown modules (Node built-ins, etc.)
				// These code paths are never called during describe()/handler execution.
				return new Proxy({}, {
					get: function(target, prop) {
						if (prop === '__esModule') return false;
						if (prop === 'default') return {};
						return function() { return {}; };
					}
				});
			};
		`,
			{ timeout: 5000 },
		);

		// Load the pre-bundled libraries. The bundle's internal __require
		// will call our global require for external deps, getting stubs.
		// After evaluation, globalThis.__modules has '@n8n/agents' and 'zod'.
		//
		// The compiled Script is cached so we only pay the V8 parse+compile cost
		// once. Each context gets a fresh evaluation (filling its own __modules)
		// but shares the underlying compiled bytecode.
		if (!this.bundleScript) {
			this.bundleScript = isolate.compileScriptSync(libraryBundle);
		}
		this.bundleScript.runSync(context, { timeout: 10000 });

		return context;
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
	private runInContext<T>(context: ivm.Context, isolate: ivm.Isolate, code: string): T {
		// Set up module.exports
		context.evalSync('var module = { exports: {} }; var exports = module.exports;', {
			timeout: 5000,
		});

		const script = isolate.compileScriptSync(code);
		script.runSync(context, { timeout: 5000 });
		script.release();

		// Extract module.exports via reference + copy
		const ref = context.global.getSync('module', { reference: true });
		const moduleObj = ref.copySync() as { exports: T };
		ref.release();

		return moduleObj.exports;
	}

	/**
	 * Run user TypeScript code in a sandbox, call describe() on the exported
	 * Agent, and return the AgentSchema JSON with source strings patched in.
	 */
	async describeSecurely(tsCode: string): Promise<AgentSchema> {
		const jsCode = await this.compileTs(tsCode);
		const libraryBundle = await this.getLibraryBundle();
		const isolate = await this.getIsolate();
		const context = this.createContext(isolate, libraryBundle);

		try {
			const wrapper = `
				var __me = {};
				var __mod = { exports: __me };
				(function(exports, require, module) {
					${jsCode}
				})(__me, require, __mod);

				var __exported = __mod.exports.default || __mod.exports;

				if (!__exported || typeof __exported !== 'object' || typeof __exported.describe !== 'function') {
					throw new Error('No agent found. Export a built agent as default: export default agent;');
				}

				module.exports = JSON.stringify(__exported.describe());
			`;

			const resultJson = this.runInContext<string>(context, isolate, wrapper);
			const schema = this.parseSandboxJson<AgentSchema>(resultJson, 'describeSecurely');

			// Patch source strings from the original TypeScript on the host side.
			const { extractSources } = await import('./agent-framework-source-parser');
			const extracted = extractSources(tsCode);

			for (const tool of schema.tools) {
				const toolSources = extracted.tools.get(tool.name);
				if (toolSources) {
					tool.handlerSource = toolSources.handlerSource ?? tool.handlerSource;
					tool.inputSchemaSource = toolSources.inputSchemaSource;
					tool.outputSchemaSource = toolSources.outputSchemaSource;
					tool.suspendSchemaSource = toolSources.suspendSchemaSource;
					tool.resumeSchemaSource = toolSources.resumeSchemaSource;
					tool.toMessageSource = toolSources.toMessageSource;
					tool.needsApprovalFnSource = toolSources.needsApprovalFnSource;
				}
			}
			for (const pt of schema.providerTools) {
				const ptSource = extracted.providerTools.get(pt.name);
				if (ptSource) pt.source = ptSource;
			}
			if (schema.memory) {
				schema.memory.source = extracted.memory;
			}
			for (const ev of schema.evaluations) {
				const evalSource = extracted.evals.get(ev.name);
				if (evalSource) ev.handlerSource = evalSource;
			}
			for (const g of schema.guardrails) {
				const gSource = extracted.guardrails.get(g.name);
				if (gSource) g.source = gSource;
			}
			if (schema.mcp) {
				for (const m of schema.mcp) {
					const mSource = extracted.mcpConfigs.get(m.name);
					if (mSource) m.configSource = mSource;
				}
			}
			if (schema.telemetry && extracted.telemetry) {
				schema.telemetry.source = extracted.telemetry;
			}
			if (schema.config.structuredOutput.enabled && extracted.structuredOutputSource) {
				schema.config.structuredOutput.schemaSource = extracted.structuredOutputSource;
			}

			return schema;
		} finally {
			context.release();
		}
	}

	/**
	 * Execute a named handler within the full agent module context.
	 *
	 * Two-phase execution:
	 * 1. Sync: load the library bundle + compile user module (sets up globals)
	 * 2. Async: invoke the handler via context.eval() which can resolve Promises
	 *    (tool handlers are async functions)
	 */
	async executeInModule(
		tsCode: string,
		type: 'tool' | 'toMessage' | 'eval',
		name: string,
		args: unknown,
	): Promise<unknown> {
		const jsCode = await this.compileTs(tsCode);
		const libraryBundle = await this.getLibraryBundle();
		const isolate = await this.getIsolate();
		const context = this.createContext(isolate, libraryBundle);

		try {
			// Phase 1 (sync): load user module and store the exported agent as a global
			const setupCode = `
				var __me = {};
				var __mod = { exports: __me };
				(function(exports, require, module) {
					${jsCode}
				})(__me, require, __mod);

				globalThis.__exported = __mod.exports.default || __mod.exports;
				if (!globalThis.__exported || typeof globalThis.__exported !== 'object') {
					throw new Error('No agent found');
				}
			`;
			const setupScript = isolate.compileScriptSync(setupCode);
			setupScript.runSync(context, { timeout: 5000 });
			setupScript.release();

			// Phase 2 (async): invoke the handler — context.eval() resolves Promises
			const serializedArgs = JSON.stringify(args);

			let invokeCode: string;
			if (type === 'tool') {
				invokeCode = `
					(async function() {
						var tools = globalThis.__exported.declaredTools || [];
						var tool = tools.find(function(t) { return t.name === ${JSON.stringify(name)}; });
						if (!tool) throw new Error('Tool ' + ${JSON.stringify(name)} + ' not found');

						var args = ${serializedArgs};
						var suspendPayload = { called: false, data: null };
						var ctx = Object.assign({}, args.ctx || {}, {
							suspend: function(payload) {
								suspendPayload.called = true;
								suspendPayload.data = payload;
								return Promise.resolve({ suspended: true });
							},
						});

						var result = await tool.handler(args.input, ctx);

						if (suspendPayload.called) {
							return JSON.stringify({ __suspend: true, payload: suspendPayload.data });
						}
						return JSON.stringify(result);
					})()
				`;
			} else if (type === 'toMessage') {
				invokeCode = `
					(function() {
						var tools = globalThis.__exported.declaredTools || [];
						var tool = tools.find(function(t) { return t.name === ${JSON.stringify(name)}; });
						if (!tool || !tool.toMessage) throw new Error('toMessage not found for ' + ${JSON.stringify(name)});
						return JSON.stringify(tool.toMessage(${serializedArgs}));
					})()
				`;
			} else if (type === 'eval') {
				invokeCode = `
					(async function() {
						var evals = globalThis.__exported.agentEvals || [];
						var ev = evals.find(function(e) { return e.name === ${JSON.stringify(name)}; });
						if (!ev) throw new Error('Eval ' + ${JSON.stringify(name)} + ' not found');
						var result = await ev._run(${serializedArgs});
						return JSON.stringify(result);
					})()
				`;
			} else {
				throw new Error(`Unknown execution type: ${type as string}`);
			}

			// context.eval with { promise: true } tells isolated-vm to await
			// the Promise inside the isolate before returning the result.
			// { copy: true } then copies the resolved value to the host.
			const resultJson = (await context.eval(invokeCode, {
				timeout: 5000,
				promise: true,
				copy: true,
			})) as string;

			const parsed = this.parseSandboxJson<Record<string, unknown>>(resultJson, 'executeInModule');

			if (parsed && parsed.__suspend) {
				return {
					[Symbol.for('n8n.agent.suspend')]: true,
					payload: parsed.payload,
				};
			}

			return parsed;
		} finally {
			context.release();
		}
	}

	/**
	 * Evaluate an arbitrary expression in the sandbox and return the result.
	 * Used for provider tool sources, MCP configs, telemetry sources, etc.
	 */
	async evaluateExpression(source: string): Promise<unknown> {
		const libraryBundle = await this.getLibraryBundle();
		const isolate = await this.getIsolate();
		const context = this.createContext(isolate, libraryBundle);

		try {
			const wrapper = `
				var z = require('zod').z || require('zod');
				var agentsModule = require('@n8n/agents');
				var providerTools = agentsModule.providerTools;
				var Telemetry = agentsModule.Telemetry;
				module.exports = JSON.stringify(${source});
			`;

			const resultJson = this.runInContext<string>(context, isolate, wrapper);
			return this.parseSandboxJson<unknown>(resultJson, 'evaluateExpression');
		} finally {
			context.release();
		}
	}

	/**
	 * Evaluate a provider tool source expression in the sandbox.
	 * Returns the BuiltProviderTool with name and args.
	 */
	async evaluateProviderToolSource(
		source: string,
	): Promise<{ name: string; args: Record<string, unknown> }> {
		const libraryBundle = await this.getLibraryBundle();
		const isolate = await this.getIsolate();
		const context = this.createContext(isolate, libraryBundle);

		try {
			const wrapper = `
				var agentsModule = require('@n8n/agents');
				var providerTools = agentsModule.providerTools;
				var result = ${source};
				module.exports = JSON.stringify(result);
			`;

			const resultJson = this.runInContext<string>(context, isolate, wrapper);
			return this.parseSandboxJson<{ name: string; args: Record<string, unknown> }>(
				resultJson,
				'evaluateProviderToolSource',
			);
		} finally {
			context.release();
		}
	}

	/**
	 * Synchronously execute a toMessage call within the agent module context.
	 * Uses runInContext (sync) instead of context.eval (async).
	 *
	 * Throws if the library bundle has not been warmed up yet (the async path
	 * must have been called at least once before this sync variant is used).
	 */
	executeToMessageSync(tsCode: string, toolName: string, output: unknown): unknown {
		if (!this.libraryBundle) {
			throw new Error(
				'executeToMessageSync called before the library bundle was initialised. ' +
					'Call an async method (describeSecurely, executeInModule, …) first to warm up the bundle.',
			);
		}
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const esbuild = require('esbuild') as {
			transformSync: (code: string, options: Record<string, string>) => { code: string };
		};
		// compileTs is async; for the sync path we use esbuild's synchronous API.
		const jsCode = esbuild.transformSync(tsCode, {
			loader: 'ts',
			format: 'cjs',
			target: 'es2022',
		}).code;

		const isolate = this.getIsolateSync();
		const context = this.createContext(isolate, this.libraryBundle);

		try {
			const serializedOutput = JSON.stringify(output);

			const wrapper = `
				var __me = {};
				var __mod = { exports: __me };
				(function(exports, require, module) {
					${jsCode}
				})(__me, require, __mod);

				var __exported = __mod.exports.default || __mod.exports;
				if (!__exported || typeof __exported !== 'object') {
					module.exports = JSON.stringify(null);
				} else {
					var tools = __exported.declaredTools || [];
					var tool = tools.find(function(t) { return t.name === ${JSON.stringify(toolName)}; });
					if (!tool || !tool.toMessage) {
						module.exports = JSON.stringify(null);
					} else {
						module.exports = JSON.stringify(tool.toMessage(${serializedOutput}));
					}
				}
			`;

			const resultJson = this.runInContext<string>(context, isolate, wrapper);
			return this.parseSandboxJson<unknown>(resultJson, 'executeToMessageSync');
		} finally {
			context.release();
		}
	}

	/**
	 * Evaluate a Zod source string in the sandbox and return JSON Schema.
	 *
	 * Requires `zod-to-json-schema` to be available in the library bundle
	 * (added via the shim). Throws if conversion fails rather than returning
	 * a silent fallback.
	 */
	async evaluateZodSource(source: string): Promise<Record<string, unknown>> {
		const libraryBundle = await this.getLibraryBundle();
		const isolate = await this.getIsolate();
		const context = this.createContext(isolate, libraryBundle);

		try {
			const wrapper = `
				var z = require('zod').z || require('zod');
				var zodToJsonSchemaModule = require('zod-to-json-schema');
				var zodToJsonSchema = zodToJsonSchemaModule.zodToJsonSchema || zodToJsonSchemaModule.default;
				if (typeof zodToJsonSchema !== 'function') {
					throw new Error('zod-to-json-schema is not available in the sandbox bundle');
				}
				var schema = ${source};
				module.exports = JSON.stringify(zodToJsonSchema(schema));
			`;

			const resultJson = this.runInContext<string>(context, isolate, wrapper);
			return this.parseSandboxJson<Record<string, unknown>>(resultJson, 'evaluateZodSource');
		} finally {
			context.release();
		}
	}

	/**
	 * Create a HandlerExecutor backed by this runtime for a specific agent's code.
	 */
	createExecutor(agentCode: string): HandlerExecutor {
		return {
			executeTool: async (toolName: string, input: unknown, ctx: unknown) =>
				await this.executeInModule(agentCode, 'tool', toolName, { input, ctx }),

			executeToMessage: async (toolName: string, output: unknown) =>
				(await this.executeInModule(agentCode, 'toMessage', toolName, output)) as
					| Awaited<ReturnType<HandlerExecutor['executeToMessage']>>
					| undefined,

			executeToMessageSync: (toolName: string, output: unknown) =>
				this.executeToMessageSync(agentCode, toolName, output) as
					| ReturnType<NonNullable<HandlerExecutor['executeToMessageSync']>>
					| undefined,

			executeEval: async (evalName: string, evalInput: unknown) =>
				(await this.executeInModule(agentCode, 'eval', evalName, evalInput)) as Awaited<
					ReturnType<HandlerExecutor['executeEval']>
				>,

			evaluateSchema: async (schemaSource: string) => {
				const jsonSchema = await this.evaluateZodSource(schemaSource);
				return jsonSchema as unknown as ZodType;
			},

			evaluateExpression: async (source: string) => await this.evaluateExpression(source),
		};
	}

	/**
	 * Dispose the underlying V8 isolate. Safe to call multiple times.
	 */
	dispose(): void {
		if (this.isolate) {
			this.isolate.dispose();
			this.isolate = null;
		}
		this.isolateInitPromise = null;
		this.libraryBundle = null;
		this.bundleScript = null;
	}
}
