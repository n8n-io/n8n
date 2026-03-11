import { mock } from 'jest-mock-extended';

import type {
	CredentialsRepository,
	ProjectRepository,
	SharedCredentialsRepository,
} from '@n8n/db';
import type { Logger } from '@n8n/backend-common';

const mockModelsList = jest.fn();

jest.mock('@openrouter/sdk', () => ({
	OpenRouter: jest.fn().mockImplementation(() => ({
		models: { list: mockModelsList },
	})),
}));

import { AiGatewayService } from '../ai-gateway.service';
import type { AiGatewayConfig } from '../ai-gateway.config';
import type { OwnershipService } from '@/services/ownership.service';

describe('AiGatewayService', () => {
	let service: AiGatewayService;
	const config = mock<AiGatewayConfig>({
		enabled: true,
		openRouterApiKey: 'test-key',
		openRouterBaseUrl: 'https://openrouter.ai/api/v1',
		defaultCategory: 'balanced',
	});
	const credentialsRepository = mock<CredentialsRepository>();
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
	const projectRepository = mock<ProjectRepository>();
	const ownershipService = mock<OwnershipService>();
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	beforeEach(() => {
		jest.clearAllMocks();
		service = new AiGatewayService(
			config,
			credentialsRepository,
			sharedCredentialsRepository,
			projectRepository,
			ownershipService,
			logger,
		);
	});

	describe('isEnabled / isConfigured', () => {
		it('should reflect config state', () => {
			expect(service.isEnabled()).toBe(true);
			expect(service.isConfigured()).toBe(true);
		});

		it('should return not configured when API key is empty', () => {
			const emptyConfig = mock<AiGatewayConfig>({
				enabled: true,
				openRouterApiKey: '',
			});
			const svc = new AiGatewayService(
				emptyConfig,
				credentialsRepository,
				sharedCredentialsRepository,
				projectRepository,
				ownershipService,
				logger,
			);
			expect(svc.isEnabled()).toBe(true);
			expect(svc.isConfigured()).toBe(false);
		});
	});

	describe('provisionCredential', () => {
		it('should create a new credential when none exists', async () => {
			credentialsRepository.findOne.mockResolvedValue(null);
			credentialsRepository.create.mockReturnValue({ id: 'new-id' } as never);
			credentialsRepository.save.mockResolvedValue({ id: 'new-id' } as never);
			ownershipService.getInstanceOwner.mockResolvedValue({ id: 'owner-id' } as never);
			projectRepository.getPersonalProjectForUserOrFail.mockResolvedValue({
				id: 'project-id',
			} as never);
			sharedCredentialsRepository.create.mockReturnValue({ credentialsId: 'new-id' } as never);
			sharedCredentialsRepository.save.mockResolvedValue({ credentialsId: 'new-id' } as never);

			await service.provisionCredential();

			expect(credentialsRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'n8n AI Gateway',
					type: 'n8nAiGatewayApi',
					isManaged: true,
					isGlobal: true,
				}),
			);
			expect(credentialsRepository.save).toHaveBeenCalled();
			expect(sharedCredentialsRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					credentialsId: 'new-id',
					role: 'credential:owner',
					projectId: 'project-id',
				}),
			);
		});

		it('should update existing credential', async () => {
			credentialsRepository.findOne.mockResolvedValue({
				id: 'existing-id',
				type: 'n8nAiGatewayApi',
				isManaged: true,
			} as never);

			await service.provisionCredential();

			expect(credentialsRepository.update).toHaveBeenCalledWith(
				'existing-id',
				expect.objectContaining({ data: expect.any(String) }),
			);
			expect(credentialsRepository.create).not.toHaveBeenCalled();
		});
	});

	describe('listModels', () => {
		it('should call OpenRouter SDK and cache result', async () => {
			const mockModels = { data: [{ id: 'openai/gpt-4.1', name: 'GPT-4.1' }] };
			mockModelsList.mockResolvedValue(mockModels);

			const result1 = await service.listModels();
			expect(result1).toEqual(mockModels);
			expect(mockModelsList).toHaveBeenCalledTimes(1);

			// Second call should use cache
			const result2 = await service.listModels();
			expect(result2).toEqual(mockModels);
			expect(mockModelsList).toHaveBeenCalledTimes(1);
		});

		it('should refetch after cache invalidation', async () => {
			const mockModels = { data: [{ id: 'openai/gpt-4.1' }] };
			mockModelsList.mockResolvedValue(mockModels);

			await service.listModels();
			expect(mockModelsList).toHaveBeenCalledTimes(1);

			service.invalidateModelCache();

			await service.listModels();
			expect(mockModelsList).toHaveBeenCalledTimes(2);
		});
	});

	describe('getActivity', () => {
		it('should fetch and aggregate activity from OpenRouter', async () => {
			const mockActivity = {
				data: [
					{
						date: '2026-03-10',
						model: 'openai/gpt-4.1-mini',
						usage: 0.05,
						requests: 10,
						prompt_tokens: 5000,
						completion_tokens: 2000,
					},
					{
						date: '2026-03-10',
						model: 'anthropic/claude-4-sonnet',
						usage: 0.12,
						requests: 3,
						prompt_tokens: 3000,
						completion_tokens: 1500,
					},
				],
			};

			jest.spyOn(global, 'fetch').mockResolvedValueOnce({
				ok: true,
				json: async () => mockActivity,
			} as Response);

			const result = await service.getActivity();

			expect(result.totalRequests).toBe(13);
			expect(result.totalInputTokens).toBe(8000);
			expect(result.totalOutputTokens).toBe(3500);
			expect(result.totalCost).toBeCloseTo(0.17);
			expect(result.byModel['openai/gpt-4.1-mini']).toEqual({
				requests: 10,
				inputTokens: 5000,
				outputTokens: 2000,
				cost: 0.05,
			});
			expect(result.byModel['anthropic/claude-4-sonnet']).toEqual({
				requests: 3,
				inputTokens: 3000,
				outputTokens: 1500,
				cost: 0.12,
			});
		});

		it('should return empty usage when OpenRouter returns an error', async () => {
			jest.spyOn(global, 'fetch').mockResolvedValueOnce({
				ok: false,
				status: 403,
			} as Response);

			const result = await service.getActivity();

			expect(result.totalRequests).toBe(0);
			expect(result.totalCost).toBe(0);
			expect(result.byModel).toEqual({});
		});

		it('should cache activity data', async () => {
			const mockActivity = {
				data: [
					{
						date: '2026-03-10',
						model: 'openai/gpt-4.1-mini',
						usage: 0.01,
						requests: 1,
						prompt_tokens: 100,
						completion_tokens: 50,
					},
				],
			};
			const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
				ok: true,
				json: async () => mockActivity,
			} as Response);

			await service.getActivity();
			await service.getActivity();

			expect(fetchSpy).toHaveBeenCalledTimes(1);
		});
	});
});
