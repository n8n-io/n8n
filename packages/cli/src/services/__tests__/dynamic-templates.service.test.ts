import type { Logger } from '@n8n/backend-common';
import axios from 'axios';
import { mock } from 'jest-mock-extended';

import {
	DynamicTemplatesService,
	DYNAMIC_TEMPLATES_URL,
	REQUEST_TIMEOUT_MS,
	mapToUnifiedUserContext,
	type DynamicTemplatesUserContext,
} from '@/services/dynamic-templates.service';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('DynamicTemplatesService', () => {
	const mockLogger = mock<Logger>();
	let dynamicTemplatesService: DynamicTemplatesService;

	beforeEach(() => {
		jest.clearAllMocks();
		dynamicTemplatesService = new DynamicTemplatesService(mockLogger);
	});

	describe('fetchDynamicTemplates', () => {
		const expectedHeaders = { 'Content-Type': 'application/json' };

		it('should return templates from the external API', async () => {
			const mockTemplates = [
				{ id: 1, name: 'Template 1' },
				{ id: 2, name: 'Template 2' },
			];

			mockedAxios.get.mockResolvedValue({
				data: { templates: mockTemplates },
			});

			const result = await dynamicTemplatesService.fetchDynamicTemplates({});

			expect(result).toEqual(mockTemplates);
			expect(mockedAxios.get).toHaveBeenCalledWith(DYNAMIC_TEMPLATES_URL, {
				headers: expectedHeaders,
				timeout: REQUEST_TIMEOUT_MS,
				params: {},
			});
		});

		it('should return empty array when API returns empty templates', async () => {
			mockedAxios.get.mockResolvedValue({
				data: { templates: [] },
			});

			const result = await dynamicTemplatesService.fetchDynamicTemplates({});

			expect(result).toEqual([]);
		});

		it('should log error and throw when API call fails', async () => {
			const mockError = new Error('Network error');
			mockedAxios.get.mockRejectedValue(mockError);

			await expect(dynamicTemplatesService.fetchDynamicTemplates({})).rejects.toThrow(
				'Network error',
			);
			expect(mockLogger.error).toHaveBeenCalledWith('Error fetching dynamic templates', {
				error: mockError,
			});
		});

		it('should throw on timeout', async () => {
			const timeoutError = new Error(`timeout of ${REQUEST_TIMEOUT_MS}ms exceeded`);
			mockedAxios.get.mockRejectedValue(timeoutError);

			await expect(dynamicTemplatesService.fetchDynamicTemplates({})).rejects.toThrow(
				`timeout of ${REQUEST_TIMEOUT_MS}ms exceeded`,
			);
			expect(mockLogger.error).toHaveBeenCalled();
		});

		it('should pass userContext as query parameter when provided', async () => {
			const mockTemplates = [{ id: 1, name: 'Template 1' }];
			const userContext: DynamicTemplatesUserContext = {
				companySize: '20-99',
				role: 'developer',
				selectedApps: ['slack', 'notion'],
			};

			mockedAxios.get.mockResolvedValue({
				data: { templates: mockTemplates },
			});

			await dynamicTemplatesService.fetchDynamicTemplates({ ...{}, userContext });

			expect(mockedAxios.get).toHaveBeenCalledWith(DYNAMIC_TEMPLATES_URL, {
				headers: expectedHeaders,
				timeout: REQUEST_TIMEOUT_MS,
				params: { userContext: JSON.stringify(userContext) },
			});
		});
	});

	describe('mapToUnifiedUserContext', () => {
		it('should map self-hosted personalizationAnswers correctly', () => {
			const personalizationAnswers = {
				version: 'v4' as const,
				personalization_survey_submitted_at: '2024-01-01',
				personalization_survey_n8n_version: '1.0.0',
				companySize: '20-99',
				companyType: 'saas',
				role: 'developer',
				reportedSource: 'friend',
				automationGoalDevops: ['ci-cd', 'monitoring'],
				usageModes: ['work', 'personal'],
				companyIndustryExtended: ['tech', 'finance'],
			};

			const result = mapToUnifiedUserContext(personalizationAnswers);

			expect(result).toEqual({
				companySize: '20-99',
				companyType: 'saas',
				role: 'developer',
				source: 'friend',
				automationGoals: ['ci-cd', 'monitoring'],
				usageModes: ['work', 'personal'],
				companyIndustry: ['tech', 'finance'],
			});
		});

		it('should map cloud information correctly', () => {
			const cloudInformation = {
				what_is_the_size_of_your_company: '<20',
				what_team_are_you_on: 'Marketing',
				how_did_you_hear_about_n8n: 'Google',
				'eb4c8e07-e906-4b6d-9a7d-836c0438166c': ['API calls', 'Webhooks'],
				'2945eae8-6601-49c0-b5f9-69fdd1364aa8': 'Yes',
			};
			const selectedApps = ['slack', 'notion'];

			const result = mapToUnifiedUserContext(null, selectedApps, cloudInformation);

			expect(result).toEqual({
				companySize: '<20',
				role: 'Marketing',
				source: 'Google',
				codingSkill: ['API calls', 'Webhooks'],
				hasUsedAutomation: 'Yes',
				selectedApps: ['slack', 'notion'],
			});
		});

		it('should override self-hosted values with cloud values when both provided', () => {
			const personalizationAnswers = {
				version: 'v4' as const,
				personalization_survey_submitted_at: '2024-01-01',
				personalization_survey_n8n_version: '1.0.0',
				companySize: '20-99',
				role: 'developer',
			};
			const cloudInformation = {
				what_is_the_size_of_your_company: '<20',
				what_team_are_you_on: 'Marketing',
			};

			const result = mapToUnifiedUserContext(personalizationAnswers, undefined, cloudInformation);

			expect(result.companySize).toBe('<20');
			expect(result.role).toBe('Marketing');
		});

		it('should return empty object when no data provided', () => {
			const result = mapToUnifiedUserContext(null);

			expect(result).toEqual({});
		});

		it('should handle codingSkill as single string value', () => {
			const cloudInformation = {
				'eb4c8e07-e906-4b6d-9a7d-836c0438166c': 'Single skill',
			};

			const result = mapToUnifiedUserContext(null, undefined, cloudInformation);

			expect(result.codingSkill).toEqual(['Single skill']);
		});
	});
});
