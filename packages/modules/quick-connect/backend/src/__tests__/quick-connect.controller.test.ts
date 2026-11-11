import type { GetQuickConnectApiKeyDto } from '@n8n/api-types';
import type { AuthenticatedRequest, Person } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { QuickConnectController } from '../quick-connect.controller';
import type { QuickConnectService } from '../quick-connect.service';

describe('QuickConnectController', () => {
	let controller: QuickConnectController;
	let service: QuickConnectService;

	beforeEach(() => {
		service = mock<QuickConnectService>();
		controller = new QuickConnectController(service);
	});

	describe('getCredentialData', () => {
		it('should call service with correct parameters', async () => {
			const person = mock<Person>({
				id: 'user-123',
				email: 'test@example.com',
			});
			const req = mock<AuthenticatedRequest>({ user: person });
			const body: GetQuickConnectApiKeyDto = {
				quickConnectType: 'firecrawl',
			};
			const expectedResult = { apiKey: 'test-api-key' };

			service.getCredentialData = vi.fn().mockResolvedValue(expectedResult);

			const result = await controller.getCredentialData(req, {}, body);

			expect(service.getCredentialData).toHaveBeenCalledWith('firecrawl', person);
			expect(result).toEqual(expectedResult);
		});

		it('should pass through service errors', async () => {
			const person = mock<Person>({
				id: 'user-123',
				email: 'test@example.com',
			});
			const req = mock<AuthenticatedRequest>({ user: person });
			const body: GetQuickConnectApiKeyDto = {
				quickConnectType: 'invalid',
			};
			const error = new Error('Handler not configured');

			service.getCredentialData = vi.fn().mockRejectedValue(error);

			await expect(controller.getCredentialData(req, {}, body)).rejects.toThrow(error);
			expect(service.getCredentialData).toHaveBeenCalledWith('invalid', person);
		});

		it('should handle different quickConnectTypes', async () => {
			const person = mock<Person>({
				id: 'user-456',
				email: 'another@example.com',
			});
			const req = mock<AuthenticatedRequest>({ user: person });
			const body: GetQuickConnectApiKeyDto = {
				quickConnectType: 'custom-provider',
			};
			const expectedResult = { apiKey: 'custom-api-key-xyz' };

			service.getCredentialData = vi.fn().mockResolvedValue(expectedResult);

			const result = await controller.getCredentialData(req, {}, body);

			expect(service.getCredentialData).toHaveBeenCalledWith('custom-provider', person);
			expect(result).toEqual(expectedResult);
		});
	});
});
