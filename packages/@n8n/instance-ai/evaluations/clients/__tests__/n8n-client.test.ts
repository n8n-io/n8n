import { N8nClient, type DataTableCreatePayload, type WorkflowCreatePayload } from '../n8n-client';

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

	it('sends eval approval fields in the confirmation body', async () => {
		const fetchMock = mockFetchOnce({});
		const client = new N8nClient(BASE_URL);

		await client.confirmAction('request-1', true, {
			mockCredentials: true,
			datasetChoice: 'link-existing',
			existingDataTableId: 'dt-1',
			enabledMetricIds: ['correctness'],
			credentialId: 'credential-1',
		});

		expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/rest/instance-ai/confirm/request-1`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				approved: true,
				mockCredentials: true,
				datasetChoice: 'link-existing',
				existingDataTableId: 'dt-1',
				enabledMetricIds: ['correctness'],
				credentialId: 'credential-1',
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

	it('creates a workflow from a broad create payload without changing the body', async () => {
		const workflow: WorkflowCreatePayload = {
			id: 'workflow-import-id',
			name: 'Imported eval workflow',
			description: 'Imported from topology fixture',
			hash: 'hash-1',
			nodes: [
				{
					id: 'node-1',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
			settings: null,
			staticData: null,
			meta: null,
			pinData: null,
			tags: [{ id: 'tag-1', name: 'Eval' }],
			projectId: 'project-1',
			parentFolderId: 'folder-1',
			parentFolder: { id: 'folder-1', name: 'Eval fixtures' },
			uiContext: 'eval-setup-topology',
			aiBuilderAssisted: true,
			expectedChecksum: 'checksum-1',
			autosaved: false,
		};
		const response = {
			id: 'workflow-1',
			name: workflow.name,
			active: false,
			nodes: workflow.nodes,
			connections: {},
		};
		const fetchMock = mockFetchOnce({ data: response });
		const client = new N8nClient(BASE_URL);

		await client.createWorkflow(workflow);

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

	it('inserts data table rows with count return type', async () => {
		const rows = [
			{ question: 'What is n8n?', expected: 'Automation', score: 1, active: true },
			{ question: 'What is AI?', expected: null, score: 0, active: false },
		];
		const fetchMock = mockFetchOnce({ data: { count: 2 } });
		const client = new N8nClient(BASE_URL);

		await client.insertDataTableRows('project-1', 'dt-1', rows);

		expect(fetchMock).toHaveBeenCalledWith(
			`${BASE_URL}/rest/projects/project-1/data-tables/dt-1/insert`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ data: rows, returnType: 'count' }),
			},
		);
	});

	it('starts a native test run', async () => {
		const fetchMock = mockFetchOnce({});
		const client = new N8nClient(BASE_URL);

		await client.startNativeTestRun('workflow-1');

		expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/rest/workflows/workflow-1/test-runs/new`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: undefined,
		});
	});

	it('lists native test runs from a direct array response', async () => {
		const testRuns = [{ id: 'run-1', status: 'completed', errorCode: null }];
		mockFetchOnce({ data: testRuns });
		const client = new N8nClient(BASE_URL);

		await expect(client.listNativeTestRuns('workflow-1')).resolves.toEqual(testRuns);
	});

	it('lists native test runs from a paginated results response', async () => {
		const testRuns = [{ id: 'run-2', status: 'failed', errorCode: 'EVAL_ERROR' }];
		mockFetchOnce({ data: { results: testRuns } });
		const client = new N8nClient(BASE_URL);

		await expect(client.listNativeTestRuns('workflow-1')).resolves.toEqual(testRuns);
	});
});
