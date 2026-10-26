import {
	NodeSearchEngine,
	suggestedNodesData,
	type SearchableNodeType,
} from '@n8n/ai-utilities/node-catalog';
import { validateNodeConfig } from '@n8n/workflow-sdk';
import { OperationalError } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { executeTool, parseToolInput } from '../../__tests__/tool-test-utils';
import { RESOURCE_EXPLORATION_UNAVAILABLE } from '../../constants/resource-exploration';
import type { InstanceAiContext } from '../../types';
import { addSetupPreference } from '../nodes/setup-preference';
import {
	createExecuteNodeTool,
	createGetNodeParameterOptionsTool,
	createGetNodeTypesTool,
	createSearchNodesTool,
} from '../nodes.tool';

vi.mock('@n8n/workflow-sdk', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/workflow-sdk')>()),
	validateNodeConfig: vi.fn(() => ({ valid: true, errors: [] })),
}));

function createMockContext(overrides: Partial<InstanceAiContext> = {}): InstanceAiContext {
	return {
		userId: 'user-1',
		workflowService: {
			list: vi.fn(),
			get: vi.fn(),
			getAsWorkflowJSON: vi.fn(),
			createFromWorkflowJSON: vi.fn(),
			updateFromWorkflowJSON: vi.fn(),
			archive: vi.fn(),
			delete: vi.fn(),
			publish: vi.fn(),
			unpublish: vi.fn(),
		},
		executionService: {
			list: vi.fn(),
			run: vi.fn(),
			getStatus: vi.fn(),
			getResult: vi.fn(),
			stop: vi.fn(),
			getDebugInfo: vi.fn(),
			getNodeOutput: vi.fn(),
		},
		credentialService: {
			list: vi.fn(),
			get: vi.fn(),
			delete: vi.fn(),
			test: vi.fn(),
		},
		nodeService: {
			listAvailable: vi.fn(),
			getDescription: vi.fn(),
			listSearchable: vi.fn(),
			exploreResources: vi.fn(),
		},
		dataTableService: {
			list: vi.fn(),
			create: vi.fn(),
			delete: vi.fn(),
			getSchema: vi.fn(),
			addColumn: vi.fn(),
			deleteColumn: vi.fn(),
			renameColumn: vi.fn(),
			queryRows: vi.fn(),
			insertRows: vi.fn(),
			updateRows: vi.fn(),
			deleteRows: vi.fn(),
		},
		permissions: {},
		...overrides,
	} as unknown as InstanceAiContext;
}

