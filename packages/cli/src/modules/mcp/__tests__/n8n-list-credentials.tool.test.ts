import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import type { CredentialsEntity } from '@n8n/db';
import type { INodeTypeDescription } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import { NodeCatalogService } from '@/node-catalog';
import { Telemetry } from '@/telemetry';

import {
	createN8nListCredentialsTool,
	listN8nCredentials,
} from '../tools/n8n-list-credentials.tool';

type EnrichedCredential = Partial<CredentialsEntity>;

const buildCredential = (overrides: EnrichedCredential = {}): EnrichedCredential => ({
	id: 'cred-1',
	name: 'My API Key',
	type: 'httpHeaderAuth',
	isManaged: false,
	isGlobal: false,
	...overrides,
});

const buildSlackNodeDescription = (): INodeTypeDescription =>
	({
		name: 'n8n-nodes-base.slack',
		displayName: 'Slack',
		credentials: [{ name: 'slackApi' }, { name: 'slackOAuth2Api' }],
	}) as unknown as INodeTypeDescription;

describe('n8n_list_credentials MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });

	const createMocks = (
		credentials: EnrichedCredential[] | Error = [],
		nodeDescription: INodeTypeDescription | null = null,
	) => {
		const getMany =
			credentials instanceof Error
				? jest.fn().mockRejectedValue(credentials)
				: jest.fn().mockResolvedValue(credentials);
		const credentialsService = mockInstance(CredentialsService, { getMany });
		const telemetry = mockInstance(Telemetry, { track: jest.fn() });
		const nodeCatalogService = mockInstance(NodeCatalogService, {
			getNodeTypeParser: jest.fn().mockReturnValue({
				getNodeType: jest.fn().mockReturnValue(nodeDescription),
				searchNodeTypes: jest.fn().mockReturnValue(
					nodeDescription
						? [
								{
									id: nodeDescription.name,
									displayName: nodeDescription.displayName,
									description: '',
									version: 1,
									isTrigger: false,
								},
							]
						: [],
				),
			}),
		});
		return { credentialsService, telemetry, nodeCatalogService };
	};

	describe('smoke tests', () => {
		test('creates the tool correctly', () => {
			const { credentialsService, telemetry, nodeCatalogService } = createMocks();

			const tool = createN8nListCredentialsTool(
				user,
				credentialsService,
				nodeCatalogService,
				telemetry,
			);

			expect(tool.name).toBe('n8n_list_credentials');
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
		test('filters by nodeType resolved to credential type', async () => {
			const { credentialsService, nodeCatalogService } = createMocks(
				[
					buildCredential({ id: 'a', name: 'My Slack', type: 'slackApi' }),
					buildCredential({ id: 'b', name: 'Slack OAuth', type: 'slackOAuth2Api' }),
				],
				buildSlackNodeDescription(),
			);

			const result = await listN8nCredentials(user, credentialsService, nodeCatalogService, {
				nodeType: 'slack',
			});

			expect(result.credentials.length).toBeGreaterThan(0);
			result.credentials.forEach((c) => {
				expect(c.type.toLowerCase()).toMatch(/slack/);
			});
			// credentialsService.getMany must be called with a filter of one of the
			// resolved credential types (we resolve to slackApi / slackOAuth2Api).
			expect(credentialsService.getMany).toHaveBeenCalled();
			const [, options] = (credentialsService.getMany as jest.Mock).mock.calls[0];
			expect(options.includeData).toBe(false);
		});

		test('never returns secret material', async () => {
			const credWithSecrets = {
				...buildCredential(),
				data: 'encrypted-blob',
				apiKey: 'super-secret',
			} as unknown as EnrichedCredential;
			const { credentialsService, nodeCatalogService } = createMocks([credWithSecrets]);

			const result = await listN8nCredentials(user, credentialsService, nodeCatalogService, {});

			expect(result.credentials.length).toBe(1);
			result.credentials.forEach((c) => {
				expect(c).not.toHaveProperty('data');
				expect(c).not.toHaveProperty('apiKey');
				// Output is strictly { id, name, type }
				expect(Object.keys(c).sort()).toEqual(['id', 'name', 'type']);
			});
		});

		test('returns all credentials when no nodeType is provided', async () => {
			const { credentialsService, nodeCatalogService } = createMocks([
				buildCredential({ id: 'a', name: 'A', type: 'httpHeaderAuth' }),
				buildCredential({ id: 'b', name: 'B', type: 'slackApi' }),
			]);

			const result = await listN8nCredentials(user, credentialsService, nodeCatalogService, {});

			expect(Array.isArray(result.credentials)).toBe(true);
			expect(result.credentials.map((c) => c.id)).toEqual(['a', 'b']);
			// No filter passed to getMany when nodeType not provided.
			const [, options] = (credentialsService.getMany as jest.Mock).mock.calls[0];
			expect(options.listQueryOptions?.filter).toBeUndefined();
		});

		test('ignores unresolvable nodeType and returns all credentials', async () => {
			// Node lookup returns null and searchNodeTypes returns nothing -> filter is dropped
			const { credentialsService, nodeCatalogService } = createMocks(
				[
					buildCredential({ id: 'a', name: 'A', type: 'httpHeaderAuth' }),
					buildCredential({ id: 'b', name: 'B', type: 'slackApi' }),
				],
				null,
			);

			const result = await listN8nCredentials(user, credentialsService, nodeCatalogService, {
				nodeType: 'does-not-exist',
			});

			// All credentials should come back: filter unresolved -> dropped
			expect(result.credentials.map((c) => c.id)).toEqual(['a', 'b']);
		});

		test('tracks telemetry on success', async () => {
			const { credentialsService, telemetry, nodeCatalogService } = createMocks([
				buildCredential(),
			]);

			const tool = createN8nListCredentialsTool(
				user,
				credentialsService,
				nodeCatalogService,
				telemetry,
			);
			await tool.handler(
				{
					nodeType: undefined as unknown as string,
				},
				{} as never,
			);

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					user_id: 'user-1',
					tool_name: 'n8n_list_credentials',
					results: { success: true, data: { count: 1 } },
				}),
			);
		});

		test('returns isError and tracks failure when service throws', async () => {
			const { credentialsService, telemetry, nodeCatalogService } = createMocks(
				new Error('DB exploded'),
			);

			const tool = createN8nListCredentialsTool(
				user,
				credentialsService,
				nodeCatalogService,
				telemetry,
			);
			const result = await tool.handler(
				{
					nodeType: undefined as unknown as string,
				},
				{} as never,
			);

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toMatchObject({
				credentials: [],
				error: 'DB exploded',
			});
			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					tool_name: 'n8n_list_credentials',
					results: { success: false, error: 'DB exploded' },
				}),
			);
		});
	});
});
