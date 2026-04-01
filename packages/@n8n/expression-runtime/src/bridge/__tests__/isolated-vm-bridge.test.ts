import { describe, it, expect, vi } from 'vitest';
import { IsolatedVmBridge } from '../isolated-vm-bridge';
import type { Logger } from '../../types';

describe('IsolatedVmBridge', () => {
	describe('logger integration', () => {
		it('should use logger instead of console.log when debug is enabled', async () => {
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

			expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('[IsolatedVmBridge]'));
			expect(consoleSpy).not.toHaveBeenCalled();
			consoleSpy.mockRestore();
		});
	});
});
