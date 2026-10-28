import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { IsolatedVmBridge } from '../isolated-vm-bridge';
import type { Logger } from '../../types';

type Isolate = IsolatedVmBridge['isolate'];

/**
 * isolated-vm's native Isolate is frozen, so vi.spyOn cannot patch it. Swap
 * the bridge's isolate for a Proxy that records calls to one method and
 * forwards everything else to the real isolate.
 */
function spyOnIsolate<M extends 'compileScript' | 'compileScriptSync'>(
	bridge: IsolatedVmBridge,
	method: M,
) {
	const isolate = bridge['isolate'];
	const spy = vi.fn((...args: unknown[]) => Reflect.apply(isolate[method], isolate, args));
	bridge['isolate'] = new Proxy(isolate, {
		get(target, key) {
			if (key === method) return spy;
			// Native getters such as isDisposed reject a Proxy receiver.
			const value: unknown = Reflect.get(target, key, target);
			return typeof value === 'function' ? value.bind(target) : value;
		},
	});
	return spy;
}

describe('IsolatedVmBridge', () => {
	describe('logger integration', () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('should use logger instead of console.log', async () => {
			const consoleSpy = vi.spyOn(console, 'log');
			const logger: Logger = {
				error: vi.fn(),
				warn: vi.fn(),
				info: vi.fn(),
				debug: vi.fn(),
			};

			const bridge = new IsolatedVmBridge({ logger });
			await bridge.initialize();
			await bridge.dispose();

			expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('[IsolatedVmBridge]'));
			expect(consoleSpy).not.toHaveBeenCalled();
		});
	});

	describe('compile cache', () => {
		// The cached data lives in module state. Re-import the bridge per test so
		// each one starts with an empty cache and the produce path is exercised.
		let Bridge: typeof IsolatedVmBridge;
		beforeEach(async () => {
			vi.resetModules();
			({ IsolatedVmBridge: Bridge } = await import('../isolated-vm-bridge'));
		});

		it('produces cached data on the first compile and consumes it on the next', async () => {
			const first = new Bridge({ compileCache: true });
			const firstCompile = spyOnIsolate(first, 'compileScript');
			await first.initialize();
			expect(firstCompile).toHaveBeenCalledWith(expect.any(String), { produceCachedData: true });
			expect(first.execute('return typeof DateTime !== "undefined" && 40 + 2', {})).toBe(42);
			await first.dispose();

			const second = new Bridge({ compileCache: true });
			const secondCompile = spyOnIsolate(second, 'compileScript');
			await second.initialize();
			expect(secondCompile).toHaveBeenCalledWith(expect.any(String), {
				cachedData: expect.anything(),
			});
			expect(second.execute('return typeof DateTime !== "undefined" && 40 + 2', {})).toBe(42);
			await second.dispose();
		});

		it('initializes synchronously with compileCache on and an empty cache', () => {
			const bridge = new Bridge({ compileCache: true });
			const compile = spyOnIsolate(bridge, 'compileScriptSync');
			bridge.initializeSync!();
			// Proves the module reset: a populated cache would pass cachedData here.
			expect(compile).toHaveBeenCalledWith(expect.any(String), { produceCachedData: true });
			const result = bridge.execute('return typeof extend === "function"', {});
			expect(result).toBe(true);
			void bridge.dispose();
		});
	});

	describe('workflow data', () => {
		let bridge: IsolatedVmBridge;

		beforeEach(async () => {
			bridge = new IsolatedVmBridge();
			await bridge.initialize();
		});

		afterEach(async () => {
			await bridge.dispose();
		});

		it('should free the data of a finished call after the bridge is disposed', async () => {
			setFlagsFromString('--expose_gc');
			const gc = runInNewContext('gc') as unknown as () => void;

			let data: { $json: { value: number } } | undefined = { $json: { value: 42 } };
			const dataRef = new WeakRef(data);
			expect(bridge.execute('return this.$json.value', data)).toBe(42);
			await bridge.dispose();
			data = undefined;

			// A WeakRef keeps its target alive until the current job ends.
			await new Promise((resolve) => setTimeout(resolve, 10));
			gc();

			expect(dataRef.deref()).toBeUndefined();
		});

		it('should free the data of a call whose callbacks fail to build', async () => {
			setFlagsFromString('--expose_gc');
			const gc = runInNewContext('gc') as unknown as () => void;

			vi.spyOn(
				bridge as unknown as { createGetArrayElementRef: () => unknown },
				'createGetArrayElementRef',
			).mockImplementation(() => {
				throw new Error('Callback failed');
			});
			let data: { $json: { value: number } } | undefined = { $json: { value: 42 } };
			const dataRef = new WeakRef(data);
			expect(() => bridge.execute('return 1', data!)).toThrow('Callback failed');
			data = undefined;

			// A WeakRef keeps its target alive until the current job ends.
			await new Promise((resolve) => setTimeout(resolve, 10));
			gc();

			expect(dataRef.deref()).toBeUndefined();
		});

		it('should return an error from a callback that runs after its call failed', () => {
			expect(() =>
				bridge.execute('globalThis.__getValueAtPath = $0; throw new Error("boom")', {
					$json: { value: 42 },
				}),
			).toThrow('boom');

			expect(() =>
				bridge.execute('return globalThis.__getValueAtPath(["$json", "value"])', {}),
			).toThrow('Host callback called after its expression finished');
		});
	});
});
