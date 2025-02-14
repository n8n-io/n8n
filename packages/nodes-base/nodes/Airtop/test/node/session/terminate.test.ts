import nock from 'nock';

import * as terminate from '../../../actions/session/terminate.operation';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

jest.mock('../../../transport', () => {
	const originalModule = jest.requireActual('../../../transport');
	return {
		...originalModule,
		apiRequest: jest.fn(async function () {
			return {
				status: 'success',
			};
		}),
	};
});

describe('Test Airtop, session terminate operation', () => {
	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
		jest.unmock('../../../transport');
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should terminate a session successfully', async () => {
		const nodeParameters = {
			resource: 'session',
			operation: 'terminate',
			sessionId: 'test-session-123',
		};

		const result = await terminate.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith('DELETE', '/sessions/test-session-123');

		expect(result).toEqual([
			{
				json: {
					success: true,
				},
			},
		]);
	});

	it('should throw error when sessionId is empty', async () => {
		const nodeParameters = {
			resource: 'session',
			operation: 'terminate',
			sessionId: '',
		};

		await expect(
			terminate.execute.call(createMockExecuteFunction(nodeParameters), 0),
		).rejects.toThrow('Session ID is required');
	});

	it('should throw error when sessionId is whitespace', async () => {
		const nodeParameters = {
			resource: 'session',
			operation: 'terminate',
			sessionId: '   ',
		};

		await expect(
			terminate.execute.call(createMockExecuteFunction(nodeParameters), 0),
		).rejects.toThrow('Session ID is required');
	});
});
