import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { WorkflowTemplatesService } from '../workflow-templates.service';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function jsonResponse(body: unknown, status = 200) {
	return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function makeService(enabled = true, host = 'https://api.n8n.io/api/') {
	const globalConfig = mock<GlobalConfig>({ templates: { enabled, host } });
	return new WorkflowTemplatesService(mock<Logger>(), globalConfig);
}

describe('WorkflowTemplatesService', () => {
	beforeEach(() => fetchMock.mockReset());

	it('returns the template workflow for an id', async () => {
		fetchMock.mockResolvedValue(jsonResponse({ workflow: { id: 7, name: 'Demo' } }));
		const service = makeService();

		const result = await service.getTemplate('7');

		expect(result).toEqual({ available: true, template: { id: 7, name: 'Demo' } });
		expect(fetchMock).toHaveBeenCalledWith(
			'https://api.n8n.io/api/templates/workflows/7',
			expect.objectContaining({ signal: expect.any(AbortSignal) }),
		);
	});

	it('reports unavailable when templates are disabled', async () => {
		const service = makeService(false);
		const result = await service.getTemplate('7');
		expect(result).toEqual({ available: false });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('reports unavailable when a 200 response has no workflow payload', async () => {
		fetchMock.mockResolvedValue(jsonResponse({ error: 'not found' }));
		const service = makeService();

		const result = await service.getTemplate('7');

		expect(result).toEqual({ available: false });
	});

	it('throws when the templates host responds with an error status', async () => {
		fetchMock.mockResolvedValue(jsonResponse({}, 502));
		const service = makeService();

		await expect(service.getTemplate('7')).rejects.toThrow(
			'Template request failed with status 502',
		);
	});

	it('rethrows network failures', async () => {
		// One-shot: the test harness calls global fetch during cleanup, and a
		// still-rejecting stub would fail the test from outside its body.
		fetchMock.mockImplementationOnce(async () => {
			throw new Error('socket hang up');
		});
		const service = makeService();

		await expect(service.getTemplate('7')).rejects.toThrow('socket hang up');
	});
});
