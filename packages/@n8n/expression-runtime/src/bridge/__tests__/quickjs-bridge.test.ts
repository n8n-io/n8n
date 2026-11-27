import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { QuickJSContext } from 'quickjs-emscripten-core';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ExpressionEvaluator } from '../../evaluator/expression-evaluator';
import { classifyExpressionError, errorOriginOf } from '../../evaluator/error-classification';
import type { BridgeConfig, RuntimeBridge } from '../../types';
import { HostCallError, MemoryLimitError, RuntimeRestartingError } from '../../types';
import { QuickJsBridge } from '../quickjs-bridge';

// Deep enough that V8 runs out of native stack inside the QuickJS WASM code
// before the QuickJS stack check fires.
const DEPTH = 100_000;
const deepData = { $json: { deep: '['.repeat(DEPTH) + ']'.repeat(DEPTH) } };
const OVERFLOW = 'return JSON.parse(this.$json.deep).length;';
const NATIVE_OVERFLOW = /Maximum call stack size exceeded/;

describe('QuickJsBridge after a host error in a guest call', () => {
	const bridges: RuntimeBridge[] = [];

	async function newBridge(config: BridgeConfig = {}): Promise<QuickJsBridge> {
		const bridge = new QuickJsBridge({ timeout: 5000, ...config });
		bridges.push(bridge);
		await bridge.initialize();
		return bridge;
	}

	/** An async initialize() waits for the replacement module that the overflow started to load. */
	async function waitForReplacementModule(): Promise<void> {
		await newBridge();
	}

	/** Breaks the runtime, then makes the rebuild on the replacement module fail once. */
	async function failRebuild(bridge: QuickJsBridge, beforeFailure?: () => void): Promise<void> {
		expect(() => bridge.execute(OVERFLOW, deepData)).toThrow(NATIVE_OVERFLOW);
		await waitForReplacementModule();
		vi.spyOn(
			bridge as unknown as { verifyProxySystem(): void },
			'verifyProxySystem',
		).mockImplementationOnce(() => {
			beforeFailure?.();
			throw new Error('rebuild failed');
		});
		expect(() => bridge.execute('return 1 + 1;', {})).toThrow('rebuild failed');
	}

	afterEach(async () => {
		vi.restoreAllMocks();
		await Promise.all(bridges.splice(0).map(async (bridge) => await bridge.dispose()));
	});

	it('should classify the host error and the restart that follows it apart from other errors', async () => {
		const bridge = await newBridge();
		const errorOf = (code: string, data: Record<string, unknown>) => {
			try {
				bridge.execute(code, data);
			} catch (error) {
				return error;
			}
			throw new Error('expected the call to fail');
		};

		const hostError = errorOf(OVERFLOW, deepData);
		expect(hostError).toBeInstanceOf(HostCallError);
		expect(hostError).toMatchObject({ hostErrorName: 'RangeError' });
		expect(classifyExpressionError(hostError)).toBe('host_error');

		const restarting = errorOf('return 1 + 1;', {});
		expect(restarting).toBeInstanceOf(RuntimeRestartingError);
		expect(classifyExpressionError(restarting)).toBe('engine_restarting');
	});

	it('should dispose a bridge after a native stack overflow', async () => {
		const bridge = await newBridge();

		expect(() => bridge.execute(OVERFLOW, deepData)).toThrow(NATIVE_OVERFLOW);

		await expect(bridge.dispose()).resolves.toBeUndefined();
	});

	it('should evaluate the next expression on a runtime in a new WASM module', async () => {
		const bridge = await newBridge();
		expect(() => bridge.execute(OVERFLOW, deepData)).toThrow(NATIVE_OVERFLOW);

		await waitForReplacementModule();

		expect(bridge.execute('return 1 + 1;', {})).toBe(2);
		// The old module's stack pointer stays lower after the overflow, so there
		// the QuickJS check fires first. A new module overflows the native stack again.
		expect(() => bridge.execute(OVERFLOW, deepData)).toThrow(NATIVE_OVERFLOW);
	});

	it('should return a string that contains NUL characters on a rebuilt runtime', async () => {
		const bridge = await newBridge();
		expect(() => bridge.execute(OVERFLOW, deepData)).toThrow(NATIVE_OVERFLOW);

		await waitForReplacementModule();

		expect(bridge.execute('return "x\\u0000y";', {})).toBe('x\0y');
	});

	it('should report that the engine restarts while the replacement module loads', async () => {
		const bridge = await newBridge();
		expect(() => bridge.execute(OVERFLOW, deepData)).toThrow(NATIVE_OVERFLOW);

		expect(() => bridge.execute('return 1 + 1;', {})).toThrow(/restarting after an earlier error/);
		expect(() => bridge.execute('return 1 + 1;', {})).toThrow(RuntimeRestartingError);

		await waitForReplacementModule();
		expect(bridge.execute('return 1 + 1;', {})).toBe(2);
	});

	it('should keep creating working bridges after repeated native stack overflows', async () => {
		for (let i = 0; i < 12; i++) {
			const bridge = await newBridge();
			expect(() => bridge.execute(OVERFLOW, deepData)).toThrow(NATIVE_OVERFLOW);
			await bridge.dispose();
		}

		const bridge = await newBridge();
		expect(bridge.execute('return [1, 2, 3].map(function (n) { return n * 2; });', {})).toEqual([
			2, 4, 6,
		]);
	});

	it('should stop the outer call when a nested call overflows the native stack', async () => {
		const bridge = await newBridge();
		const data: Record<string, unknown> = {
			...deepData,
			$evaluateExpression: () => bridge.execute(OVERFLOW, data),
		};

		expect(() => bridge.execute('this.$evaluateExpression("x"); return 1;', data)).toThrow(
			/nested expression stopped the expression engine/,
		);

		await waitForReplacementModule();
		expect(bridge.execute('return 1 + 1;', {})).toBe(2);
	});

	it('should rebuild the runtime from the runtime bundle that the bridge was given', async () => {
		const bundle = await readRuntimeBundle();
		const markedBundle = (marker: string) => `${bundle}\n;globalThis.__bundleMarker = '${marker}';`;
		const bridge = await newBridge({ runtimeBundle: markedBundle('own') });
		expect(() => bridge.execute(OVERFLOW, deepData)).toThrow(NATIVE_OVERFLOW);

		// This bridge initializes last, so the process-wide bundle cache holds its bundle.
		await newBridge({ runtimeBundle: markedBundle('other') });

		expect(bridge.execute('return globalThis.__bundleMarker;', {})).toBe('own');
	});

	it('should retry the rebuild on the next execute after a failed rebuild', async () => {
		const bridge = await newBridge();
		await failRebuild(bridge);

		expect(bridge.execute('return 1 + 1;', {})).toBe(2);
	});

	it('should keep the current WASM module when a bridge with a failed rebuild is disposed', async () => {
		const bridge = await newBridge();
		await failRebuild(bridge);

		await bridge.dispose();

		const next = new QuickJsBridge();
		bridges.push(next);
		expect(() => next.initializeSync()).not.toThrow();
	});

	it('should retire the WASM module when the runtime of a failed rebuild cannot be freed', async () => {
		const bridge = await newBridge();
		await failRebuild(bridge, () => {
			const { runtime } = bridge as unknown as { runtime: { dispose(): void } };
			vi.spyOn(runtime, 'dispose').mockImplementationOnce(() => {
				throw new Error('free aborted');
			});
		});

		const next = new QuickJsBridge();
		bridges.push(next);
		expect(() => next.initializeSync()).toThrow(/not loaded yet/);
		await waitForReplacementModule();
		expect(bridge.execute('return 1 + 1;', {})).toBe(2);
	});

	it('should record a failed rebuild as the origin of its error', async () => {
		const bridge = await newBridge();
		expect(() => bridge.execute(OVERFLOW, deepData)).toThrow(NATIVE_OVERFLOW);
		await waitForReplacementModule();
		vi.spyOn(
			bridge as unknown as { verifyProxySystem(): void },
			'verifyProxySystem',
		).mockImplementationOnce(() => {
			throw new TypeError('rebuild failed');
		});

		let rebuildError: unknown;
		try {
			bridge.execute('return 1 + 1;', {});
		} catch (error) {
			rebuildError = error;
		}

		expect(errorOriginOf(rebuildError)).toEqual({ kind: 'rebuild', errorName: 'TypeError' });
	});
});

