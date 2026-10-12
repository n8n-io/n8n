import type { Logger } from '@n8n/backend-common';
import type { CredentialsRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { PendingAuthorizationCleanupTask } from '@/credentials/pending-authorization-cleanup.task';

describe('PendingAuthorizationCleanupTask', () => {
	const credentialsRepository = mock<CredentialsRepository>();
	const scopedLogger = mock<Logger>();
	const logger = mock<Logger>({ scoped: vi.fn().mockReturnValue(scopedLogger) });

	const task = () => new PendingAuthorizationCleanupTask(logger, credentialsRepository);

	beforeEach(() => {
		vi.clearAllMocks();
		credentialsRepository.deleteExpiredPendingAuthorizations.mockResolvedValue(0);
	});

	it('runs durably, on any main, and on the fallback timer as soon as a leader takes over', () => {
		expect(task().placement).toEqual({
			scope: 'cluster',
			durable: true,
			runOnTakeover: true,
		});
	});

	it('deletes the rows past their deadline and reports what went', async () => {
		credentialsRepository.deleteExpiredPendingAuthorizations.mockResolvedValue(3);

		await task().run();

		const [now] = credentialsRepository.deleteExpiredPendingAuthorizations.mock.calls[0];
		expect(Math.abs(Date.now() - now.getTime())).toBeLessThan(1_000);
		expect(scopedLogger.debug).toHaveBeenCalledWith(
			'Deleted 3 credentials with expired pending authorization',
		);
	});

	it('stays quiet when nothing is due', async () => {
		await task().run();

		expect(scopedLogger.debug).not.toHaveBeenCalled();
	});
});
