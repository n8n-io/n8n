import nock from 'nock';

import * as close from '../../../actions/window/close.operation';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

jest.mock('../../../transport', () => {
	const originalModule = jest.requireActual<typeof transport>('../../../transport');
	return {
		...originalModule,
		apiRequest: jest.fn(async function () {
			return {
				status: 'success',
				data: {
					closed: true,
				},
			};
		}),
	};
});

describe('Test Airtop, window close operation', () => {
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

	it('should close a window successfully', async () => {
		const nodeParameters = {
			resource: 'window',
			operation: 'close',
			sessionId: 'test-session-123',
			windowId: 'win-123',
		};

		const result = await close.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'DELETE',
			'/sessions/test-session-123/windows/win-123',
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
					windowId: 'win-123',
					status: 'success',
					data: {
						closed: true,
					},
				},
			},
		]);
	});

	it('should throw error when sessionId is empty', async () => {
		const nodeParameters = {
			resource: 'window',
			operation: 'close',
			sessionId: '',
			windowId: 'win-123',
		};

		await expect(close.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			'Session ID is required',
		);
	});

	it('should throw error when windowId is empty', async () => {
		const nodeParameters = {
			resource: 'window',
			operation: 'close',
			sessionId: 'test-session-123',
			windowId: '',
		};

		await expect(close.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			'Window ID is required',
		);
	});
});
