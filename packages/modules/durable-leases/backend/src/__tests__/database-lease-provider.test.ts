import { UnexpectedError } from '@n8n/errors';

import { DatabaseLeaseProvider } from '../database-lease-provider';

describe('DatabaseLeaseProvider', () => {
	const provider = new DatabaseLeaseProvider();

	it('rejects a holder with an unexpected error', async () => {
		await expect(
			provider.registerHolder(
				'test-kind',
				{ startTimeoutSeconds: 60, maxFailedStarts: 5 },
				async () => {},
			),
		).rejects.toThrow(UnexpectedError);
	});

	it('rejects sync with an unexpected error', async () => {
		await expect(provider.sync('test-kind')).rejects.toThrow(UnexpectedError);
	});

	it('rejects status with an unexpected error', async () => {
		await expect(provider.status('test-kind', ['a'])).rejects.toThrow(UnexpectedError);
	});
});
