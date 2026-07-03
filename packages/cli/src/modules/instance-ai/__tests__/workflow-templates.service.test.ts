import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import axios from 'axios';
import { mock } from 'vitest-mock-extended';

import { WorkflowTemplatesService } from '../workflow-templates.service';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

function makeService(enabled = true, host = 'https://api.n8n.io/api/') {
	const globalConfig = mock<GlobalConfig>({ templates: { enabled, host } });
	return new WorkflowTemplatesService(mock<Logger>(), globalConfig);
}

describe('WorkflowTemplatesService', () => {
	beforeEach(() => vi.resetAllMocks());

	it('returns the template workflow for an id', async () => {
		mockedAxios.get.mockResolvedValue({ data: { workflow: { id: 7, name: 'Demo' } } });
		const service = makeService();

		const result = await service.getTemplate('7');

		expect(result).toEqual({ available: true, template: { id: 7, name: 'Demo' } });
		expect(mockedAxios.get).toHaveBeenCalledWith(
			'https://api.n8n.io/api/templates/workflows/7',
			expect.objectContaining({ timeout: expect.any(Number) }),
		);
	});

	it('reports unavailable when templates are disabled', async () => {
		const service = makeService(false);
		const result = await service.getTemplate('7');
		expect(result).toEqual({ available: false });
		expect(mockedAxios.get).not.toHaveBeenCalled();
	});

	it('reports unavailable when a 200 response has no workflow payload', async () => {
		mockedAxios.get.mockResolvedValue({ data: { error: 'not found' } });
		const service = makeService();

		const result = await service.getTemplate('7');

		expect(result).toEqual({ available: false });
	});
});
