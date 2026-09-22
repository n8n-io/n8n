import {
	NodeSearchEngine,
	suggestedNodesData,
	type SearchableNodeType,
} from '@n8n/ai-utilities/node-catalog';
import { validateNodeConfig } from '@n8n/workflow-sdk';
import type { Mock } from 'vitest';

import { executeTool } from '../../__tests__/tool-test-utils';
import type { InstanceAiContext } from '../../types';
import { addSetupPreference } from '../nodes/setup-preference';
import { createNodesTool } from '../nodes.tool';

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
					name: '@n8n/n8n-nodes-langchain.openAi',
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
});
