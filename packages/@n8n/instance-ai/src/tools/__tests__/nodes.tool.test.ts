import {
	NodeSearchEngine,
	suggestedNodesData,
	type SearchableNodeType,
} from '@n8n/ai-utilities/node-catalog';
import { zodToJsonSchema } from '@n8n/ai-utilities/json-schema';
import { validateNodeConfig } from '@n8n/workflow-sdk';
import type { Mock } from 'vitest';

import { executeTool } from '../../__tests__/tool-test-utils';
import type { InstanceAiContext, SearchableNodeDescription } from '../../types';
import { derivedNodeTypes } from './derived-node-types';
import { nextNodeModule } from '../next-modules';
import { addSetupPreference } from '../nodes/setup-preference';
import { createNodesTool } from '../nodes.tool';

vi.mock('@n8n/workflow-sdk', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/workflow-sdk')>()),
	validateNodeConfig: vi.fn(() => ({ valid: true, errors: [] })),
}));

const firecrawlPackage = {
	name: 'n8n-nodes-firecrawl.firecrawl',
	displayName: 'Firecrawl',
	description: 'Scrape websites',
	packageName: 'n8n-nodes-firecrawl',
};

const firecrawlRow = {
	name: 'n8n-nodes-firecrawl.firecrawl',
	displayName: 'Firecrawl',
	description: 'Scrape websites',
	install:
		"Not installed. Ask the user before you use it: an instance owner or admin must install the package 'n8n-nodes-firecrawl' in Settings > Community nodes.",
};

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

