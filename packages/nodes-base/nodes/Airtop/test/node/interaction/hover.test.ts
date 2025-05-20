import nock from 'nock';

import * as hover from '../../../actions/interaction/hover.operation';
import { ERROR_MESSAGES } from '../../../constants';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

const baseNodeParameters = {
	resource: 'interaction',
	operation: 'hover',
	sessionId: 'test-session-123',
	windowId: 'win-123',
	elementDescription: 'the user profile image',
	additionalFields: {},
};

const mockResponse = {
	success: true,
	message: 'Hover interaction executed successfully',
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

describe('Test Airtop, hover operation', () => {
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

	it('should execute hover with minimal parameters', async () => {
		const result = await hover.execute.call(createMockExecuteFunction(baseNodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123/hover',
			{
				configuration: {},
				elementDescription: 'the user profile image',
			},
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
					windowId: 'win-123',
					status: 'success',
					data: mockResponse,
				},
			},
		]);
	});

	it("should throw error when 'elementDescription' parameter is empty", async () => {
		const nodeParameters = {
			...baseNodeParameters,
			elementDescription: '',
		};
		const errorMessage = ERROR_MESSAGES.REQUIRED_PARAMETER.replace(
			'{{field}}',
			'Element Description',
		);

		await expect(hover.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			errorMessage,
		);
	});

	it("should include 'visualScope' parameter when specified", async () => {
		const nodeParameters = {
			...baseNodeParameters,
			additionalFields: {
				visualScope: 'viewport',
			},
		};

		await hover.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123/hover',
			{
				configuration: {
					visualAnalysis: {
						scope: 'viewport',
					},
				},
				elementDescription: 'the user profile image',
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

		await hover.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123/hover',
			{
				configuration: {
					waitForNavigationConfig: {
						waitUntil: 'load',
					},
				},
				waitForNavigation: true,
				elementDescription: 'the user profile image',
			},
		);
	});
});
