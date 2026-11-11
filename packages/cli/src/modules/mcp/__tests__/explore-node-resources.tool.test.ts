import type { Mocked } from 'vitest';
import { User } from '@n8n/db';
import { NodeApiError, type INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { createExploreNodeResourcesTool } from '../tools/workflow-builder/explore-node-resources.tool';

import type { NodeResourceExplorerService } from '@/services/node-resource-explorer.service';
import type { Telemetry } from '@/telemetry';

vi.mock('@n8n/ai-workflow-builder', () => ({
	CODE_BUILDER_SEARCH_NODES_TOOL: { toolName: 'search_nodes', displayTitle: 'Search' },
	CODE_BUILDER_GET_NODE_TYPES_TOOL: { toolName: 'get_node_types', displayTitle: 'Get' },
	CODE_BUILDER_GET_SUGGESTED_NODES_TOOL: { toolName: 'get_suggested', displayTitle: 'Suggest' },
	CODE_BUILDER_VALIDATE_TOOL: { toolName: 'validate_workflow_code', displayTitle: 'Validate' },
	MCP_GET_SDK_REFERENCE_TOOL: { toolName: 'sdk_ref', displayTitle: 'SDK Ref' },
	MCP_CREATE_WORKFLOW_FROM_CODE_TOOL: { toolName: 'create_workflow', displayTitle: 'Create' },
	MCP_ARCHIVE_WORKFLOW_TOOL: { toolName: 'archive_workflow', displayTitle: 'Archive' },
	MCP_UPDATE_WORKFLOW_TOOL: { toolName: 'update_workflow', displayTitle: 'Update' },
	MCP_EXPLORE_NODE_RESOURCES_TOOL: {
		toolName: 'explore_node_resources',
		displayTitle: 'Exploring node resources',
	},
}));

describe('explore-node-resources MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	const node: INode = {
		id: 'node-1',
		name: 'AWS Lambda',
		type: 'n8n-nodes-base.awsLambda',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};
	let nodeResourceExplorerService: Mocked<NodeResourceExplorerService>;
	let telemetry: Mocked<Telemetry>;

	beforeEach(() => {
		vi.clearAllMocks();
		nodeResourceExplorerService = mock<NodeResourceExplorerService>();
		telemetry = mock<Telemetry>();
	});

	const createTool = () =>
		createExploreNodeResourcesTool(user, nodeResourceExplorerService, telemetry);

	const baseInput = {
		nodeType: 'n8n-nodes-base.slack',
		version: 2.3,
		methodName: 'getChannels',
		methodType: 'listSearch' as const,
		credentialType: 'slackApi',
		credentialId: 'cred-1',
		filter: undefined,
		paginationToken: undefined,
		currentNodeParameters: undefined,
	};

	test('delegates to the service and returns results with text + structured content', async () => {
		nodeResourceExplorerService.exploreResources.mockResolvedValue({
			results: [
				{ name: '#general', value: 'C123' },
				{ name: '#random', value: 'C456' },
			],
			paginationToken: 'next-page',
			builderHint: 'Pick a public channel',
		});

		const tool = createTool();
		const result = await tool.handler(baseInput, {} as never);

		expect(nodeResourceExplorerService.exploreResources).toHaveBeenCalledWith(user, {
			nodeType: 'n8n-nodes-base.slack',
			version: 2.3,
			methodName: 'getChannels',
			methodType: 'listSearch',
			credentialType: 'slackApi',
			credentialId: 'cred-1',
			filter: undefined,
			paginationToken: undefined,
			currentNodeParameters: undefined,
		});

		expect(result.structuredContent).toEqual({
			results: [
				{ name: '#general', value: 'C123' },
				{ name: '#random', value: 'C456' },
			],
			paginationToken: 'next-page',
			builderHint: 'Pick a public channel',
		});
		expect(result.content).toEqual([
			{ type: 'text', text: JSON.stringify(result.structuredContent) },
		]);
	});

	test('forwards filter, paginationToken, and currentNodeParameters when provided', async () => {
		nodeResourceExplorerService.exploreResources.mockResolvedValue({ results: [] });

		const tool = createTool();
		await tool.handler(
			{
				...baseInput,
				filter: 'general',
				paginationToken: 'tok',
				currentNodeParameters: { documentId: 'sheet-1' },
			},
			{} as never,
		);

		expect(nodeResourceExplorerService.exploreResources).toHaveBeenCalledWith(
			user,
			expect.objectContaining({
				filter: 'general',
				paginationToken: 'tok',
				currentNodeParameters: { documentId: 'sheet-1' },
			}),
		);
	});

	test('tracks telemetry on success with non-sensitive parameter summary', async () => {
		nodeResourceExplorerService.exploreResources.mockResolvedValue({
			results: [{ name: 'a', value: '1' }],
			paginationToken: 'p',
			builderHint: 'h',
		});

		const tool = createTool();
		await tool.handler({ ...baseInput, filter: 'g' }, {} as never);

		expect(telemetry.track).toHaveBeenCalledWith(
			USER_CALLED_MCP_TOOL_EVENT,
			expect.objectContaining({
				user_id: 'user-1',
				tool_name: 'explore_node_resources',
				parameters: {
					nodeType: 'n8n-nodes-base.slack',
					version: 2.3,
					methodName: 'getChannels',
					methodType: 'listSearch',
					credentialType: 'slackApi',
					hasFilter: true,
					hasPaginationToken: false,
					hasCurrentNodeParameters: false,
				},
				results: {
					success: true,
					data: {
						resultCount: 1,
						hasPaginationToken: true,
						hasBuilderHint: true,
					},
				},
			}),
		);
	});

	test('omits the credentialId from telemetry parameters', async () => {
		nodeResourceExplorerService.exploreResources.mockResolvedValue({ results: [] });

		const tool = createTool();
		await tool.handler(baseInput, {} as never);

		const payload = telemetry.track.mock.calls[0][1] as { parameters: Record<string, unknown> };
		expect(payload.parameters).not.toHaveProperty('credentialId');
	});

	test('tracks telemetry on failure and returns an error result', async () => {
		nodeResourceExplorerService.exploreResources.mockRejectedValueOnce(
			new Error('Credential cred-1 not found or not accessible'),
		);

		const tool = createTool();
		const result = await tool.handler(baseInput, {} as never);

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({
			results: [],
			error: 'Credential cred-1 not found or not accessible',
		});
		expect(result.content).toEqual([
			{ type: 'text', text: JSON.stringify(result.structuredContent) },
		]);

		expect(telemetry.track).toHaveBeenCalledWith(
			USER_CALLED_MCP_TOOL_EVENT,
			expect.objectContaining({
				user_id: 'user-1',
				tool_name: 'explore_node_resources',
				results: {
					success: false,
					error: 'Error',
				},
			}),
		);
	});

	test('returns the HTTP code and upstream error text of a NodeApiError', async () => {
		const upstreamText =
			'User: arn:aws:sts::123456789012:assumed-role/reader/session is not authorized to perform: lambda:ListFunctions';
		nodeResourceExplorerService.exploreResources.mockRejectedValueOnce(
			new NodeApiError(node, {
				httpCode: '403',
				message: 'Request failed with status code 403',
				response: { status: 403, data: { message: upstreamText } },
			}),
		);

		const tool = createTool();
		const result = await tool.handler(baseInput, {} as never);

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({
			results: [],
			error: 'Forbidden - perhaps check your credentials?',
			httpCode: '403',
			errorDescription: upstreamText,
		});
	});

	test('truncates long upstream error text', async () => {
		nodeResourceExplorerService.exploreResources.mockRejectedValueOnce(
			new NodeApiError(node, { httpCode: '400' }, { description: 'x'.repeat(10_000) }),
		);

		const tool = createTool();
		const result = await tool.handler(baseInput, {} as never);

		const { errorDescription } = result.structuredContent as { errorDescription: string };
		expect(errorDescription).toBe(`${'x'.repeat(4_000)}...`);
	});

	test('scrubs secrets from the upstream error text', async () => {
		nodeResourceExplorerService.exploreResources.mockRejectedValueOnce(
			new NodeApiError(
				node,
				{ httpCode: '401' },
				{ description: 'Token rejected: Bearer abcdef1234567890abcdef is expired' },
			),
		);

		const tool = createTool();
		const result = await tool.handler(baseInput, {} as never);

		const { errorDescription } = result.structuredContent as { errorDescription: string };
		expect(errorDescription).toBe('Token rejected: [REDACTED] is expired');
		expect(JSON.stringify(result.content)).not.toContain('abcdef1234567890abcdef');
	});

	test('scrubs a secret that crosses the truncation limit', async () => {
		const secret = 'abcdef1234567890abcdef';
		nodeResourceExplorerService.exploreResources.mockRejectedValueOnce(
			new NodeApiError(
				node,
				{ httpCode: '401' },
				{ description: `${'x'.repeat(3_985)} Bearer ${secret}` },
			),
		);

		const tool = createTool();
		const result = await tool.handler(baseInput, {} as never);

		const { errorDescription } = result.structuredContent as { errorDescription: string };
		expect(errorDescription).not.toContain(secret.slice(0, 4));
		expect(errorDescription).toBe(`${'x'.repeat(3_985)} [REDACTED]`);
	});

	test('scrubs secrets from the error message', async () => {
		nodeResourceExplorerService.exploreResources.mockRejectedValueOnce(
			new Error('Request rejected for Bearer abcdef1234567890abcdef'),
		);

		const tool = createTool();
		const result = await tool.handler(baseInput, {} as never);

		expect(result.structuredContent).toEqual({
			results: [],
			error: 'Request rejected for [REDACTED]',
		});
	});

	test('returns an error result that matches the output schema', async () => {
		nodeResourceExplorerService.exploreResources.mockRejectedValueOnce(
			new NodeApiError(node, { httpCode: '403' }, { description: 'Access denied' }),
		);

		const tool = createTool();
		const result = await tool.handler(baseInput, {} as never);

		const outputSchema = z.object(tool.config.outputSchema!);
		expect(outputSchema.safeParse(result.structuredContent).success).toBe(true);
	});

	test('does not include the raw error message in telemetry', async () => {
		nodeResourceExplorerService.exploreResources.mockRejectedValueOnce(
			new Error('Credential cred-secret-id not found or not accessible'),
		);

		const tool = createTool();
		await tool.handler(baseInput, {} as never);

		const payload = telemetry.track.mock.calls[0][1] as { results: { error: string } };
		expect(payload.results.error).not.toContain('cred-secret-id');
	});

	test('does not include the upstream error text in telemetry', async () => {
		nodeResourceExplorerService.exploreResources.mockRejectedValueOnce(
			new NodeApiError(node, { httpCode: '403' }, { description: 'arn:aws:iam::123456789012' }),
		);

		const tool = createTool();
		await tool.handler(baseInput, {} as never);

		const payload = telemetry.track.mock.calls[0][1] as { results: { error: string } };
		expect(payload.results.error).toBe('NodeApiError');
	});
});