describe('QuickJsBridge error origin', () => {
	let bridge: QuickJsBridge;

	beforeAll(async () => {
		bridge = new QuickJsBridge({ timeout: 5000 });
		await bridge.initialize();
	});

	afterAll(async () => {
		await bridge.dispose();
	});

	const errorOf = (code: string, data: Record<string, unknown> = {}) => {
		try {
			bridge.execute(code, data);
		} catch (error) {
			return error;
		}
		throw new Error('expected the call to fail');
	};

	it('should keep the class of a guest error that the bridge replaces with a generic Error', () => {
		const error = errorOf('return null.missing;');

		expect(error).toMatchObject({ name: 'Error' });
		expect(errorOriginOf(error)).toEqual({ kind: 'guest', errorName: 'TypeError' });
	});

	it('should tell an error that a host callback threw from a guest error', () => {
		const data = {
			$json: {
				get broken() {
					throw new RangeError('host failure');
				},
			},
		};

		expect(errorOriginOf(errorOf('return this.$json.broken;', data))).toEqual({
			kind: 'host_callback',
			errorName: 'RangeError',
		});
	});

	it('should record a compile error', () => {
		expect(errorOriginOf(errorOf('return );'))).toEqual({ kind: 'compile' });
	});

	it('should record a failed callback setup and keep its error', () => {
		const vm = (bridge as unknown as { vm: { newFunction(): unknown } }).vm;
		const setupError = new TypeError('setup failed');
		vi.spyOn(vm, 'newFunction').mockImplementationOnce(() => {
			throw setupError;
		});

		const error = errorOf('return 1;');

		expect(error).toBe(setupError);
		expect(errorOriginOf(error)).toEqual({ kind: 'callback_setup', errorName: 'TypeError' });
	});

	it('should record a failed callback cleanup and keep its error', () => {
		const cleanupError = new RangeError('cleanup failed');
		const internals = bridge as unknown as {
			createCallbackHandles(resolver: unknown, budget: unknown): Array<{ dispose(): void }>;
		};
		const createCallbackHandles = internals.createCallbackHandles.bind(bridge);
		vi.spyOn(internals, 'createCallbackHandles').mockImplementationOnce((resolver, budget) => {
			const handles = createCallbackHandles(resolver, budget);
			const [first] = handles;
			const dispose = first.dispose.bind(first);
			first.dispose = () => {
				dispose();
				throw cleanupError;
			};
			return handles;
		});

		const error = errorOf('return 1;');

		expect(error).toBe(cleanupError);
		expect(errorOriginOf(error)).toEqual({ kind: 'callback_cleanup', errorName: 'RangeError' });
		expect(bridge.execute('return 1 + 1;', {})).toBe(2);
	});
});