describe('nodes tool', () => {
	describe('orchestrator surface', () => {
		it('should only expose explore-resources action', () => {
			const context = createMockContext();
			const tool = createNodesTool(context, 'orchestrator');

			expect(tool.description).toContain('RLC parameters');
			expect(tool.description).not.toContain('list —');
			expect(tool.description).not.toContain('search —');
		});

		it('should call exploreResources for explore-resources action', async () => {
			const context = createMockContext();
			const mockResult = {
				results: [{ name: 'Sheet1', value: 'sheet-1' }],
				paginationToken: undefined,
			};
			(context.nodeService.exploreResources as Mock).mockResolvedValue(mockResult);

			const tool = createNodesTool(context, 'orchestrator');
			const result = await executeTool(
				tool,
				{
					action: 'explore-resources',
					nodeType: 'n8n-nodes-base.googleSheets',
					version: 4.7,
					methodName: 'spreadSheetsSearch',
					methodType: 'listSearch',
					credentialType: 'googleSheetsOAuth2Api',
					credentialId: 'cred1',
				},
				{} as never,
			);

			expect(context.nodeService.exploreResources).toHaveBeenCalled();
			expect(result).toEqual({
				results: [{ name: 'Sheet1', value: 'sheet-1' }],
				paginationToken: undefined,
			});
		});
	});

	describe('full surface', () => {
		it('should have a concise description', () => {
			const context = createMockContext();
			const tool = createNodesTool(context, 'full');

			expect(tool.description).toContain('node types');
			expect(tool.description).not.toContain('targeted guides');
		});
	});

	describe('list action', () => {
		it('should call nodeService.listAvailable with query', async () => {
			const nodes = [
				{
					name: 'n8n-nodes-base.httpRequest',
					displayName: 'HTTP Request',
					description: 'Make HTTP requests',
					group: ['transform'],
					version: 1,
				},
			];
			const context = createMockContext();
			(context.nodeService.listAvailable as Mock).mockResolvedValue(nodes);

			const tool = createNodesTool(context, 'full');
			const result = await executeTool(
				tool,
				{ action: 'list', query: 'http' } as never,
				{} as never,
			);

			expect(context.nodeService.listAvailable).toHaveBeenCalledWith({
				query: 'http',
				gatewayCreditsOnly: undefined,
			});
			expect(result).toEqual({ nodes });
		});

		it('should forward gatewayCreditsOnly to nodeService.listAvailable', async () => {
			const nodes = [
				{
					name: 'n8n-nodes-base.openAi',
					displayName: 'OpenAI',
					description: 'Use OpenAI',
					group: ['transform'],
					version: 1,
					aiGateway: { supported: true },
				},
			];
			const context = createMockContext();
			(context.nodeService.listAvailable as Mock).mockResolvedValue(nodes);

			const tool = createNodesTool(context, 'full');
			const result = await executeTool(
				tool,
				{ action: 'list', gatewayCreditsOnly: true } as never,
				{} as never,
			);

			expect(context.nodeService.listAvailable).toHaveBeenCalledWith({
				query: undefined,
				gatewayCreditsOnly: true,
			});
			expect(result).toEqual({ nodes });
		});
	});

	describe('search action', () => {
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

			const tool = createNodesTool(context, 'full');
			const first = await executeTool(
				tool,
				{ action: 'search', query: 'http', limit: 5 } as never,
				{} as never,
			);
			const second = await executeTool(
				tool,
				{ action: 'search', query: 'http', limit: 5 } as never,
				{} as never,
			);

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

			const tool = createNodesTool(context, 'full');
			const result = await executeTool(
				tool,
				{ action: 'search', connectionType: 'ai_tool', limit: 5 } as never,
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

			const tool = createNodesTool(context, 'full');
			const result = await executeTool(
				tool,
				{ action: 'search', query: 'firecrawl', limit: 5 } as never,
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

			const tool = createNodesTool(context, 'full');
			const result = await executeTool(
				tool,
				{ action: 'search', query: 'agent', limit: 5 } as never,
				{} as never,
			);

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

			const tool = createNodesTool(context, 'full');
			const result = await executeTool(
				tool,
				{ action: 'search', query: 'agent', limit: 5 } as never,
				{} as never,
			);

			const [node] = (result as { results: Array<{ subnodeRequirements?: unknown[] }> }).results;
			expect(node.subnodeRequirements).toEqual([
				expect.not.objectContaining({ suggestedNode: expect.anything() }),
			]);
		});

		it('does not search uninstalled community nodes without node contracts', async () => {
			const context = createMockContext();
			vi.mocked(context.nodeService.listSearchable).mockResolvedValue([]);
			context.nodeService.searchUninstalledNodes = vi.fn().mockResolvedValue([firecrawlPackage]);

			const result = await executeTool(createNodesTool(context, 'full'), {
				action: 'search',
				query: 'firecrawl',
				limit: 5,
			});

			expect(context.nodeService.searchUninstalledNodes).not.toHaveBeenCalled();
			expect(result).toEqual({ results: [], totalResults: 0 });
		});

		it('lists no uninstalled node when the instance offers none', async () => {
			const context = createMockContext({ nodeContractsEnabled: true });
			vi.mocked(context.nodeService.listSearchable).mockResolvedValue([]);
			context.nodeService.searchUninstalledNodes = vi.fn().mockResolvedValue([]);

			const result = await executeTool(createNodesTool(context, 'full'), {
				action: 'search',
				query: 'firecrawl',
				limit: 5,
			});

			expect(context.nodeService.searchUninstalledNodes).toHaveBeenCalledWith('firecrawl');
			expect(result).not.toHaveProperty('notInstalled');
		});

		it('still returns installed results when the uninstalled list fails', async () => {
			const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
			const context = createMockContext({ logger, nodeContractsEnabled: true });
			vi.mocked(context.nodeService.listSearchable).mockResolvedValue([]);
			context.nodeService.searchUninstalledNodes = vi
				.fn()
				.mockRejectedValue(new Error('registry down'));

			const result = await executeTool(createNodesTool(context, 'full'), {
				action: 'search',
				query: 'firecrawl',
				limit: 5,
			});

			expect(result).toMatchObject({ results: [], totalResults: 0 });
			expect(result).not.toHaveProperty('notInstalled');
			expect(logger.warn).toHaveBeenCalled();
		});

		it('should return no search results when neither query nor connection type is provided', async () => {
			const context = createMockContext();
			(context.nodeService.listSearchable as Mock).mockResolvedValue([]);

			const tool = createNodesTool(context, 'full');
			const result = await executeTool(tool, { action: 'search' } as never, {} as never);

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

			const tool = createNodesTool(context, 'full');
			const searchResult = await executeTool<{
				results: Array<{
					name: string;
					score: number;
					note?: string;
					aiGateway?: unknown;
					discriminators?: unknown;
					setupPreference?: unknown;
				}>;
			}>(tool, { action: 'search', query: 'message', limit: 5 } as never, {} as never);
			const suggestedResult = await executeTool<{
				results: Array<{
					suggestedNodes: Array<{
						name: string;
						note?: string;
						setupPreference?: unknown;
					}>;
				}>;
			}>(tool, { action: 'suggested', categories: ['notification'] } as never, {} as never);

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

	describe('explore-resources action', () => {
		it('should return error when exploreResources is not available', async () => {
			const context = createMockContext();
			context.nodeService.exploreResources = undefined;

			const tool = createNodesTool(context, 'full');
			const result = await executeTool(
				tool,
				{
					action: 'explore-resources',
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

		it('lists a contract resource by its resource id with the node contracts on', async () => {
			const context = createMockContext({ nodeContractsEnabled: true });
			(context.nodeService.exploreResources as Mock).mockResolvedValue({
				results: [{ name: 'Leads', value: '0' }],
			});
			const input = {
				action: 'explore-resources' as const,
				nodeType: '@n8n/nodes-integrations.googleSheetsSheetRead',
				version: 1,
				methodName: 'googleSheets.sheet',
				methodType: 'listSearch' as const,
				credentialType: 'googleSheetsOAuth2Api',
				credentialId: 'cred1',
				currentNodeParameters: { spreadsheet: 'abc' },
			};

			const result = await executeTool(createNodesTool(context, 'full'), input, {} as never);

			expect(context.nodeService.exploreResources).toHaveBeenCalledWith(input);
			expect(result).toEqual({ results: [{ name: 'Leads', value: '0' }] });
		});

		it.each(['full', 'orchestrator'] as const)(
			'gives no catalog node type example on the %s surface only with the node contracts on',
			(surface) => {
				const schemaOf = (nodeContractsEnabled: boolean) => {
					const tool = createNodesTool(createMockContext({ nodeContractsEnabled }), surface);
					const { inputSchema } = tool as unknown as { inputSchema: never };
					return JSON.stringify(zodToJsonSchema(inputSchema));
				};
				expect(schemaOf(true)).not.toContain('n8n-nodes-base');
				expect(schemaOf(false)).toContain('n8n-nodes-base.httpRequest');
			},
		);

		it('names the resource id as the method only with the node contracts on', () => {
			const methodNameOf = (nodeContractsEnabled: boolean) => {
				const tool = createNodesTool(createMockContext({ nodeContractsEnabled }), 'full');
				const { inputSchema } = tool as unknown as { inputSchema: never };
				const json = JSON.stringify(zodToJsonSchema(inputSchema));
				return json.includes('it is the resource id, e.g. \\"slack.channel\\"');
			};
			expect(methodNameOf(true)).toBe(true);
			expect(methodNameOf(false)).toBe(false);
		});

		it('should handle errors from exploreResources gracefully', async () => {
			const context = createMockContext();
			(context.nodeService.exploreResources as Mock).mockRejectedValue(new Error('Auth failed'));

			const tool = createNodesTool(context, 'full');
			const result = await executeTool(
				tool,
				{
					action: 'explore-resources',
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
	});

	describe('type-definition action', () => {
		it.each(['full', 'orchestrator'] as const)(
			'activates model selection for model-bearing definitions on the %s surface',
			async (surface) => {
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
				const tool = createNodesTool(context, surface);
				for (const nodeType of [
					'@n8n/n8n-nodes-langchain.lmChatOpenRouter',
					'@n8n/n8n-nodes-langchain.openAi',
					'@n8n/n8n-nodes-langchain.googleGemini',
					'@n8n/n8n-nodes-langchain.anthropic',
				]) {
					loadSkill.mockClear();
					const result = await executeTool(
						tool,
						{ action: 'type-definition', nodeTypes: [nodeType] },
						{ loadSkill },
					);
					expect(result.definitions).toEqual([
						expect.objectContaining({ nodeType, content: expect.stringContaining('modelId') }),
					]);
					expect(loadSkill).toHaveBeenCalledExactlyOnceWith('model-selection');
				}
			},
		);

		it('keeps model selection inactive for unrelated operations and failed definitions', async () => {
			const context = createMockContext();
			context.nodeService.getNodeTypeDefinition = vi
				.fn()
				.mockResolvedValueOnce({ content: 'export type Params = { fileId: string };' })
				.mockResolvedValueOnce({ error: 'Unknown node type' });
			vi.mocked(context.nodeService.listSearchable).mockResolvedValue([]);
			const loadSkill = vi.fn();
			const tool = createNodesTool(context);
			await executeTool(
				tool,
				{
					action: 'type-definition',
					nodeTypes: ['@n8n/n8n-nodes-langchain.openAi', 'missing.node'],
				},
				{ loadSkill },
			);
			expect(loadSkill).not.toHaveBeenCalled();
		});

		it('should return a Zod-derived error when nodeTypes is missing', async () => {
			// The discriminated union is flattened for Anthropic, so `nodeTypes`
			// becomes optional at the top-level schema. The handler re-validates
			// against the variant schema so missing fields return a structured
			// error instead of crashing downstream on input.nodeTypes.map.
			const context = createMockContext();
			const tool = createNodesTool(context, 'full');

			const result = await executeTool(tool, { action: 'type-definition' } as never, {} as never);

			expect(result).toMatchObject({
				definitions: [],
				error: expect.stringContaining('nodeTypes'),
			});
		});

		it('should return a Zod-derived error when nodeTypes is empty', async () => {
			const context = createMockContext();
			const tool = createNodesTool(context, 'full');

			const result = await executeTool(
				tool,
				{ action: 'type-definition', nodeTypes: [] } as never,
				{} as never,
			);

			expect(result).toMatchObject({
				definitions: [],
				error: expect.stringContaining('nodeTypes'),
			});
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

			const tool = createNodesTool(context, 'full');
			const result = await executeTool(
				tool,
				{ action: 'type-definition', nodeTypes: ['n8n-nodes-base.if'] } as never,
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

			const tool = createNodesTool(context, 'full');
			const result = await executeTool(
				tool,
				{
					action: 'type-definition',
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

	describe('describe action', () => {
		it('should return found: false when node type is not found', async () => {
			const context = createMockContext();
			(context.nodeService.getDescription as Mock).mockRejectedValue(new Error('not found'));

			const tool = createNodesTool(context, 'full');
			const result = await executeTool(
				tool,
				{ action: 'describe', nodeType: 'unknown.node' } as never,
				{} as never,
			);

			expect(result).toMatchObject({
				found: false,
				error: expect.stringContaining('unknown.node'),
			});
		});
	});

	describe('execute action', () => {
		const executeInput = {
			action: 'execute',
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: { parameters: { mode: 'manual' } },
		};

		it('should return a structured error when required execute fields are missing', async () => {
			const executeNodeService = { execute: vi.fn() };
			const tool = createNodesTool(createMockContext({ executeNodeService }), 'full');

			const result = await executeTool(
				tool,
				{ action: 'execute', type: 'n8n-nodes-base.set' } as never,
				{} as never,
			);

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
			const tool = createNodesTool(createMockContext({ executeNodeService }), 'full');

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

		describe('contract node', () => {
			const contractInput = (parameters: Record<string, unknown>) => ({
				action: 'execute',
				type: '@n8n/nodes-integrations.notionDatabasePageGetAll',
				version: 1,
				config: { parameters },
			});

			async function executeContractNode(
				parameters: Record<string, unknown>,
				nodeContractsEnabled: boolean,
			) {
				const executeNodeService = { execute: vi.fn() };
				const suspend = vi.fn();
				const tool = createNodesTool(
					createMockContext({ executeNodeService, nodeContractsEnabled }),
					'full',
				);
				const result = await executeTool(
					tool,
					contractInput(parameters) as never,
					{
						suspend,
					} as never,
				);
				return { result, suspend, executeNodeService };
			}

			it('rejects parameters that fail the contract input schema', async () => {
				const { result, suspend, executeNodeService } = await executeContractNode(
					{ database: 'Invoices' },
					true,
				);

				expect(result).toMatchObject({
					status: 'error',
					error: {
						message:
							'Node parameters do not match the schema for @n8n/nodes-integrations.notionDatabasePageGetAll v1',
						issues: [
							{ path: 'parameters.database', message: expect.stringContaining('"Invoices"') },
						],
					},
				});
				expect(validateNodeConfig).not.toHaveBeenCalled();
				expect(suspend).not.toHaveBeenCalled();
				expect(executeNodeService.execute).not.toHaveBeenCalled();
			});

			it('reports a missing required contract field', async () => {
				const { result } = await executeContractNode({}, true);

				expect(result).toMatchObject({
					error: { issues: [{ path: 'parameters.database', message: 'is required' }] },
				});
			});

			it('accepts parameters that match the contract input schema', async () => {
				const { suspend } = await executeContractNode(
					{ database: '0123456789abcdef0123456789abcdef', limit: '={{ $json.limit }}' },
					true,
				);

				expect(suspend).toHaveBeenCalledTimes(1);
			});

			it('checks a contract node with the legacy schemas when node contracts are off', async () => {
				const { suspend } = await executeContractNode({ database: 'Invoices' }, false);

				expect(validateNodeConfig).toHaveBeenCalledWith(
					'@n8n/nodes-integrations.notionDatabasePageGetAll',
					1,
					{ parameters: { database: 'Invoices' } },
				);
				expect(suspend).toHaveBeenCalledTimes(1);
			});
		});

		it('should treat missing-discriminator-only validation errors as non-blocking', async () => {
			const executeNodeService = { execute: vi.fn() };
			const suspendFn = vi.fn();
			vi.mocked(validateNodeConfig).mockReturnValueOnce({
				valid: false,
				errors: [{ path: 'parameters.resource', message: 'Required', missingDiscriminator: true }],
			});
			const tool = createNodesTool(createMockContext({ executeNodeService }), 'full');

			await executeTool(tool, executeInput as never, { suspend: suspendFn } as never);

			expect(suspendFn).toHaveBeenCalledTimes(1);
		});

		it('should suspend for confirmation on the first call', async () => {
			const executeNodeService = { execute: vi.fn() };
			const suspendFn = vi.fn();
			const tool = createNodesTool(createMockContext({ executeNodeService }), 'full');

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
				createNodesTool(context, 'full'),
				{
					action: 'execute',
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
				createNodesTool(context, 'full'),
				{
					action: 'execute',
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
			const tool = createNodesTool(
				createMockContext({ executeNodeService, permissions: { executeNode: 'blocked' } as never }),
				'full',
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
			const tool = createNodesTool(
				createMockContext({
					executeNodeService,
					permissions: { executeNode: 'always_allow' } as never,
				}),
				'full',
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
			const tool = createNodesTool(
				createMockContext({
					executeNodeService,
					permissions: { runWorkflow: 'blocked', executeNode: 'always_allow' } as never,
				}),
				'full',
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

		it('should require approval when always_allow is scoped to specific workflows', async () => {
			const executeNodeService = { execute: vi.fn() };
			const suspendFn = vi.fn();
			const tool = createNodesTool(
				createMockContext({
					executeNodeService,
					permissions: { executeNode: 'always_allow' } as never,
					allowedRunWorkflowIds: new Set(['wf-under-verification']),
				}),
				'full',
			);

			await executeTool(tool, executeInput as never, { suspend: suspendFn } as never);

			expect(suspendFn).toHaveBeenCalledTimes(1);
			expect(executeNodeService.execute).not.toHaveBeenCalled();
		});

		it('should skip approval when a session grant exists for the node type', async () => {
			const serviceResult = { status: 'success', output: [[{ json: {} }]] };
			const executeNodeService = { execute: vi.fn().mockResolvedValue(serviceResult) };
			const suspendFn = vi.fn();
			const tool = createNodesTool(
				createMockContext({
					executeNodeService,
					sessionApprovedToolKeys: new Set(['nodes:execute:n8n-nodes-base.set:manual']),
				}),
				'full',
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

		it('should persist a session grant split by type, resource, and operation on "always allow"', async () => {
			const executeNodeService = { execute: vi.fn().mockResolvedValue({ status: 'success' }) };
			const grantSessionToolApproval = vi.fn();
			const tool = createNodesTool(
				createMockContext({ executeNodeService, grantSessionToolApproval }),
				'full',
			);

			await executeTool(
				tool,
				{
					action: 'execute',
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
			const tool = createNodesTool(
				createMockContext({ executeNodeService, grantSessionToolApproval }),
				'full',
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
			const tool = createNodesTool(
				createMockContext({ executeNodeService, grantSessionToolApproval }),
				'full',
			);

			await executeTool(
				tool,
				{
					action: 'execute',
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
			const tool = createNodesTool(createMockContext({ executeNodeService }), 'full');

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
			const tool = createNodesTool(createMockContext({ executeNodeService }), 'full');

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
			const tool = createNodesTool(createMockContext(), 'full');

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

	describe('with node contracts enabled', () => {
		const searchableNodes: SearchableNodeDescription[] = [
			{
				name: 'n8n-nodes-base.notion',
				displayName: 'Notion',
				description: 'Consume Notion API',
				version: [2, 2.2],
				inputs: ['main'],
				outputs: ['main'],
			},
			{
				name: 'n8n-nodes-base.httpRequest',
				displayName: 'HTTP Request',
				description: 'Makes an HTTP request and returns the response data',
				version: 4.2,
				inputs: ['main'],
				outputs: ['main'],
			},
			{
				name: 'n8n-nodes-base.mattermost',
				displayName: 'Mattermost',
				description: 'Consume Mattermost API',
				version: 2.3,
				inputs: ['main'],
				outputs: ['main'],
			},
		];

		function createContractContext() {
			const context = createMockContext({ nodeContractsEnabled: true });
			vi.mocked(context.nodeService.listSearchable).mockResolvedValue(searchableNodes);
			vi.mocked(context.nodeService.getDescription).mockResolvedValue({
				properties: [{ type: 'credentialsSelect' }],
			} as never);
			context.nodeService.listDiscriminators = vi.fn().mockResolvedValue({
				resources: [{ name: 'message', operations: ['post'] }],
			});
			context.nodeService.getNodeTypeDefinition = vi.fn().mockResolvedValue({
				version: '2.3',
				content: 'export type MattermostV23Params = {}',
			});
			return context;
		}

		type ModuleSearch = {
			nodeModules?: Array<{ node: string; import: string; module: string }>;
			otherActions?: string[];
			results?: Array<{ name: string }>;
			otherNodes?: string[];
		};

		it('inlines the module of the service the query names instead of its catalog row', async () => {
			const context = createContractContext();
			const result = await executeTool<ModuleSearch>(createNodesTool(context, 'full'), {
				action: 'search',
				query: 'notion get many pages',
				limit: 5,
			});

			expect(result.nodeModules).toEqual([
				{
					node: 'notion',
					import: "import { notion } from '@n8n/nodes/notion';",
					module: expect.stringContaining('export const notion = {'),
				},
			]);
			expect(result).not.toHaveProperty('results');
		});

		it('lists catalog hits beside a module as one-line rows without its tool variants', async () => {
			const context = createContractContext();
			vi.mocked(context.nodeService.listSearchable).mockResolvedValue([
				...searchableNodes,
				...[
					['n8n-nodes-base.notionTool', 'Notion Tool', ['ai_tool']],
					['@n8n/mcp-registry.notion', 'Notion MCP', ['ai_tool']],
					['n8n-nodes-base.notionTrigger', 'Notion Trigger', ['main']],
					['n8n-nodes-base.oracleDatabase', 'Oracle Database', ['main']],
					[
						'n8n-nodes-base.googleFirebaseRealtimeDatabase',
						'Google Cloud Realtime Database',
						['main'],
					],
					['n8n-nodes-base.metabase', 'Metabase', ['main']],
				].map(([name, displayName, outputs]) => ({
					name: name as string,
					displayName: displayName as string,
					description: `Consume ${displayName as string} database pages`,
					version: 1,
					inputs: ['main'],
					outputs: outputs as string[],
				})),
			]);
			const search = async (query: string) =>
				await executeTool<ModuleSearch>(createNodesTool(context, 'full'), {
					action: 'search',
					query,
					limit: 10,
				});
			const result = await search('notion database trigger');

			expect(result.nodeModules?.map(({ node }) => node)).toEqual(['notion']);
			expect(result).not.toHaveProperty('results');
			expect(result.otherNodes).toHaveLength(3);
			expect(result.otherNodes?.[0]).toBe('n8n-nodes-base.notionTrigger: Notion Trigger');
			expect(result.otherNodes?.join('\n')).not.toMatch(/notionTool|mcp-registry/);
			expect(await search('notion get many database pages')).not.toHaveProperty('otherNodes');
		});

		it('lists a vetted community node that is not installed as install-first', async () => {
			const context = createContractContext();
			context.nodeService.searchUninstalledNodes = vi.fn().mockResolvedValue([firecrawlPackage]);

			const result = await executeTool(createNodesTool(context, 'full'), {
				action: 'search',
				queries: ['firecrawl scrape page'],
				limit: 5,
			});

			expect(context.nodeService.searchUninstalledNodes).toHaveBeenCalledWith(
				'firecrawl scrape page',
			);
			expect(result).toMatchObject({
				searches: [{ query: 'firecrawl scrape page', notInstalled: [firecrawlRow] }],
			});
		});

		it('gives the tool factories of a module instead of the tool variant of its legacy node', async () => {
			const context = createContractContext();
			vi.mocked(context.nodeService.listSearchable).mockResolvedValue(
				[
					['n8n-nodes-base.slackTool', 'Slack Tool'],
					['@n8n/n8n-nodes-langchain.toolCode', 'Code Tool'],
				].map(([name, displayName]) => ({
					name,
					displayName,
					description: 'A tool for an AI agent',
					version: 1,
					inputs: [],
					outputs: ['ai_tool'],
				})),
			);
			const result = await executeTool<ModuleSearch>(createNodesTool(context, 'full'), {
				action: 'search',
				connectionType: 'ai_tool',
				query: 'slack',
				limit: 10,
			});

			expect(result.nodeModules?.map(({ node }) => node)).toEqual(['slack']);
			expect(result.nodeModules?.[0]?.module).toContain('sendTool: <In, Ctx>(');
			expect(JSON.stringify(result)).not.toContain('n8n-nodes-base.slackTool');
		});

		it('keeps the legacy agent beside the ai module for an AI agent search', async () => {
			const context = createContractContext();
			vi.mocked(context.nodeService.listSearchable).mockResolvedValue([
				...searchableNodes,
				...[
					['@n8n/n8n-nodes-langchain.agent', 'AI Agent'],
					['@n8n/n8n-nodes-langchain.chainLlm', 'Basic LLM Chain'],
					['@n8n/n8n-nodes-langchain.agentTool', 'AI Agent Tool'],
				].map(([name, displayName]) => ({
					name,
					displayName,
					description: 'Generates an action plan with an AI agent',
					version: 1,
					inputs: ['main'],
					outputs: ['main'],
				})),
			]);
			const result = await executeTool<ModuleSearch>(createNodesTool(context, 'full'), {
				action: 'search',
				query: 'AI agent',
				limit: 10,
			});

			expect(result.nodeModules?.map(({ node }) => node)).toContain('ai');
			expect(result.otherNodes).toEqual(['@n8n/n8n-nodes-langchain.agent: AI Agent']);
		});

		it('searches several services in one call and inlines each module once', async () => {
			const context = createContractContext();
			const result = await executeTool<{
				nodeModules: Array<{ node: string }>;
				searches: Array<ModuleSearch & { query: string; modules?: string[] }>;
			}>(createNodesTool(context, 'full'), {
				action: 'search',
				queries: ['notion get many pages', 'http get', 'http send', 'mattermost'],
				limit: 5,
			});

			expect(result.nodeModules.map(({ node }) => node)).toEqual(['notion', 'httpRequest']);
			expect(result.nodeModules[1]).toEqual(nextNodeModule('httpRequest'));
			expect(result.searches[0]).not.toHaveProperty('actions');
			expect(result.searches.map(({ query, modules }) => ({ query, modules }))).toEqual([
				{ query: 'notion get many pages', modules: ['notion'] },
				{ query: 'http get', modules: ['httpRequest'] },
				{ query: 'http send', modules: ['httpRequest'] },
				{ query: 'mattermost', modules: undefined },
			]);
			expect(result.searches[3].results).toEqual([
				expect.objectContaining({
					name: 'n8n-nodes-base.mattermost',
					version: 2.3,
					discriminators: { resources: [{ name: 'message', operations: ['post'] }] },
				}),
			]);
		});

		it('shows types only for the module actions that the query names', async () => {
			const context = createContractContext();
			const result = await executeTool<ModuleSearch>(createNodesTool(context, 'full'), {
				action: 'search',
				query: 'http request post',
				limit: 5,
			});

			expect(result).not.toHaveProperty('actions');
			expect(result.nodeModules?.[0]?.module).toContain('export type HttpRequestSendInput<I, C>');
			expect(result.nodeModules?.[0]?.module).not.toContain('export type HttpRequestGetInput');
			expect(result.nodeModules?.[0]?.module).toContain(
				'// httpRequest.get(config: HttpRequestGetInput) — GET a URL (read, 1:N)',
			);
		});

		it('lists module actions of services the query does not name as one line each', async () => {
			const context = createContractContext();
			const result = await executeTool<ModuleSearch>(createNodesTool(context, 'full'), {
				action: 'search',
				query: 'mattermost send',
				limit: 5,
			});

			expect(result).not.toHaveProperty('nodeModules');
			expect(result.otherActions).toContain(
				'httpRequest.send: POST, PUT, PATCH, or DELETE to any HTTP API.',
			);
		});

		const catalogNodes = (rows: Array<[string, string]>): SearchableNodeDescription[] =>
			rows.map(([name, displayName]) => ({
				name,
				displayName,
				description: `${displayName} node`,
				version: 1,
				inputs: ['main'],
				outputs: ['main'],
			}));

		it('inlines the module of a native trigger instead of its catalog rows', async () => {
			const context = createContractContext();
			vi.mocked(context.nodeService.listSearchable).mockResolvedValue(
				catalogNodes([
					['n8n-nodes-base.webhook', 'Webhook'],
					['n8n-nodes-base.n8nTrigger', 'n8n Trigger'],
					['n8n-nodes-base.boxTrigger', 'Box Trigger'],
				]),
			);
			const result = await executeTool<ModuleSearch>(createNodesTool(context, 'full'), {
				action: 'search',
				query: 'webhook trigger',
				limit: 10,
			});

			expect(result.nodeModules?.map(({ node }) => node)).toEqual(['webhook']);
			expect(result).not.toHaveProperty('results');
		});

		it('inlines the module that replaces a catalog node the query names', async () => {
			const context = createContractContext();
			vi.mocked(context.nodeService.listSearchable).mockResolvedValue(
				catalogNodes([
					['@n8n/n8n-nodes-langchain.chainLlm', 'Basic LLM Chain'],
					['@n8n/n8n-nodes-langchain.chainSummarization', 'Summarization Chain'],
				]),
			);
			const result = await executeTool<ModuleSearch>(createNodesTool(context, 'full'), {
				action: 'search',
				query: 'basic llm chain',
				limit: 10,
			});

			expect(result.nodeModules?.map(({ node }) => node)).toEqual(['ai']);
			expect(result).not.toHaveProperty('results');
		});

		it.each([
			['manual trigger', 'n8n-nodes-base.manualTrigger', 'Manual Trigger', 'manual({'],
			['if condition', 'n8n-nodes-base.if', 'If', 'when({'],
			['filter rows', 'n8n-nodes-base.filter', 'Filter', 'filter({'],
			['split out items', 'n8n-nodes-base.splitOut', 'Split Out', 'splitOut({'],
		])(
			'answers "%s" with the SDK step instead of catalog rows',
			async (query, nodeType, displayName, step) => {
				const context = createContractContext();
				vi.mocked(context.nodeService.listSearchable).mockResolvedValue(
					catalogNodes([
						[nodeType, displayName],
						['n8n-nodes-base.compareDatasets', `${displayName} Compare Datasets`],
					]),
				);
				const result = await executeTool<ModuleSearch & { coreSteps?: string[] }>(
					createNodesTool(context, 'full'),
					{ action: 'search', query, limit: 10 },
				);

				expect(result.coreSteps).toHaveLength(1);
				expect(result.coreSteps?.[0].startsWith(step)).toBe(true);
				expect(result).not.toHaveProperty('results');
				expect(result).not.toHaveProperty('otherActions');
				expect(result.otherNodes).toEqual([
					`n8n-nodes-base.compareDatasets: ${displayName} Compare Datasets`,
				]);
			},
		);

		it('searches at most 20 catalog rows per query', async () => {
			const context = createContractContext();
			vi.mocked(context.nodeService.listSearchable).mockResolvedValue(
				catalogNodes(
					Array.from({ length: 30 }, (_, index): [string, string] => [
						`n8n-nodes-base.acme${index}`,
						`Acme ${index}`,
					]),
				),
			);
			const result = await executeTool<ModuleSearch>(createNodesTool(context, 'full'), {
				action: 'search',
				query: 'acme',
				limit: 50,
			});

			expect(result.results).toHaveLength(20);
		});

		it('cuts catalog rows to the byte budget and says so', async () => {
			const context = createContractContext();
			vi.mocked(context.nodeService.listSearchable).mockResolvedValue(
				Array.from({ length: 20 }, (_, index) => ({
					name: `n8n-nodes-base.acme${index}`,
					displayName: `Acme ${index}`,
					description: `Acme ${'x'.repeat(2_000)}`,
					version: 1,
					inputs: ['main'],
					outputs: ['main'],
				})),
			);
			const result = await executeTool<{
				cut?: string;
				searches: Array<{ results?: unknown[]; totalResults?: number }>;
			}>(createNodesTool(context, 'full'), {
				action: 'search',
				queries: ['acme', 'acme', 'acme'],
				limit: 20,
			});

			expect(Buffer.byteLength(JSON.stringify(result))).toBeLessThan(33_000);
			expect(result.cut).toMatch(/^Cut to 32 KB: \d+ catalog rows/);
			expect(result.searches[0].results?.length).toBeLessThan(20);
			expect(result.searches[0].totalResults).toBe(20);
		});

		it('returns the module for the catalog type name of a module node', async () => {
			const context = createContractContext();
			const result = await executeTool<{ definitions: Array<Record<string, unknown>> }>(
				createNodesTool(context, 'full'),
				{ action: 'type-definition', nodeTypes: ['n8n-nodes-base.slack'] },
			);
			const described = await executeTool<Record<string, unknown>>(
				createNodesTool(context, 'full'),
				{ action: 'describe', nodeType: 'n8n-nodes-base.slack' },
			);

			expect(result.definitions[0]).toMatchObject({
				nodeType: 'n8n-nodes-base.slack',
				node: 'slack',
				content: expect.stringContaining('export const slack = {'),
			});
			expect(described).toMatchObject({ found: true, node: 'slack' });
			expect(context.nodeService.getNodeTypeDefinition).not.toHaveBeenCalled();
			expect(context.nodeService.getDescription).not.toHaveBeenCalled();
		});

		it('types only the action that runs the requested resource and operation', async () => {
			const context = createContractContext();
			const result = await executeTool<{ definitions: Array<{ content: string }> }>(
				createNodesTool(context, 'full'),
				{
					action: 'type-definition',
					nodeTypes: [{ nodeType: 'n8n-nodes-base.slack', resource: 'message', operation: 'send' }],
				},
			);

			expect(result.definitions[0].content).toContain('export type SlackMessageSendInput');
			expect(result.definitions[0].content).not.toContain('export type SlackMessageUpdateInput');
		});

		it('points a catalog node with an SDK step to the step', async () => {
			const context = createContractContext();
			const result = await executeTool<{ definitions: Array<{ content: string }> }>(
				createNodesTool(context, 'full'),
				{ action: 'type-definition', nodeTypes: ['n8n-nodes-base.if'] },
			);

			expect(result.definitions[0].content).toMatch(
				/^\/\/ Use the flow step instead of node\(\): when\(\{/,
			);
		});

		it('points a module action that a flow step emits to the step', async () => {
			const context = createContractContext();
			const result = await executeTool<{
				definitions: Array<{ content: string; error?: string }>;
			}>(createNodesTool(context, 'full'), {
				action: 'type-definition',
				nodeTypes: ['items.set', 'merge', 'items'],
			});

			const [set, merge, items] = result.definitions;
			expect(set.error).toMatch(/^The flow SDK builds items\.set\. Use its step instead: set\(\{/);
			expect(merge.error).toContain('merge({');
			expect(items.content).toContain('export const items = {');
			expect(items.content).not.toContain('itemsSet');
		});

		it('keeps search and type-definition unchanged with node contracts disabled', async () => {
			const context = createContractContext();
			context.nodeContractsEnabled = false;
			vi.mocked(context.nodeService.listSearchable).mockResolvedValue(
				catalogNodes([
					['n8n-nodes-base.if', 'If'],
					['n8n-nodes-base.webhook', 'Webhook'],
				]),
			);
			const search = await executeTool<Record<string, unknown>>(createNodesTool(context, 'full'), {
				action: 'search',
				query: 'if',
				limit: 50,
			});
			const definitions = await executeTool<{ definitions: Array<Record<string, unknown>> }>(
				createNodesTool(context, 'full'),
				{ action: 'type-definition', nodeTypes: ['n8n-nodes-base.slack', 'n8n-nodes-base.if'] },
			);

			expect(Object.keys(search)).toEqual(['results', 'totalResults']);
			expect(definitions.definitions).toEqual([
				{
					nodeType: 'n8n-nodes-base.slack',
					version: '2.3',
					content: 'export type MattermostV23Params = {}',
				},
				{
					nodeType: 'n8n-nodes-base.if',
					version: '2.3',
					content: 'export type MattermostV23Params = {}',
				},
			]);
		});

		it.each(['full', 'orchestrator'] as const)(
			'returns the module text for module and action ids on the %s surface',
			async (surface) => {
				const context = createContractContext();
				const result = await executeTool<{ definitions: Array<Record<string, unknown>> }>(
					createNodesTool(context, surface),
					{
						action: 'type-definition',
						nodeTypes: ['notion', 'httpRequest.send', 'n8n-nodes-base.mattermost'],
					},
				);

				expect(result.definitions).toEqual([
					{
						nodeType: 'notion',
						node: 'notion',
						import: "import { notion } from '@n8n/nodes/notion';",
						content: expect.stringContaining('getAll'),
					},
					{
						nodeType: 'httpRequest.send',
						node: 'httpRequest',
						import: "import { httpRequest } from '@n8n/nodes/httpRequest';",
						content: expect.stringContaining('send'),
					},
					{ nodeType: 'n8n-nodes-base.mattermost', version: '2.3', content: expect.any(String) },
				]);
				expect(context.nodeService.getNodeTypeDefinition).toHaveBeenCalledTimes(1);
			},
		);

		it('starts the definition of a node without a module with how to use node()', async () => {
			const context = createContractContext();
			const result = await executeTool<{ definitions: Array<{ content: string }> }>(
				createNodesTool(context, 'full'),
				{
					action: 'type-definition',
					nodeTypes: [
						'n8n-nodes-base.mattermost',
						'n8n-nodes-base.notion',
						'n8n-nodes-base.telegramTrigger',
					],
				},
			);

			expect(result.definitions[0].content).toBe(
				"// No typed module. Use node({ name, type: 'n8n-nodes-base.mattermost', version: 2.3, parameters, sample }) from '@n8n/workflow-sdk/next', or provider({ … }) for an AI provider. Its `sample` items type the output, not type arguments.\nexport type MattermostV23Params = {}",
			);
			expect(result.definitions[1].content).toContain('export const notion = {');
			expect(result.definitions[2].content).toBe(
				"// No typed module. Start the flow with trigger({ name, type: 'n8n-nodes-base.telegramTrigger', version: 2.3, parameters, sample }) from '@n8n/workflow-sdk/next'.\nexport type MattermostV23Params = {}",
			);

			context.nodeContractsEnabled = false;
			const off = await executeTool<{ definitions: Array<{ content: string }> }>(
				createNodesTool(context, 'full'),
				{ action: 'type-definition', nodeTypes: ['n8n-nodes-base.mattermost'] },
			);
			expect(off.definitions[0].content).toBe('export type MattermostV23Params = {}');
		});

		it('lists the module actions next to the legacy definition of an operation without an action', async () => {
			const context = createContractContext();
			const result = await executeTool<{ definitions: Array<{ actions?: string[] }> }>(
				createNodesTool(context, 'full'),
				{
					action: 'type-definition',
					nodeTypes: [{ nodeType: 'n8n-nodes-base.notion', resource: 'page', operation: 'create' }],
				},
			);

			expect(result.definitions[0].actions).toEqual([
				'notion.databasePage.getAll: List pages of a Notion database, optionally filtered and sorted.',
				'notion.user.get: Get one Notion user (a person or a bot) by ID.',
			]);
		});

		it('starts the legacy definition of an operation without an action with how to use node()', async () => {
			const context = createContractContext();
			const legacy =
				"export type GmailV22MessageSendAndWaitNode = {\n  type: 'n8n-nodes-base.gmail';\n  version: 2.2;\n};";
			vi.mocked(context.nodeService.getNodeTypeDefinition!).mockResolvedValue({
				version: 'v22',
				content: legacy,
			});
			const result = await executeTool<{ definitions: Array<{ content: string }> }>(
				createNodesTool(context, 'full'),
				{
					action: 'type-definition',
					nodeTypes: [{ nodeType: 'n8n-nodes-base.notion', resource: 'page', operation: 'create' }],
				},
			);

			expect(result.definitions[0].content).toBe(
				`// The typed module has no action for this operation. Use node({ name, type: 'n8n-nodes-base.notion', version: 2.2, parameters, sample }) from '@n8n/workflow-sdk/next'. Its \`sample\` items type the output, not type arguments.\n${legacy}`,
			);
		});

		it('returns the nearest actions for an unknown action id', async () => {
			const context = createContractContext();
			vi.mocked(context.nodeService.getNodeTypeDefinition!).mockResolvedValue(null);
			const result = await executeTool<{
				definitions: Array<{ error?: string; actions?: string[] }>;
			}>(createNodesTool(context, 'full'), {
				action: 'type-definition',
				nodeTypes: ['notion.page.getAll'],
			});

			expect(result.definitions[0].error).toContain("No action 'notion.page.getAll'");
			expect(result.definitions[0].actions?.[0]).toBe(
				'notion.databasePage.getAll: List pages of a Notion database, optionally filtered and sorted.',
			);
		});

		it('describes a module id with its module text', async () => {
			const context = createContractContext();
			const result = await executeTool(createNodesTool(context, 'full'), {
				action: 'describe',
				nodeType: 'httpRequest',
			});

			expect(result).toMatchObject({
				found: true,
				name: 'httpRequest',
				module: expect.stringContaining('export const httpRequest = {'),
			});
			expect(context.nodeService.getDescription).not.toHaveBeenCalled();
		});

		it('inlines the derived module of a catalog node without a typed module that the query names', async () => {
			const context = createContractContext();
			context.nodeTypesProvider = derivedNodeTypes();
			const result = await executeTool<ModuleSearch>(createNodesTool(context, 'full'), {
				action: 'search',
				query: 'mattermost delete a message',
				limit: 5,
			});

			expect(result.nodeModules).toEqual([
				{
					node: 'n8n-nodes-base.mattermost',
					import: "import { mattermost } from '@n8n/nodes/n8n-nodes-base/mattermost';",
					module: expect.stringContaining('export const mattermost = {'),
				},
			]);
			expect(result.nodeModules?.[0].module).toContain('export type MattermostMessageDeleteInput');
			expect(result.nodeModules?.[0].module).not.toContain(
				'export type MattermostMessagePostInput',
			);
			expect(result).not.toHaveProperty('results');
		});

		it('returns the derived module for type-definition and describe of a node without a typed module', async () => {
			const context = createContractContext();
			context.nodeTypesProvider = derivedNodeTypes();
			const tool = createNodesTool(context, 'full');
			const result = await executeTool<{ definitions: Array<Record<string, string>> }>(tool, {
				action: 'type-definition',
				nodeTypes: [
					'n8n-nodes-base.mattermost',
					{ nodeType: 'n8n-nodes-base.mattermost', resource: 'channel', operation: 'archive' },
					{ nodeType: 'n8n-nodes-base.mattermost', resource: 'message', operation: 'update' },
				],
			});
			const described = await executeTool<Record<string, unknown>>(tool, {
				action: 'describe',
				nodeType: 'n8n-nodes-base.mattermost',
			});

			expect(result.definitions[0]).toMatchObject({
				node: 'n8n-nodes-base.mattermost',
				import: "import { mattermost } from '@n8n/nodes/n8n-nodes-base/mattermost';",
				content: expect.stringContaining('// Derived from n8n-nodes-base.mattermost version 2.3.'),
			});
			expect(result.definitions[0].content).not.toContain('No typed module');
			expect(result.definitions[1].content.match(/contractStep\(/g)).toHaveLength(1);
			expect(result.definitions[1].content).toContain('export type MattermostChannelArchiveInput');
			expect(result.definitions[2].content).toContain('export type MattermostV23Params');
			expect(context.nodeService.getNodeTypeDefinition).toHaveBeenCalledTimes(1);
			expect(described).toMatchObject({ found: true, node: 'n8n-nodes-base.mattermost' });
			expect(context.nodeService.getDescription).not.toHaveBeenCalled();
		});

		it('describes a node without a module with its legacy description', async () => {
			const context = createContractContext();
			const result = await executeTool(createNodesTool(context, 'full'), {
				action: 'describe',
				nodeType: 'n8n-nodes-base.mattermost',
			});

			expect(result).toMatchObject({ found: true, properties: [{ type: 'credentialsSelect' }] });
		});

		it.each(['full', 'orchestrator'] as const)(
			'asks for all definitions in one call on the %s surface',
			(surface) => {
				const { description } = createNodesTool(createContractContext(), surface);

				expect(description).toContain('one call');
				expect(description).not.toContain('first to read');
			},
		);
	});
});
