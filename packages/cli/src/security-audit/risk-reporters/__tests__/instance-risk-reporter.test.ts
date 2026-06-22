import type { Logger } from '@n8n/backend-common';
import type { HttpRequestClient, OutboundHttp } from '@n8n/backend-network';
import type { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { N8N_VERSION } from '@/constants';
import { InstanceRiskReporter } from '@/security-audit/risk-reporters/instance-risk-reporter';

describe('InstanceRiskReporter', () => {
	const VERSIONS_ENDPOINT = 'https://api.n8n.io/api/versions/';

	const instanceSettings = mock<InstanceSettings>({ instanceId: 'test-instance-id' });
	const logger = mock<Logger>();
	// `deployment.type: 'cloud'` makes `getSecuritySettings()` short-circuit so the
	// report path that fetches versions can be exercised in isolation.
	const globalConfig = mock<GlobalConfig>({
		versionNotifications: { endpoint: VERSIONS_ENDPOINT },
		deployment: { type: 'cloud' },
	});

	const request = jest.fn();
	const requests = jest.fn().mockReturnValue(mock<HttpRequestClient>({ request }));
	const outboundHttp = mock<OutboundHttp>({ requests });

	let reporter: InstanceRiskReporter;

	beforeEach(() => {
		jest.clearAllMocks();
		requests.mockReturnValue(mock<HttpRequestClient>({ request }));
		reporter = new InstanceRiskReporter(instanceSettings, logger, globalConfig, outboundHttp);
	});

	it('should create the request client with SSRF disabled for the fixed host', () => {
		expect(requests).toHaveBeenCalledWith({ ssrf: 'disabled' });
	});

	it('should fetch versions with the instance-id header and JSON parsing', async () => {
		request.mockResolvedValue([]);

		await reporter.report([]);

		expect(request).toHaveBeenCalledWith({
			url: `${VERSIONS_ENDPOINT}${N8N_VERSION}`,
			method: 'GET',
			headers: { 'n8n-instance-id': 'test-instance-id' },
			json: true,
			timeout: 30_000,
		});
	});

	it('should skip the outdated report when fetching versions fails', async () => {
		request.mockRejectedValue(new Error('network down'));

		const report = await reporter.report([]);

		expect(report).toBeNull();
	});
});