describe('QuickJsBridge workflow data', () => {
	const bridges: RuntimeBridge[] = [];

	async function newBridge(): Promise<QuickJsBridge> {
		const bridge = new QuickJsBridge({ timeout: 5000 });
		bridges.push(bridge);
		await bridge.initialize();
		return bridge;
	}

	/** Runs a full GC. A WeakRef keeps its target alive until the current job ends. */
	async function collectGarbage(): Promise<void> {
		setFlagsFromString('--expose_gc');
		await new Promise((resolve) => setTimeout(resolve, 10));
		(runInNewContext('gc') as () => void)();
	}

	/**
	 * Replaces `vm.newFunction`. `call` counts from 1. Not vi.spyOn: a spy
	 * records its arguments, and those hold the data.
	 */
	function overrideNewFunction(
		bridge: QuickJsBridge,
		override: (
			call: number,
			build: () => import('quickjs-emscripten-core').QuickJSHandle,
		) => import('quickjs-emscripten-core').QuickJSHandle,
	): void {
		const vm = bridge['vm']!;
		const newFunction = vm.newFunction.bind(vm);
		let calls = 0;
		vm.newFunction = ((...args: Parameters<typeof newFunction>) =>
			override(++calls, () => newFunction(...args))) as typeof vm.newFunction;
	}

	/** Makes `handle.dispose()` free the handle and then throw. */
	function failDispose(
		handle: import('quickjs-emscripten-core').QuickJSHandle,
	): import('quickjs-emscripten-core').QuickJSHandle {
		const dispose = handle.dispose.bind(handle);
		handle.dispose = () => {
			dispose();
			throw new Error('dispose failed');
		};
		return handle;
	}

	afterEach(async () => {
		await Promise.all(bridges.splice(0).map(async (bridge) => await bridge.dispose()));
	});

	it('reads host objects after an earlier call changes the JSON parser', async () => {
		const bridge = await newBridge();
		bridge.execute('JSON.parse = () => { throw new Error("custom parser"); }; return 1;', {});

		expect(
			bridge.execute('return this.$json.profile.name;', {
				$json: { profile: { name: 'from host' } },
			}),
		).toBe('from host');
	});

	it.each([
		{
			label: 'a batched read',
			code: 'return this.$json.rows.map(function (r) { return r; });',
			$json: { rows: [1, 2, 'fail'] },
		},
		{ label: 'a single read', code: 'return typeof this.$json.box;', $json: { box: { fail: 1 } } },
	])('stops the evaluation when the guest cannot build the value of $label', async (testCase) => {
		const bridge = await newBridge();
		const vm = bridge['vm']!;
		// Fails like the guest JSON parser at the memory limit, for a value that holds "fail".
		vm.unwrapResult(
			vm.evalCode(`
				var unwrap = globalThis.__unwrapFromHost;
				globalThis.__unwrapFromHost = function (json, holdsSentinel) {
					if (json.indexOf('fail') !== -1) throw new InternalError('out of memory');
					return unwrap(json, holdsSentinel);
				};
			`),
		).dispose();

		expect(() => bridge.execute(testCase.code, { $json: testCase.$json })).toThrow(
			MemoryLimitError,
		);
	});

	it('stops the evaluation when the guest cannot build a date', async () => {
		const bridge = await newBridge();
		const vm = bridge['vm']!;
		// Fails like the guest at the memory limit, for this one date only.
		vm.unwrapResult(
			vm.evalCode(`
				var HostDate = Date;
				globalThis.Date = function (time) {
					if (time === 1234) throw new InternalError('out of memory');
					return arguments.length ? new HostDate(time) : new HostDate();
				};
				globalThis.Date.prototype = HostDate.prototype;
				globalThis.Date.now = HostDate.now;
				globalThis.Date.UTC = HostDate.UTC;
				globalThis.Date.parse = HostDate.parse;
			`),
		).dispose();

		expect(() =>
			bridge.execute('return typeof this.$json.when;', { $json: { when: new Date(1234) } }),
		).toThrow(MemoryLimitError);
	});

	it.each([
		{ label: 'a marker key', $json: { a: { __isDate: true, __isoString: 'text' }, b: 1 } },
		{
			label: 'a boxed primitive marker key',
			$json: { a: { __isBoxedPrimitive: 'string', __value: 'text' }, b: 1 },
		},
		{ label: 'a metadata key', $json: { __isObject: true, __keys: ['x'], __length: 3 } },
		{ label: 'a __proto__ key', $json: JSON.parse('{"__proto__": {"a": 1}, "b": 2}') as object },
		{ label: 'a marker key as text', $json: { text: '__isDate', b: 1 } },
		{ label: 'a Date', $json: { at: new Date(0), b: 1 } },
		{ label: 'undefined', $json: { a: undefined, list: [undefined, 1] } },
		{ label: 'NaN', $json: { nan: NaN, b: 1 } },
		{ label: 'an escape key', $json: { __isEscaped: 1, b: 2 } },
	])('returns a small item with $label as the same data', async ({ $json }) => {
		const bridge = await newBridge();

		expect(bridge.execute('return this.$json;', { $json })).toStrictEqual($json);
	});

	it('reads a host symbol as undefined and frees the runtime', async () => {
		const bridge = await newBridge();

		expect(bridge.execute('return this.$json.sym;', { $json: { sym: Symbol('s') } })).toBe(
			undefined,
		);
		await expect(bridge.dispose()).resolves.toBeUndefined();
	});

	it('should free the data of a finished call while the bridge is alive', async () => {
		const bridge = await newBridge();
		let data: { $json: { value: number } } | undefined = { $json: { value: 42 } };
		const dataRef = new WeakRef(data);
		expect(bridge.execute('return this.$json.value', data)).toBe(42);
		data = undefined;

		await collectGarbage();

		expect(dataRef.deref()).toBeUndefined();
	});

	it.each([2, 3])(
		'should free the data of a call whose callback %i fails to build',
		async (failingCall) => {
			const bridge = await newBridge();
			overrideNewFunction(bridge, (call, build) => {
				if (call === failingCall) throw new Error('newFunction failed');
				return build();
			});
			let data: { $json: { value: number } } | undefined = { $json: { value: 42 } };
			const dataRef = new WeakRef(data);
			expect(() => bridge.execute('return 1', data!)).toThrow('newFunction failed');
			data = undefined;

			await collectGarbage();

			expect(dataRef.deref()).toBeUndefined();
		},
	);

	it('should keep the build error when a built callback fails to dispose', async () => {
		const bridge = await newBridge();
		overrideNewFunction(bridge, (call, build) => {
			if (call === 3) throw new Error('newFunction failed');
			return call === 1 ? failDispose(build()) : build();
		});

		expect(() => bridge.execute('return 1', { $json: { value: 42 } })).toThrow(
			'newFunction failed',
		);
	});

	it('should free the data of a call whose callback fails to dispose', async () => {
		const bridge = await newBridge();
		overrideNewFunction(bridge, (call, build) => (call === 3 ? failDispose(build()) : build()));
		let data: { $json: { value: number } } | undefined = { $json: { value: 42 } };
		const dataRef = new WeakRef(data);
		try {
			bridge.execute('return 1', data!);
		} catch {
			// This test checks only that the data is freed, not which outcome the call has.
		}
		data = undefined;

		await collectGarbage();

		expect(dataRef.deref()).toBeUndefined();
	});

	it('should return an error from a callback that runs after its call finished', async () => {
		const bridge = await newBridge();
		expect(() =>
			bridge.execute(
				'globalThis.__getValueAtPath = __getValueAtPathImpl; throw new Error("boom")',
				{ $json: { value: 42 } },
			),
		).toThrow('boom');

		expect(
			bridge.execute('return globalThis.__getValueAtPath(["$json", "value"])', {}),
		).toMatchObject({
			__isError: true,
			message: 'Host callback called after its expression finished',
		});
	});
});

