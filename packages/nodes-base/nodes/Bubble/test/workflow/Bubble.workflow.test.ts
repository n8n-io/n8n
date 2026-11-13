import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const objectId = '1696851234567x123456789012345678';
const object = { _id: objectId, name: 'Nathan' };

function setupTests(
	credentials: { appName: string; domain: string; environment: string; hosting: string },
	workflowFile: string,
) {
	new NodeTestHarness().setupTests({
		credentials: { bubbleApi: { apiToken: 'fake-api-token', ...credentials } },
		workflowFiles: [workflowFile],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
}

describe('Bubble > Workflows', () => {
	describe('Bubble-hosted app, live environment', () => {
		beforeAll(() => {
			const mock = nock('https://acme-crm.bubbleapps.io/api/1.1').matchHeader(
				'authorization',
				'Bearer fake-api-token',
			);
			mock
				.post('/obj/customer', { name: 'Nathan' })
				.reply(200, { status: 'success', id: objectId });
			mock.get(`/obj/customer/${objectId}`).reply(200, { response: object });
			mock
				.get('/obj/customer')
				.query({ limit: 100, cursor: 0 })
				.reply(200, { response: { results: [{ _id: objectId }], remaining: 1 } });
			mock
				.get('/obj/customer')
				.query({ limit: 100, cursor: 100 })
				.reply(200, {
					response: { results: [{ _id: '1696851234568x123456789012345679' }], remaining: 0 },
				});
			mock.patch(`/obj/customer/${objectId}`, { name: 'Nathan' }).reply(204);
			mock.delete(`/obj/customer/${objectId}`).reply(204);
		});

		setupTests(
			{ appName: 'acme-crm', domain: '', environment: 'live', hosting: 'bubbleHosted' },
			'hosted.workflow.json',
		);
	});

	describe('Bubble-hosted app, development environment', () => {
		beforeAll(() => {
			nock('https://acme-crm.bubbleapps.io')
				.get(`/version-test/api/1.1/obj/customer/${objectId}`)
				.reply(200, { response: object });
		});

		setupTests(
			{ appName: 'acme-crm', domain: '', environment: 'development', hosting: 'bubbleHosted' },
			'development.workflow.json',
		);
	});

	describe('Self-hosted app', () => {
		beforeAll(() => {
			nock('https://bubble.example.com')
				.get(`/api/1.1/obj/customer/${objectId}`)
				.reply(200, { response: object });
		});

		setupTests(
			{
				appName: 'acme-crm',
				domain: 'https://bubble.example.com',
				environment: 'live',
				hosting: 'selfHosted',
			},
			'self-hosted.workflow.json',
		);
	});
});
