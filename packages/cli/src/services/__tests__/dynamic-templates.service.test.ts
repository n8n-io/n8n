import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import axios from 'axios';
import { mock } from 'jest-mock-extended';

import { DynamicTemplatesService, REQUEST_TIMEOUT_MS } from '@/services/dynamic-templates.service';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

const MOCK_DYNAMIC_TEMPLATES_HOST = 'https://dynamic-templates.n8n.io/templates';

describe('DynamicTemplatesService', () => {
	const mockLogger = mock<Logger>();
	const mockGlobalConfig = mock<GlobalConfig>({
		templates: { dynamicTemplatesHost: MOCK_DYNAMIC_TEMPLATES_HOST },
	});
	let dynamicTemplatesService: DynamicTemplatesService;

	beforeEach(() => {
		jest.clearAllMocks();
		dynamicTemplatesService = new DynamicTemplatesService(mockLogger, mockGlobalConfig);
	});

	describe('fetchDynamicTemplates', () => {
		it('should return templates from the external API', async () => {
			const mockTemplates = [
				{ id: 1, name: 'Template 1' },
				{ id: 2, name: 'Template 2' },
			];

			mockedAxios.get.mockResolvedValue({
				data: { templates: mockTemplates },
			});

			const result = await dynamicTemplatesService.fetchDynamicTemplates();

			expect(result).toEqual(mockTemplates);
			expect(mockedAxios.get).toHaveBeenCalledWith(MOCK_DYNAMIC_TEMPLATES_HOST, {
				headers: { 'Content-Type': 'application/json' },
				timeout: REQUEST_TIMEOUT_MS,
			});
		});

		it('should return empty array when API returns empty templates', async () => {
			mockedAxios.get.mockResolvedValue({
				data: { templates: [] },
			});

			const result = await dynamicTemplatesService.fetchDynamicTemplates();

			expect(result).toEqual([]);
		});

		it('should log error and throw when API call fails', async () => {
			const mockError = new Error('Network error');
			mockedAxios.get.mockRejectedValue(mockError);

			await expect(dynamicTemplatesService.fetchDynamicTemplates()).rejects.toThrow(
				'Network error',
			);
			expect(mockLogger.error).toHaveBeenCalledWith('Error fetching dynamic templates', {
				error: mockError,
			});
		});

		it('should throw on timeout', async () => {
			const timeoutError = new Error(`timeout of ${REQUEST_TIMEOUT_MS}ms exceeded`);
			mockedAxios.get.mockRejectedValue(timeoutError);

			await expect(dynamicTemplatesService.fetchDynamicTemplates()).rejects.toThrow(
				`timeout of ${REQUEST_TIMEOUT_MS}ms exceeded`,
			);
			expect(mockLogger.error).toHaveBeenCalled();
		});
	});
});
