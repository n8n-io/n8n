import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import type { CredentialsEntity } from '@n8n/db';

import { CredentialsService } from '@/credentials/credentials.service';
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
				? jest.fn().mockRejectedValue(credentials)
				: jest.fn().mockResolvedValue(credentials);
		const credentialsService = mockInstance(CredentialsService, { getMany });
		const telemetry = mockInstance(Telemetry, { track: jest.fn() });
		return { credentialsService, telemetry };
	};

	describe('smoke tests', () => {
		test('creates the tool correctly', () => {
			const { credentialsService, telemetry } = createMocks();

			const tool = createListCredentialsTool(user, credentialsService, telemetry);

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
		test('formats credentials and never includes data', async () => {
			const { credentialsService } = createMocks([
				buildCredential({
					id: 'a',
					name: 'Slack',
					type: 'slackApi',
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

			const result = await listCredentials(user, credentialsService, {});

			expect(result).toEqual({
				count: 2,
				data: [
					{
						id: 'a',
						name: 'Slack',
						type: 'slackApi',
						scopes: ['credential:read', 'credential:update'],
						isManaged: false,
						isGlobal: false,
						homeProject: { id: 'proj-1', name: 'Personal', type: 'personal' },
					},
					{
						id: 'b',
						name: 'HTTP Header',
						type: 'httpHeaderAuth',
						scopes: [],
						isManaged: false,
						isGlobal: true,
						homeProject: null,
					},
				],
			});

			const [, optionsArg] = (credentialsService.getMany as jest.Mock).mock.calls[0];
			expect(optionsArg).toMatchObject({
				includeScopes: true,
				includeData: false,
				includeGlobal: true,
				onlySharedWithMe: false,
			});
		});

		test('passes filters to credentialsService.getMany and clamps limit', async () => {
			const { credentialsService } = createMocks();

			await listCredentials(user, credentialsService, {
				limit: 9999,
				query: 'prod',
				type: 'slackApi',
				projectId: 'proj-1',
				onlySharedWithMe: true,
			});

			const [, optionsArg] = (credentialsService.getMany as jest.Mock).mock.calls[0];
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

			const result = await listCredentials(user, credentialsService, {});

			expect(result.data[0].homeProject).toEqual({
				id: 'proj-1',
				name: 'My team',
				type: 'team',
			});
		});

		test('disables includeGlobal when onlySharedWithMe is true so globals do not leak through', async () => {
			const { credentialsService } = createMocks();

			await listCredentials(user, credentialsService, { onlySharedWithMe: true });

			const [, optionsArg] = (credentialsService.getMany as jest.Mock).mock.calls[0];
			expect(optionsArg).toMatchObject({
				onlySharedWithMe: true,
				includeGlobal: false,
			});
		});

		test('clamps non-positive limit up to 1', async () => {
			const { credentialsService } = createMocks();

			await listCredentials(user, credentialsService, { limit: 0 });

			const [, optionsArg] = (credentialsService.getMany as jest.Mock).mock.calls[0];
			expect(optionsArg.listQueryOptions.take).toBe(1);
		});

		test('omits filter when no filter args provided', async () => {
			const { credentialsService } = createMocks();

			await listCredentials(user, credentialsService, {});

			const [, optionsArg] = (credentialsService.getMany as jest.Mock).mock.calls[0];
			expect(optionsArg.listQueryOptions.filter).toBeUndefined();
		});

		test('tracks telemetry on success', async () => {
			const { credentialsService, telemetry } = createMocks([buildCredential()]);

			const tool = createListCredentialsTool(user, credentialsService, telemetry);
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

			const tool = createListCredentialsTool(user, credentialsService, telemetry);
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
	});
});
