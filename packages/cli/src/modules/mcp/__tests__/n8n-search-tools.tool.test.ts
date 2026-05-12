import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import type { CredentialsEntity } from '@n8n/db';
import type { INodeTypeDescription } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import { NodeCatalogService } from '@/node-catalog';
import { Telemetry } from '@/telemetry';

import { createN8nSearchToolsTool, searchN8nTools } from '../tools/n8n-search-tools.tool';

type EnrichedCredential = Partial<CredentialsEntity>;

const buildCredential = (overrides: EnrichedCredential = {}): EnrichedCredential => ({
	id: 'cred-1',
	name: 'My API Key',
	type: 'slackApi',
	isManaged: false,
	isGlobal: false,
	...overrides,
});

/**
 * Build a Slack-like node description with resource/operation discriminators
 * and a mix of property types (including loadOptions/resourceLocator/resourceMapper).
 */
const buildSlackNodeDescription = (): INodeTypeDescription =>
	({
		name: 'n8n-nodes-base.slack',
		displayName: 'Slack',
		description: 'Consume Slack API',
		credentials: [{ name: 'slackApi' }, { name: 'slackOAuth2Api' }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Channel', value: 'channel' },
					{ name: 'Message', value: 'message' },
				],
				default: 'message',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['message'] } },
				options: [
					{ name: 'Send', value: 'send', action: 'Send a message' },
					{ name: 'Delete', value: 'delete', action: 'Delete a message' },
				],
				default: 'send',
			},
			{
				displayName: 'Channel',
				name: 'channelId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				displayOptions: { show: { resource: ['message'], operation: ['send'] } },
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				default: '',
				required: true,
				description: 'The message text',
				displayOptions: { show: { resource: ['message'], operation: ['send'] } },
			},
			{
				displayName: 'Reply Broadcast',
				name: 'replyBroadcast',
				type: 'boolean',
				default: false,
				description: 'Whether to broadcast the reply',
				displayOptions: { show: { resource: ['message'], operation: ['send'] } },
			},
			{
				displayName: 'Channel Picker',
				name: 'channelPicker',
				type: 'options',
				default: '',
				typeOptions: { loadOptionsMethod: 'getChannels' },
				displayOptions: { show: { resource: ['message'], operation: ['send'] } },
			},
			{
				displayName: 'Mapper',
				name: 'mapper',
				type: 'resourceMapper',
				default: {},
				displayOptions: { show: { resource: ['message'], operation: ['send'] } },
			},
			{
				displayName: 'Channel ID (Delete)',
				name: 'channelDelete',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['message'], operation: ['delete'] } },
			},
		],
	}) as unknown as INodeTypeDescription;

/**
 * Build a "simple" node description with just an operation discriminator and no resource.
 */
const buildSimpleNodeDescription = (): INodeTypeDescription =>
	({
		name: 'n8n-nodes-base.set',
		displayName: 'Set',
		description: 'Set values',
		credentials: [],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [{ name: 'Manual', value: 'manual', action: 'Set values manually' }],
				default: 'manual',
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'string',
				default: '',
				required: true,
			},
		],
	}) as unknown as INodeTypeDescription;

/**
 * Build a node description with NO discriminator at all (just plain properties).
 */
const buildBareNodeDescription = (): INodeTypeDescription =>
	({
		name: 'n8n-nodes-base.httpRequest',
		displayName: 'HTTP Request',
		description: 'Makes an HTTP request',
		credentials: [],
		properties: [
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				description: 'The URL to request',
			},
		],
	}) as unknown as INodeTypeDescription;

