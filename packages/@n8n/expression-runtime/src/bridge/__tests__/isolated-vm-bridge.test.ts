import { afterEach, describe, it, expect, vi } from 'vitest';
import { IsolatedVmBridge } from '../isolated-vm-bridge';
import type { Logger } from '../../types';

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
		it('initializes and evaluates with compileCache on, across produce and consume', async () => {
			// First bridge produces the module-level cached data, second consumes it.
			for (let i = 0; i < 2; i++) {
				const bridge = new IsolatedVmBridge({ compileCache: true });
				await bridge.initialize();
				// The bundle's globals must be present when loaded via the
				// compile-cache path, same as via plain eval.
				const result = bridge.execute('return typeof DateTime !== "undefined" && 40 + 2', {});
				expect(result).toBe(42);
				await bridge.dispose();
			}
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
