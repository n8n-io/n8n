import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import axios from 'axios';
import { mock } from 'jest-mock-extended';

import { ActiveWorkflowRefreshClient } from '@/services/active-workflow-refresh-client.service';

jest.mock('axios');

describe('ActiveWorkflowRefreshClient', () => {
	const logger = mock<Logger>();
	const globalConfig = mock<GlobalConfig>({
		protocol: 'http',
		port: 5678,
		path: '/',
		endpoints: { rest: 'rest' } as GlobalConfig['endpoints'],
	});
	let client: ActiveWorkflowRefreshClient;
	const postMock = axios.post as jest.MockedFunction<typeof axios.post>;

	beforeEach(() => {
		jest.resetAllMocks();
		logger.scoped.mockReturnValue(logger);
		client = new ActiveWorkflowRefreshClient(logger, globalConfig);
	});

	it('POSTs the workflow id to the loopback endpoint', async () => {
		postMock.mockResolvedValue({ status: 200, data: { applied: 'removed' } });

		const ok = await client.notifyRefresh('w1');

		expect(ok).toBe(true);
		expect(postMock).toHaveBeenCalledTimes(1);
		const [url, body] = postMock.mock.calls[0];
		expect(url).toBe('http://127.0.0.1:5678/rest/internal/active-workflow-manager/refresh');
		expect(body).toEqual({ workflowId: 'w1' });
	});

	it('returns false and logs info when server is not reachable', async () => {
		const connErr = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
		postMock.mockRejectedValue(connErr);

		const ok = await client.notifyRefresh('w1');

		expect(ok).toBe(false);
		expect(logger.info).toHaveBeenCalled();
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it('returns false and logs warn on unexpected errors', async () => {
		postMock.mockRejectedValue(
			Object.assign(new Error('server boom'), { response: { status: 500 } }),
		);

		const ok = await client.notifyRefresh('w1');

		expect(ok).toBe(false);
		expect(logger.warn).toHaveBeenCalled();
	});

	it('includes global path prefix in the URL', async () => {
		globalConfig.path = '/n8n';
		postMock.mockResolvedValue({ status: 200, data: { applied: 'removed' } });

		await client.notifyRefresh('w1');

		const [url] = postMock.mock.calls[0];
		expect(url).toBe('http://127.0.0.1:5678/n8n/rest/internal/active-workflow-manager/refresh');
	});
});