describe('nodes tools', () => {
	describe('search_nodes', () => {
		it('should search nodes by query and reuse the searchable node list reference', async () => {
			const searchableNodes = [
				{
					name: 'n8n-nodes-base.httpRequest',
					displayName: 'HTTP Request',
					description: 'Make HTTP requests',
					inputs: ['main'],
					outputs: ['main'],
					version: 1,
					codex: { alias: ['api'] },
				},
			];
			const context = createMockContext();
			(context.nodeService.listSearchable as Mock).mockResolvedValue(searchableNodes);
			(context.nodeService.getDescription as Mock).mockResolvedValue({
				properties: [{ type: 'credentialsSelect' }],
				credentials: [{ name: 'gmailOAuth2' }],
			});

			const tool = createSearchNodesTool(context);
			const first = await executeTool(tool, { query: 'http', limit: 5 } as never, {} as never);
			const second = await executeTool(tool, { query: 'http', limit: 5 } as never, {} as never);

			expect(context.nodeService.listSearchable).toHaveBeenCalledTimes(2);
			expect(first).toMatchObject({
				totalResults: 1,
				results: [expect.objectContaining({ name: 'n8n-nodes-base.httpRequest' })],
			});
			expect(second).toMatchObject({
				totalResults: 1,
				results: [expect.objectContaining({ name: 'n8n-nodes-base.httpRequest' })],
			});
			expect(context.nodeService.getDescription).toHaveBeenCalledTimes(2);
			expect(first).not.toHaveProperty('results.0.setupPreference');
		});

		it('should search nodes by connection type and enrich results with discriminators', async () => {
			const searchableNodes = [
				{
					name: 'n8n-nodes-base.slackTool',
					displayName: 'Slack Tool',
					description: 'Send messages to Slack from an AI agent',
					inputs: ['main'],
					outputs: ['ai_tool'],
					version: 1,
				},
			];
			const context = createMockContext();
			(context.nodeService.listSearchable as Mock).mockResolvedValue(searchableNodes);
			context.nodeService.listDiscriminators = vi.fn().mockResolvedValue({
				resource: ['message'],
			});

			const tool = createSearchNodesTool(context);
			const result = await executeTool(
				tool,
				{ connectionType: 'ai_tool', limit: 5 } as never,
				{} as never,
			);

			expect(context.nodeService.listDiscriminators).toHaveBeenCalledWith(
				'n8n-nodes-base.slackTool',
			);
			expect(result).toMatchObject({
				totalResults: 1,
				results: [
					expect.objectContaining({
						name: 'n8n-nodes-base.slackTool',
						discriminators: { resource: ['message'] },
					}),
				],
			});
		});

		it('surfaces aiGateway meta from searchable nodes through the search handler', async () => {
			const searchableNodes = [
				{
					name: 'n8n-nodes-base.firecrawl',
					displayName: 'Firecrawl',
					description: 'Scrape and crawl the web',
					inputs: ['main'],
					outputs: ['main'],
					version: 1,
					aiGateway: { supported: true, minVersion: 1 },
				},
			];
			const context = createMockContext();
			(context.nodeService.listSearchable as Mock).mockResolvedValue(searchableNodes);
			context.nodeService.listDiscriminators = vi.fn().mockResolvedValue(null);

			const tool = createSearchNodesTool(context);
			const result = await executeTool(
				tool,
				{ query: 'firecrawl', limit: 5 } as never,
				{} as never,
			);

			expect(result).toMatchObject({
				results: [
					expect.objectContaining({
						name: 'n8n-nodes-base.firecrawl',
						aiGateway: { supported: true, minVersion: 1 },
					}),
				],
			});
		});

		it("suggests the chat model for the user's configured provider on ai_languageModel requirements", async () => {
			const searchableNodes = [
				{
					name: '@n8n/n8n-nodes-langchain.agent',
					displayName: 'AI Agent',
					description: 'Reasoning agent',
					inputs: ['main'],
					outputs: ['main'],
					version: 1,
					builderHint: { inputs: { ai_languageModel: { required: true } } },
				},
			];
			const context = createMockContext();
			(context.nodeService.listSearchable as Mock).mockResolvedValue(searchableNodes);
			(context.credentialService.list as Mock).mockResolvedValue([
				{ id: 'cred-1', name: 'My Anthropic key', type: 'anthropicApi' },
			]);

			const tool = createSearchNodesTool(context);
			const result = await executeTool(tool, { query: 'agent', limit: 5 } as never, {} as never);

			expect(result).toMatchObject({
				results: [
					expect.objectContaining({
						subnodeRequirements: [
							expect.objectContaining({
								connectionType: 'ai_languageModel',
								suggestedNode: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
							}),
						],
					}),
				],
			});
		});

		it('does not suggest a chat model when no LLM credential is configured', async () => {
			const searchableNodes = [
				{
					name: '@n8n/n8n-nodes-langchain.agent',
					displayName: 'AI Agent',
					description: 'Reasoning agent',
					inputs: ['main'],
					outputs: ['main'],
					version: 1,
					builderHint: { inputs: { ai_languageModel: { required: true } } },
				},
			];
			const context = createMockContext();
			(context.nodeService.listSearchable as Mock).mockResolvedValue(searchableNodes);
			(context.credentialService.list as Mock).mockResolvedValue([]);

			const tool = createSearchNodesTool(context);
			const result = await executeTool(tool, { query: 'agent', limit: 5 } as never, {} as never);

			const [node] = (result as { results: Array<{ subnodeRequirements?: unknown[] }> }).results;
			expect(node.subnodeRequirements).toEqual([
				expect.not.objectContaining({ suggestedNode: expect.anything() }),
			]);
		});

		it('should return no search results when neither query nor connection type is provided', async () => {
			const context = createMockContext();
			(context.nodeService.listSearchable as Mock).mockResolvedValue([]);

			const tool = createSearchNodesTool(context);
			const result = await executeTool(tool, {});

			expect(result).toEqual({ results: [], totalResults: 0 });
		});
	});

	describe('setup preference', () => {
		it('should expose credential preferences without changing existing data or order', async () => {
			const expectedTelegram = addSetupPreference({}, ['telegramApi']).setupPreference;
			const expectedGmail = addSetupPreference({}, ['gmailOAuth2', 'googleApi']).setupPreference;
			const credentialsByNode = new Map([
				['n8n-nodes-base.gmail', ['gmailOAuth2', 'googleApi']],
				['n8n-nodes-base.httpRequest', ['gmailOAuth2']],
				['n8n-nodes-base.telegram', ['telegramApi']],
			]);
			const searchableNodes = [
				{
					name: 'n8n-nodes-base.telegram',
					displayName: 'Telegram',
					description: 'Send a notification message',
					inputs: ['main'],
					outputs: ['main'],
					version: 1,
					aiGateway: { supported: true, minVersion: 1 },
				},
				{
					name: 'n8n-nodes-base.unknownSetupability',
					displayName: 'Unknown Setupability',
					description: 'Send a notification message',
					inputs: ['main'],
					outputs: ['main'],
					version: 1,
				},
			] satisfies SearchableNodeType[];
			const expectedSearchResults = new NodeSearchEngine(searchableNodes).searchByName(
				'message',
				5,
			);
			const context = createMockContext();
			(context.nodeService.listSearchable as Mock).mockResolvedValue(searchableNodes);
			(context.nodeService.getDescription as Mock).mockImplementation((nodeType: string) => ({
				properties:
					nodeType === 'n8n-nodes-base.httpRequest' ? [{ type: 'credentialsSelect' }] : [],
				credentials: (credentialsByNode.get(nodeType) ?? []).map((name) => ({ name })),
			}));
			context.nodeService.listDiscriminators = vi.fn().mockResolvedValue({
				resource: ['message'],
			});

			const tool = createSearchNodesTool(context);
			const searchResult = await executeTool<{
				results: Array<{
					name: string;
					score: number;
					note?: string;
					aiGateway?: unknown;
					discriminators?: unknown;
					setupPreference?: unknown;
				}>;
			}>(tool, { query: 'message', limit: 5 } as never, {} as never);
			const suggestedResult = await executeTool<{
				results: Array<{
					suggestedNodes: Array<{
						name: string;
						note?: string;
						setupPreference?: unknown;
					}>;
				}>;
			}>(tool, { categories: ['notification'] });

			expect(searchResult.results.map(({ name, score }) => ({ name, score }))).toEqual(
				expectedSearchResults.map(({ name, score }) => ({ name, score })),
			);
			const searchTelegram = searchResult.results.find(
				(node) => node.name === 'n8n-nodes-base.telegram',
			);
			const searchUnknown = searchResult.results.find(
				(node) => node.name === 'n8n-nodes-base.unknownSetupability',
			);
			const notificationNodes = suggestedResult.results[0]?.suggestedNodes;
			const suggestedTelegram = notificationNodes?.find(
				(node) => node.name === 'n8n-nodes-base.telegram',
			);

			expect(searchTelegram).toMatchObject({
				aiGateway: { supported: true, minVersion: 1 },
				discriminators: { resource: ['message'] },
				setupPreference: expectedTelegram,
			});
			expect(suggestedTelegram?.setupPreference).toEqual(searchTelegram?.setupPreference);
			expect(searchUnknown).not.toHaveProperty('setupPreference');
			expect(notificationNodes?.map(({ name }) => name)).toEqual(
				suggestedNodesData.notification.nodes.map(({ name }) => name),
			);
			expect(notificationNodes?.find((node) => node.name === 'n8n-nodes-base.gmail')).toEqual({
				name: 'n8n-nodes-base.gmail',
				note: "Default to this because it's easy for users to setup",
				setupPreference: expectedGmail,
			});
			expect(
				notificationNodes?.find((node) => node.name === 'n8n-nodes-base.httpRequest'),
			).not.toHaveProperty('setupPreference');
		});
	});

	describe('get_node_parameter_options by methodName', () => {
		it('should return error when exploreResources is not available', async () => {
			const context = createMockContext();
			context.nodeService.exploreResources = undefined;

			const tool = createGetNodeParameterOptionsTool(context);
			const result = await executeTool(
				tool,
				{
					nodeType: 'n8n-nodes-base.googleSheets',
					version: 4.7,
					methodName: 'spreadSheetsSearch',
					methodType: 'listSearch' as const,
					credentialType: 'googleSheetsOAuth2Api',
					credentialId: 'cred1',
				},
				{} as never,
			);

			expect(result).toEqual({
				results: [],
				error: 'Resource exploration is not available.',
			});
		});

		it('should handle errors from exploreResources gracefully', async () => {
			const context = createMockContext();
			(context.nodeService.exploreResources as Mock).mockRejectedValue(new Error('Auth failed'));

			const tool = createGetNodeParameterOptionsTool(context);
			const result = await executeTool(
				tool,
				{
					nodeType: 'n8n-nodes-base.googleSheets',
					version: 4.7,
					methodName: 'spreadSheetsSearch',
					methodType: 'listSearch' as const,
					credentialType: 'googleSheetsOAuth2Api',
					credentialId: 'cred1',
				},
				{} as never,
			);

			expect(result).toEqual({
				results: [],
				error: 'Auth failed',
			});
		});

		it('should return the unavailable error when exploreResources refuses the lookup', async () => {
			const context = createMockContext();
			(context.nodeService.exploreResources as Mock).mockRejectedValue(
				new OperationalError(RESOURCE_EXPLORATION_UNAVAILABLE),
			);

			const tool = createGetNodeParameterOptionsTool(context);
			const result = await executeTool(
				tool,
				{
					nodeType: 'n8n-nodes-base.googleSheets',
					version: 4.7,
					methodName: 'spreadSheetsSearch',
					methodType: 'listSearch' as const,
					credentialType: 'googleSheetsOAuth2Api',
					credentialId: 'cred1',
				},
				{} as never,
			);

			expect(result).toEqual({
				results: [],
				error: 'Resource exploration is not available.',
			});
		});
	});

	describe('get_node_types', () => {
		it('activates model selection for model-bearing definitions', async () => {
			const context = createMockContext();
			context.nodeService.getNodeTypeDefinition = vi.fn().mockResolvedValue({
				content: 'export interface Params {\n  modelId?: string;\n}',
			});
			vi.mocked(context.nodeService.listSearchable).mockResolvedValue([
				{
					name: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
					displayName: 'OpenRouter Chat Model',
					description: '',
					version: 1,
					inputs: [],
					outputs: ['ai_languageModel'],
				},
			]);
			const loadSkill = vi.fn().mockResolvedValue(null);
			const tool = createGetNodeTypesTool(context);
			for (const nodeType of [
				'@n8n/n8n-nodes-langchain.lmChatOpenRouter',
				'@n8n/n8n-nodes-langchain.openAi',
				'@n8n/n8n-nodes-langchain.googleGemini',
				'@n8n/n8n-nodes-langchain.anthropic',
			]) {
				loadSkill.mockClear();
				const result = await executeTool(tool, { nodeTypes: [nodeType] }, { loadSkill });
				expect(result.definitions).toEqual([
					expect.objectContaining({ nodeType, content: expect.stringContaining('modelId') }),
				]);
				expect(loadSkill).toHaveBeenCalledExactlyOnceWith('model-selection');
			}
		});

		it('keeps model selection inactive for unrelated operations and failed definitions', async () => {
			const context = createMockContext();
			context.nodeService.getNodeTypeDefinition = vi
				.fn()
				.mockResolvedValueOnce({ content: 'export type Params = { fileId: string };' })
				.mockResolvedValueOnce({ error: 'Unknown node type' });
			vi.mocked(context.nodeService.listSearchable).mockResolvedValue([]);
			const loadSkill = vi.fn();
			const tool = createGetNodeTypesTool(context);
			await executeTool(
				tool,
				{
					nodeTypes: ['@n8n/n8n-nodes-langchain.openAi', 'missing.node'],
				},
				{ loadSkill },
			);
			expect(loadSkill).not.toHaveBeenCalled();
		});

		it('should require a non-empty nodeTypes list', () => {
			const tool = createGetNodeTypesTool(createMockContext());

			expect(parseToolInput(tool, {}).success).toBe(false);
			expect(parseToolInput(tool, { nodeTypes: [] }).success).toBe(false);
			expect(parseToolInput(tool, { nodeIds: ['n8n-nodes-base.gmailTool'] }).success).toBe(false);
			expect(
				parseToolInput(tool, { nodeTypes: [{ nodeId: 'n8n-nodes-base.gmail' }] }).success,
			).toBe(false);
			expect(parseToolInput(tool, { nodeTypes: ['n8n-nodes-base.gmail'] }).success).toBe(true);
		});

		it('should surface node-level builder hints from type definitions', async () => {
			const context = createMockContext({
				nodeService: {
					listAvailable: vi.fn(),
					getDescription: vi.fn(),
					listSearchable: vi.fn(),
					exploreResources: vi.fn(),
					getNodeTypeDefinition: vi.fn().mockResolvedValue({
						content: 'export type IfNode = unknown;',
						version: 'v23',
						builderHint: 'Always include options, conditions, and combinator.',
					}),
				},
			});

			const tool = createGetNodeTypesTool(context);
			const result = await executeTool(
				tool,
				{ nodeTypes: ['n8n-nodes-base.if'] } as never,
				{} as never,
			);

			expect(result).toEqual({
				definitions: [
					{
						nodeType: 'n8n-nodes-base.if',
						version: 'v23',
						content: 'export type IfNode = unknown;',
						builderHint: 'Always include options, conditions, and combinator.',
					},
				],
			});
		});

		it('should mark a retired node type as deprecated', async () => {
			const context = createMockContext({
				nodeService: {
					listAvailable: vi.fn(),
					getDescription: vi.fn(),
					listSearchable: vi.fn(),
					exploreResources: vi.fn(),
					getNodeTypeDefinition: vi.fn().mockResolvedValue({
						content: '/**\n * @deprecated This node type is retired.\n */',
						version: '1.1',
						builderHint: 'Use `n8n-nodes-base.httpRequestTool` instead.',
						deprecated: true,
					}),
				},
			});

			const tool = createGetNodeTypesTool(context);
			const result = await executeTool(
				tool,
				{
					nodeTypes: ['@n8n/n8n-nodes-langchain.toolHttpRequest'],
				} as never,
				{} as never,
			);

			// The definition is still returned. The caller decides what to do with it.
			expect(result).toEqual({
				definitions: [
					{
						nodeType: '@n8n/n8n-nodes-langchain.toolHttpRequest',
						version: '1.1',
						content: '/**\n * @deprecated This node type is retired.\n */',
						builderHint: 'Use `n8n-nodes-base.httpRequestTool` instead.',
						deprecated: true,
					},
				],
			});
		});
	});

	describe('get_node_types unavailable notice', () => {
		it('passes through why a node cannot run on this instance', async () => {
			const notice = 'Agents are disabled on this instance, so this node cannot run.';
			const context = createMockContext({
				nodeService: {
					listAvailable: vi.fn(),
					getDescription: vi.fn(),
					listSearchable: vi.fn(),
					exploreResources: vi.fn(),
					getNodeTypeDefinition: vi.fn().mockResolvedValue({
						content: 'export type MessageAnAgentNode = unknown;',
						version: 'v31',
						unavailable: notice,
					}),
				},
			});

			const tool = createGetNodeTypesTool(context);
			const result = await executeTool(
				tool,
				{ nodeTypes: ['n8n-nodes-base.messageAnAgent'] } as never,
				{} as never,
			);

			expect(result).toEqual({
				definitions: [
					{
						nodeType: 'n8n-nodes-base.messageAnAgent',
						version: 'v31',
						content: 'export type MessageAnAgentNode = unknown;',
						unavailable: notice,
					},
				],
			});
		});
	});

	describe('execute_node', () => {
		const executeInput = {
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: { parameters: { mode: 'manual' } },
		};

		it('should return a structured error when required execute fields are missing', async () => {
			const executeNodeService = { execute: vi.fn() };
			const tool = createExecuteNodeTool(createMockContext({ executeNodeService }));

			const result = await executeTool(tool, { type: 'n8n-nodes-base.set' } as never, {} as never);

			expect(result).toMatchObject({
				status: 'error',
				error: { message: expect.stringContaining('version') },
			});
			expect(executeNodeService.execute).not.toHaveBeenCalled();
		});

		it('should reject a config that fails schema validation before suspending', async () => {
			const executeNodeService = { execute: vi.fn() };
			const suspendFn = vi.fn();
			vi.mocked(validateNodeConfig).mockReturnValueOnce({
				valid: false,
				errors: [
					{ path: 'parameters.text', message: 'Required' },
					{ path: 'parameters.select', message: 'Invalid value', missingDiscriminator: true },
				],
			});
			const tool = createExecuteNodeTool(createMockContext({ executeNodeService }));

			const result = await executeTool(
				tool,
				executeInput as never,
				{
					suspend: suspendFn,
				} as never,
			);

			expect(result).toEqual({
				status: 'error',
				error: {
					message: 'Node parameters do not match the schema for n8n-nodes-base.set v3.4',
					issues: [{ path: 'parameters.text', message: 'Required' }],
				},
			});
			expect(suspendFn).not.toHaveBeenCalled();
			expect(executeNodeService.execute).not.toHaveBeenCalled();
		});

		it('should treat missing-discriminator-only validation errors as non-blocking', async () => {
			const executeNodeService = { execute: vi.fn() };
			const suspendFn = vi.fn();
			vi.mocked(validateNodeConfig).mockReturnValueOnce({
				valid: false,
				errors: [{ path: 'parameters.resource', message: 'Required', missingDiscriminator: true }],
			});
			const tool = createExecuteNodeTool(createMockContext({ executeNodeService }));

			await executeTool(tool, executeInput as never, { suspend: suspendFn } as never);

			expect(suspendFn).toHaveBeenCalledTimes(1);
		});

		it('should suspend for confirmation on the first call', async () => {
			const executeNodeService = { execute: vi.fn() };
			const suspendFn = vi.fn();
			const tool = createExecuteNodeTool(createMockContext({ executeNodeService }));

			await executeTool(tool, executeInput as never, { suspend: suspendFn } as never);

			expect(suspendFn).toHaveBeenCalledTimes(1);
			expect(suspendFn.mock.calls[0][0]).toEqual(
				expect.objectContaining({
					requestId: expect.any(String),
					message: 'manual',
					resourceName: 'n8n-nodes-base.set node',
					severity: 'warning',
				}),
			);
			expect(executeNodeService.execute).not.toHaveBeenCalled();
		});

		/** Mirrors Google Sheets: `create` is an operation of both resources, with its own label. */
		const splitNodeDescription = {
			name: 'n8n-nodes-base.googleSheets',
			displayName: 'Google Sheets',
			properties: [
				{
					name: 'resource',
					displayName: 'Resource',
					type: 'options',
					default: 'sheet',
					options: [
						{ name: 'Document', value: 'spreadsheet' },
						{ name: 'Sheet Within Document', value: 'sheet' },
					],
				},
				{
					name: 'operation',
					displayName: 'Operation',
					type: 'options',
					default: 'read',
					displayOptions: { show: { resource: ['sheet'] } },
					options: [
						{ name: 'Create Sheet', value: 'create' },
						{ name: 'Get Row(s)', value: 'read' },
					],
				},
				{
					name: 'operation',
					displayName: 'Operation',
					type: 'options',
					default: 'create',
					displayOptions: { show: { resource: ['spreadsheet'] } },
					options: [{ name: 'Create Document', value: 'create' }],
				},
			],
		};

		async function suspendPayloadFor(
			parameters: Record<string, unknown>,
			description: unknown = splitNodeDescription,
		) {
			const suspendFn = vi.fn();
			const context = createMockContext({ executeNodeService: { execute: vi.fn() } });
			(context.nodeService.getDescription as Mock).mockResolvedValue(description);

			await executeTool(
				createExecuteNodeTool(context),
				{
					type: 'n8n-nodes-base.googleSheets',
					version: 4.7,
					config: { parameters },
				} as never,
				{ suspend: suspendFn } as never,
			);

			return suspendFn.mock.calls[0][0];
		}

		it('should name the node in the title and the operation in the description', async () => {
			expect(await suspendPayloadFor({ resource: 'sheet', operation: 'create' })).toMatchObject({
				resourceName: 'Google Sheets node',
				message: 'Sheet Within Document > Create Sheet',
			});
		});

		it('should label a shared operation value by the resource it belongs to', async () => {
			expect(
				await suspendPayloadFor({ resource: 'spreadsheet', operation: 'create' }),
			).toMatchObject({ message: 'Document > Create Document' });
		});

		it('should fall back to the node defaults for omitted discriminators', async () => {
			expect(await suspendPayloadFor({ operation: 'create' })).toMatchObject({
				message: 'Sheet Within Document > Create Sheet',
			});
			expect(await suspendPayloadFor({})).toMatchObject({
				message: 'Sheet Within Document > Get Row(s)',
			});
		});

		it('should name the first headline parameter for a node without resource or operation', async () => {
			const httpRequest = {
				name: 'n8n-nodes-base.httpRequest',
				displayName: 'HTTP Request',
				properties: [
					{ name: 'method', displayName: 'Method', type: 'options', default: 'GET' },
					{ name: 'url', displayName: 'URL', type: 'string', default: '' },
				],
			};
			expect(
				await suspendPayloadFor(
					{ method: 'POST', url: 'https://example.com/v4/sheets' },
					httpRequest,
				),
			).toMatchObject({
				resourceName: 'HTTP Request node',
				message: 'https://example.com/v4/sheets',
			});
		});

		it('should prefer mode over the later headline parameters and label it', async () => {
			const set = {
				name: 'n8n-nodes-base.set',
				displayName: 'Edit Fields (Set)',
				properties: [
					{
						name: 'mode',
						displayName: 'Mode',
						type: 'options',
						default: 'manual',
						options: [
							{ name: 'Manual Mapping', value: 'manual' },
							{ name: 'JSON', value: 'raw' },
						],
					},
					{ name: 'url', displayName: 'URL', type: 'string', default: '' },
				],
			};
			expect(await suspendPayloadFor({ url: 'https://example.com' }, set)).toMatchObject({
				message: 'Manual Mapping',
			});
		});

		it('should fall back to a generic description when no parameter names the call', async () => {
			const filter = { name: 'n8n-nodes-base.filter', displayName: 'Filter', properties: [] };
			expect(await suspendPayloadFor({}, filter)).toMatchObject({
				resourceName: 'Filter node',
				message: 'Single run',
			});
		});

		it('should fall back to raw values when the node description does not resolve', async () => {
			const suspendFn = vi.fn();
			const context = createMockContext({ executeNodeService: { execute: vi.fn() } });
			(context.nodeService.getDescription as Mock).mockRejectedValue(new Error('not found'));

			await executeTool(
				createExecuteNodeTool(context),
				{
					type: 'n8n-nodes-base.slack',
					version: 2.3,
					config: { parameters: { resource: 'message', operation: 'post' } },
				} as never,
				{ suspend: suspendFn } as never,
			);

			expect(suspendFn.mock.calls[0][0]).toMatchObject({
				resourceName: 'n8n-nodes-base.slack node',
				message: 'message > post',
			});
		});

		it('should deny without suspending when the admin policy blocks node execution', async () => {
			const executeNodeService = { execute: vi.fn() };
			const suspendFn = vi.fn();
			const tool = createExecuteNodeTool(
				createMockContext({ executeNodeService, permissions: { executeNode: 'blocked' } as never }),
			);

			const result = await executeTool(
				tool,
				executeInput as never,
				{
					suspend: suspendFn,
				} as never,
			);

			expect(result).toEqual({ status: 'error', denied: true, reason: 'Action blocked by admin' });
			expect(suspendFn).not.toHaveBeenCalled();
			expect(executeNodeService.execute).not.toHaveBeenCalled();
		});

		it('should skip approval when the admin policy is always_allow', async () => {
			const serviceResult = { status: 'success', output: [[{ json: {} }]] };
			const executeNodeService = { execute: vi.fn().mockResolvedValue(serviceResult) };
			const suspendFn = vi.fn();
			const tool = createExecuteNodeTool(
				createMockContext({
					executeNodeService,
					permissions: { executeNode: 'always_allow' } as never,
				}),
			);

			const result = await executeTool(
				tool,
				executeInput as never,
				{
					suspend: suspendFn,
				} as never,
			);

			expect(suspendFn).not.toHaveBeenCalled();
			expect(result).toEqual(serviceResult);
		});

		it('should not consult the runWorkflow policy', async () => {
			const serviceResult = { status: 'success', output: [[{ json: {} }]] };
			const executeNodeService = { execute: vi.fn().mockResolvedValue(serviceResult) };
			const suspendFn = vi.fn();
			const tool = createExecuteNodeTool(
				createMockContext({
					executeNodeService,
					permissions: { runWorkflow: 'blocked', executeNode: 'always_allow' } as never,
				}),
			);

			const result = await executeTool(
				tool,
				executeInput as never,
				{
					suspend: suspendFn,
				} as never,
			);

			expect(suspendFn).not.toHaveBeenCalled();
			expect(result).toEqual(serviceResult);
		});

		it('should skip approval when a session grant exists for the node type', async () => {
			const serviceResult = { status: 'success', output: [[{ json: {} }]] };
			const executeNodeService = { execute: vi.fn().mockResolvedValue(serviceResult) };
			const suspendFn = vi.fn();
			const tool = createExecuteNodeTool(
				createMockContext({
					executeNodeService,
					sessionApprovedToolKeys: new Set(['nodes:execute:n8n-nodes-base.set:manual']),
				}),
			);

			const result = await executeTool(
				tool,
				executeInput as never,
				{
					suspend: suspendFn,
				} as never,
			);

			expect(suspendFn).not.toHaveBeenCalled();
			expect(result).toEqual(serviceResult);
		});

		it('resumes an approval saved under the former combined nodes tool through execute_node', async () => {
			const serviceResult = { status: 'success', output: [[{ json: {} }]] };
			const executeNodeService = { execute: vi.fn().mockResolvedValue(serviceResult) };
			const tool = createExecuteNodeTool(createMockContext({ executeNodeService }));

			expect(tool.legacyNames).toEqual(expect.arrayContaining(['workflow_builder_nodes', 'nodes']));

			const result = await executeTool(
				tool,
				{
					action: 'execute',
					type: 'n8n-nodes-base.slack',
					version: 2.7,
					config: { parameters: { resource: 'message', operation: 'post', text: 'hi' } },
				},
				{ resumeData: { approved: true } } as never,
			);

			expect(executeNodeService.execute).toHaveBeenCalled();
			expect(result).toEqual(serviceResult);
		});

		it('should persist a session grant split by type, resource, and operation on "always allow"', async () => {
			const executeNodeService = { execute: vi.fn().mockResolvedValue({ status: 'success' }) };
			const grantSessionToolApproval = vi.fn();
			const tool = createExecuteNodeTool(
				createMockContext({ executeNodeService, grantSessionToolApproval }),
			);

			await executeTool(
				tool,
				{
					type: 'n8n-nodes-base.slack',
					version: 2.7,
					config: { parameters: { resource: 'message', operation: 'post', text: 'hi' } },
				} as never,
				{ resumeData: { approved: true, scope: 'session' } } as never,
			);

			expect(grantSessionToolApproval).toHaveBeenCalledWith(
				'nodes:execute:n8n-nodes-base.slack:message:post',
			);
			expect(executeNodeService.execute).toHaveBeenCalled();
		});

		it('should persist a grant scoped by the fallback parameter without resource/operation', async () => {
			const executeNodeService = { execute: vi.fn().mockResolvedValue({ status: 'success' }) };
			const grantSessionToolApproval = vi.fn();
			const tool = createExecuteNodeTool(
				createMockContext({ executeNodeService, grantSessionToolApproval }),
			);

			await executeTool(
				tool,
				executeInput as never,
				{
					resumeData: { approved: true, scope: 'session' },
				} as never,
			);

			expect(grantSessionToolApproval).toHaveBeenCalledWith(
				'nodes:execute:n8n-nodes-base.set:manual',
			);
		});

		it('should persist a per-type grant for a node with no scoping parameter at all', async () => {
			const executeNodeService = { execute: vi.fn().mockResolvedValue({ status: 'success' }) };
			const grantSessionToolApproval = vi.fn();
			const tool = createExecuteNodeTool(
				createMockContext({ executeNodeService, grantSessionToolApproval }),
			);

			await executeTool(
				tool,
				{
					type: 'n8n-nodes-base.filter',
					version: 2.2,
					config: { parameters: { conditions: {} } },
				} as never,
				{ resumeData: { approved: true, scope: 'session' } } as never,
			);

			expect(grantSessionToolApproval).toHaveBeenCalledWith('nodes:execute:n8n-nodes-base.filter');
		});

		it('should return a denied result without executing when the user denies', async () => {
			const executeNodeService = { execute: vi.fn() };
			const tool = createExecuteNodeTool(createMockContext({ executeNodeService }));

			const result = await executeTool(
				tool,
				executeInput as never,
				{
					resumeData: { approved: false },
				} as never,
			);

			expect(result).toEqual({ status: 'error', denied: true, reason: 'User denied the action' });
			expect(executeNodeService.execute).not.toHaveBeenCalled();
		});

		it('should execute the node with the workflow-sdk-shaped request when approved', async () => {
			const serviceResult = { status: 'success', output: [[{ json: { done: true } }]] };
			const executeNodeService = { execute: vi.fn().mockResolvedValue(serviceResult) };
			const tool = createExecuteNodeTool(createMockContext({ executeNodeService }));

			const result = await executeTool(
				tool,
				{
					...executeInput,
					config: {
						parameters: { mode: 'manual' },
						credentials: { slackApi: { id: 'cred-1', name: 'Slack' } },
					},
					input: [{ json: { text: 'hi' } }],
					timeoutMs: 10_000,
				} as never,
				{ resumeData: { approved: true } } as never,
			);

			expect(executeNodeService.execute).toHaveBeenCalledWith({
				type: 'n8n-nodes-base.set',
				version: 3.4,
				config: {
					parameters: { mode: 'manual' },
					credentials: { slackApi: { id: 'cred-1', name: 'Slack' } },
				},
				input: [{ json: { text: 'hi' } }],
				timeoutMs: 10_000,
			});
			expect(result).toEqual(serviceResult);
		});

		it('should return an error when executeNodeService is not wired', async () => {
			const tool = createExecuteNodeTool(createMockContext());

			const result = await executeTool(
				tool,
				executeInput as never,
				{
					resumeData: { approved: true },
				} as never,
			);

			expect(result).toMatchObject({ status: 'error' });
		});
	});

	describe('unified independent tools', () => {
		describe('createSearchNodesTool', () => {
			it('searches across batched queries and filters to agent_tool scope when requested', async () => {
				const context = createMockContext();
				(context.nodeService.listSearchable as Mock).mockResolvedValue([
					{
						name: 'n8n-nodes-base.slack',
						displayName: 'Slack',
						description: 'Slack node',
						version: 2.2,
						inputs: ['main'],
						outputs: ['main'],
					},
					{
						name: 'n8n-nodes-base.slackTool',
						displayName: 'Slack Tool',
						description: 'Slack tool node',
						version: 2.2,
						inputs: [],
						outputs: ['ai_tool'],
					},
				]);
				const tool = createSearchNodesTool(context);

				const agentScoped = await executeTool(tool, {
					queries: ['slack'],
					scope: 'agent_tool',
					limit: 10,
				});
				expect((agentScoped.results as Array<{ name: string }>).map((r) => r.name)).toEqual([
					'n8n-nodes-base.slackTool',
				]);

				const allScoped = await executeTool(tool, {
					queries: ['slack'],
					scope: 'all',
					limit: 10,
				});
				expect((allScoped.results as Array<{ name: string }>).map((r) => r.name)).toEqual(
					expect.arrayContaining(['n8n-nodes-base.slack', 'n8n-nodes-base.slackTool']),
				);
			});

			it('supports category recommendations and gatewayCreditsOnly lookups', async () => {
				const context = createMockContext();
				const firstCategory = Object.keys(suggestedNodesData)[0]!;
				const tool = createSearchNodesTool(context);

				const catResult = await executeTool(tool, {
					categories: [firstCategory],
					scope: 'all',
					limit: 10,
				});
				const catEntries = catResult.results as Array<{ category: string }>;
				expect(catEntries).toHaveLength(1);
				expect(catEntries[0]?.category).toBe(firstCategory);

				(context.nodeService.listAvailable as Mock).mockResolvedValue([
					{
						name: 'n8n-nodes-base.openAi',
						displayName: 'OpenAI',
						description: 'OpenAI',
						group: ['transform'],
						version: 1,
						aiGateway: { supported: true },
					},
				]);
				const gwResult = await executeTool(tool, {
					gatewayCreditsOnly: true,
					scope: 'all',
					limit: 10,
				});
				expect(gwResult.nodes).toHaveLength(1);
				expect(gwResult.results).toHaveLength(1);
				expect(context.nodeService.listAvailable).toHaveBeenCalledWith({
					query: undefined,
					gatewayCreditsOnly: true,
				});
			});

			it('maps category recommendations to executable tool nodes for agent_tool scope', async () => {
				const context = createMockContext();
				(context.nodeService.listSearchable as Mock).mockResolvedValue(
					['webhook', 'scheduleTrigger', 'gmail', 'gmailTool', 'slack', 'slackTool'].map(
						(name) => ({
							name: `n8n-nodes-base.${name}`,
							displayName: name,
							description: '',
							version: 1,
							inputs: [],
							outputs: [],
						}),
					),
				);
				const tool = createSearchNodesTool(context);
				const toNames = (result: Record<string, unknown>) =>
					(
						result.results as Array<{ suggestedNodes: Array<{ name: string }> }>
					)[0]!.suggestedNodes.map((n) => n.name);

				const categoryOnly = await executeTool(tool, {
					categories: ['notification'],
					scope: 'agent_tool',
				});
				expect(toNames(categoryOnly)).toEqual([
					'n8n-nodes-base.gmailTool',
					'n8n-nodes-base.slackTool',
				]);

				const mixed = await executeTool(tool, {
					categories: ['notification'],
					queries: ['slack'],
					scope: 'agent_tool',
				});
				const mixedCategoryNames = (
					mixed.categoryResults as Array<{ suggestedNodes: Array<{ name: string }> }>
				)[0]!.suggestedNodes.map((n) => n.name);
				expect(mixedCategoryNames).toEqual([
					'n8n-nodes-base.gmailTool',
					'n8n-nodes-base.slackTool',
				]);
			});

			it('sends every batched query to the Gateway credits lookup and merges the results', async () => {
				const context = createMockContext();
				(context.nodeService.listAvailable as Mock).mockImplementation(
					async ({ query }: { query?: string }) =>
						await Promise.resolve([
							{ name: `n8n-nodes-base.${query}`, displayName: query, description: '' },
							{ name: 'n8n-nodes-base.shared', displayName: 'Shared', description: '' },
						]),
				);
				const tool = createSearchNodesTool(context);

				const result = await executeTool(tool, {
					queries: ['gmail', 'slack'],
					gatewayCreditsOnly: true,
				});

				expect(context.nodeService.listAvailable).toHaveBeenCalledWith({
					query: 'gmail',
					gatewayCreditsOnly: true,
				});
				expect(context.nodeService.listAvailable).toHaveBeenCalledWith({
					query: 'slack',
					gatewayCreditsOnly: true,
				});
				expect((result.nodes as Array<{ name: string }>).map((n) => n.name)).toEqual([
					'n8n-nodes-base.gmail',
					'n8n-nodes-base.shared',
					'n8n-nodes-base.slack',
				]);
			});

			describe('with connectionType', () => {
				const toolNode = (name: string, extra: Partial<SearchableNodeType> = {}) => ({
					name,
					displayName: name,
					description: '',
					version: 1,
					inputs: [],
					outputs: ['ai_tool'],
					...extra,
				});

				it('applies gatewayCreditsOnly to the results', async () => {
					const context = createMockContext();
					(context.nodeService.listSearchable as Mock).mockResolvedValue([
						toolNode('n8n-nodes-base.plainTool'),
						toolNode('n8n-nodes-base.firecrawlTool', {
							aiGateway: { supported: true, minVersion: 1 },
						}),
					]);
					const tool = createSearchNodesTool(context);

					const result = await executeTool(tool, {
						connectionType: 'ai_tool',
						gatewayCreditsOnly: true,
					});

					expect(context.nodeService.listAvailable).not.toHaveBeenCalled();
					expect((result.results as Array<{ name: string }>).map((r) => r.name)).toEqual([
						'n8n-nodes-base.firecrawlTool',
					]);
				});

				it('applies the agent_tool scope before the limit', async () => {
					const context = createMockContext();
					(context.nodeService.listSearchable as Mock).mockResolvedValue([
						toolNode('@n8n/n8n-nodes-langchain.toolCalculator'),
						toolNode('@n8n/n8n-nodes-langchain.toolThink'),
						toolNode('n8n-nodes-base.slackTool'),
					]);
					const tool = createSearchNodesTool(context);

					const result = await executeTool(tool, {
						connectionType: 'ai_tool',
						scope: 'agent_tool',
						limit: 1,
					});

					expect((result.results as Array<{ name: string }>).map((r) => r.name)).toEqual([
						'n8n-nodes-base.slackTool',
					]);
				});
			});
		});

		describe('createGetNodeTypesTool', () => {
			it('resolves node type requests and rejects unsupported ephemeral operations on *Tool nodes', async () => {
				const context = createMockContext();
				context.nodeService.getNodeTypeDefinition = vi.fn().mockResolvedValue({
					content: 'interface SlackParams {}',
					version: '2.2',
					aiGateway: { supported: true },
				});
				const tool = createGetNodeTypesTool(context);

				const okResult = await executeTool(tool, {
					nodeTypes: [{ nodeType: 'n8n-nodes-base.slack', version: 2.2, operation: 'sendAndWait' }],
				});
				const okDefs = okResult.definitions as Array<Record<string, unknown>>;
				expect(okDefs[0]).toMatchObject({
					nodeType: 'n8n-nodes-base.slack',
					content: 'interface SlackParams {}',
					aiGateway: { supported: true },
				});

				const blockedToolResult = await executeTool(tool, {
					nodeTypes: [
						{ nodeType: 'n8n-nodes-base.slackTool', version: 2.2, operation: 'sendAndWait' },
					],
				});
				const blockedDefs = blockedToolResult.definitions as Array<{ error?: string }>;
				expect(blockedDefs[0]?.error).toContain('sendAndWait');
				expect(blockedDefs[0]?.error).toContain('requireApproval: true');

				const nodeTypesResult = await executeTool(tool, {
					nodeTypes: [{ nodeType: 'n8n-nodes-base.gmail', version: '2.1' }],
				});
				const nodeTypesDefs = nodeTypesResult.definitions as Array<Record<string, unknown>>;
				expect(nodeTypesDefs[0]).toMatchObject({
					nodeType: 'n8n-nodes-base.gmail',
					content: 'interface SlackParams {}',
				});
				expect(context.nodeService.getNodeTypeDefinition).toHaveBeenLastCalledWith(
					'n8n-nodes-base.gmail',
					{ version: '2.1' },
				);
			});
		});

		describe('createGetNodeParameterOptionsTool', () => {
			it('delegates parameterPath lookups to resolveParameterOptions when available', async () => {
				const resolveParameterOptions = vi.fn().mockResolvedValue({
					ok: true,
					kind: 'resourceLocator',
					parameterPath: 'channelId',
					methodName: 'getChannels',
					mode: 'list',
					results: [
						{
							name: '#general',
							value: 'C123',
							parameterValue: { __rl: true, mode: 'list', value: 'C123' },
						},
					],
				});
				const context = createMockContext();
				context.nodeService.resolveParameterOptions = resolveParameterOptions;
				const tool = createGetNodeParameterOptionsTool(context);

				const result = await executeTool(tool, {
					nodeType: 'n8n-nodes-base.slack',
					version: 2.2,
					parameterPath: 'channelId',
					credentialType: 'slackApi',
					credentialId: 'cred-1',
				});
				expect(resolveParameterOptions).toHaveBeenCalledWith(
					expect.objectContaining({
						nodeType: 'n8n-nodes-base.slack',
						version: 2.2,
						parameterPath: 'channelId',
						credentialType: 'slackApi',
						credentialId: 'cred-1',
					}),
				);
				expect(result).toMatchObject({ ok: true, parameterPath: 'channelId' });
			});

			it('requires methodType when querying by methodName', async () => {
				const context = createMockContext();
				const tool = createGetNodeParameterOptionsTool(context);

				const result = await executeTool(tool, {
					nodeType: 'n8n-nodes-base.slack',
					version: 2.2,
					methodName: 'getChannels',
					credentialType: 'slackApi',
					credentialId: 'cred-1',
				});

				expect(result.error).toContain('methodType');
				expect(context.nodeService.exploreResources).not.toHaveBeenCalled();
			});
		});

		describe('createExecuteNodeTool', () => {
			it('executes a standalone node after approval', async () => {
				const serviceResult = { status: 'success', output: [[{ json: { ok: true } }]] };
				const executeNodeService = { execute: vi.fn().mockResolvedValue(serviceResult) };
				const tool = createExecuteNodeTool(createMockContext({ executeNodeService }));

				const result = await executeTool(
					tool,
					{
						type: 'n8n-nodes-base.set',
						version: 3.4,
						config: { parameters: { mode: 'manual' } },
					},
					{ resumeData: { approved: true } } as never,
				);
				expect(result).toEqual(serviceResult);
			});
		});
	});
});
