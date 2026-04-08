import type { AuthenticatedRequest } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { DynamicTemplatesController } from '@/controllers/dynamic-templates.controller';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import type { DynamicTemplatesService } from '@/services/dynamic-templates.service';

describe('DynamicTemplatesController', () => {
	const mockDynamicTemplatesService = mock<DynamicTemplatesService>();
	let dynamicTemplatesController: DynamicTemplatesController;
	let mockRequest: AuthenticatedRequest;

	beforeEach(() => {
		jest.clearAllMocks();
		dynamicTemplatesController = new DynamicTemplatesController(mockDynamicTemplatesService);
		mockRequest = { user: { id: 'user-123' } } as unknown as AuthenticatedRequest;
	});

	describe('get', () => {
		it('should return templates from the service', async () => {
			const mockTemplates = [
				{ id: 1, name: 'Template 1' },
				{ id: 2, name: 'Template 2' },
			];

			mockDynamicTemplatesService.fetchDynamicTemplates.mockResolvedValue(mockTemplates);

			const result = await dynamicTemplatesController.get(mockRequest);

			expect(result).toEqual({ templates: mockTemplates });
			expect(mockDynamicTemplatesService.fetchDynamicTemplates).toHaveBeenCalledTimes(1);
		});

		it('should return empty templates array when service returns empty', async () => {
			mockDynamicTemplatesService.fetchDynamicTemplates.mockResolvedValue([]);

			const result = await dynamicTemplatesController.get(mockRequest);

			expect(result).toEqual({ templates: [] });
		});

		it('should throw InternalServerError when service fails', async () => {
			mockDynamicTemplatesService.fetchDynamicTemplates.mockRejectedValue(
				new Error('External API error'),
			);

			await expect(dynamicTemplatesController.get(mockRequest)).rejects.toThrow(
				InternalServerError,
			);
		});

		it('should throw InternalServerError with correct message when service fails', async () => {
			mockDynamicTemplatesService.fetchDynamicTemplates.mockRejectedValue(
				new Error('Network timeout'),
			);

			try {
				await dynamicTemplatesController.get(mockRequest);
				fail('Expected error to be thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(InternalServerError);
				expect((error as InternalServerError).message).toBe('Failed to fetch dynamic templates');
			}
		});
	});
});