async function readRuntimeBundle(): Promise<string> {
	let dir = __dirname;
	while (dir !== path.dirname(dir)) {
		try {
			return await readFile(path.join(dir, 'dist', 'bundle', 'runtime.iife.js'), 'utf-8');
		} catch {}
		dir = path.dirname(dir);
	}
	throw new Error('runtime bundle not found for test setup');
}

describe('ExpressionEvaluator on QuickJS after native stack overflows', () => {
	it('should keep evaluating in later executions', async () => {
		const evaluator = new ExpressionEvaluator({
			createBridge: () => new QuickJsBridge({ timeout: 5000 }),
			maxCodeCacheSize: 16,
			poolSize: 1,
		});
		await evaluator.initialize();

		try {
			for (let i = 0; i < 12; i++) {
				const execution = {};
				await evaluator.acquire(execution);
				// A pooled bridge built on a retired module before its overflow keeps
				// that module's lower stack, so the QuickJS check can fire first.
				expect(() =>
					evaluator.evaluate('{{ JSON.parse($json.deep).length }}', deepData, execution),
				).toThrow(/Maximum call stack size exceeded|stack overflow/);
				await expect(evaluator.release(execution)).resolves.toBeUndefined();
				await evaluator.waitForReplenishment();
			}

			const execution = {};
			await evaluator.acquire(execution);
			expect(evaluator.evaluate('{{ $json.a + 1 }}', { $json: { a: 1 } }, execution)).toBe(2);
			await evaluator.release(execution);
		} finally {
			await evaluator.dispose();
		}
	});
});

describe('QuickJsBridge string transfer', () => {
	let bridge: QuickJsBridge;

	beforeAll(async () => {
		bridge = new QuickJsBridge({ timeout: 5000 });
		await bridge.initialize();
	});

	afterAll(async () => {
		await bridge.dispose();
	});

	it('should return a string that contains NUL characters', () => {
		expect(bridge.execute('return "x\\u0000y\\u0000";', {})).toBe('x\0y\0');
	});

	it('should read a data string that contains NUL characters', () => {
		const data = { $json: { s: '\0x\0y' } };

		expect(bridge.execute('return this.$json.s.length;', data)).toBe(4);
		expect(bridge.execute('return this.$json.s;', data)).toBe('\0x\0y');
	});

	it('should read a data string that contains a lone surrogate', () => {
		const codeUnitsOf = (s: string) =>
			bridge.execute(
				'return Array.from({ length: this.$json.s.length }, (_, i) => this.$json.s.charCodeAt(i));',
				{ $json: { s } },
			);

		expect(codeUnitsOf('\ud800x')).toEqual([0xd800, 0x78]);
		expect(codeUnitsOf('x\udc00')).toEqual([0x78, 0xdc00]);
		expect(codeUnitsOf('\udc00\ud800')).toEqual([0xdc00, 0xd800]);
		expect(codeUnitsOf('x\ud800\ud800y')).toEqual([0x78, 0xd800, 0xd800, 0x79]);
		expect(codeUnitsOf('😀')).toEqual([0xd83d, 0xde00]);
	});

	it('should pass strings that contain NUL characters to Intl', () => {
		expect(
			bridge.execute('return new Intl.Collator("en").compare("\\u0000a", "\\u0000b");', {}),
		).toBe(-1);
	});

	it('should pass Date arguments to Intl', () => {
		expect(
			bridge.execute(
				'return new Intl.Collator("en").compare(new Date(0), new Date(5 * 86400000));',
				{},
			),
		).toBe(-1);
	});

	it('should return a lone surrogate followed by a NUL character unchanged', () => {
		expect(bridge.execute('return "\\ud800\\u0000x";', {})).toBe('\ud800\0x');
	});

	it('should report the memory limit during a string read and keep the engine running', async () => {
		const small = new QuickJsBridge({ timeout: 5000, memoryLimit: 32 });
		await small.initialize();
		try {
			expect(() => small.execute('return "\\u0000".repeat(8_000_000);', {})).toThrow(
				MemoryLimitError,
			);
			expect(small.execute('return 1 + 1;', {})).toBe(2);
		} finally {
			await small.dispose();
		}
	});

	it('should report the memory limit during a string read for Intl in a template expression', async () => {
		const evaluator = new ExpressionEvaluator({
			createBridge: () => new QuickJsBridge({ timeout: 5000, memoryLimit: 32 }),
			maxCodeCacheSize: 16,
			poolSize: 1,
		});
		await evaluator.initialize();
		const execution = {};
		await evaluator.acquire(execution);
		try {
			const expression = '{{ new Intl.Collator("en").compare("\\u0000".repeat(8_000_000), "a") }}';
			expect(() => evaluator.evaluate(expression, {}, execution)).toThrow(MemoryLimitError);
			expect(evaluator.evaluate('{{ 1 + 1 }}', {}, execution)).toBe(2);
		} finally {
			await evaluator.release(execution);
			await evaluator.dispose();
		}
	});

	it('should return a lone surrogate unchanged', () => {
		expect(bridge.execute('return "\\ud83d\\ude00"[0];', {})).toBe('\ud83d');
	});

	it('should return a string with NUL characters when an expression adds toJSON hooks', async () => {
		const hooked = new QuickJsBridge({ timeout: 5000 });
		await hooked.initialize();
		try {
			const code = `
				Array.prototype.toJSON = function () { return ['changed']; };
				String.prototype.toJSON = function () { return 'changed'; };
				return "x\\u0000y";
			`;
			expect(hooked.execute(code, {})).toBe('x\0y');
		} finally {
			await hooked.dispose();
		}
	});

	it('should read a string without NUL characters in one dump', () => {
		const callFunction = vi.spyOn(QuickJSContext.prototype, 'callFunction');
		try {
			expect(bridge.execute('return "abc";', {})).toBe('abc');
			expect(callFunction).toHaveBeenCalledTimes(1);
		} finally {
			callFunction.mockRestore();
		}
	});
});

