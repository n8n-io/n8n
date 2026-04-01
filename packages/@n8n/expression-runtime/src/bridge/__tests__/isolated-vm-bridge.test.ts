import { describe, it, expect, vi } from 'vitest';
import { IsolatedVmBridge } from '../isolated-vm-bridge';
import type { Logger } from '../../types';

describe('IsolatedVmBridge', () => {
	describe('logger integration', () => {
		it('should call logger.debug instead of console.log when debug is enabled', async () => {
			const logger: Logger = {
				error: vi.fn(),
				warn: vi.fn(),
				info: vi.fn(),
				debug: vi.fn(),
			};

			const bridge = new IsolatedVmBridge({ debug: true, logger });
			await bridge.initialize();

			expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('[IsolatedVmBridge]'));

			await bridge.dispose();
		});

		it('should not call console.log when a logger is provided', async () => {
			const consoleSpy = vi.spyOn(console, 'log');
			const logger: Logger = {
				error: vi.fn(),
				warn: vi.fn(),
				info: vi.fn(),
				debug: vi.fn(),
			};

			const bridge = new IsolatedVmBridge({ debug: true, logger });
			await bridge.initialize();
			await bridge.dispose();

			expect(consoleSpy).not.toHaveBeenCalled();
			consoleSpy.mockRestore();
		});
	});
});
