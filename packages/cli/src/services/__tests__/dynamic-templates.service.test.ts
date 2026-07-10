import type { Logger } from '@n8n/backend-common';
import type { HttpRequestClient, OutboundHttp } from '@n8n/backend-network';
import type { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { DynamicTemplatesService, REQUEST_TIMEOUT_MS } from '@/services/dynamic-templates.service';

const MOCK_DYNAMIC_TEMPLATES_HOST = 'https://dynamic-templates.n8n.io/templates';

describe('DynamicTemplatesService', () => {
	const mockLogger = mock<Logger>();
	const mockGlobalConfig = mock<GlobalConfig>({
		templates: { dynamicTemplatesHost: MOCK_DYNAMIC_TEMPLATES_HOST },
	});
	const request = vi.fn();
	const requests = vi.fn().mockReturnValue(mock<HttpRequestClient>({ request }));
	const outboundHttp = mock<OutboundHttp>({ requests });
	let dynamicTemplatesService: DynamicTemplatesService;

	beforeEach(() => {
		vi.clearAllMocks();
		requests.mockReturnValue(mock<HttpRequestClient>({ request }));
		dynamicTemplatesService = new DynamicTemplatesService(
			mockLogger,
			mockGlobalConfig,
			outboundHttp,
		);
	});

	it('should create the request client with SSRF disabled for the fixed host', () => {
		expect(requests).toHaveBeenCalledWith({ ssrf: 'disabled', timeout: REQUEST_TIMEOUT_MS });
	});

	describe('fetchDynamicTemplates', () => {
		it('should return templates from the external API', async () => {
			const mockTemplates = [
				{ id: 1, name: 'Template 1' },
				{ id: 2, name: 'Template 2' },
			];

			request.mockResolvedValue({ templates: mockTemplates });

			const result = await dynamicTemplatesService.fetchDynamicTemplates();

			expect(result).toEqual(mockTemplates);
			expect(request).toHaveBeenCalledWith({
				url: MOCK_DYNAMIC_TEMPLATES_HOST,
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
				json: true,
			});
		});

		it('should return empty array when API returns empty templates', async () => {
			request.mockResolvedValue({ templates: [] });

			const result = await dynamicTemplatesService.fetchDynamicTemplates();

			expect(result).toEqual([]);
		});

		it('should log error and throw when API call fails', async () => {
			const mockError = new Error('Network error');
			request.mockRejectedValue(mockError);

			await expect(dynamicTemplatesService.fetchDynamicTemplates()).rejects.toThrow(
				'Network error',
			);
			expect(mockLogger.error).toHaveBeenCalledWith('Error fetching dynamic templates', {
				error: mockError,
			});
		});

		it('should throw on timeout', async () => {
			const timeoutError = new Error(`timeout of ${REQUEST_TIMEOUT_MS}ms exceeded`);
			request.mockRejectedValue(timeoutError);

			await expect(dynamicTemplatesService.fetchDynamicTemplates()).rejects.toThrow(
				`timeout of ${REQUEST_TIMEOUT_MS}ms exceeded`,
			);
			expect(mockLogger.error).toHaveBeenCalled();
		});
	});
});
