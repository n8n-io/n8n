import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { IExecuteFunctions } from 'n8n-workflow';
import nock from 'nock';

import { QueryError, TimeoutError } from '../errors';

import { CloudBeaverClient } from '../transport/CloudBeaverClient';
import type { RequestFn } from '../helpers/interfaces';
import { transformResults } from '../helpers/utils';

const SERVER_URL = 'https://cb.example.com';
const GQL_PATH = '/api/gql';
const MOCK_COOKIE = 'cb-session-id=test-session';

const credentials = {
	cloudBeaverApi: { serverUrl: SERVER_URL, authType: 'token', token: 'test-token' },
};

function gql() {
	return nock(SERVER_URL).post(GQL_PATH);
}

function mockAuth() {
	gql().reply(
		200,
		{ data: { authLogin: { authStatus: 'SUCCESS' } } },
		{ 'set-cookie': MOCK_COOKIE },
	);
}

function mockFullSuccess() {
	mockAuth();
	gql().reply(200, { data: { initConnection: { id: 'pg-1' } } });
	gql().reply(200, {
		data: { sqlContextCreate: { id: 'ctx-1', connectionId: 'pg-1', projectId: null } },
	});
	gql().reply(200, { data: { asyncSqlExecuteQuery: { id: 'task-1', running: true } } });
	gql().reply(200, {
		data: { asyncTaskInfo: { id: 'task-1', running: false, status: 'Finished', error: null } },
	});
}

function createMockContext(httpResponse: unknown) {
	return {
		helpers: {
			httpRequest: jest.fn().mockResolvedValue(httpResponse),
		},
		getNode: jest.fn().mockReturnValue({
			id: 'node-1',
			name: 'CloudBeaver',
			type: 'n8n-nodes-base.cloudBeaver',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		}),
	} as unknown as IExecuteFunctions;
}

describe('CloudBeaver Node — successful SELECT', () => {
	beforeAll(() => {
		mockFullSuccess();
		gql().reply(200, {
			data: {
				asyncSqlExecuteResults: {
					results: [
						{
							resultSet: {
								columns: [{ name: 'id' }, { name: 'name' }],
								rowsWithMetaData: [{ data: [1, 'Alice'] }, { data: [2, 'Bob'] }],
							},
						},
					],
				},
			},
		});
		gql().reply(200, { data: { sqlContextDestroy: true } });
	});

	afterAll(() => nock.cleanAll());

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['workflow.select.json'],
	});
});

describe('CloudBeaver Node — empty result set', () => {
	beforeAll(() => {
		mockFullSuccess();
		gql().reply(200, { data: { asyncSqlExecuteResults: { results: [] } } });
		gql().reply(200, { data: { sqlContextDestroy: true } });
	});

	afterAll(() => nock.cleanAll());

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['workflow.empty.json'],
	});
});

describe('transformResults', () => {
	it('maps columns and rows to n8n items', () => {
		const result = transformResults({
			results: [
				{
					resultSet: {
						columns: [{ name: 'id' }, { name: 'name' }],
						rowsWithMetaData: [{ data: [1, 'Alice'] }, { data: [2, 'Bob'] }],
					},
				},
			],
		});

		expect(result).toHaveLength(2);
		expect(result[0].json).toEqual({ id: 1, name: 'Alice' });
		expect(result[1].json).toEqual({ id: 2, name: 'Bob' });
	});

	it('returns empty array for empty results', () => {
		expect(transformResults({ results: [] })).toHaveLength(0);
	});

	it('uses col index as fallback name when column has no name', () => {
		const result = transformResults({
			results: [
				{
					resultSet: {
						columns: [{}],
						rowsWithMetaData: [{ data: [42] }],
					},
				},
			],
		});

		expect(result[0].json).toEqual({ col0: 42 });
	});
});

describe('CloudBeaverClient.pollTask', () => {
	let requestMock: jest.Mock;
	let client: CloudBeaverClient;

	beforeEach(() => {
		requestMock = jest.fn();
		client = new CloudBeaverClient(requestMock as RequestFn);
	});

	it('resolves when task completes', async () => {
		requestMock.mockResolvedValueOnce({
			data: { asyncTaskInfo: { id: 'task-1', running: false, status: 'Finished', error: null } },
		});
		await expect(client.pollTask('task-1', 5_000)).resolves.toBeUndefined();
	});

	it('throws QueryError when task has error', async () => {
		requestMock.mockResolvedValueOnce({
			data: {
				asyncTaskInfo: {
					id: 'task-1',
					running: false,
					status: 'Error',
					error: { message: 'relation "users" does not exist' },
				},
			},
		});
		await expect(client.pollTask('task-1', 5_000)).rejects.toThrow(
			new QueryError('Task error: relation "users" does not exist'),
		);
	});

	it('throws TimeoutError on timeout', async () => {
		requestMock.mockResolvedValue({
			data: { asyncTaskInfo: { id: 'task-1', running: true, status: 'Running', error: null } },
		});
		await expect(client.pollTask('task-1', 100)).rejects.toThrow(TimeoutError);
	});
});

describe('CloudBeaverClient.pollTask — adaptive polling', () => {
	let requestMock: jest.Mock;
	let client: CloudBeaverClient;

	beforeEach(() => {
		jest.useFakeTimers();
		requestMock = jest.fn();
		client = new CloudBeaverClient(requestMock as RequestFn);
	});

	afterEach(() => jest.useRealTimers());

	it('first poll fires after 50ms, not 500ms', async () => {
		requestMock
			.mockResolvedValueOnce({
				data: { asyncTaskInfo: { id: 't1', running: true, status: 'Running', error: null } },
			})
			.mockResolvedValueOnce({
				data: { asyncTaskInfo: { id: 't1', running: false, status: 'Finished', error: null } },
			});

		const pollPromise = client.pollTask('t1', 60_000);

		expect(requestMock).toHaveBeenCalledTimes(1);

		await jest.advanceTimersByTimeAsync(50);
		expect(requestMock).toHaveBeenCalledTimes(2);

		await pollPromise;
	});

	it('interval caps at 500ms after several misses', async () => {
		const running = {
			data: { asyncTaskInfo: { id: 't2', running: true, status: 'Running', error: null } },
		};
		const done = {
			data: { asyncTaskInfo: { id: 't2', running: false, status: 'Finished', error: null } },
		};

		requestMock
			.mockResolvedValueOnce(running)
			.mockResolvedValueOnce(running)
			.mockResolvedValueOnce(running)
			.mockResolvedValueOnce(running)
			.mockResolvedValueOnce(running)
			.mockResolvedValueOnce(done);

		const pollPromise = client.pollTask('t2', 60_000);

		expect(requestMock).toHaveBeenCalledTimes(1);
		await jest.advanceTimersByTimeAsync(50);
		expect(requestMock).toHaveBeenCalledTimes(2);
		await jest.advanceTimersByTimeAsync(100);
		expect(requestMock).toHaveBeenCalledTimes(3);
		await jest.advanceTimersByTimeAsync(200);
		expect(requestMock).toHaveBeenCalledTimes(4);
		await jest.advanceTimersByTimeAsync(400);
		expect(requestMock).toHaveBeenCalledTimes(5);
		await jest.advanceTimersByTimeAsync(500);
		expect(requestMock).toHaveBeenCalledTimes(6);

		await pollPromise;
	});
});
