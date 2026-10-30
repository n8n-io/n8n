import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ExpressionEvaluator } from '../../evaluator/expression-evaluator';
import type { BridgeConfig, RuntimeBridge } from '../../types';
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

	it('should report that the engine restarts while the replacement module loads', async () => {
		const bridge = await newBridge();
		expect(() => bridge.execute(OVERFLOW, deepData)).toThrow(NATIVE_OVERFLOW);

		expect(() => bridge.execute('return 1 + 1;', {})).toThrow(/restarting after an earlier error/);

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
			build: () => import('quickjs-emscripten').QuickJSHandle,
		) => import('quickjs-emscripten').QuickJSHandle,
	): void {
		const vm = bridge['vm']!;
		const newFunction = vm.newFunction.bind(vm);
		let calls = 0;
		vm.newFunction = ((...args: Parameters<typeof newFunction>) =>
			override(++calls, () => newFunction(...args))) as typeof vm.newFunction;
	}

	/** Makes `handle.dispose()` free the handle and then throw. */
	function failDispose(
		handle: import('quickjs-emscripten').QuickJSHandle,
	): import('quickjs-emscripten').QuickJSHandle {
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
