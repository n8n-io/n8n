import { OutboundHttp, SsrfProtectionService, type HttpRequestClient } from '@n8n/backend-network';
import { mockInstance } from '@n8n/backend-test-utils';
import { SsrfProtectionConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { executeNpmRequest } from '../npm-utils';

describe('executeNpmRequest SSRF gating', () => {
	const request = vi.fn();
	const requests = vi.fn().mockReturnValue(mock<HttpRequestClient>({ request }));
	mockInstance(OutboundHttp, { requests });
	const ssrfConfig = mockInstance(SsrfProtectionConfig);
	const ssrfService = mockInstance(SsrfProtectionService);

	beforeEach(() => {
		vi.clearAllMocks();
		requests.mockReturnValue(mock<HttpRequestClient>({ request }));
		request.mockResolvedValue({});
	});

	it('should pass the SSRF bridge when protection is enabled', async () => {
		ssrfConfig.enabled = true;

		await executeNpmRequest('https://registry.example.com', 'pkg/1.0.0');

		expect(requests).toHaveBeenCalledWith({ ssrf: ssrfService });
	});

	it('should disable SSRF when protection is disabled', async () => {
		ssrfConfig.enabled = false;

		await executeNpmRequest('https://registry.example.com', 'pkg/1.0.0');

		expect(requests).toHaveBeenCalledWith({ ssrf: 'disabled' });
	});

	it('should map the registry GET request with auth header, timeout and JSON', async () => {
		ssrfConfig.enabled = false;

		await executeNpmRequest('https://registry.example.com/', 'pkg/1.0.0', {
			authToken: 'tok',
			timeout: 1234,
		});

		expect(request).toHaveBeenCalledWith({
			url: 'https://registry.example.com/pkg/1.0.0',
			method: 'GET',
			timeout: 1234,
			headers: { Authorization: 'Bearer tok' },
			json: true,
		});
	});

	it('should re-throw the original error so callers can fall back to the npm CLI', async () => {
		ssrfConfig.enabled = false;
		const error = new Error('registry unreachable');
		request.mockRejectedValueOnce(error);

		await expect(executeNpmRequest('https://registry.example.com', 'pkg/1.0.0')).rejects.toBe(
			error,
		);
	});
});
