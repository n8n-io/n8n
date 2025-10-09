import nock from 'nock';

import * as type from '../../../actions/interaction/type.operation';
import { ERROR_MESSAGES } from '../../../constants';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

const baseNodeParameters = {
	resource: 'interaction',
	operation: 'type',
	sessionId: 'test-session-123',
	windowId: 'win-123',
	text: 'Hello World',
	pressEnterKey: false,
	elementDescription: '',
	additionalFields: {},
};

const mockResponse = {
	success: true,
	message: 'Text typed successfully',
};

jest.mock('../../../transport', () => {
	const originalModule = jest.requireActual<typeof transport>('../../../transport');
	return {
		...originalModule,
		apiRequest: jest.fn(async function () {
			return {
				status: 'success',
				data: mockResponse,
			};
		}),
	};
});

describe('Test Airtop, type operation', () => {
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

	it('should execute type with minimal parameters', async () => {
		const result = await type.execute.call(createMockExecuteFunction(baseNodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123/type',
			{
				configuration: {},
				text: 'Hello World',
				pressEnterKey: false,
				elementDescription: '',
			},
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: baseNodeParameters.sessionId,
					windowId: baseNodeParameters.windowId,
					status: 'success',
					data: mockResponse,
				},
			},
		]);
	});

	it("should throw error when 'text' parameter is empty", async () => {
		const nodeParameters = {
			...baseNodeParameters,
			text: '',
		};

		await expect(type.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			ERROR_MESSAGES.REQUIRED_PARAMETER.replace('{{field}}', 'Text'),
		);
	});

	it("should include 'elementDescription' parameter when specified", async () => {
		const nodeParameters = {
			...baseNodeParameters,
			elementDescription: 'the search box',
		};

		await type.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123/type',
			{
				configuration: {},
				text: 'Hello World',
				pressEnterKey: false,
				elementDescription: 'the search box',
			},
		);
	});

	it("should include 'pressEnterKey' parameter when specified", async () => {
		const nodeParameters = {
			...baseNodeParameters,
			pressEnterKey: true,
		};

		await type.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123/type',
			{
				configuration: {},
				text: 'Hello World',
				pressEnterKey: true,
				elementDescription: '',
			},
		);
	});

	it("should include 'waitForNavigation' parameter when specified", async () => {
		const nodeParameters = {
			...baseNodeParameters,
			additionalFields: {
				waitForNavigation: 'load',
			},
		};

		await type.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123/type',
			{
				configuration: {
					waitForNavigationConfig: {
						waitUntil: 'load',
					},
				},
				waitForNavigation: true,
				text: 'Hello World',
				pressEnterKey: false,
				elementDescription: '',
			},
		);
	});

	it("should include 'visualScope' parameter when specified", async () => {
		const nodeParameters = {
			...baseNodeParameters,
			additionalFields: {
				visualScope: 'viewport',
			},
		};

		await type.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123/type',
			{
				configuration: {
					visualAnalysis: {
						scope: 'viewport',
					},
				},
				text: 'Hello World',
				pressEnterKey: false,
				elementDescription: '',
			},
		);
	});
});
