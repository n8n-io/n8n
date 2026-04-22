import { mockLogger } from '@n8n/backend-test-utils';

import { EncryptionBootstrapService } from '../encryption-bootstrap.service';

describe('EncryptionBootstrapService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	const createService = () => new EncryptionBootstrapService(mockLogger());

	it('runs without error', async () => {
		await expect(createService().run()).resolves.toBeUndefined();
	});
});
