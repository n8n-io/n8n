import type { ILoadOptionsFunctions } from 'n8n-workflow';

import * as run from '../../../actions/agent/run.operation';
import { ERROR_MESSAGES, BASE_URL_V2, AIRTOP_HOOKS_BASE_URL } from '../../../constants';
import * as methods from '../../../methods';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

const AGENTS_ENDPOINT = `${BASE_URL_V2}/agents`;
const AGENTS_HOOKS_ENDPOINT = `${AIRTOP_HOOKS_BASE_URL}/agents`;

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

const mockAgentsListResponse = {
	agents: [
		{ id: 'agent-1', name: 'Test Agent 1', enabled: true },
		{ id: 'agent-2', name: 'Test Agent 2', enabled: true },
		{ id: 'agent-3', name: 'Another Agent', enabled: true },
	],
};

const mockAgentDetailsResponse = {
	id: 'test-agent-123',
	name: 'Test Agent',
	enabled: true,
	publishedVersion: 1,
	webhookId: 'test-webhook',
	versionData: {
		configVarsSchema: {
			properties: {
				url: { type: 'string', description: 'The URL to process' },
				maxResults: { type: 'number', description: 'Maximum results to return' },
				includeMetadata: { type: 'boolean', description: 'Include metadata in response' },
			},
			required: ['url'],
		},
	},
};

