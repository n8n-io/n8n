import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const sessionId = '3f9a6c2e-8b41-4d7a-9e05-1c2b3d4e5f60';
const windowId = '7b8c9d0e-1f2a-4b3c-8d4e-5f6a7b8c9d0e';
const fileId = 'c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f';
const newSessionId = 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b';
const newWindowId = 'f6a7b8c9-d0e1-4f2a-9b3c-4d5e6f7a8b9c';
const requestId = '9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b6a';
const sessionPath = `/api/v1/sessions/${sessionId}`;
const windowPath = `${sessionPath}/windows/${windowId}`;
const ok = { data: {} };

describe('Test Airtop, request URLs', () => {
	afterEach(() => nock.cleanAll());

	new NodeTestHarness().setupTests({
		workflowFiles: ['requestUrls.workflow.json'],
		nock: {
			baseUrl: 'https://api.airtop.ai',
			mocks: [
				{
					method: 'post',
					path: '/api/v1/sessions',
					statusCode: 200,
					responseBody: { data: { id: sessionId, status: 'initializing' } },
				},
				{
					method: 'get',
					path: sessionPath,
					statusCode: 200,
					responseBody: { data: { id: sessionId, status: 'running' } },
				},
				{
					method: 'put',
					path: `${sessionPath}/save-profile-on-termination/my-profile`,
					statusCode: 200,
					responseBody: ok,
				},
				{
					method: 'put',
					path: `${sessionPath}/save-profile-on-termination/my-profile`,
					statusCode: 200,
					responseBody: ok,
				},
				{
					method: 'post',
					path: `${sessionPath}/windows`,
					statusCode: 200,
					responseBody: { data: { windowId } },
				},
				{ method: 'get', path: windowPath, statusCode: 200, responseBody: { data: { windowId } } },
				{ method: 'post', path: windowPath, statusCode: 200, responseBody: ok },
				{ method: 'post', path: `${windowPath}/screenshot`, statusCode: 200, responseBody: ok },
				{ method: 'post', path: `${windowPath}/click`, statusCode: 200, responseBody: ok },
				{ method: 'post', path: `${windowPath}/hover`, statusCode: 200, responseBody: ok },
				{ method: 'post', path: `${windowPath}/type`, statusCode: 200, responseBody: ok },
				{ method: 'post', path: `${windowPath}/scroll`, statusCode: 200, responseBody: ok },
				{
					method: 'post',
					path: `/api/v1/async/sessions/${sessionId}/windows/${windowId}/execute-automation`,
					statusCode: 200,
					responseBody: { requestId },
				},
				{
					method: 'get',
					path: `/api/v1/requests/${requestId}/status`,
					statusCode: 200,
					responseBody: { status: 'completed' },
				},
				{ method: 'post', path: `${windowPath}/scrape-content`, statusCode: 200, responseBody: ok },
				{
					method: 'post',
					path: '/api/v1/sessions',
					statusCode: 200,
					responseBody: { data: { id: newSessionId, status: 'running' } },
				},
				{
					method: 'post',
					path: `/api/v1/sessions/${newSessionId}/windows`,
					statusCode: 200,
					responseBody: { data: { windowId: newWindowId } },
				},
				{
					method: 'post',
					path: `/api/v1/sessions/${newSessionId}/windows/${newWindowId}/page-query`,
					statusCode: 200,
					responseBody: ok,
				},
				{
					method: 'delete',
					path: `/api/v1/sessions/${newSessionId}`,
					statusCode: 200,
					responseBody: ok,
				},
				{
					method: 'post',
					path: `${windowPath}/paginated-extraction`,
					statusCode: 200,
					responseBody: ok,
				},
				{
					method: 'get',
					path: `/api/v1/files/${fileId}`,
					statusCode: 200,
					responseBody: { data: { id: fileId, status: 'available' } },
				},
				{
					method: 'get',
					path: `/api/v1/files?sessionIds=${sessionId}&limit=10`,
					statusCode: 200,
					responseBody: { data: { files: [] } },
				},
				{ method: 'delete', path: `/api/v1/files/${fileId}`, statusCode: 200, responseBody: ok },
				{
					method: 'get',
					path: `${sessionPath}/events?all=true`,
					statusCode: 200,
					responseBody: `data: {"event":"file_status","status":"available","fileId":"${fileId}"}\n\n`,
				},
				{ method: 'delete', path: windowPath, statusCode: 200, responseBody: ok },
				{ method: 'delete', path: sessionPath, statusCode: 200, responseBody: ok },
			],
		},
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
