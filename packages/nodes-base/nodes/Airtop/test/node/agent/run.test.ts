import * as run from '../../../actions/agent/run.operation';
import { ERROR_MESSAGES } from '../../../constants';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

const baseNodeParameters = {
	resource: 'agent',
	operation: 'run',
	webhookUrl: 'https://api.airtop.ai/api/hooks/agents/test-agent-123/webhooks/test-webhook',
	agentParameters: '{"key": "value"}',
	awaitExecution: true,
	timeout: 600,
};

const mockInvocationResponse = {
	invocationId: 'invocation-123',
};

const mockAgentStatusResponseWithOutput = {
	status: 'Completed' as const,
	output: {
		result: 'success',
		data: { test: 'data' },
	},
};

const mockAgentStatusResponseRunning = {
	status: 'Running' as const,
};

jest.mock('../../../transport', () => {
	const originalModule = jest.requireActual<typeof transport>('../../../transport');
	return {
		...originalModule,
		apiRequest: jest.fn(),
	};
});

describe('Test Airtop, agent run operation', () => {
	afterAll(() => {
		jest.unmock('../../../transport');
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should return invocationId without waiting for agent completion', async () => {
		const apiRequestMock = transport.apiRequest as jest.Mock;
		apiRequestMock.mockResolvedValueOnce(mockInvocationResponse);

		const nodeParameters = {
			...baseNodeParameters,
			awaitExecution: false,
		};

		const result = await run.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(apiRequestMock).toHaveBeenCalledTimes(1);
		expect(apiRequestMock).toHaveBeenCalledWith('POST', baseNodeParameters.webhookUrl, {
			key: 'value',
		});

		expect(result).toEqual([
			{
				json: {
					invocationId: 'invocation-123',
				},
			},
		]);
	});

	it('should wait for agent until response contains an output', async () => {
		const apiRequestMock = transport.apiRequest as jest.Mock;

		// Mock the initial invocation request
		apiRequestMock.mockResolvedValueOnce(mockInvocationResponse);

		// Mock the first status check (still running, no output)
		apiRequestMock.mockResolvedValueOnce(mockAgentStatusResponseRunning);

		// Mock the second status check (completed with output)
		apiRequestMock.mockResolvedValueOnce(mockAgentStatusResponseWithOutput);

		const nodeParameters = {
			...baseNodeParameters,
			awaitExecution: true,
			timeout: 600,
		};

		const result = await run.execute.call(createMockExecuteFunction(nodeParameters), 0);

		// Should have called apiRequest 3 times: 1 for invocation + 2 for status checks
		expect(apiRequestMock).toHaveBeenCalledTimes(3);

		// First call should be the invocation
		expect(apiRequestMock).toHaveBeenNthCalledWith(1, 'POST', baseNodeParameters.webhookUrl, {
			key: 'value',
		});

		// Second and third calls should be status checks
		expect(apiRequestMock).toHaveBeenNthCalledWith(
			2,
			'GET',
			'https://api.airtop.ai/api/hooks/agents/test-agent-123/invocations/invocation-123/result',
		);

		expect(apiRequestMock).toHaveBeenNthCalledWith(
			3,
			'GET',
			'https://api.airtop.ai/api/hooks/agents/test-agent-123/invocations/invocation-123/result',
		);

		expect(result).toEqual([
			{
				json: {
					invocationId: 'invocation-123',
					status: 'Completed',
					output: {
						result: 'success',
						data: { test: 'data' },
					},
				},
			},
		]);
	});

	it('should throw an error when agentId is missing in the webhook URL', async () => {
		const apiRequestMock = transport.apiRequest as jest.Mock;
		apiRequestMock.mockResolvedValueOnce(mockInvocationResponse);

		const nodeParameters = {
			...baseNodeParameters,
			webhookUrl: 'https://api.airtop.ai/api/hooks/invalid-webhook',
			awaitExecution: true,
		};

		await expect(run.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			ERROR_MESSAGES.AGENT_INVALID_WEBHOOK_URL,
		);
	});

	it('should throw an error if timeout is less than 10 seconds', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			timeout: 5, // Less than 10 seconds
		};

		await expect(run.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			ERROR_MESSAGES.AGENT_TIMEOUT_INVALID,
		);
	});
});
