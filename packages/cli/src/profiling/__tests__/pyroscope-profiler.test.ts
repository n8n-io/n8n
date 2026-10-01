import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import Pyroscope from '@pyroscope/nodejs';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { PyroscopeProfiler } from '@/profiling/pyroscope-profiler';

vi.mock('@pyroscope/nodejs', () => ({
	default: { init: vi.fn(), start: vi.fn() },
}));

describe('PyroscopeProfiler', () => {
	const instanceSettings = mock<InstanceSettings>({ instanceType: 'main' });
	const logger = mockLogger();

	const createProfiler = (pyroscopeUrl: string) =>
		new PyroscopeProfiler(
			mock<GlobalConfig>({ profiling: { pyroscopeUrl } }),
			instanceSettings,
			logger,
		);

	beforeEach(() => vi.clearAllMocks());

	test('should not start profiling when no Pyroscope URL is set', async () => {
		await createProfiler('').start();

		expect(Pyroscope.init).not.toHaveBeenCalled();
		expect(Pyroscope.start).not.toHaveBeenCalled();
	});

	test('should push profiles to the configured Pyroscope URL', async () => {
		await createProfiler('http://pyroscope:4040').start();

		expect(Pyroscope.init).toHaveBeenCalledWith(
			expect.objectContaining({
				serverAddress: 'http://pyroscope:4040',
				appName: 'n8n',
				tags: expect.objectContaining({ instanceType: 'main' }),
			}),
		);
		expect(Pyroscope.start).toHaveBeenCalled();
	});

	test('should log a warning and continue when profiling fails to start', async () => {
		vi.mocked(Pyroscope.start).mockImplementationOnce(() => {
			throw new Error('native module missing');
		});

		await expect(createProfiler('http://pyroscope:4040').start()).resolves.toBeUndefined();

		expect(logger.warn).toHaveBeenCalledWith('Failed to start Pyroscope profiling', {
			error: expect.any(Error),
		});
	});
});
