import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const zoneId = '023e105f4ecef8ad9ca31a8372d0c353';
const certificateId = '2458ce5a-0c35-4c7f-82c7-8e9487d3ff60';
const certificate = { id: certificateId, status: 'active' };

describe('Cloudflare > Workflows', () => {
	const credentials = {
		cloudflareApi: {
			apiToken: 'fake-api-token',
		},
	};

	beforeAll(() => {
		const api = nock('https://api.cloudflare.com/client/v4');
		const path = `/zones/${zoneId}/origin_tls_client_auth`;
		api.get(`${path}/${certificateId}`).reply(200, { result: certificate });
		api.delete(`${path}/${certificateId}`).reply(200, { result: { id: certificateId } });
		api
			.get(path)
			.query({ per_page: 5 })
			.reply(200, { result: [certificate] });
		api
			.get(path)
			.query({ page: 1 })
			.reply(200, { result: [certificate], result_info: { page: 1, total_pages: 1 } });
		api
			.post(path, { certificate: 'fake-certificate', private_key: 'fake-private-key' })
			.reply(200, { result: { id: certificateId, status: 'pending' } });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
