import { afterEach, describe, it, expect, vi } from 'vitest';
import { IsolatedVmBridge } from '../isolated-vm-bridge';
import type { Logger } from '../../types';

type CompileScript = IsolatedVmBridge['isolate']['compileScript'];

/**
 * isolated-vm's native Isolate is frozen, so vi.spyOn cannot patch it. Swap
 * the bridge's isolate for a Proxy that records compileScript calls and
 * forwards everything else to the real isolate.
 */
function spyOnCompileScript(bridge: IsolatedVmBridge) {
	const isolate = bridge['isolate'];
	const spy = vi.fn<CompileScript>((...args) => isolate.compileScript(...args));
	bridge['isolate'] = new Proxy(isolate, {
		get(target, key) {
			if (key === 'compileScript') return spy;
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
		// The cached data lives in module state, so these tests depend on their
		// order: the first bridge in this file to initialize with compileCache
		// produces it, every later one consumes it.
		it('produces cached data on the first compile and consumes it on the next', async () => {
			const first = new IsolatedVmBridge({ compileCache: true });
			const firstCompile = spyOnCompileScript(first);
			await first.initialize();
			expect(firstCompile).toHaveBeenCalledWith(expect.any(String), { produceCachedData: true });
			expect(first.execute('return typeof DateTime !== "undefined" && 40 + 2', {})).toBe(42);
			await first.dispose();

			const second = new IsolatedVmBridge({ compileCache: true });
			const secondCompile = spyOnCompileScript(second);
			await second.initialize();
			expect(secondCompile).toHaveBeenCalledWith(expect.any(String), {
				cachedData: expect.anything(),
			});
			expect(second.execute('return typeof DateTime !== "undefined" && 40 + 2', {})).toBe(42);
			await second.dispose();
		});

		it('initializes synchronously with compileCache on', () => {
			const bridge = new IsolatedVmBridge({ compileCache: true });
			bridge.initializeSync!();
			const result = bridge.execute('return typeof extend === "function"', {});
			expect(result).toBe(true);
			void bridge.dispose();
		});
	});
});
