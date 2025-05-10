import * as fill from '../../../actions/interaction/fill.operation';
import { ERROR_MESSAGES } from '../../../constants';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

const baseNodeParameters = {
	resource: 'interaction',
	operation: 'fill',
	sessionId: 'test-session-123',
	windowId: 'win-123',
	formData: 'Name: John Doe, Email: john@example.com',
};

const mockAsyncResponse = {
	requestId: 'req-123',
	status: 'pending',
};

const mockCompletedResponse = {
	status: 'completed',
	data: {
		success: true,
		message: 'Form filled successfully',
	},
};

jest.mock('../../../transport', () => {
	const originalModule = jest.requireActual<typeof transport>('../../../transport');
	return {
		...originalModule,
		apiRequest: jest.fn(),
	};
});

describe('Test Airtop, fill form operation', () => {
	afterAll(() => {
		jest.unmock('../../../transport');
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should execute fill operation successfully', async () => {
		const apiRequestMock = transport.apiRequest as jest.Mock;

		// Mock the initial async request
		apiRequestMock.mockResolvedValueOnce(mockAsyncResponse);

		// Mock the status check to return completed after first pending
		apiRequestMock
			.mockResolvedValueOnce({ ...mockAsyncResponse })
			.mockResolvedValueOnce(mockCompletedResponse);

		const result = await fill.execute.call(createMockExecuteFunction(baseNodeParameters), 0);

		expect(apiRequestMock).toHaveBeenCalledWith(
			'POST',
			'/async/sessions/test-session-123/windows/win-123/execute-automation',
			{
				automationId: 'auto',
				parameters: {
					customData: 'Name: John Doe, Email: john@example.com',
				},
			},
		);

		expect(apiRequestMock).toHaveBeenCalledWith('GET', '/requests/req-123/status');

		expect(result).toEqual([
			{
				json: {
					sessionId: baseNodeParameters.sessionId,
					windowId: baseNodeParameters.windowId,
					status: 'completed',
					data: {
						success: true,
						message: 'Form filled successfully',
					},
				},
			},
		]);
	});

	it("should throw error when 'formData' parameter is empty", async () => {
		const nodeParameters = {
			...baseNodeParameters,
			formData: '',
		};

		await expect(fill.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			ERROR_MESSAGES.REQUIRED_PARAMETER.replace('{{field}}', 'Form Data'),
		);
	});

	it('should throw error when operation times out after 2 sec', async () => {
		const apiRequestMock = transport.apiRequest as jest.Mock;
		const nodeParameters = {
			...baseNodeParameters,
		};
		const timeout = 2000;

		// Mock the initial async request
		apiRequestMock.mockResolvedValueOnce(mockAsyncResponse);

		// Return pending on all requests
		apiRequestMock.mockResolvedValue({ ...mockAsyncResponse });

		// should throw NodeApiError
		await expect(
			fill.execute.call(createMockExecuteFunction(nodeParameters), 0, timeout),
		).rejects.toThrow('The service was not able to process your request');
	});

	it('should handle error status in response', async () => {
		const apiRequestMock = transport.apiRequest as jest.Mock;
		const errorResponse = {
			status: 'error',
			error: {
				message: 'Failed to fill form',
			},
		};

		// Mock the initial async request
		apiRequestMock.mockResolvedValueOnce(mockAsyncResponse);

		// Mock the status check to return error
		apiRequestMock
			.mockResolvedValueOnce({ ...mockAsyncResponse })
			.mockResolvedValueOnce(errorResponse);

		const result = await fill.execute.call(createMockExecuteFunction(baseNodeParameters), 0);

		expect(result).toEqual([
			{
				json: {
					sessionId: baseNodeParameters.sessionId,
					windowId: baseNodeParameters.windowId,
					status: 'error',
					error: {
						message: 'Failed to fill form',
					},
				},
			},
		]);
	});
});
