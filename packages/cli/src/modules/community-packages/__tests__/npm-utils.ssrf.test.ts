import { OutboundHttp, type HttpRequestClient } from '@n8n/backend-network';
import { mockInstance } from '@n8n/backend-test-utils';
import { mock } from 'vitest-mock-extended';

import { executeNpmRequest } from '../npm-utils';

describe('executeNpmRequest SSRF gating', () => {
	const request = vi.fn();
	const requests = vi.fn().mockReturnValue(mock<HttpRequestClient>({ request }));
	mockInstance(OutboundHttp, { requests });

	beforeEach(() => {
		vi.clearAllMocks();
		requests.mockReturnValue(mock<HttpRequestClient>({ request }));
		request.mockResolvedValue({});
	});

	it('should request the default safe client', async () => {
		await executeNpmRequest('https://registry.example.com', 'pkg/1.0.0');

		expect(requests).toHaveBeenCalledWith();
	});

	it('should map the registry GET request with auth header, timeout and JSON', async () => {
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
		const error = new Error('registry unreachable');
		request.mockRejectedValueOnce(error);

		await expect(executeNpmRequest('https://registry.example.com', 'pkg/1.0.0')).rejects.toBe(
			error,
		);
	});
});
