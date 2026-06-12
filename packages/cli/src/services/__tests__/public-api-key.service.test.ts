import type { Logger } from '@n8n/backend-common';
import type { ApiKey, ApiKeyRepository, User } from '@n8n/db';
import { hasGlobalScope } from '@n8n/permissions';
import { mock } from 'jest-mock-extended';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { UserManagementMailer } from '@/user-management/email';

import type { JwtService } from '../jwt.service';
import { PublicApiKeyService } from '../public-api-key.service';
import type { UrlService } from '../url.service';

jest.mock('@n8n/permissions', () => ({
	...jest.requireActual('@n8n/permissions'),
	hasGlobalScope: jest.fn(),
}));

describe('PublicApiKeyService', () => {
	const apiKeyRepository = mock<ApiKeyRepository>();
	const jwtService = mock<JwtService>();
	const mailer = mock<UserManagementMailer>();
	const urlService = mock<UrlService>();
	const logger = mock<Logger>();

	const service = new PublicApiKeyService(apiKeyRepository, jwtService, mailer, urlService, logger);

	const hasGlobalScopeMock = jest.mocked(hasGlobalScope);

	beforeEach(() => {
		jest.clearAllMocks();
		urlService.getInstanceBaseUrl.mockReturnValue('https://acme.app.n8n.cloud');
	});

	describe('deleteApiKey', () => {
		const apiKey = mock<ApiKey>({
			id: 'key-1',
			label: 'Test 123',
			apiKey: 'n8n_api_xxxxxxxaaa5',
			userId: 'owner-1',
			user: mock<User>({
				id: 'owner-1',
				email: 'owner@example.com',
				firstName: 'Maria',
				lastName: 'Silva',
			}),
		});

		const owner = mock<User>({ id: 'owner-1' });
		const admin = mock<User>({
			id: 'admin-1',
			firstName: 'Jan',
			lastName: 'Ostrówka',
			email: 'jan@acme.test',
		});

		it('does not send an email when the owner deletes their own key', async () => {
			hasGlobalScopeMock.mockReturnValue(false);
			apiKeyRepository.findOne.mockResolvedValue(apiKey);
			apiKeyRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

			const result = await service.deleteApiKey(owner, 'key-1');

			expect(result).toEqual({ isOwn: true });
			expect(mailer.apiKeyRevoked).not.toHaveBeenCalled();
		});

		it('sends a revocation email when an admin revokes another user’s key', async () => {
			hasGlobalScopeMock.mockReturnValue(true);
			apiKeyRepository.findOne.mockResolvedValue(apiKey);
			apiKeyRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

			const result = await service.deleteApiKey(admin, 'key-1');

			expect(result).toEqual({ isOwn: false });
			expect(mailer.apiKeyRevoked).toHaveBeenCalledWith({
				email: 'owner@example.com',
				firstName: 'Maria',
				label: 'Test 123',
				suffix: 'aaa5',
				revokedBy: 'Jan Ostrówka',
				revokedAt: expect.stringMatching(/^\d{1,2} [A-Z][a-z]{2} \d{4}$/),
				createApiKeyUrl: 'https://acme.app.n8n.cloud/settings/api',
			});
		});

		it('logs and swallows when the revocation email fails to send', async () => {
			hasGlobalScopeMock.mockReturnValue(true);
			apiKeyRepository.findOne.mockResolvedValue(apiKey);
			apiKeyRepository.delete.mockResolvedValue({ affected: 1, raw: [] });
			mailer.apiKeyRevoked.mockRejectedValueOnce(new Error('smtp down'));

			const result = await service.deleteApiKey(admin, 'key-1');

			expect(result).toEqual({ isOwn: false });
			// Flush microtasks so the fire-and-forget catch has a chance to run.
			await new Promise(setImmediate);
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to send API key revocation email',
				expect.objectContaining({
					apiKeyId: 'key-1',
					ownerId: 'owner-1',
					error: 'smtp down',
				}),
			);
		});

		it('throws NotFoundError when the API key does not exist', async () => {
			hasGlobalScopeMock.mockReturnValue(false);
			apiKeyRepository.findOne.mockResolvedValue(null);

			await expect(service.deleteApiKey(owner, 'missing')).rejects.toThrow(NotFoundError);
			expect(mailer.apiKeyRevoked).not.toHaveBeenCalled();
		});
	});
});
