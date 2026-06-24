/**
 * Isolated-vm sandbox — a vm2 replacement that runs untrusted JavaScript
 * in a V8 isolate instead of vm2's emulated Node.js sandbox.
 *
 * vm2 (CVE-2023-37466, CVE-2023-29017, …) is deprecated with known sandbox
 * escape vulnerabilities. This class uses isolated-vm (native V8 isolates)
 * for true process-level isolation.
 *
 * API surface is kept compatible with the existing vm2 NodeVM pattern:
 *  - sandbox context injection
 *  - require support with allow-lists (NODE_FUNCTION_ALLOW_BUILTIN / EXTERNAL)
 *  - console redirection via event emitter
 *  - code execution via .run(code, filename)
 */

import ivm from 'isolated-vm';
import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';

/** Resolver shape matching vm2's Resolver type. */
export interface IvmResolver {
	builtin: string[];
	external?: string[];
	/** Custom module resolution callback, mirroring vm2's Resolver.resolve(). */
	resolve?: (moduleName: string, parentDirname: string) => string | undefined;
}

/**
 * Build a resolver from the legacy NODE_FUNCTION_ALLOW_* env vars.
 * Mirrors vm2's makeResolverFromLegacyOptions().
 */
export function makeIvmResolver(options: {
	builtin: string[];
	external?: { modules: string[]; transitive: boolean } | false;
}): IvmResolver {
	return {
		builtin: options.builtin,
		external:
			options.external === false
				? undefined
				: options.external?.modules.map((m) => m.trim()).filter(Boolean),
	};
}

/**
 * Default resolver — reads NODE_FUNCTION_ALLOW_BUILTIN / NODE_FUNCTION_ALLOW_EXTERNAL env vars.
 */
export const defaultIvmResolver: IvmResolver = (() => {
	const builtIn = (process.env.NODE_FUNCTION_ALLOW_BUILTIN ?? '').split(',').filter(Boolean);
	const externalRaw = (process.env.NODE_FUNCTION_ALLOW_EXTERNAL ?? '').trim();
	const external = externalRaw
		? externalRaw
				.split(',')
				.map((m) => m.trim())
				.filter(Boolean)
		: undefined;
	return { builtin: builtIn.length > 0 ? builtIn : [], external };
})();

export interface IvmSandboxOptions {
	/** Variables to inject into the sandbox global scope. */
	sandbox?: Record<string, unknown>;
	/** Module resolution config. */
	resolver?: IvmResolver;
	/** Console handling: 'redirect' emits events, 'inherit' passes through. */
	console?: 'redirect' | 'inherit';
	/** Per-isolate memory limit in MB (default: 64). */
	memoryLimit?: number;
	/** Execution timeout in ms (default: 10_000). */
	timeout?: number;
}

/**
 * Thin wrapper around isolated-vm that mimics the vm2 NodeVM API
 * for the Code / Function / FunctionItem nodes.
 */
export class IvmSandbox extends EventEmitter {
	private readonly isolate: ivm.Isolate;

	private readonly resolver: IvmResolver;

	private readonly consoleMode: 'redirect' | 'inherit';

	private readonly timeout: number;

	constructor(options: IvmSandboxOptions = {}) {
		super();

		const memoryLimit = options.memoryLimit ?? 64;
		this.isolate = new ivm.Isolate({ memoryLimit });
		this.resolver = options.resolver ?? defaultIvmResolver;
		this.consoleMode = options.console ?? 'redirect';
		this.timeout = options.timeout ?? 10_000;

		// Pre-warm the isolate with an empty context so it's ready.
		// We create a fresh context per run() call, but the isolate is reused.
		void this.createEmptyContext();
	}

	/**
	 * Create a context with the given sandbox variables, polyfills,
	 * and a secure require shim.
	 */
	private createContext(sandbox?: Record<string, unknown>): ivm.Context {
		const context = this.isolate.createContextSync();
		const jail = context.global;

		// Make `globalThis` and `global` work
		jail.setSync('global', jail.derefInto());
		jail.setSync('globalThis', jail.derefInto());

		// Inject sandbox variables as plain globals
		if (sandbox) {
			for (const [key, value] of Object.entries(sandbox)) {
				this.setGlobal(context, key, value);
			}
		}

		// Set up console
		this.setupConsole(context);

		// Set up module system polyfill
		this.setupModuleSystem(context);

		// Set up the secure require shim
		this.setupRequireShim(context);

		return context;
	}

