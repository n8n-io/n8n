import type { AiGatewayConfigDto } from '@n8n/api-types';
import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import type { CredentialsEntity } from '@n8n/db';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod';

import { CredentialsService } from '@/credentials/credentials.service';
import type { AiGatewayService } from '@/services/ai-gateway.service';
import { Telemetry } from '@/telemetry';

import { createListCredentialsTool, listCredentials } from '../tools/list-credentials.tool';

type EnrichedCredential = Partial<CredentialsEntity> & {
	scopes?: string[];
	homeProject?: { id: string; name: string; type: string; icon?: unknown } | null;
};

const buildCredential = (overrides: EnrichedCredential = {}): EnrichedCredential => ({
	id: 'cred-1',
	name: 'My API Key',
	type: 'httpHeaderAuth',
	isManaged: false,
	isGlobal: false,
	scopes: ['credential:read'],
	homeProject: { id: 'proj-1', name: 'Personal', type: 'personal' },
	...overrides,
});

describe('list-credentials MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });

	const createMocks = (credentials: EnrichedCredential[] | Error = []) => {
		const getMany =
			credentials instanceof Error
				? vi.fn().mockRejectedValue(credentials)
				: vi.fn().mockResolvedValue(credentials);
		const credentialsService = mockInstance(CredentialsService, { getMany });
		const telemetry = mockInstance(Telemetry, { track: vi.fn() });
		return { credentialsService, telemetry };
	};

	const makeAiGatewayMocks = (
		opts: {
			available?: boolean;
			config?: Partial<AiGatewayConfigDto>;
		} = {},
	) => {
		const aiGatewayService = mock<AiGatewayService>();
		if (opts.available === false) {
			aiGatewayService.isAvailable.mockResolvedValue({ available: false });
		} else {
			aiGatewayService.isAvailable.mockResolvedValue({
				available: true,
				config: {
					nodes: ['@n8n/n8n-nodes-langchain.openAi'],
					credentialTypes: ['openAiApi'],
					providerConfig: {
						openAiApi: {
							gatewayPath: '/v1/gateway/openai/v1',
							urlField: 'url',
							apiKeyField: 'apiKey',
						},
					},
					...opts.config,
				} as AiGatewayConfigDto,
			});
		}
		return { aiGatewayService };
	};

	describe('smoke tests', () => {
		test('creates the tool correctly', () => {
			const { credentialsService, telemetry } = createMocks();
			const { aiGatewayService } = makeAiGatewayMocks();

			const tool = createListCredentialsTool(
				user,
				credentialsService,
				telemetry,
				aiGatewayService,
				true,
			);

			expect(tool.name).toBe('list_credentials');
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
		test.each([false, undefined])(
			'omits descriptions from responses, schemas, and guidance when the flag is %s',
			async (enabled) => {
				const { credentialsService, telemetry } = createMocks([
					buildCredential({ description: 'Read-only reporting account' }),
				]);
				const { aiGatewayService } = makeAiGatewayMocks({ available: false });
				const tool = createListCredentialsTool(
					user,
					credentialsService,
					telemetry,
					aiGatewayService,
					enabled,
				);

				const result = await tool.handler(
					{ limit: 200, query: '', type: '', projectId: '', onlySharedWithMe: false },
					{} as never,
				);

				expect(result.structuredContent).toMatchObject({ data: [{ id: 'cred-1' }] });
				expect(JSON.stringify(result.structuredContent)).not.toContain('description');
				const dataSchema = tool.config.outputSchema!.data as z.ZodArray<z.ZodObject<z.ZodRawShape>>;
				expect(dataSchema.element.shape).not.toHaveProperty('description');
				expect(tool.config.description).not.toContain('read their descriptions');
				expect(result.content).toEqual([
					{ type: 'text', text: JSON.stringify(result.structuredContent) },
				]);
			},
		);

		test('formats credentials and never includes data', async () => {
			const { credentialsService } = createMocks([
				buildCredential({
					id: 'a',
					name: 'Slack',
					type: 'slackApi',
					description: 'Send alerts to the operations workspace',
					data: 'encrypted-test-value',
					scopes: ['credential:read', 'credential:update'],
				}),
				buildCredential({
					id: 'b',
					name: 'HTTP Header',
					type: 'httpHeaderAuth',
					isGlobal: true,
					homeProject: null,
					scopes: [],
				}),
			]);

			const result = await listCredentials(user, credentialsService, {}, true);

			expect(result).toEqual({
				count: 2,
				data: [
					{
						id: 'a',
						name: 'Slack',
						type: 'slackApi',
						description: 'Send alerts to the operations workspace',
						scopes: ['credential:read', 'credential:update'],
						isManaged: false,
						isGlobal: false,
						homeProject: { id: 'proj-1', name: 'Personal', type: 'personal' },
					},
					{
						id: 'b',
						name: 'HTTP Header',
						type: 'httpHeaderAuth',
						description: null,
						scopes: [],
						isManaged: false,
						isGlobal: true,
						homeProject: null,
					},
				],
			});

			const [, optionsArg] = (credentialsService.getMany as Mock).mock.calls[0];
			expect(optionsArg).toMatchObject({
				includeScopes: true,
				includeData: false,
				includeGlobal: true,
				onlySharedWithMe: false,
			});
		});

		test.each([
			{ label: 'unset', description: null, expected: null },
			{ label: 'omitted', description: undefined, expected: null },
			{ label: 'short', description: 'Reporting database', expected: 'Reporting database' },
			{ label: 'at the preview limit', description: 'x'.repeat(256), expected: 'x'.repeat(256) },
			{
				label: 'with a Unicode character at the boundary',
				description: 'x'.repeat(252) + '😀extra',
				expected: 'x'.repeat(252) + '...',
			},
			{
				label: 'above the preview limit',
				description: 'x'.repeat(257),
				expected: 'x'.repeat(253) + '...',
			},
			{
				label: 'at the storage limit',
				description: 'x'.repeat(512),
				expected: 'x'.repeat(253) + '...',
			},
		])(
			'returns a $label description in both response formats',
			async ({ description, expected }) => {
				const { credentialsService, telemetry } = createMocks([buildCredential({ description })]);
				const { aiGatewayService } = makeAiGatewayMocks({ available: false });
				const tool = createListCredentialsTool(
					user,
					credentialsService,
					telemetry,
					aiGatewayService,
					true,
				);

				const result = await tool.handler(
					{ limit: 200, query: '', type: '', projectId: '', onlySharedWithMe: false },
					{} as never,
				);

				const parsed = z.object(tool.config.outputSchema!).parse(result.structuredContent);
				expect(parsed.data[0].description).toBe(expected);
				expect(result.content).toEqual([
					{ type: 'text', text: JSON.stringify(result.structuredContent) },
				]);
			},
		);

		test('passes filters to credentialsService.getMany and clamps limit', async () => {
			const { credentialsService } = createMocks();

			await listCredentials(user, credentialsService, {
				limit: 9999,
				query: 'prod',
				type: 'slackApi',
				projectId: 'proj-1',
				onlySharedWithMe: true,
			});

			const [, optionsArg] = (credentialsService.getMany as Mock).mock.calls[0];
			expect(optionsArg).toMatchObject({
				listQueryOptions: {
					take: 200,
					filter: { name: 'prod', type: 'slackApi', projectId: 'proj-1' },
				},
				onlySharedWithMe: true,
				includeGlobal: false,
			});
		});

		test('strips extra fields (e.g. icon) from homeProject so output matches the schema', async () => {
			const { credentialsService } = createMocks([
				buildCredential({
					id: 'a',
					homeProject: {
						id: 'proj-1',
						name: 'My team',
						type: 'team',
						icon: { type: 'icon', value: 'bug' },
					},
				}),
			]);

			const result = await listCredentials(user, credentialsService, {}, true);

			expect(result.data[0].homeProject).toEqual({
				id: 'proj-1',
				name: 'My team',
				type: 'team',
			});
		});

		test('disables includeGlobal when onlySharedWithMe is true so globals do not leak through', async () => {
			const { credentialsService } = createMocks();

			await listCredentials(user, credentialsService, { onlySharedWithMe: true });

			const [, optionsArg] = (credentialsService.getMany as Mock).mock.calls[0];
			expect(optionsArg).toMatchObject({
				onlySharedWithMe: true,
				includeGlobal: false,
			});
		});

		test('clamps non-positive limit up to 1', async () => {
			const { credentialsService } = createMocks();

			await listCredentials(user, credentialsService, { limit: 0 });

			const [, optionsArg] = (credentialsService.getMany as Mock).mock.calls[0];
			expect(optionsArg.listQueryOptions.take).toBe(1);
		});

		test('omits filter when no filter args provided', async () => {
			const { credentialsService } = createMocks();

			await listCredentials(user, credentialsService, {}, true);

			const [, optionsArg] = (credentialsService.getMany as Mock).mock.calls[0];
			expect(optionsArg.listQueryOptions.filter).toBeUndefined();
		});

		test('tracks telemetry on success', async () => {
			const { credentialsService, telemetry } = createMocks([buildCredential()]);

			const { aiGatewayService } = makeAiGatewayMocks({ available: false });
			const tool = createListCredentialsTool(
				user,
				credentialsService,
				telemetry,
				aiGatewayService,
				true,
			);
			await tool.handler(
				{
					limit: undefined as unknown as number,
					query: undefined as unknown as string,
					type: undefined as unknown as string,
					projectId: undefined as unknown as string,
					onlySharedWithMe: undefined as unknown as boolean,
				},
				{} as never,
			);

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					user_id: 'user-1',
					tool_name: 'list_credentials',
					results: { success: true, data: { count: 1 } },
				}),
			);
		});

		test('returns isError and tracks failure when service throws', async () => {
			const { credentialsService, telemetry } = createMocks(new Error('DB exploded'));

			const { aiGatewayService } = makeAiGatewayMocks({ available: false });
			const tool = createListCredentialsTool(
				user,
				credentialsService,
				telemetry,
				aiGatewayService,
				true,
			);
			const result = await tool.handler(
				{
					limit: undefined as unknown as number,
					query: undefined as unknown as string,
					type: undefined as unknown as string,
					projectId: undefined as unknown as string,
					onlySharedWithMe: undefined as unknown as boolean,
				},
				{} as never,
			);

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toMatchObject({
				data: [],
				count: 0,
				error: 'DB exploded',
			});
			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					tool_name: 'list_credentials',
					results: { success: false, error: 'DB exploded' },
				}),
			);
		});

		describe('gatewayCredits block', () => {
			async function callHandler(opts: { available?: boolean } = {}) {
				const { credentialsService, telemetry } = createMocks([buildCredential()]);
				const { aiGatewayService } = makeAiGatewayMocks(opts);
				const tool = createListCredentialsTool(
					user,
					credentialsService,
					telemetry,
					aiGatewayService,
					true,
				);
				const result = await tool.handler(
					{
						limit: undefined as unknown as number,
						query: undefined as unknown as string,
						type: undefined as unknown as string,
						projectId: undefined as unknown as string,
						onlySharedWithMe: undefined as unknown as boolean,
					},
					{} as never,
				);
				return result.structuredContent as {
					data: unknown[];
					count: number;
					gatewayCredits?: { credentialTypes: string[]; nodes: string[] };
				};
			}

			test('includes gatewayCredits block when gateway is available', async () => {
				const structured = await callHandler({ available: true });
				expect(structured.gatewayCredits).toEqual({
					credentialTypes: ['openAiApi'],
					nodes: ['@n8n/n8n-nodes-langchain.openAi'],
				});
			});

			test('omits gatewayCredits block when unavailable', async () => {
				const structured = await callHandler({ available: false });
				expect(structured.gatewayCredits).toBeUndefined();
			});
		});
	});
});
