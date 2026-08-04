import { getCurrentTaskInput } from '@langchain/langgraph';
import type { INodeTypeDescription } from 'n8n-workflow';
import type { MockedFunction } from 'vitest';

import {
	createWorkflow,
	createNode,
	createNodeType,
	nodeTypes,
	parseToolResult,
	createToolConfig,
	setupWorkflowState,
	expectToolError,
	type ParsedToolContent,
	createNodeTypeWithResourceLocator,
	mockResourceLocatorCallback,
	createResourceLocatorResults,
} from '../../../test/test-utils';
import type { ResourceLocatorCallback } from '../../types/callbacks';
import { createGetResourceLocatorOptionsTool } from '../get-resource-locator-options.tool';

vi.mock('@langchain/langgraph', () => ({
	getCurrentTaskInput: vi.fn(),
	Command: vi.fn(function (params: Record<string, unknown>) {
		return { content: JSON.stringify(params) };
	}),
}));

describe('getResourceLocatorOptions tool', () => {
	const mockGetCurrentTaskInput = getCurrentTaskInput as MockedFunction<typeof getCurrentTaskInput>;
	let parsedNodeTypes: INodeTypeDescription[];

	beforeEach(() => {
		vi.clearAllMocks();
		parsedNodeTypes = [
			nodeTypes.code,
			nodeTypes.httpRequest,
			createNodeTypeWithResourceLocator(
				'n8n-nodes-base.googleCalendar',
				'calendarId',
				'getCalendars',
			),
		];
	});

	describe('callback not provided', () => {
		it('should return error when callback is not available', async () => {
			const tool = createGetResourceLocatorOptionsTool(parsedNodeTypes, undefined).tool;
			const workflow = createWorkflow([
				createNode({
					id: 'calendar1',
					name: 'Google Calendar',
					type: 'n8n-nodes-base.googleCalendar',
					credentials: { googleCalendarOAuth2Api: { id: 'cred1', name: 'Google Calendar' } },
				}),
			]);

			setupWorkflowState(mockGetCurrentTaskInput, workflow);
			const config = createToolConfig('get_resource_locator_options', 'call-1');

			const result = await tool.invoke(
				{ nodeId: 'calendar1', parameterPath: 'calendarId' },
				config,
			);
			const content = parseToolResult<ParsedToolContent>(result);

			expectToolError(content, /Resource locator fetching is not available/);
		});
	});

	describe('node validation', () => {
		it('should return error when node is not found', async () => {
			const mockCallback = mockResourceLocatorCallback();
			const tool = createGetResourceLocatorOptionsTool(parsedNodeTypes, mockCallback).tool;
			const workflow = createWorkflow([]);

			setupWorkflowState(mockGetCurrentTaskInput, workflow);
			const config = createToolConfig('get_resource_locator_options', 'call-2');

			const result = await tool.invoke(
				{ nodeId: 'nonexistent', parameterPath: 'calendarId' },
				config,
			);
			const content = parseToolResult<ParsedToolContent>(result);

			expectToolError(content, /not found/i);
		});

		it('should return error when node type is not found', async () => {
			const mockCallback = mockResourceLocatorCallback();
			const tool = createGetResourceLocatorOptionsTool(parsedNodeTypes, mockCallback).tool;
			const workflow = createWorkflow([
				createNode({
					id: 'unknown1',
					name: 'Unknown Node',
					type: 'n8n-nodes-base.unknownNode',
					credentials: { api: { id: 'cred1', name: 'API' } },
				}),
			]);

			setupWorkflowState(mockGetCurrentTaskInput, workflow);
			const config = createToolConfig('get_resource_locator_options', 'call-3');

			const result = await tool.invoke({ nodeId: 'unknown1', parameterPath: 'calendarId' }, config);
			const content = parseToolResult<ParsedToolContent>(result);

			expectToolError(content, /Node type .* not found/i);
		});
	});

	describe('credentials validation', () => {
		it('should return error when node has no credentials', async () => {
			const mockCallback = mockResourceLocatorCallback();
			const tool = createGetResourceLocatorOptionsTool(parsedNodeTypes, mockCallback).tool;
			const workflow = createWorkflow([
				createNode({
					id: 'calendar1',
					name: 'Google Calendar',
					type: 'n8n-nodes-base.googleCalendar',
					// No credentials
				}),
			]);

			setupWorkflowState(mockGetCurrentTaskInput, workflow);
			const config = createToolConfig('get_resource_locator_options', 'call-4');

			const result = await tool.invoke(
				{ nodeId: 'calendar1', parameterPath: 'calendarId' },
				config,
			);
			const content = parseToolResult<ParsedToolContent>(result);

			expectToolError(content, /does not have credentials configured/i);
		});
	});

	describe('parameter validation', () => {
		it('should return error when parameter is not a resource locator', async () => {
			const mockCallback = mockResourceLocatorCallback();
			const tool = createGetResourceLocatorOptionsTool(parsedNodeTypes, mockCallback).tool;
			const workflow = createWorkflow([
				createNode({
					id: 'http1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					credentials: { httpBasicAuth: { id: 'cred1', name: 'HTTP Auth' } },
				}),
			]);

			setupWorkflowState(mockGetCurrentTaskInput, workflow);
			const config = createToolConfig('get_resource_locator_options', 'call-5');

			const result = await tool.invoke({ nodeId: 'http1', parameterPath: 'url' }, config);
			const content = parseToolResult<ParsedToolContent>(result);

			expectToolError(content, /not a resource locator/i);
		});
	});

	describe('successful fetch', () => {
		it('should return formatted options when callback succeeds', async () => {
			const mockResults = createResourceLocatorResults([
				{ name: 'Primary Calendar', value: 'primary' },
				{ name: 'Work Calendar', value: 'work@example.com' },
			]);
			const mockCallback = mockResourceLocatorCallback(mockResults);
			const tool = createGetResourceLocatorOptionsTool(parsedNodeTypes, mockCallback).tool;
			const workflow = createWorkflow([
				createNode({
					id: 'calendar1',
					name: 'Google Calendar',
					type: 'n8n-nodes-base.googleCalendar',
					credentials: { googleCalendarOAuth2Api: { id: 'cred1', name: 'Google Calendar' } },
				}),
			]);

			setupWorkflowState(mockGetCurrentTaskInput, workflow);
			const config = createToolConfig('get_resource_locator_options', 'call-6');

			const result = await tool.invoke(
				{ nodeId: 'calendar1', parameterPath: 'calendarId' },
				config,
			);
			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expect(message).toContain('<resource_locator_options');
			expect(message).toContain('<display_name>Primary Calendar</display_name>');
			expect(message).toContain('<id>primary</id>');
			expect(message).toContain('<display_name>Work Calendar</display_name>');
			expect(message).toContain('<total_count>2</total_count>');
		});

		it('should pass filter to callback when provided', async () => {
			const mockResults = createResourceLocatorResults([
				{ name: 'Filtered Calendar', value: 'filtered' },
			]);
			const mockCallback = mockResourceLocatorCallback(mockResults);
			const tool = createGetResourceLocatorOptionsTool(parsedNodeTypes, mockCallback).tool;
			const workflow = createWorkflow([
				createNode({
					id: 'calendar1',
					name: 'Google Calendar',
					type: 'n8n-nodes-base.googleCalendar',
					credentials: { googleCalendarOAuth2Api: { id: 'cred1', name: 'Google Calendar' } },
				}),
			]);

			setupWorkflowState(mockGetCurrentTaskInput, workflow);
			const config = createToolConfig('get_resource_locator_options', 'call-7');

			await tool.invoke(
				{ nodeId: 'calendar1', parameterPath: 'calendarId', filter: 'work' },
				config,
			);

			expect(mockCallback).toHaveBeenCalledWith(
				'getCalendars',
				'parameters.calendarId',
				{ name: 'n8n-nodes-base.googleCalendar', version: 1 },
				{},
				{ googleCalendarOAuth2Api: { id: 'cred1', name: 'Google Calendar' } },
				'work',
			);
		});

		it('should fetch options for parameters using loadOptionsMethod', async () => {
			const mockResults = createResourceLocatorResults([
				{ name: 'Engineering', value: 'team-eng' },
				{ name: 'Support', value: 'team-support' },
			]);
			const mockCallback = mockResourceLocatorCallback(mockResults);
			const tool = createGetResourceLocatorOptionsTool(
				[
					...parsedNodeTypes,
					createNodeType({
						name: 'n8n-nodes-base.linear',
						displayName: 'Linear',
						credentials: [{ name: 'linearOAuth2Api', required: true }],
						properties: [
							{
								displayName: 'Team Name or ID',
								name: 'teamId',
								type: 'options',
								default: '',
								typeOptions: {
									loadOptionsMethod: 'getTeams',
								},
							},
						],
					}),
				],
				mockCallback,
			).tool;
			const credentials = { linearOAuth2Api: { id: 'cred1', name: 'Linear' } };
			const workflow = createWorkflow([
				createNode({
					id: 'linear1',
					name: 'Linear',
					type: 'n8n-nodes-base.linear',
					credentials,
					parameters: { resource: 'issue' },
				}),
			]);

			setupWorkflowState(mockGetCurrentTaskInput, workflow);
			const config = createToolConfig('get_resource_locator_options', 'call-load-options');

			const result = await tool.invoke({ nodeId: 'linear1', parameterPath: 'teamId' }, config);
			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expect(message).toContain('<display_name>Engineering</display_name>');
			expect(message).toContain('<id>team-eng</id>');
			expect(message).toContain('<display_name>Support</display_name>');
			expect(mockCallback).toHaveBeenCalledWith(
				'getTeams',
				'parameters.teamId',
				{ name: 'n8n-nodes-base.linear', version: 1 },
				{ resource: 'issue' },
				credentials,
				undefined,
			);
		});

		it('should handle empty results', async () => {
			const mockResults = createResourceLocatorResults([]);
			const mockCallback = mockResourceLocatorCallback(mockResults);
			const tool = createGetResourceLocatorOptionsTool(parsedNodeTypes, mockCallback).tool;
			const workflow = createWorkflow([
				createNode({
					id: 'calendar1',
					name: 'Google Calendar',
					type: 'n8n-nodes-base.googleCalendar',
					credentials: { googleCalendarOAuth2Api: { id: 'cred1', name: 'Google Calendar' } },
				}),
			]);

			setupWorkflowState(mockGetCurrentTaskInput, workflow);
			const config = createToolConfig('get_resource_locator_options', 'call-8');

			const result = await tool.invoke(
				{ nodeId: 'calendar1', parameterPath: 'calendarId' },
				config,
			);
			const content = parseToolResult<ParsedToolContent>(result);
			const message = content.update.messages[0]?.kwargs.content;

			expect(message).toContain('No options available');
		});
	});

	describe('callback errors', () => {
		it('should handle callback errors gracefully', async () => {
			const mockCallback = vi
				.fn()
				.mockRejectedValue(
					new Error('API rate limit exceeded'),
				) as MockedFunction<ResourceLocatorCallback>;
			const tool = createGetResourceLocatorOptionsTool(parsedNodeTypes, mockCallback).tool;
			const workflow = createWorkflow([
				createNode({
					id: 'calendar1',
					name: 'Google Calendar',
					type: 'n8n-nodes-base.googleCalendar',
					credentials: { googleCalendarOAuth2Api: { id: 'cred1', name: 'Google Calendar' } },
				}),
			]);

			setupWorkflowState(mockGetCurrentTaskInput, workflow);
			const config = createToolConfig('get_resource_locator_options', 'call-9');

			const result = await tool.invoke(
				{ nodeId: 'calendar1', parameterPath: 'calendarId' },
				config,
			);
			const content = parseToolResult<ParsedToolContent>(result);

			expectToolError(content, /Failed to fetch options.*API rate limit exceeded/i);
		});

		it('should handle callback timeout', async () => {
			const mockCallback = vi.fn().mockImplementation(
				async () =>
					await new Promise((_, reject) => {
						setTimeout(() => reject(new Error('Request timed out')), 100);
					}),
			) as MockedFunction<ResourceLocatorCallback>;
			const tool = createGetResourceLocatorOptionsTool(parsedNodeTypes, mockCallback).tool;
			const workflow = createWorkflow([
				createNode({
					id: 'calendar1',
					name: 'Google Calendar',
					type: 'n8n-nodes-base.googleCalendar',
					credentials: { googleCalendarOAuth2Api: { id: 'cred1', name: 'Google Calendar' } },
				}),
			]);

			setupWorkflowState(mockGetCurrentTaskInput, workflow);
			const config = createToolConfig('get_resource_locator_options', 'call-10');

			const result = await tool.invoke(
				{ nodeId: 'calendar1', parameterPath: 'calendarId' },
				config,
			);
			const content = parseToolResult<ParsedToolContent>(result);

			expectToolError(content, /Failed to fetch options.*timed out/i);
		});
	});
});