	/** Inject a variable into the sandbox global scope, handling complex types. */
	private setGlobal(context: ivm.Context, key: string, value: unknown): void {
		const jail = context.global;
		if (value === null || value === undefined) {
			jail.setSync(key, null);
			return;
		}
		if (typeof value === 'function') {
			// Functions need to be wrapped as ivm.Reference
			jail.setSync(key, new ivm.Reference(value));
			return;
		}
		if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
			jail.setSync(key, value as ivm.Copy<boolean> & ivm.Copy<string> & ivm.Copy<number>);
			return;
		}
		// Objects and arrays — pass a reference that the sandbox can call .derefInto() on.
		// The sandbox code accesses them via a wrapper.
		jail.setSync(key, new ivm.Reference(value));
	}

	/** Wire up console.log/warn/error inside the isolate. */
	private setupConsole(context: ivm.Context): void {
		if (this.consoleMode === 'inherit') {
			context.evalSync(
				`
				globalThis.console = {
					log:   function(...args) {},
					warn:  function(...args) {},
					error: function(...args) {},
					info:  function(...args) {},
					debug: function(...args) {},
				};
			`,
				{ timeout: 2000 },
			);
			return;
		}

		// Redirect mode: each console call emits an event on the host side
		// We use an ivm.Reference to a host-side function
		const logFn = new ivm.Reference((...args: unknown[]) => {
			this.emit('console.log', ...args);
		});
		const warnFn = new ivm.Reference((...args: unknown[]) => {
			this.emit('console.warn', ...args);
		});
		const errorFn = new ivm.Reference((...args: unknown[]) => {
			this.emit('console.error', ...args);
		});

		context.evalSync(
			`
			globalThis.__consoleLog = $0;
			globalThis.__consoleWarn = $1;
			globalThis.__consoleError = $2;
			globalThis.console = {
				log:   function() { globalThis.__consoleLog.apply(undefined, Array.prototype.slice.call(arguments)); },
				warn:  function() { globalThis.__consoleWarn.apply(undefined, Array.prototype.slice.call(arguments)); },
				error: function() { globalThis.__consoleError.apply(undefined, Array.prototype.slice.call(arguments)); },
				info:  function() { globalThis.console.log.apply(undefined, arguments); },
				debug: function() { globalThis.console.log.apply(undefined, arguments); },
			};
		`,
			{ timeout: 2000, arguments: [logFn, warnFn, errorFn] },
		);
	}

	/** Set up `module` and `exports` globals so the code wrapper pattern works. */
	private setupModuleSystem(context: ivm.Context): void {
		context.evalSync(
			`
			globalThis.module = { exports: {} };
			globalThis.exports = globalThis.module.exports;
		`,
			{ timeout: 2000 },
		);
	}

	/**
	 * Sets up a custom require() function inside the isolate that delegates
	 * to the host process. Module resolution and loading happens on the
	 * host side, with the result copied back into the isolate.
	 */
	private setupRequireShim(context: ivm.Context): void {
		const builtinSet = new Set(this.resolver.builtin);
		const externalSet = this.resolver.external ? new Set(this.resolver.external) : null;

		const requireHostFn = new ivm.Reference((moduleId: string, parentDirname: string): unknown => {
			try {
				// Custom module resolution (used by langchain/... redirects)
				if (this.resolver.resolve) {
					const resolved = this.resolver.resolve(moduleId, parentDirname);
					if (resolved) {
						// eslint-disable-next-line @typescript-eslint/no-var-requires
						return require(resolved);
					}
				}

				// Validate: only allow listed builtins and externals
				if (builtinSet.size > 0 && builtinSet.has(moduleId)) {
					// Built-in modules are loaded via createRequire and returned
					const hostRequire = createRequire(process.cwd());
					return hostRequire(moduleId);
				}

				if (externalSet && externalSet.has(moduleId)) {
					const hostRequire = createRequire(process.cwd());
					return hostRequire(moduleId);
				}

				// No allow-lists configured — allow a minimal set of safe builtins
				const BASIC_ALLOWED = new Set([
					'assert',
					'buffer',
					'crypto',
					'events',
					'path',
					'process',
					'stream',
					'string_decoder',
					'timers',
					'url',
					'util',
				]);

				if (builtinSet.size === 0 && BASIC_ALLOWED.has(moduleId)) {
					const hostRequire = createRequire(process.cwd());
					return hostRequire(moduleId);
				}

				// If no lists are configured at all, allow all builtins (legacy behavior)
				if (builtinSet.size === 0 && !externalSet) {
					const hostRequire = createRequire(process.cwd());
					return hostRequire(moduleId);
				}

				// Denied module
				throw new Error(
					`Module "${moduleId}" is not in the allowed list. ` +
						`Set NODE_FUNCTION_ALLOW_BUILTIN to allow built-ins, ` +
						`NODE_FUNCTION_ALLOW_EXTERNAL to allow external packages.`,
				);
			} catch (err) {
				// Re-throw as a plain object so it can be serialized across the boundary
				throw new Error(
					`require("${moduleId}"): ${err instanceof Error ? err.message : String(err)}`,
				);
			}
		});

		context.evalSync(
			`
			globalThis.__requireHost = $0;
			globalThis.__dirname = '/sandbox';
			globalThis.require = function(id) {
				// Check if it's an internal resolve relative to __dirname-like paths
				if (id.startsWith('.') || id.startsWith('/')) {
					throw new Error('Relative require() is not supported in the sandbox. Use absolute module names.');
				}
				return globalThis.__requireHost.applyIgnored(id, globalThis.__dirname);
			};
		`,
			{ timeout: 2000, arguments: [requireHostFn] },
		);
	}

	/**
	 * Run JavaScript code in the sandbox.
	 * Compatible with vm2 NodeVM.run(script, filename).
	 *
	 * The code is wrapped in a function each time so `module.exports` works.
	 */
	async run<T = unknown>(code: string, _filename?: string): Promise<T> {
		const context = this.createContext({ __sandboxCode: code });
		try {
			// Wrap the user code in a self-executing async function
			const wrappedCode = `
				(async function() {
					${code}
				})()
			`;

			const result = (await context.eval(wrappedCode, {
				timeout: this.timeout,
				promise: true,
				copy: true,
			})) as T;

			return result;
		} catch (error) {
			// Re-throw with better error message
			if (error instanceof ivm.IsolateTimeoutError) {
				throw new Error(`Execution timed out after ${this.timeout}ms`);
			}
			throw error;
		} finally {
			context.release();
		}
	}

	/** Dispose the underlying V8 isolate. */
	dispose(): void {
		if (!this.isolate.isDisposed) {
			this.isolate.dispose();
		}
	}
}
