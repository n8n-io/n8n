import { jsonParse } from 'n8n-workflow';

import { N8nClient, type DataTableCreatePayload } from '../n8n-client';

const BASE_URL = 'http://localhost:5678';
const originalFetch = global.fetch;

function jsonResponse(body: unknown) {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
}

function mockFetchOnce(body: unknown) {
	const fetchMock = jest.mocked(global.fetch);
	fetchMock.mockResolvedValueOnce(jsonResponse(body));
	return fetchMock;
}

describe('N8nClient', () => {
	beforeEach(() => {
		global.fetch = jest.fn();
	});

	afterEach(() => {
		jest.restoreAllMocks();
		global.fetch = originalFetch;
	});

	afterAll(() => {
		global.fetch = originalFetch;
	});

	it('serializes the confirmation body and posts it to the confirm endpoint', async () => {
		const fetchMock = mockFetchOnce({});
		const client = new N8nClient(BASE_URL);

		await client.confirmAction('request-1', {
			kind: 'approval',
			approved: true,
		});

		expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/rest/instance-ai/confirm/request-1`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				kind: 'approval',
				approved: true,
			}),
		});
	});

	it('creates a workflow and unwraps the data response', async () => {
		const workflow = {
			name: 'Imported eval workflow',
			nodes: [],
			connections: {},
			settings: { executionOrder: 'v1' },
			projectId: 'project-1',
		};
		const response = {
			id: 'workflow-1',
			name: workflow.name,
			active: false,
			nodes: [],
			connections: {},
		};
		const fetchMock = mockFetchOnce({ data: response });
		const client = new N8nClient(BASE_URL);

		const result = await client.createWorkflow(workflow);

		expect(result).toEqual(response);
		expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/rest/workflows`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(workflow),
		});
	});

	it('creates a data table under the project path and unwraps the data response', async () => {
		const payload: DataTableCreatePayload = {
			name: 'Eval samples',
			columns: [
				{ name: 'question', type: 'string' },
				{ name: 'score', type: 'number' },
			],
		};
		const response = {
			id: 'dt-1',
			name: payload.name,
			columns: [
				{ id: 'col-1', name: 'question', type: 'string' },
				{ id: 'col-2', name: 'score', type: 'number' },
			],
		};
		const fetchMock = mockFetchOnce({ data: response });
		const client = new N8nClient(BASE_URL);

		const result = await client.createDataTable('project-1', payload);

		expect(result).toEqual(response);
		expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/rest/projects/project-1/data-tables`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
	});

	it('gets the personal project id from the project endpoint', async () => {
		const fetchMock = mockFetchOnce({ data: { id: 'project-1', type: 'personal' } });
		const client = new N8nClient(BASE_URL);

		await expect(client.getPersonalProjectId()).resolves.toBe('project-1');
		expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/rest/projects/personal`, {
			method: 'GET',
			headers: { 'Content-Type': 'application/json' },
			body: undefined,
		});
	});

	it('posts the rows to the data-table insert endpoint', async () => {
		const rows = [
			{ question: 'What is n8n?', expected: 'Automation', score: 1, active: true },
			{ question: 'What is AI?', expected: null, score: 0, active: false },
		];
		const fetchMock = mockFetchOnce({ data: { count: 2 } });
		const client = new N8nClient(BASE_URL);

		await client.insertDataTableRows('project-1', 'dt-1', rows);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] as [string, { method: string; body: string }];
		expect(url).toBe(`${BASE_URL}/rest/projects/project-1/data-tables/dt-1/insert`);
		expect(init.method).toBe('POST');
		expect(jsonParse(init.body)).toMatchObject({ data: rows });
	});

	it('returns direct thread status responses', async () => {
		const status = { hasActiveRun: false, isSuspended: false, backgroundTasks: [] };
		const fetchMock = mockFetchOnce(status);
		const client = new N8nClient(BASE_URL);

		await expect(client.getThreadStatus('thread-1')).resolves.toEqual(status);
		expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/rest/instance-ai/threads/thread-1/status`, {
			method: 'GET',
			headers: { 'Content-Type': 'application/json' },
			body: undefined,
		});
	});

	it('unwraps REST-wrapped thread status responses', async () => {
		const status = { hasActiveRun: false, isSuspended: false, backgroundTasks: [] };
		const fetchMock = mockFetchOnce({ data: status });
		const client = new N8nClient(BASE_URL);

		await expect(client.getThreadStatus('thread-1')).resolves.toEqual(status);
		expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/rest/instance-ai/threads/thread-1/status`, {
			method: 'GET',
			headers: { 'Content-Type': 'application/json' },
			body: undefined,
		});
	});
});
