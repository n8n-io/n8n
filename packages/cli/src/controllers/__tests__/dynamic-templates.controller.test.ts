import type { DynamicTemplatesRequestQuery } from '@n8n/api-types';
import type { GlobalConfig } from '@n8n/config';
import type { AuthenticatedRequest, UserRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { DynamicTemplatesController } from '@/controllers/dynamic-templates.controller';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import type { DynamicTemplatesService } from '@/services/dynamic-templates.service';

describe('DynamicTemplatesController', () => {
	const mockDynamicTemplatesService = mock<DynamicTemplatesService>();
	const mockUserRepository = mock<UserRepository>();
	const mockGlobalConfig = mock<GlobalConfig>({ deployment: { type: 'default' } });
	let dynamicTemplatesController: DynamicTemplatesController;
	let mockRequest: AuthenticatedRequest;
	const mockQuery: DynamicTemplatesRequestQuery = {};

	beforeEach(() => {
		jest.clearAllMocks();
		mockGlobalConfig.deployment.type = 'default';
		dynamicTemplatesController = new DynamicTemplatesController(
			mockDynamicTemplatesService,
			mockUserRepository,
			mockGlobalConfig,
		);
		mockRequest = { user: { id: 'user-123' } } as unknown as AuthenticatedRequest;
		mockUserRepository.findOne.mockResolvedValue({ personalizationAnswers: null } as never);
	});

	describe('get', () => {
		it('should return templates from the service', async () => {
			const mockTemplates = [
				{ id: 1, name: 'Template 1' },
				{ id: 2, name: 'Template 2' },
			];

			mockDynamicTemplatesService.fetchDynamicTemplates.mockResolvedValue(mockTemplates);

			const result = await dynamicTemplatesController.get(mockRequest, {}, mockQuery);

			expect(result).toEqual({ templates: mockTemplates });
			expect(mockDynamicTemplatesService.fetchDynamicTemplates).toHaveBeenCalledTimes(1);
		});

		it('should return empty templates array when service returns empty', async () => {
			mockDynamicTemplatesService.fetchDynamicTemplates.mockResolvedValue([]);

			const result = await dynamicTemplatesController.get(mockRequest, {}, mockQuery);

			expect(result).toEqual({ templates: [] });
		});

		it('should throw InternalServerError when service fails', async () => {
			mockDynamicTemplatesService.fetchDynamicTemplates.mockRejectedValue(
				new Error('External API error'),
			);

			await expect(dynamicTemplatesController.get(mockRequest, {}, mockQuery)).rejects.toThrow(
				InternalServerError,
			);
		});

		it('should throw InternalServerError with correct message when service fails', async () => {
			mockDynamicTemplatesService.fetchDynamicTemplates.mockRejectedValue(
				new Error('Network timeout'),
			);

			try {
				await dynamicTemplatesController.get(mockRequest, {}, mockQuery);
				fail('Expected error to be thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(InternalServerError);
				expect((error as InternalServerError).message).toBe('Failed to fetch dynamic templates');
			}
		});

		it('should fetch personalizationAnswers from DB for self-hosted users', async () => {
			const mockPersonalizationAnswers = {
				version: 'v4' as const,
				personalization_survey_submitted_at: '2024-01-01',
				personalization_survey_n8n_version: '1.0.0',
				companySize: '20-99',
				role: 'developer',
			};

			mockUserRepository.findOne.mockResolvedValue({
				personalizationAnswers: mockPersonalizationAnswers,
			} as never);
			mockDynamicTemplatesService.fetchDynamicTemplates.mockResolvedValue([]);

			await dynamicTemplatesController.get(mockRequest, {}, mockQuery);

			expect(mockUserRepository.findOne).toHaveBeenCalledWith({
				where: { id: 'user-123' },
				select: ['personalizationAnswers'],
			});
			expect(mockDynamicTemplatesService.fetchDynamicTemplates).toHaveBeenCalledWith({
				userContext: expect.objectContaining({
					companySize: '20-99',
					role: 'developer',
				}),
			});
		});

		it('should skip DB query for cloud users when deployment type is cloud', async () => {
			mockGlobalConfig.deployment.type = 'cloud';

			const cloudQuery: DynamicTemplatesRequestQuery = {
				selectedApps: JSON.stringify(['slack', 'notion']),
				cloudInformation: JSON.stringify({
					what_team_are_you_on: 'Engineering',
				}),
			};

			mockDynamicTemplatesService.fetchDynamicTemplates.mockResolvedValue([]);

			await dynamicTemplatesController.get(mockRequest, {}, cloudQuery);

			expect(mockUserRepository.findOne).not.toHaveBeenCalled();
			expect(mockDynamicTemplatesService.fetchDynamicTemplates).toHaveBeenCalledWith({
				userContext: expect.objectContaining({
					selectedApps: ['slack', 'notion'],
					role: 'Engineering',
				}),
			});
		});
	});
});
