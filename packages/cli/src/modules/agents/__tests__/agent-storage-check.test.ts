import type { Logger } from '@n8n/backend-common';
import type { BinaryDataConfig } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { warnIfAgentFilesAreLocal } from '../agent-storage-check';
import { testCluster } from './test-utils/cluster';

describe('warnIfAgentFilesAreLocal', () => {
	const logger = mock<Logger>();

	beforeEach(() => vi.clearAllMocks());

	it('warns about filesystem storage in queue mode', () => {
		const warned = warnIfAgentFilesAreLocal(
			testCluster({ queue: true }),
			{ mode: 'filesystem' },
			logger,
		);

		expect(warned).toBe(true);
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('filesystem storage in queue mode'),
		);
	});

	it.each<BinaryDataConfig['mode']>(['database', 's3', 'azure'])(
		'does not warn about %s storage in queue mode',
		(mode) => {
			expect(warnIfAgentFilesAreLocal(testCluster({ queue: true }), { mode }, logger)).toBe(false);
			expect(logger.warn).not.toHaveBeenCalled();
		},
	);

	it('does not warn about filesystem storage outside queue mode', () => {
		expect(warnIfAgentFilesAreLocal(testCluster(), { mode: 'filesystem' }, logger)).toBe(false);
		expect(logger.warn).not.toHaveBeenCalled();
	});
});
