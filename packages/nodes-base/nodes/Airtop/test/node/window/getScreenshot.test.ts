import nock from 'nock';

import * as getScreenshot from '../../../actions/window/getScreenshot.operation';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

const baseNodeParameters = {
	resource: 'window',
	operation: 'getScreenshot',
	sessionId: 'test-session-123',
	windowId: 'win-123',
};

const mockResponse = {
	data: {
		meta: {
			screenshots: [{ dataUrl: 'base64-encoded-image-data' }],
		},
	},
};

jest.mock('../../../transport', () => {
	const originalModule = jest.requireActual<typeof transport>('../../../transport');
	return {
		...originalModule,
		apiRequest: jest.fn(async function () {
			return {
				status: 'success',
				data: mockResponse.data,
			};
		}),
	};
});

describe('Test Airtop, take screenshot operation', () => {
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

	it('should take screenshot successfully', async () => {
		const result = await getScreenshot.execute.call(
			createMockExecuteFunction({ ...baseNodeParameters }),
			0,
		);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123/screenshot',
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
					windowId: 'win-123',
					status: 'success',
					data: mockResponse.data,
				},
			},
		]);
	});

	it('should throw error when sessionId is empty', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			sessionId: '',
		};

		await expect(
			getScreenshot.execute.call(createMockExecuteFunction(nodeParameters), 0),
		).rejects.toThrow('Session ID is required');
	});

	it('should throw error when windowId is empty', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			windowId: '',
		};

		await expect(
			getScreenshot.execute.call(createMockExecuteFunction(nodeParameters), 0),
		).rejects.toThrow('Window ID is required');
	});
});
