import type { Logger } from '@n8n/backend-common';
import type { HttpRequestClient, OutboundHttp } from '@n8n/backend-network';
import type { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import {
	TEMPLATE_REQUEST_TIMEOUT_MS,
	WorkflowTemplatesService,
} from '../workflow-templates.service';

const request = vi.fn();
const requests = vi.fn().mockReturnValue(mock<HttpRequestClient>({ request }));

const outboundHttp = mock<OutboundHttp>({ requests });

function makeService(enabled = true, host = 'https://api.n8n.io/api/') {
	const globalConfig = mock<GlobalConfig>({ templates: { enabled, host } });
	return new WorkflowTemplatesService(mock<Logger>(), globalConfig, outboundHttp);
}

describe('WorkflowTemplatesService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		requests.mockReturnValue(mock<HttpRequestClient>({ request }));
	});

	it('creates the request client with SSRF disabled for the fixed host', () => {
		makeService();

		expect(requests).toHaveBeenCalledWith({
			ssrf: 'disabled',
			timeout: TEMPLATE_REQUEST_TIMEOUT_MS,
		});
	});

	it('returns the template workflow for an id', async () => {
		request.mockResolvedValue({ workflow: { id: 7, name: 'Demo' } });
		const service = makeService();

		const result = await service.getTemplate('7');

		expect(result).toEqual({ available: true, template: { id: 7, name: 'Demo' } });
		expect(request).toHaveBeenCalledWith({
			url: 'https://api.n8n.io/api/templates/workflows/7',
			method: 'GET',
			headers: { Accept: 'application/json' },
			json: true,
		});
	});

	it('reports unavailable when templates are disabled', async () => {
		const service = makeService(false);
		const result = await service.getTemplate('7');
		expect(result).toEqual({ available: false });
		expect(request).not.toHaveBeenCalled();
	});

	it('reports unavailable when a 200 response has no workflow payload', async () => {
		request.mockResolvedValue({ error: 'not found' });
		const service = makeService();

		const result = await service.getTemplate('7');

		expect(result).toEqual({ available: false });
	});

	it('throws when the templates host responds with an error status', async () => {
		request.mockRejectedValue(new Error('Template request failed with status 502'));
		const service = makeService();

		await expect(service.getTemplate('7')).rejects.toThrow(
			'Template request failed with status 502',
		);
	});

	it('rethrows network failures', async () => {
		request.mockRejectedValue(new Error('socket hang up'));
		const service = makeService();

		await expect(service.getTemplate('7')).rejects.toThrow('socket hang up');
	});
});