const createMockLoadOptionsFunction = (
	nodeParameters: Record<string, unknown> = {},
): ILoadOptionsFunctions => {
	return {
		getCurrentNodeParameter(parameterName: string) {
			return nodeParameters[parameterName];
		},
		getCredentials: jest.fn(),
		getNode: () => ({
			id: '1',
			name: 'Airtop node',
			typeVersion: 1,
			type: 'n8n-nodes-base.airtop',
			position: [10, 10],
			parameters: {},
		}),
	} as unknown as ILoadOptionsFunctions;
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
		jest.resetAllMocks();
	});

	it('should list available agents', async () => {
		const apiRequestMock = transport.apiRequest as jest.Mock;
		apiRequestMock.mockResolvedValueOnce(mockAgentsListResponse);

		const mockLoadOptions = createMockLoadOptionsFunction();
		const result = await methods.listSearchAgents.call(mockLoadOptions, '');

		expect(apiRequestMock).toHaveBeenCalledTimes(1);
		expect(apiRequestMock).toHaveBeenCalledWith(
			'GET',
			AGENTS_ENDPOINT,
			{},
			{ createdByMe: true, limit: 50, enabled: true, published: true, name: '' },
		);

		expect(result).toEqual({
			results: [
				{ name: 'Another Agent', value: 'agent-3' },
				{ name: 'Test Agent 1', value: 'agent-1' },
				{ name: 'Test Agent 2', value: 'agent-2' },
			],
		});
	});

	it('should get agent input parameters schema for selected agent ID', async () => {
		const apiRequestMock = transport.apiRequest as jest.Mock;
		apiRequestMock.mockResolvedValueOnce(mockAgentDetailsResponse);

		const mockLoadOptions = createMockLoadOptionsFunction({
			agentId: { mode: 'list', value: 'test-agent-123' },
		});

		const result = await methods.agentsResourceMapping.call(mockLoadOptions);

		expect(apiRequestMock).toHaveBeenCalledTimes(1);
		expect(apiRequestMock).toHaveBeenCalledWith('GET', `${AGENTS_ENDPOINT}/test-agent-123`);

		expect(result).toEqual({
			fields: [
				{
					id: 'includeMetadata',
					displayName: 'includeMetadata',
					defaultMatch: false,
					display: true,
					type: 'boolean',
					required: false,
				},
				{
					id: 'maxResults',
					displayName: 'maxResults',
					defaultMatch: false,
					display: true,
					type: 'number',
					required: false,
				},
				{
					id: 'url',
					displayName: 'url (required)',
					defaultMatch: false,
					display: true,
					type: 'string',
					required: true,
				},
			],
		});
	});

	it('should validate required agent parameters', async () => {
		const apiRequestMock = transport.apiRequest as jest.Mock;
		apiRequestMock.mockResolvedValueOnce(mockAgentDetailsResponse);

		const nodeParameters = {
			...baseNodeParameters,
			agentId: {
				mode: 'id',
				value: 'test-agent-123',
			},
			agentParameters: {
				mappingMode: 'defineBelow',
				value: {
					maxResults: 10, // url is required but missing
				},
				schema: [
					{ id: 'url', displayName: 'url (required)', type: 'string', required: true },
					{ id: 'maxResults', displayName: 'maxResults', type: 'number', required: false },
				],
			},
		};

		await expect(run.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			'Missing required parameters: url',
		);
	});

	it('should return invocationId without waiting for agent completion', async () => {
		const apiRequestMock = transport.apiRequest as jest.Mock;
		// First call: getAgentDetails
		apiRequestMock.mockResolvedValueOnce(mockAgentDetailsResponse);
		// Second call: invoke agent webhook
		apiRequestMock.mockResolvedValueOnce(mockInvocationResponse);

		const nodeParameters = {
			...baseNodeParameters,
			agentId: {
				mode: 'id',
				value: 'test-agent-123',
			},
			agentParameters: {
				mappingMode: 'defineBelow',
				value: {},
				schema: [],
			},
			awaitExecution: false,
		};

		const result = await run.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(apiRequestMock).toHaveBeenCalledTimes(2);

		// First call should be getAgentDetails
		expect(apiRequestMock).toHaveBeenNthCalledWith(1, 'GET', `${AGENTS_ENDPOINT}/test-agent-123`);

		// Second call should be the invocation
		expect(apiRequestMock).toHaveBeenNthCalledWith(
			2,
			'POST',
			`${AGENTS_HOOKS_ENDPOINT}/test-agent-123/webhooks/test-webhook`,
			{ configVars: {} },
		);

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

		// Mock getAgentDetails
		apiRequestMock.mockResolvedValueOnce(mockAgentDetailsResponse);

		// Mock the initial invocation request
		apiRequestMock.mockResolvedValueOnce(mockInvocationResponse);

		// Mock the first status check (still running, no output)
		apiRequestMock.mockResolvedValueOnce(mockAgentStatusResponseRunning);

		// Mock the second status check (completed with output)
		apiRequestMock.mockResolvedValueOnce(mockAgentStatusResponseWithOutput);

		const nodeParameters = {
			...baseNodeParameters,
			agentId: {
				mode: 'id',
				value: 'test-agent-123',
			},
			agentParameters: {
				mappingMode: 'defineBelow',
				value: {},
				schema: [],
			},
			awaitExecution: true,
			timeout: 600,
		};

		const result = await run.execute.call(createMockExecuteFunction(nodeParameters), 0);

		// Should have called apiRequest 4 times: 1 for getAgentDetails + 1 for invocation + 2 for status checks
		expect(apiRequestMock).toHaveBeenCalledTimes(4);

		// First call should be getAgentDetails
		expect(apiRequestMock).toHaveBeenNthCalledWith(1, 'GET', `${AGENTS_ENDPOINT}/test-agent-123`);

		// Second call should be the invocation
		expect(apiRequestMock).toHaveBeenNthCalledWith(
			2,
			'POST',
			`${AGENTS_HOOKS_ENDPOINT}/test-agent-123/webhooks/test-webhook`,
			{ configVars: {} },
		);

		// Third and fourth calls should be status checks
		expect(apiRequestMock).toHaveBeenNthCalledWith(
			3,
			'GET',
			`${AGENTS_HOOKS_ENDPOINT}/test-agent-123/invocations/invocation-123/result`,
		);

		expect(apiRequestMock).toHaveBeenNthCalledWith(
			4,
			'GET',
			`${AGENTS_HOOKS_ENDPOINT}/test-agent-123/invocations/invocation-123/result`,
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

	it('should throw an error if timeout is less than 10 seconds', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			timeout: 5, // Less than 10 seconds
		};

		await expect(run.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			ERROR_MESSAGES.AGENT_TIMEOUT_INVALID,
		);
	});

	it('should return empty results when no agents are available', async () => {
		const apiRequestMock = transport.apiRequest as jest.Mock;
		apiRequestMock.mockResolvedValueOnce({ agents: [] });

		const mockLoadOptions = createMockLoadOptionsFunction();
		const result = await methods.listSearchAgents.call(mockLoadOptions, '');

		expect(result).toEqual({ results: [] });
	});

	it('should return empty fields when agent has no parameters schema', async () => {
		const apiRequestMock = transport.apiRequest as jest.Mock;
		apiRequestMock.mockResolvedValueOnce({
			id: 'test-agent-123',
			name: 'Test Agent',
			enabled: true,
			publishedVersion: 1,
			webhookId: 'test-webhook',
			versionData: {},
		});

		const mockLoadOptions = createMockLoadOptionsFunction({
			agentId: { mode: 'list', value: 'test-agent-123' },
		});

		const result = await methods.agentsResourceMapping.call(mockLoadOptions);

		expect(result).toEqual({ fields: [] });
	});

	it('should filter agents by name when search filter is provided', async () => {
		const apiRequestMock = transport.apiRequest as jest.Mock;
		apiRequestMock.mockResolvedValueOnce(mockAgentsListResponse);

		const mockLoadOptions = createMockLoadOptionsFunction();
		await methods.listSearchAgents.call(mockLoadOptions, 'Test');

		expect(apiRequestMock).toHaveBeenCalledWith(
			'GET',
			AGENTS_ENDPOINT,
			{},
			{ createdByMe: true, limit: 50, enabled: true, published: true, name: 'Test' },
		);
	});

	it('should wrap agent parameters in configVars when executing', async () => {
		const apiRequestMock = transport.apiRequest as jest.Mock;
		// First call: getAgentDetails
		apiRequestMock.mockResolvedValueOnce(mockAgentDetailsResponse);
		// Second call: invoke agent webhook
		apiRequestMock.mockResolvedValueOnce(mockInvocationResponse);

		const nodeParameters = {
			...baseNodeParameters,
			agentId: {
				mode: 'id',
				value: 'test-agent-123',
			},
			agentParameters: {
				mappingMode: 'defineBelow',
				value: {
					url: 'https://example.com',
					maxResults: 10,
				},
				schema: [
					{ id: 'url', displayName: 'url (required)', type: 'string', required: true },
					{ id: 'maxResults', displayName: 'maxResults', type: 'number', required: false },
				],
			},
			awaitExecution: false,
		};

		await run.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(apiRequestMock).toHaveBeenCalledTimes(2);

		// First call should be getAgentDetails
		expect(apiRequestMock).toHaveBeenNthCalledWith(1, 'GET', `${AGENTS_ENDPOINT}/test-agent-123`);

		// Second call should be the invocation with configVars
		expect(apiRequestMock).toHaveBeenNthCalledWith(
			2,
			'POST',
			`${AGENTS_HOOKS_ENDPOINT}/test-agent-123/webhooks/test-webhook`,
			{
				configVars: {
					url: 'https://example.com',
					maxResults: 10,
				},
			},
		);
	});

	it('should pass all required parameters successfully', async () => {
		const apiRequestMock = transport.apiRequest as jest.Mock;
		apiRequestMock.mockResolvedValueOnce(mockAgentDetailsResponse);
		apiRequestMock.mockResolvedValueOnce(mockInvocationResponse);
		apiRequestMock.mockResolvedValueOnce(mockAgentStatusResponseWithOutput);

		const nodeParameters = {
			...baseNodeParameters,
			agentId: {
				mode: 'id',
				value: 'test-agent-123',
			},
			agentParameters: {
				mappingMode: 'defineBelow',
				value: {
					url: 'https://example.com',
					maxResults: 10,
					includeMetadata: true,
				},
				schema: [
					{ id: 'url', displayName: 'url (required)', type: 'string', required: true },
					{ id: 'maxResults', displayName: 'maxResults', type: 'number', required: false },
					{
						id: 'includeMetadata',
						displayName: 'includeMetadata',
						type: 'boolean',
						required: false,
					},
				],
			},
			awaitExecution: true,
		};

		const result = await run.execute.call(createMockExecuteFunction(nodeParameters), 0);

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
});
