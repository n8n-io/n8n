import type { IExecuteFunctions } from 'n8n-workflow';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { execute } from './message.operation';

const apiRequestMock = vi.hoisted(() => vi.fn());

vi.mock('../../transport', () => ({
	apiRequest: apiRequestMock,
}));

vi.mock('@utils/helpers', () => ({
	getConnectedTools: vi.fn().mockResolvedValue([]),
}));

vi.mock('n8n-workflow', async () => ({
	...(await vi.importActual('n8n-workflow')),
	accumulateTokenUsage: vi.fn(),
	updateDisplayOptions: vi.fn((_, props) => props),
}));

const baseResponse = {
	stop_reason: 'end_turn',
	content: [{ type: 'text', text: 'Hello' }],
	usage: { input_tokens: 10, output_tokens: 5 },
};

describe('message.operation', () => {
	const executeFunctionsMock = mockDeep<IExecuteFunctions>();

	beforeEach(() => {
		vi.clearAllMocks();
		executeFunctionsMock.getNodeInputs.mockReturnValue([]);
		executeFunctionsMock.getExecutionCancelSignal.mockReturnValue(undefined);
		apiRequestMock.mockResolvedValue(baseResponse);
	});

	function mockGetNodeParameter(overrides: Record<string, unknown> = {}) {
		const defaults: Record<string, unknown> = {
			modelId: 'claude-sonnet-4-5',
			'messages.values': [{ role: 'user', content: 'Hello' }],
			addAttachments: false,
			simplify: true,
			options: {},
			'options.maxToolsIterations': 15,
			...overrides,
		};

		executeFunctionsMock.getNodeParameter.mockImplementation(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(param: string, _i: unknown, defaultValue?: unknown): any =>
				param in defaults ? defaults[param] : defaultValue,
		);
	}

	type CallBody = {
		body: {
			mcp_servers?: Array<Record<string, unknown>>;
			tools?: Array<Record<string, unknown>>;
		};
		enableAnthropicBetas?: Record<string, unknown>;
	};

	function getFirstCallParams(): CallBody {
		return apiRequestMock.mock.calls[0][2] as CallBody;
	}

	describe('MCP Servers', () => {
		it('should not include mcp_servers when toggle is off', async () => {
			mockGetNodeParameter({
				options: { enableMcpToolset: false },
			});

			await execute.call(executeFunctionsMock, 0);

			const params = getFirstCallParams();
			expect(params.body.mcp_servers).toBeUndefined();
			expect(params.enableAnthropicBetas).toMatchObject({ mcpClient: false });
		});

		it('should not inject mcp_client entries into tools when toggle is off', async () => {
			mockGetNodeParameter({
				options: {
					enableMcpToolset: false,
					mcpServers: {
						values: [{ name: 'srv', url: 'https://mcp.example.com/mcp', authorizationToken: '' }],
					},
				},
			});

			await execute.call(executeFunctionsMock, 0);

			const params = getFirstCallParams();
			const mcpToolsets = (params.body.tools ?? []).filter((t) => t.name === 'mcp_client');
			expect(mcpToolsets).toHaveLength(0);
		});

		it('should include mcp_servers array when toggle is on', async () => {
			mockGetNodeParameter({
				options: {
					enableMcpToolset: true,
					mcpServers: {
						values: [
							{
								name: 'example_mcp',
								url: 'https://mcp.example.com/mcp',
								authorizationToken: 'tok_abc',
							},
						],
					},
				},
			});

			await execute.call(executeFunctionsMock, 0);

			const params = getFirstCallParams();
			expect(params.body.mcp_servers).toEqual([
				{
					type: 'url',
					name: 'example_mcp',
					url: 'https://mcp.example.com/mcp',
					authorization_token: 'tok_abc',
				},
			]);
		});

		it('should inject one mcp_client per server into the tools array', async () => {
			mockGetNodeParameter({
				options: {
					enableMcpToolset: true,
					mcpServers: {
						values: [
							{ name: 'example_mcp', url: 'https://mcp.example.com/mcp', authorizationToken: '' },
						],
					},
				},
			});

			await execute.call(executeFunctionsMock, 0);

			const params = getFirstCallParams();
			expect(params.body.tools).toEqual(
				expect.arrayContaining([
					{ name: 'mcp_client', type: 'mcp_client_20251120', mcp_server_name: 'example_mcp' },
				]),
			);
		});

		it('should inject one mcp_client per server when multiple servers are configured', async () => {
			mockGetNodeParameter({
				options: {
					enableMcpToolset: true,
					mcpServers: {
						values: [
							{ name: 'server-a', url: 'https://mcp.example1.com/sse', authorizationToken: '' },
							{ name: 'server-b', url: 'https://mcp.example2.com/sse', authorizationToken: 'tok' },
						],
					},
				},
			});

			await execute.call(executeFunctionsMock, 0);

			const params = getFirstCallParams();
			expect(params.body.mcp_servers).toHaveLength(2);
			expect(params.body.tools).toEqual(
				expect.arrayContaining([
					{ name: 'mcp_client', type: 'mcp_client_20251120', mcp_server_name: 'server-a' },
					{ name: 'mcp_client', type: 'mcp_client_20251120', mcp_server_name: 'server-b' },
				]),
			);
		});

		it('should omit authorization_token when left empty', async () => {
			mockGetNodeParameter({
				options: {
					enableMcpToolset: true,
					mcpServers: {
						values: [
							{
								name: 'public-server',
								url: 'https://mcp.example.com/mcp',
								authorizationToken: '',
							},
						],
					},
				},
			});

			await execute.call(executeFunctionsMock, 0);

			const params = getFirstCallParams();
			expect(params.body.mcp_servers![0]).not.toHaveProperty('authorization_token');
			expect(params.body.mcp_servers![0]).toMatchObject({
				type: 'url',
				name: 'public-server',
				url: 'https://mcp.example.com/mcp',
			});
		});

		it('should include mcpClient beta when toggle is on', async () => {
			mockGetNodeParameter({
				options: {
					enableMcpToolset: true,
					mcpServers: {
						values: [{ name: 'srv', url: 'https://mcp.example.com/mcp', authorizationToken: '' }],
					},
				},
			});

			await execute.call(executeFunctionsMock, 0);

			const params = getFirstCallParams();
			expect(params.enableAnthropicBetas).toMatchObject({ mcpClient: true });
		});

		it('should work alongside other beta flags (e.g. codeExecution) when both are enabled', async () => {
			mockGetNodeParameter({
				options: {
					codeExecution: true,
					enableMcpToolset: true,
					mcpServers: {
						values: [{ name: 'srv', url: 'https://mcp.example.com/mcp', authorizationToken: '' }],
					},
				},
			});

			await execute.call(executeFunctionsMock, 0);

			const params = getFirstCallParams();
			expect(params.enableAnthropicBetas).toMatchObject({
				codeExecution: true,
				mcpClient: true,
			});
		});
	});
});