describe('QuickJsBridge cycle guard', () => {
	it('should return values nested 400 levels deep in Map, Set and class instances', async () => {
		const bridge = new QuickJsBridge({ timeout: 5000 });
		await bridge.initialize();
		try {
			const depthOf = (value: unknown, next: (current: unknown) => unknown): number => {
				let depth = 0;
				for (let current = next(value); current !== undefined; current = next(current)) {
					depth++;
				}
				return depth;
			};

			const maps = bridge.execute(
				'let o = new Map([["v", 1]]); for (let i = 0; i < 400; i++) { o = new Map([["n", o]]); } return o;',
				{},
			);
			expect(depthOf(maps, (current) => (current as Map<string, unknown>).get('n'))).toBe(400);

			const sets = bridge.execute(
				'let o = new Set(); for (let i = 0; i < 400; i++) { o = new Set([o]); } return o;',
				{},
			);
			expect(depthOf(sets, (current) => [...(current as Set<unknown>)][0])).toBe(400);

			const instances = bridge.execute(
				'function Node(next) { this.next = next; } let o = new Node(); for (let i = 0; i < 400; i++) { o = new Node(o); } return o;',
				{},
			);
			expect(depthOf(instances, (current) => (current as { next?: unknown }).next)).toBe(400);
		} finally {
			await bridge.dispose();
		}
	});

	it('should return cyclic values inside Map, Set and Error without breaking or failing dispose', async () => {
		const bridge = new QuickJsBridge({ timeout: 5000 });
		await bridge.initialize();
		try {
			const selfMap = bridge.execute('const m = new Map(); m.set("self", m); return m;', {}) as Map<
				string,
				unknown
			>;
			expect(selfMap.get('self')).toBe(selfMap);

			const selfSet = bridge.execute(
				'const s = new Set(); s.add(s); return s;',
				{},
			) as Set<unknown>;
			expect(selfSet.has(selfSet)).toBe(true);

			const errInMap = bridge.execute(
				'const e = new Error("loop"); e.self = e; return new Map([["e", e]]);',
				{},
			) as Map<string, Error & { self: unknown }>;
			const innerErr = errInMap.get('e')!;
			expect(innerErr).toBeInstanceOf(Error);
			expect(innerErr.self).toBe(innerErr);

			const errWithMap = bridge.execute(
				'const e = new Error("loop"); const m = new Map([["e", e]]); e.m = m; return e;',
				{},
			) as Error & { m: Map<string, Error & { m: unknown }> };
			expect(errWithMap).toBeInstanceOf(Error);
			expect(errWithMap.m.get('e')).toBe(errWithMap);
			expect(errWithMap.m.get('e')?.m).toBe(errWithMap.m);

			// The runtime stays healthy for subsequent expressions on the same bridge.
			expect(bridge.execute('return 1 + 1;', {})).toBe(2);
		} finally {
			await expect(bridge.dispose()).resolves.toBeUndefined();
		}
	});

	it('should preserve Error identity across Map, Set, nested objects, and cause cycles', async () => {
		const bridge = new QuickJsBridge({ timeout: 5000 });
		await bridge.initialize();
		try {
			const errAsMapKey = bridge.execute(
				'const e = new Error("key"); const m = new Map([[e, 42]]); e.m = m; return e;',
				{},
			) as Error & { m: Map<unknown, number> };
			expect(errAsMapKey).toBeInstanceOf(Error);
			expect(errAsMapKey.m.get(errAsMapKey)).toBe(42);

			const errWithSet = bridge.execute(
				'const e = new Error("set"); const s = new Set([e]); e.s = s; return e;',
				{},
			) as Error & { s: Set<unknown> };
			expect(errWithSet).toBeInstanceOf(Error);
			expect(errWithSet.s.has(errWithSet)).toBe(true);
			expect(errWithSet.s.size).toBe(1);

			const nestedErr = bridge.execute(
				'const e = new Error("nested"); const m = new Map([["e", e]]); e.m = m; return { e };',
				{},
			) as { e: Error & { m: Map<string, unknown> } };
			expect(nestedErr.e).toBeInstanceOf(Error);
			expect(nestedErr.e.m.get('e')).toBe(nestedErr.e);

			const mapBeforeErr = bridge.execute(
				`
				const e = new TypeError("before");
				e.code = 42;
				Object.defineProperty(e, "hidden", { value: 9 });
				const m = new Map([["e", e]]);
				e.m = m;
				return { m, e };
				`,
				{},
			) as { m: Map<string, unknown>; e: TypeError & { code: number; m: Map<string, unknown> } };
			expect(mapBeforeErr.e).toBeInstanceOf(TypeError);
			expect(mapBeforeErr.m.get('e')).toBe(mapBeforeErr.e);
			expect(mapBeforeErr.e.m).toBe(mapBeforeErr.m);
			expect(mapBeforeErr.e.code).toBe(42);
			expect(Object.getOwnPropertyDescriptor(mapBeforeErr.e, 'hidden')).toMatchObject({
				value: 9,
				enumerable: false,
			});
			expect(typeof mapBeforeErr.e.stack).toBe('string');

			const causeCycle = bridge.execute(
				`
				const inner = new Error("inner");
				const outer = new Error("outer", { cause: inner });
				inner.m = new Map([["outer", outer], ["inner", inner]]);
				return outer;
				`,
				{},
			) as Error & { cause: Error & { m: Map<string, unknown> } };
			expect(causeCycle.cause.m.get('outer')).toBe(causeCycle);
			expect(causeCycle.cause.m.get('inner')).toBe(causeCycle.cause);

			const repeatedErr = bridge.execute(
				'const e = new Error("shared"); const m = new Map([["e", e]]); e.m = m; return { a: e, b: e };',
				{},
			) as { a: Error & { m: Map<string, unknown> }; b: Error };
			expect(repeatedErr.a).toBe(repeatedErr.b);
			expect(repeatedErr.a.m.get('e')).toBe(repeatedErr.a);

			const errWithToJson = bridge.execute(
				'const e = new Error("json"); e.m = new Map([["e", e]]); e.toJSON = function() { return { m: this.m }; }; return e;',
				{},
			) as Error & { m: Map<string, unknown>; toJSON: () => { m: Map<string, unknown> } };
			expect(errWithToJson.m.get('e')).toBe(errWithToJson);
			expect(errWithToJson.toJSON().m.get('e')).toBe(errWithToJson);
		} finally {
			await expect(bridge.dispose()).resolves.toBeUndefined();
		}
	});

	it('should keep own __proto__ keys on cyclic objects inside a Map', async () => {
		const bridge = new QuickJsBridge({ timeout: 5000 });
		await bridge.initialize();
		try {
			const result = bridge.execute(
				'const o = JSON.parse(\'{"__proto__":{"flag":1},"kept":2}\'); o.self = o; return new Map([["k", o]]);',
				{},
			) as Map<string, Record<string, unknown>>;
			const value = result.get('k')!;

			expect(Object.hasOwn(value, '__proto__')).toBe(true);
			expect(Object.getOwnPropertyDescriptor(value, '__proto__')?.value).toStrictEqual({ flag: 1 });
			expect(value.flag).toBeUndefined();
			expect(value.kept).toBe(2);
			expect(value.self).toBe(value);
		} finally {
			await bridge.dispose();
		}
	});

	it('should keep cyclic Map and Set transfer working after built-in method replacements', async () => {
		const bridge = new QuickJsBridge({ timeout: 5000 });
		await bridge.initialize();
		try {
			bridge.execute(
				`
				const m = new Map();
				m.set("self", m);
				const s = new Set();
				s.add(s);
				globalThis.__cyclicMap = m;
				globalThis.__cyclicSet = s;
				Map.prototype.get.call = function () { throw new Error("replaced"); };
				Map.prototype.get = function () { throw new Error("replaced"); };
				Map.prototype.set = function () { throw new Error("replaced"); };
				Map.prototype.forEach = function () { throw new Error("replaced"); };
				Set.prototype.add = function () { throw new Error("replaced"); };
				Set.prototype.forEach = function () { throw new Error("replaced"); };
				return "ok";
				`,
				{},
			);

			const mapResult = bridge.execute('return globalThis.__cyclicMap;', {}) as Map<
				string,
				unknown
			>;
			const setResult = bridge.execute('return globalThis.__cyclicSet;', {}) as Set<unknown>;

			expect(mapResult).toBeInstanceOf(Map);
			expect(mapResult.get('self')).toBe(mapResult);
			expect(setResult).toBeInstanceOf(Set);
			expect(setResult.has(setResult)).toBe(true);
		} finally {
			await expect(bridge.dispose()).resolves.toBeUndefined();
		}
	});

	it('should keep a value that a Map holds twice after an array iterator replacement', async () => {
		const bridge = new QuickJsBridge({ timeout: 5000 });
		await bridge.initialize();
		try {
			const result = bridge.execute(
				`
				const date = new Date(0);
				const m = new Map();
				m.set("a", date);
				m.set("b", date);
				Array.prototype[Symbol.iterator] = function () {
					return { next: () => ({ done: true }) };
				};
				return m;
				`,
				{},
			) as Map<string, unknown>;

			expect(result.get('a')).toBeInstanceOf(Date);
			expect(result.get('b')).toBe(result.get('a'));
		} finally {
			await bridge.dispose();
		}
	});

	it('should keep boxed values in a Map after an array iterator replacement', async () => {
		const bridge = new QuickJsBridge({ timeout: 5000 });
		await bridge.initialize();
		try {
			const result = bridge.execute(
				`
				const m = new Map();
				m.set("number", new Number(7));
				m.set("string", new String("x"));
				m.set("boolean", new Boolean(true));
				m.set("bigint", Object(10n));
				Array.prototype[Symbol.iterator] = function () {
					return { next: () => ({ done: true }) };
				};
				return m;
				`,
				{},
			) as Map<string, object>;

			expect(result.get('number')?.valueOf()).toBe(7);
			expect(result.get('string')?.valueOf()).toBe('x');
			expect(result.get('boolean')?.valueOf()).toBe(true);
			expect(result.get('bigint')?.valueOf()).toBe(10n);
		} finally {
			await bridge.dispose();
		}
	});

	it('should return objects and errors after an array iterator replacement', async () => {
		const bridge = new QuickJsBridge({ timeout: 5000 });
		await bridge.initialize();
		try {
			const result = bridge.execute(
				`
					const error = new TypeError("bad");
					error.code = 5;
					const result = { plain: { a: 1, b: [1, 2] }, error };
					Array.prototype[Symbol.iterator] = function () {
						return { next: () => ({ done: true }) };
					};
					return result;
				`,
				{},
			) as { plain: unknown; error: Error & { code?: number } };

			expect(result.plain).toEqual({ a: 1, b: [1, 2] });
			expect(result.error).toBeInstanceOf(TypeError);
			expect(result.error.message).toBe('bad');
			expect(result.error.code).toBe(5);
		} finally {
			await bridge.dispose();
		}
	});

	it('should return undefined for host-call plain object and array cycles without breaking the runtime', async () => {
		const evaluator = new ExpressionEvaluator({
			createBridge: () => new QuickJsBridge({ timeout: 5000 }),
			maxCodeCacheSize: 16,
			poolSize: 1,
		});
		await evaluator.initialize();
		const execution = {};
		await evaluator.acquire(execution);

		try {
			const cyc: Record<string, unknown> = { a: 1 };
			cyc.self = cyc;
			const arr: unknown[] = [1];
			arr.push(arr);
			const keyedByItem = Object.assign([1] as unknown[], { tag: 'x' });
			keyedByItem.push(keyedByItem);
			const keyedByProp = Object.assign([1] as unknown[], { self: null as unknown });
			keyedByProp.self = keyedByProp;
			const escapedCyc: Record<string, unknown> = { __isMap: true, __entries: [] };
			escapedCyc.self = escapedCyc;
			const escapedBoxedCyc: Record<string, unknown> = {
				__isBoxedPrimitive: 'string',
				__value: 'fake',
			};
			escapedBoxedCyc.self = escapedBoxedCyc;
			const mapWithCyc = new Map<string, unknown>([['k', cyc]]);

			const plainObjData = { $input: { first: () => ({ json: { cyc, n: 5 } }) } };
			const plainArrData = { $input: { first: () => ({ json: { arr, n: 5 } }) } };
			const keyedItemData = { $input: { first: () => ({ json: { keyedByItem } }) } };
			const keyedPropData = { $input: { first: () => ({ json: { keyedByProp } }) } };
			const escapedData = { $input: { first: () => ({ json: { escapedCyc } }) } };
			const escapedBoxedData = { $input: { first: () => ({ json: { escapedBoxedCyc } }) } };
			const mixedData = { $input: { first: () => ({ json: { mapWithCyc, cyc } }) } };

			expect(evaluator.evaluate('{{ $input.first().json.cyc }}', plainObjData, execution)).toBe(
				undefined,
			);
			expect(evaluator.evaluate('{{ $input.first().json }}', plainObjData, execution)).toBe(
				undefined,
			);
			expect(evaluator.evaluate('{{ $input.first().json.arr }}', plainArrData, execution)).toBe(
				undefined,
			);
			expect(
				evaluator.evaluate('{{ $input.first().json.keyedByItem }}', keyedItemData, execution),
			).toBe(undefined);
			expect(
				evaluator.evaluate('{{ $input.first().json.keyedByProp }}', keyedPropData, execution),
			).toBe(undefined);
			expect(
				evaluator.evaluate('{{ $input.first().json.escapedCyc }}', escapedData, execution),
			).toBe(undefined);
			expect(
				evaluator.evaluate(
					'{{ $input.first().json.escapedBoxedCyc }}',
					escapedBoxedData,
					execution,
				),
			).toBe(undefined);
			expect(evaluator.evaluate('{{ $input.first().json.cyc }}', mixedData, execution)).toBe(
				undefined,
			);

			// The runtime did not break or restart, so the next expression runs immediately.
			expect(evaluator.evaluate('{{ 1 + 1 }}', {}, execution)).toBe(2);
		} finally {
			await evaluator.release(execution);
			await expect(evaluator.dispose()).resolves.toBeUndefined();
		}
	});

	it('should still transfer host-call shared acyclic values and Map-mediated cycles', async () => {
		const bridge = new QuickJsBridge({ timeout: 5000 });
		await bridge.initialize();
		try {
			const sharedObj = { a: 1, bad: NaN };
			const sharedArr = [1, 2];
			const sharedKeyed = Object.assign([1], { tag: 'x' });
			const sharedDate = new Date('2025-01-01T00:00:00.000Z');
			const sharedBoxedStr = Object('ab') as object;
			const sharedBoxedNum = Object(-0) as object;
			const sharedBoxedBool = Object(false) as object;
			const sharedBoxedBigInt = Object(1n) as object;
			const sharedEscaped = { __isMap: true, keep: 3 };
			const objWithMapCycle: Record<string, unknown> = { a: 1 };
			objWithMapCycle.m = new Map([['o', objWithMapCycle]]);

			const json = {
				o1: sharedObj,
				o2: sharedObj,
				a1: sharedArr,
				a2: sharedArr,
				k1: sharedKeyed,
				k2: sharedKeyed,
				d1: sharedDate,
				d2: sharedDate,
				bs1: sharedBoxedStr,
				bs2: sharedBoxedStr,
				bn1: sharedBoxedNum,
				bn2: sharedBoxedNum,
				bb1: sharedBoxedBool,
				bb2: sharedBoxedBool,
				bi1: sharedBoxedBigInt,
				bi2: sharedBoxedBigInt,
				e1: sharedEscaped,
				e2: sharedEscaped,
				objWithMapCycle,
			};
			const data = { $input: { first: () => ({ json }) } };

			const shared = bridge.execute(
				`
				const j = this.$input.first().json;
				return {
					sameObj: j.o1 === j.o2 && Number.isNaN(j.o1.bad),
					sameArr: j.a1 === j.a2,
					sameKeyed: j.k1 === j.k2 && j.k1.tag === 'x',
					sameDate: j.d1 === j.d2 && j.d1 instanceof Date,
					sameBoxedStr: j.bs1 === j.bs2 && j.bs1 instanceof String && j.bs1.valueOf() === 'ab',
					sameBoxedNum: j.bn1 === j.bn2 && j.bn1 instanceof Number && Object.is(j.bn1.valueOf(), -0),
					sameBoxedBool: j.bb1 === j.bb2 && j.bb1 instanceof Boolean && j.bb1.valueOf() === false,
					sameBoxedBigInt: j.bi1 === j.bi2 && j.bi1 instanceof BigInt && j.bi1.valueOf() === 1n,
					sameEscaped: j.e1 === j.e2 && j.e1.__isMap === true && j.e1.keep === 3,
				};
				`,
				data,
			);
			expect(shared).toStrictEqual({
				sameObj: true,
				sameArr: true,
				sameKeyed: true,
				sameDate: true,
				sameBoxedStr: true,
				sameBoxedNum: true,
				sameBoxedBool: true,
				sameBoxedBigInt: true,
				sameEscaped: true,
			});

			const cyclicThroughMap = bridge.execute(
				'return this.$input.first().json.objWithMapCycle;',
				data,
			) as { a: number; m: Map<string, unknown> };
			expect(cyclicThroughMap.a).toBe(1);
			expect(cyclicThroughMap.m).toBeInstanceOf(Map);
			expect(cyclicThroughMap.m.get('o')).toBeDefined();
		} finally {
			await expect(bridge.dispose()).resolves.toBeUndefined();
		}
	});

	it('should reject a cyclic plain object or array extracted from a host Map or Set without breaking the runtime', async () => {
		const evaluator = new ExpressionEvaluator({
			createBridge: () => new QuickJsBridge({ timeout: 5000 }),
			maxCodeCacheSize: 16,
			poolSize: 1,
		});
		await evaluator.initialize();
		const execution = {};
		await evaluator.acquire(execution);

		try {
			const cycObj: Record<string, unknown> = { a: 1 };
			cycObj.self = cycObj;
			const cycArr: unknown[] = [1];
			cycArr.push(cycArr);
			const json = {
				mapWithObj: new Map<string, unknown>([['k', cycObj]]),
				setWithArr: new Set<unknown>([cycArr]),
			};
			const hostData = { $input: { first: () => ({ json }) } };

			// Returning the collection itself or reading acyclic fields still works.
			const returnedMap = evaluator.evaluate(
				'{{ $input.first().json.mapWithObj }}',
				hostData,
				execution,
			) as Map<string, Record<string, unknown>>;
			expect(returnedMap.get('k')).toBeDefined();
			expect(returnedMap.get('k')?.self).toBe(returnedMap.get('k'));
			expect(
				evaluator.evaluate('{{ $input.first().json.mapWithObj.get("k").a }}', hostData, execution),
			).toBe(1);

			for (const expr of [
				'{{ $input.first().json.mapWithObj.get("k") }}',
				'{{ $input.first()?.json.mapWithObj.get("k") }}',
				'{{ [...$input.first().json.setWithArr][0] }}',
			]) {
				let thrown: unknown;
				try {
					evaluator.evaluate(expr, hostData, execution);
				} catch (error) {
					thrown = error;
				}
				expect(thrown).toBeInstanceOf(Error);
				expect(thrown).not.toBeInstanceOf(HostCallError);
				expect((thrown as Error).message).toMatch(/Maximum call stack size exceeded/);
				// The runtime stays healthy for the next expression (no RuntimeRestartingError).
				expect(evaluator.evaluate('{{ 1 + 1 }}', {}, execution)).toBe(2);
			}
		} finally {
			await evaluator.release(execution);
			await expect(evaluator.dispose()).resolves.toBeUndefined();
		}
	});

	it('should not keep seen-map state across vm.dump() for large plain-object arrays near the memory limit', async () => {
		const bridge = new QuickJsBridge({ timeout: 30_000, memoryLimit: 16 });
		await bridge.initialize();
		try {
			const result = bridge.execute(
				'return Array.from({ length: 205_000 }, (_, i) => ({ i }));',
				{},
			);
			expect(Array.isArray(result)).toBe(true);
			expect((result as Array<{ i: number }>).length).toBe(205_000);
			expect((result as Array<{ i: number }>)[204_999]).toStrictEqual({ i: 204_999 });
		} finally {
			await expect(bridge.dispose()).resolves.toBeUndefined();
		}
	});

	it('should keep fields on mutually referencing Errors returned at separate positions', async () => {
		const bridge = new QuickJsBridge({ timeout: 5000 });
		await bridge.initialize();
		try {
			const mutual = bridge.execute(
				`
				const a = new Error('a');
				const b = new Error('b');
				a.child = b;
				b.parent = a;
				return [a, b];
				`,
				{},
			) as [
				Error & { child?: Error & { parent?: unknown } },
				Error & { parent?: Error & { child?: unknown } },
			];
			expect(mutual[0]).toBeInstanceOf(Error);
			expect(mutual[0].message).toBe('a');
			expect(mutual[0].child?.message).toBe('b');
			expect(mutual[0].child?.parent).toBeUndefined();
			expect(mutual[1]).toBeInstanceOf(Error);
			expect(mutual[1].message).toBe('b');
			expect(mutual[1].parent).toBeInstanceOf(Error);
			expect(mutual[1].parent?.message).toBe('a');
			expect(mutual[1].parent?.child).toBeUndefined();

			const causeLoop = bridge.execute(
				`
				const c = new Error('c');
				const e = new Error('e', { cause: c });
				c.back = e;
				return [e, c];
				`,
				{},
			) as [
				Error & { cause?: Error & { back?: unknown } },
				Error & { back?: Error & { cause?: unknown } },
			];
			expect(causeLoop[0].cause?.message).toBe('c');
			expect(causeLoop[0].cause?.back).toBeUndefined();
			expect(causeLoop[1].back).toBeInstanceOf(Error);
			expect(causeLoop[1].back?.message).toBe('e');
			expect(causeLoop[1].back?.cause).toBeUndefined();

			const threeCycle = bridge.execute(
				`
				const a = new Error('a');
				const b = new Error('b');
				const c = new Error('c');
				a.next = b;
				b.next = c;
				c.next = a;
				return [a, b, c];
				`,
				{},
			) as Array<Error & { next?: Error & { next?: Error } }>;
			expect(threeCycle[0].next?.next?.message).toBe('c');
			expect(threeCycle[1].next?.next?.message).toBe('a');
			expect(threeCycle[2].next?.next?.message).toBe('b');

			const siblingDiamond = bridge.execute(
				`
				const a = new Error('a');
				const b = new Error('b');
				const c = new Error('c');
				const d = new Error('d');
				a.first = { b };
				b.d = d;
				d.back = b;
				a.second = c;
				c.d = d;
				return [a, c];
				`,
				{},
			) as [
				Error & { first: { b: Error & { d: Error } }; second: Error & { d: Error } },
				Error & { d: Error & { back?: Error } },
			];
			expect(siblingDiamond[0].first.b.d).toBe(siblingDiamond[0].second.d);
			expect(siblingDiamond[1].d.back?.message).toBe('b');
		} finally {
			await expect(bridge.dispose()).resolves.toBeUndefined();
		}
	});
});
