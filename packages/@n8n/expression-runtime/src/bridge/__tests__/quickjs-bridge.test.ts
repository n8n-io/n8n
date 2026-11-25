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