describe('n8n_search_tools MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });

	type SearchHit = { nodeId: string; displayName: string; description: string };

	const createMocks = (
		opts: {
			searchHits?: SearchHit[];
			nodeDescriptions?: Map<string, INodeTypeDescription | null>;
			credentials?: EnrichedCredential[] | Error;
		} = {},
	) => {
		const searchHits = opts.searchHits ?? [];
		const nodeDescriptions =
			opts.nodeDescriptions ?? new Map<string, INodeTypeDescription | null>();
		const credentials = opts.credentials ?? [];

		const getMany =
			credentials instanceof Error
				? jest.fn().mockRejectedValue(credentials)
				: jest.fn().mockResolvedValue(credentials);

		const credentialsService = mockInstance(CredentialsService, { getMany });
		const telemetry = mockInstance(Telemetry, { track: jest.fn() });

		const searchNodesStructured = jest.fn().mockResolvedValue(searchHits);
		const getNodeType = jest.fn().mockImplementation((nodeId: string) => {
			return nodeDescriptions.get(nodeId) ?? null;
		});

		const nodeCatalogService = mockInstance(NodeCatalogService, {
			searchNodesStructured,
			getNodeTypeParser: jest.fn().mockReturnValue({
				getNodeType,
				searchNodeTypes: jest.fn().mockReturnValue([]),
			}),
		});

		return {
			credentialsService,
			telemetry,
			nodeCatalogService,
			searchNodesStructured,
			getNodeType,
		};
	};

	describe('smoke tests', () => {
		test('creates the tool correctly', () => {
			const { credentialsService, telemetry, nodeCatalogService } = createMocks();

			const tool = createN8nSearchToolsTool(
				user,
				credentialsService,
				nodeCatalogService,
				telemetry,
			);

			expect(tool.name).toBe('n8n_search_tools');
			expect(tool.config.description).toEqual(expect.any(String));
			expect(tool.config.inputSchema).toBeDefined();
			expect(tool.config.outputSchema).toBeDefined();
			expect(tool.config.annotations).toMatchObject({
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			});
			expect(typeof tool.handler).toBe('function');
		});
	});

	describe('handler', () => {
		test('returns inline userCredentials for matching node type', async () => {
			const slack = buildSlackNodeDescription();
			const { credentialsService, nodeCatalogService } = createMocks({
				searchHits: [
					{
						nodeId: 'n8n-nodes-base.slack',
						displayName: 'Slack',
						description: 'Consume Slack API',
					},
				],
				nodeDescriptions: new Map([['n8n-nodes-base.slack', slack]]),
				credentials: [buildCredential({ id: 'c1', name: 'My Slack', type: 'slackApi' })],
			});

			const result = await searchN8nTools(user, credentialsService, nodeCatalogService, {
				query: 'slack',
				filters: { hasCredential: true },
			});

			expect(result.results.length).toBeGreaterThan(0);
			// Every emitted result for the slack node should expose the credential.
			result.results.forEach((r) => {
				expect(r.userCredentials).toContainEqual({ id: 'c1', name: 'My Slack' });
			});
		});

		test('result.id is "<nodeType>.<resource>.<operation>" shape', async () => {
			const slack = buildSlackNodeDescription();
			const { credentialsService, nodeCatalogService } = createMocks({
				searchHits: [
					{
						nodeId: 'n8n-nodes-base.slack',
						displayName: 'Slack',
						description: 'Consume Slack API',
					},
				],
				nodeDescriptions: new Map([['n8n-nodes-base.slack', slack]]),
			});

			const result = await searchN8nTools(user, credentialsService, nodeCatalogService, {
				query: 'slack',
			});

			// Every result id must match `<nodeType>.<resource>.<operation>`,
			// e.g. "n8n-nodes-base.slack.message.send".
			expect(result.results.length).toBeGreaterThan(0);
			result.results.forEach((r) => {
				expect(r.id).toMatch(/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/);
			});

			// Specifically, we should see message.send.
			const sendResult = result.results.find((r) => r.id === 'n8n-nodes-base.slack.message.send');
			expect(sendResult).toBeDefined();
			expect(sendResult?.displayName).toMatch(/send/i);
		});

		test('inputSchema is JSON Schema, not a TS code string', async () => {
			const slack = buildSlackNodeDescription();
			const { credentialsService, nodeCatalogService } = createMocks({
				searchHits: [
					{
						nodeId: 'n8n-nodes-base.slack',
						displayName: 'Slack',
						description: 'Consume Slack API',
					},
				],
				nodeDescriptions: new Map([['n8n-nodes-base.slack', slack]]),
			});

			const result = await searchN8nTools(user, credentialsService, nodeCatalogService, {
				query: 'slack',
			});

			expect(result.results.length).toBeGreaterThan(0);
			const first = result.results[0];
			expect(first.inputSchema).toBeDefined();
			expect(first.inputSchema.type).toBe('object');
			expect(first.inputSchema.properties).toBeDefined();
			expect(typeof first.inputSchema.properties).toBe('object');
		});

		test('omits loadOptions/resourceLocator/resourceMapper from inputSchema', async () => {
			const slack = buildSlackNodeDescription();
			const { credentialsService, nodeCatalogService } = createMocks({
				searchHits: [
					{
						nodeId: 'n8n-nodes-base.slack',
						displayName: 'Slack',
						description: 'Consume Slack API',
					},
				],
				nodeDescriptions: new Map([['n8n-nodes-base.slack', slack]]),
			});

			const result = await searchN8nTools(user, credentialsService, nodeCatalogService, {
				query: 'slack',
			});

			const sendResult = result.results.find((r) => r.id === 'n8n-nodes-base.slack.message.send');
			expect(sendResult).toBeDefined();
			const properties = sendResult!.inputSchema.properties as Record<string, unknown>;

			// resourceLocator + resourceMapper + loadOptions properties must be omitted.
			expect(properties).not.toHaveProperty('channelId');
			expect(properties).not.toHaveProperty('mapper');
			expect(properties).not.toHaveProperty('channelPicker');

			// Plain string/boolean properties for this resource/operation are kept.
			expect(properties).toHaveProperty('text');
			expect(properties).toHaveProperty('replyBroadcast');

			// Properties belonging to a different operation are excluded.
			expect(properties).not.toHaveProperty('channelDelete');
		});

		test('emits one entry per (resource, operation) combination', async () => {
			const slack = buildSlackNodeDescription();
			const { credentialsService, nodeCatalogService } = createMocks({
				searchHits: [
					{
						nodeId: 'n8n-nodes-base.slack',
						displayName: 'Slack',
						description: 'Consume Slack API',
					},
				],
				nodeDescriptions: new Map([['n8n-nodes-base.slack', slack]]),
			});

			const result = await searchN8nTools(user, credentialsService, nodeCatalogService, {
				query: 'slack',
			});

			const ids = result.results.map((r) => r.id);
			expect(ids).toContain('n8n-nodes-base.slack.message.send');
			expect(ids).toContain('n8n-nodes-base.slack.message.delete');
		});

		test('emits one entry per operation for nodes without a resource discriminator', async () => {
			const setNode = buildSimpleNodeDescription();
			const { credentialsService, nodeCatalogService } = createMocks({
				searchHits: [
					{
						nodeId: 'n8n-nodes-base.set',
						displayName: 'Set',
						description: 'Set values',
					},
				],
				nodeDescriptions: new Map([['n8n-nodes-base.set', setNode]]),
			});

			const result = await searchN8nTools(user, credentialsService, nodeCatalogService, {
				query: 'set',
			});

			expect(result.results.length).toBe(1);
			expect(result.results[0].id).toBe('n8n-nodes-base.set.manual');
		});

		test('emits a single entry with id=nodeId for bare nodes (no resource/operation)', async () => {
			const httpNode = buildBareNodeDescription();
			const { credentialsService, nodeCatalogService } = createMocks({
				searchHits: [
					{
						nodeId: 'n8n-nodes-base.httpRequest',
						displayName: 'HTTP Request',
						description: 'Makes an HTTP request',
					},
				],
				nodeDescriptions: new Map([['n8n-nodes-base.httpRequest', httpNode]]),
			});

			const result = await searchN8nTools(user, credentialsService, nodeCatalogService, {
				query: 'http',
			});

			expect(result.results.length).toBe(1);
			expect(result.results[0].id).toBe('n8n-nodes-base.httpRequest');
			const props = result.results[0].inputSchema.properties as Record<string, unknown>;
			expect(props).toHaveProperty('url');
		});

		test('returns empty results when search returns nothing', async () => {
			const { credentialsService, nodeCatalogService } = createMocks({ searchHits: [] });

			const result = await searchN8nTools(user, credentialsService, nodeCatalogService, {
				query: 'nothing',
			});

			expect(result.results).toEqual([]);
		});

		test('emits result with empty inputSchema if node description cannot be resolved', async () => {
			const { credentialsService, nodeCatalogService } = createMocks({
				searchHits: [
					{
						nodeId: 'n8n-nodes-base.unknown',
						displayName: 'Unknown',
						description: 'Unknown node',
					},
				],
				nodeDescriptions: new Map([['n8n-nodes-base.unknown', null]]),
			});

			const result = await searchN8nTools(user, credentialsService, nodeCatalogService, {
				query: 'unknown',
			});

			expect(result.results.length).toBe(1);
			expect(result.results[0].id).toBe('n8n-nodes-base.unknown');
			expect(result.results[0].inputSchema.type).toBe('object');
			expect(result.results[0].inputSchema.properties).toEqual({});
			expect(result.results[0].userCredentials).toEqual([]);
		});

		test('userCredentials is empty array when the node declares no credentials', async () => {
			const setNode = buildSimpleNodeDescription();
			const { credentialsService, nodeCatalogService } = createMocks({
				searchHits: [
					{
						nodeId: 'n8n-nodes-base.set',
						displayName: 'Set',
						description: 'Set values',
					},
				],
				nodeDescriptions: new Map([['n8n-nodes-base.set', setNode]]),
			});

			const result = await searchN8nTools(user, credentialsService, nodeCatalogService, {
				query: 'set',
			});

			expect(result.results[0].userCredentials).toEqual([]);
			// And we never even ask credentialsService for credentials in that case.
			expect(credentialsService.getMany as jest.Mock).not.toHaveBeenCalled();
		});

		test('never includes credential `data` or `apiKey` fields in userCredentials', async () => {
			const slack = buildSlackNodeDescription();
			const credWithSecrets = {
				...buildCredential({ id: 'c1', name: 'My Slack', type: 'slackApi' }),
				data: 'encrypted-blob',
				apiKey: 'super-secret',
			} as unknown as EnrichedCredential;

			const { credentialsService, nodeCatalogService } = createMocks({
				searchHits: [
					{
						nodeId: 'n8n-nodes-base.slack',
						displayName: 'Slack',
						description: 'Consume Slack API',
					},
				],
				nodeDescriptions: new Map([['n8n-nodes-base.slack', slack]]),
				credentials: [credWithSecrets],
			});

			const result = await searchN8nTools(user, credentialsService, nodeCatalogService, {
				query: 'slack',
			});

			result.results.forEach((r) => {
				r.userCredentials.forEach((c) => {
					expect(c).not.toHaveProperty('data');
					expect(c).not.toHaveProperty('apiKey');
					expect(Object.keys(c).sort()).toEqual(['id', 'name']);
				});
			});
		});

		test('passes hasCredential filter through to NodeCatalogService.searchNodesStructured', async () => {
			const { credentialsService, nodeCatalogService, searchNodesStructured } = createMocks({
				searchHits: [],
			});

			await searchN8nTools(user, credentialsService, nodeCatalogService, {
				query: 'slack',
				filters: { hasCredential: true },
			});

			expect(searchNodesStructured).toHaveBeenCalledWith(['slack'], { hasCredential: true });
		});

		test('tracks telemetry on success', async () => {
			const { credentialsService, telemetry, nodeCatalogService } = createMocks({
				searchHits: [],
			});

			const tool = createN8nSearchToolsTool(
				user,
				credentialsService,
				nodeCatalogService,
				telemetry,
			);
			await tool.handler(
				{
					query: 'slack',
					filters: undefined as unknown as { hasCredential?: boolean },
				},
				{} as never,
			);

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					user_id: 'user-1',
					tool_name: 'n8n_search_tools',
					results: { success: true, data: { count: 0 } },
				}),
			);
		});

		test('returns isError and tracks failure when search throws', async () => {
			const credentialsService = mockInstance(CredentialsService, {
				getMany: jest.fn(),
			});
			const telemetry = mockInstance(Telemetry, { track: jest.fn() });
			const nodeCatalogService = mockInstance(NodeCatalogService, {
				searchNodesStructured: jest.fn().mockRejectedValue(new Error('Catalog exploded')),
				getNodeTypeParser: jest.fn(),
			});

			const tool = createN8nSearchToolsTool(
				user,
				credentialsService,
				nodeCatalogService,
				telemetry,
			);
			const result = await tool.handler(
				{
					query: 'slack',
					filters: undefined as unknown as { hasCredential?: boolean },
				},
				{} as never,
			);

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toMatchObject({
				results: [],
				error: 'Catalog exploded',
			});
			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					tool_name: 'n8n_search_tools',
					results: { success: false, error: 'Catalog exploded' },
				}),
			);
		});
	});
});
