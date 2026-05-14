import { User, type CredentialsEntity } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { ICredentialType } from 'n8n-workflow';

import {
	buildCredentialSetupOutput,
	CREDENTIAL_SETUP_CREATE_TOOL,
	CREDENTIAL_SETUP_DELETE_DRAFT_TOOL,
	CREDENTIAL_SETUP_DESCRIBE_TOOL,
	CREDENTIAL_SETUP_OAUTH_AUTHORIZE_TOOL,
	CREDENTIAL_SETUP_STATUS_TOOL,
	CREDENTIAL_SETUP_TEST_TOOL,
	createCredentialSetupTools,
	SETUP_CREDENTIAL_TOOL,
} from '../tools/credential-setup.tool';

import type { CredentialTypes } from '@/credential-types';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import type { OauthService } from '@/oauth/oauth.service';
import type { Telemetry } from '@/telemetry';

describe('credential setup MCP tools', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	const instanceBaseUrl = 'http://localhost:5678';

	const createDependencies = () => {
		const credentialTypes = mock<CredentialTypes>();
		const credentialsService = mock<CredentialsService>();
		const credentialsFinderService = mock<CredentialsFinderService>();
		const oauthService = mock<OauthService>();
		const telemetry = mock<Telemetry>();

		credentialTypes.getByName.mockImplementation((name: string) => {
			if (name === 'oAuth2Api') {
				return {
					name,
					displayName: 'OAuth2 API',
					properties: [],
				} as ICredentialType;
			}

			return {
				name,
				displayName: name === 'exampleOAuth2Api' ? 'Example OAuth2 API' : 'Example API',
				extends: name === 'exampleOAuth2Api' ? ['oAuth2Api'] : [],
				__overwrittenProperties: ['clientSecret'],
				properties: [
					{
						displayName: 'API Key',
						name: 'apiKey',
						type: 'string',
						typeOptions: { password: true },
						default: '',
						required: true,
					},
					{
						displayName: 'Hidden',
						name: 'hidden',
						type: 'hidden',
						default: '',
					},
					{
						displayName: 'Client Secret',
						name: 'clientSecret',
						type: 'string',
						typeOptions: { password: true },
						default: '',
					},
					{
						displayName: 'Unsupported',
						name: 'nested',
						type: 'collection',
						default: {},
					},
				],
			} as ICredentialType;
		});
		credentialTypes.getParentTypes.mockImplementation((name: string) =>
			name === 'exampleOAuth2Api' ? ['oAuth2Api'] : [],
		);

		return {
			user,
			credentialTypes,
			credentialsService,
			credentialsFinderService,
			oauthService,
			telemetry,
			instanceBaseUrl,
		};
	};

	const findTool = (name: string, dependencies = createDependencies()) => {
		const tool = createCredentialSetupTools(dependencies).find(
			(candidate) => candidate.name === name,
		);
		if (!tool) throw new Error(`Missing tool ${name}`);

		return { tool, dependencies };
	};

	it('builds setup metadata without hidden or overwritten fields', () => {
		const dependencies = createDependencies();

		const output = buildCredentialSetupOutput({
			credentialTypes: dependencies.credentialTypes,
			instanceBaseUrl,
			input: {
				credentialType: 'exampleApi',
				projectId: 'project-1',
				suggestedName: 'Example account',
			},
		});

		expect(output).toEqual(
			expect.objectContaining({
				credentialType: 'exampleApi',
				credentialName: 'Example account',
				projectId: 'project-1',
				isOAuth: false,
				hasUnsupportedFields: true,
				unsupportedFieldNames: ['Unsupported'],
				fallbackUrl: 'http://localhost:5678/home/credentials',
			}),
		);
		expect(output.fields.map((field) => field.name)).toEqual(['apiKey']);
		expect(output.fields[0]).toEqual(expect.objectContaining({ password: true }));
	});

	it('marks OAuth credential setup metadata', () => {
		const dependencies = createDependencies();

		const output = buildCredentialSetupOutput({
			credentialTypes: dependencies.credentialTypes,
			instanceBaseUrl,
			input: { credentialType: 'exampleOAuth2Api' },
		});

		expect(output.isOAuth).toBe(true);
		expect(output.oauthVersion).toBe('oauth2');
	});

	it('creates credentials through the app-only create tool without returning submitted data', async () => {
		const { tool, dependencies } = findTool(CREDENTIAL_SETUP_CREATE_TOOL);
		dependencies.credentialsService.createUnmanagedCredential.mockResolvedValue({
			id: 'cred-1',
			name: 'Example account',
			type: 'exampleApi',
		} as Awaited<ReturnType<CredentialsService['createUnmanagedCredential']>>);

		const result = await tool.handler(
			{
				credentialType: 'exampleApi',
				name: 'Example account',
				projectId: 'project-1',
				data: { apiKey: 'secret-api-key' },
			},
			{} as never,
		);

		expect(dependencies.credentialsService.createUnmanagedCredential).toHaveBeenCalledWith(
			expect.objectContaining({ data: { apiKey: 'secret-api-key' } }),
			user,
		);
		expect(JSON.stringify(result)).not.toContain('secret-api-key');
		expect(result.structuredContent).toEqual({
			credentialId: 'cred-1',
			credentialName: 'Example account',
			credentialType: 'exampleApi',
			status: 'created',
		});
		expect(dependencies.telemetry.track).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				parameters: {
					credentialType: 'exampleApi',
					projectId: 'project-1',
				},
				results: expect.objectContaining({
					success: true,
					data: expect.not.objectContaining({ data: expect.anything() }),
				}),
			}),
		);
	});

	it('resolves the model-visible setup tool after the app-only create tool completes', async () => {
		const dependencies = createDependencies();
		const setupTool = findTool(SETUP_CREDENTIAL_TOOL, dependencies).tool;
		const describeTool = findTool(CREDENTIAL_SETUP_DESCRIBE_TOOL, dependencies).tool;
		const createTool = findTool(CREDENTIAL_SETUP_CREATE_TOOL, dependencies).tool;
		dependencies.credentialsService.createUnmanagedCredential.mockResolvedValue({
			id: 'cred-1',
			name: 'Example account',
			type: 'exampleApi',
		} as Awaited<ReturnType<CredentialsService['createUnmanagedCredential']>>);

		const setupPromise = setupTool.handler(
			{ credentialType: 'exampleApi', suggestedName: 'Example account' },
			{
				requestId: 'setup-1',
				signal: new AbortController().signal,
			} as never,
		);
		const setupSchema = await describeTool.handler(
			{ credentialType: 'exampleApi', suggestedName: 'Example account' },
			{} as never,
		);

		expect(setupSchema.structuredContent).toEqual(
			expect.objectContaining({
				setupSessionId: 'setup-1',
				credentialType: 'exampleApi',
				fields: expect.any(Array),
			}),
		);

		await createTool.handler(
			{
				setupSessionId: 'setup-1',
				credentialType: 'exampleApi',
				name: 'Example account',
				data: { apiKey: 'secret-api-key' },
			},
			{} as never,
		);

		const setupResult = await setupPromise;

		expect(JSON.stringify(setupResult)).not.toContain('secret-api-key');
		expect(setupResult.structuredContent).toEqual({
			credentialId: 'cred-1',
			credentialName: 'Example account',
			credentialType: 'exampleApi',
			status: 'created',
		});
	});

	it('describes the pending setup when the host app id does not match the server request id', async () => {
		const dependencies = createDependencies();
		const setupTool = findTool(SETUP_CREDENTIAL_TOOL, dependencies).tool;
		const describeTool = findTool(CREDENTIAL_SETUP_DESCRIBE_TOOL, dependencies).tool;
		const createTool = findTool(CREDENTIAL_SETUP_CREATE_TOOL, dependencies).tool;
		dependencies.credentialsService.createUnmanagedCredential.mockResolvedValue({
			id: 'cred-1',
			name: 'Example account',
			type: 'exampleApi',
		} as Awaited<ReturnType<CredentialsService['createUnmanagedCredential']>>);

		const setupPromise = setupTool.handler(
			{ credentialType: 'exampleApi', suggestedName: 'Example account' },
			{
				requestId: 'server-request-id',
				signal: new AbortController().signal,
			} as never,
		);
		const setupSchema = await describeTool.handler(
			{ setupSessionId: 'claude-host-id' },
			{} as never,
		);

		expect(setupSchema.structuredContent).toEqual(
			expect.objectContaining({
				setupSessionId: 'server-request-id',
				credentialType: 'exampleApi',
			}),
		);

		await createTool.handler(
			{
				setupSessionId: 'server-request-id',
				credentialType: 'exampleApi',
				name: 'Example account',
				data: { apiKey: 'secret-api-key' },
			},
			{} as never,
		);

		await expect(setupPromise).resolves.toEqual(
			expect.objectContaining({
				structuredContent: expect.objectContaining({
					credentialId: 'cred-1',
					status: 'created',
				}),
			}),
		);
	});

	it('resolves the model-visible setup tool after create even without a matching setup session id', async () => {
		const dependencies = createDependencies();
		const setupTool = findTool(SETUP_CREDENTIAL_TOOL, dependencies).tool;
		const createTool = findTool(CREDENTIAL_SETUP_CREATE_TOOL, dependencies).tool;
		dependencies.credentialsService.createUnmanagedCredential.mockResolvedValue({
			id: 'cred-1',
			name: 'Example account',
			type: 'exampleApi',
		} as Awaited<ReturnType<CredentialsService['createUnmanagedCredential']>>);

		const setupPromise = setupTool.handler(
			{ credentialType: 'exampleApi', suggestedName: 'Example account' },
			{
				requestId: 'server-request-id',
				signal: new AbortController().signal,
			} as never,
		);

		await createTool.handler(
			{
				setupSessionId: 'claude-host-id',
				credentialType: 'exampleApi',
				name: 'Example account',
				data: { apiKey: 'secret-api-key' },
			},
			{} as never,
		);

		await expect(setupPromise).resolves.toEqual(
			expect.objectContaining({
				structuredContent: expect.objectContaining({
					credentialId: 'cred-1',
					status: 'created',
				}),
			}),
		);
	});

	it('resolves the model-visible setup tool after create when the user changes the credential name', async () => {
		const dependencies = createDependencies();
		const setupTool = findTool(SETUP_CREDENTIAL_TOOL, dependencies).tool;
		const createTool = findTool(CREDENTIAL_SETUP_CREATE_TOOL, dependencies).tool;
		dependencies.credentialsService.createUnmanagedCredential.mockResolvedValue({
			id: 'cred-1',
			name: 'Example account from Claude',
			type: 'exampleApi',
		} as Awaited<ReturnType<CredentialsService['createUnmanagedCredential']>>);

		const setupPromise = setupTool.handler(
			{ credentialType: 'exampleApi', suggestedName: 'Example account' },
			{
				requestId: 'server-request-id',
				signal: new AbortController().signal,
			} as never,
		);

		await createTool.handler(
			{
				setupSessionId: 'claude-host-id',
				credentialType: 'exampleApi',
				name: 'Example account from Claude',
				data: { apiKey: 'secret-api-key' },
			},
			{} as never,
		);

		await expect(setupPromise).resolves.toEqual(
			expect.objectContaining({
				structuredContent: expect.objectContaining({
					credentialId: 'cred-1',
					credentialName: 'Example account from Claude',
					status: 'created',
				}),
			}),
		);
	});

	it('generates OAuth authorization URLs without exposing credential data', async () => {
		const { tool, dependencies } = findTool(CREDENTIAL_SETUP_OAUTH_AUTHORIZE_TOOL);
		dependencies.credentialsFinderService.findCredentialForUser.mockResolvedValue({
			id: 'cred-1',
			name: 'Example OAuth account',
			type: 'exampleOAuth2Api',
		} as CredentialsEntity);
		dependencies.oauthService.generateAOauth2AuthUri.mockResolvedValue(
			'https://auth.example/start',
		);

		const result = await tool.handler({ credentialId: 'cred-1' }, {} as never);

		expect(dependencies.oauthService.generateAOauth2AuthUri).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'cred-1' }),
			{ cid: 'cred-1', origin: 'static-credential', userId: 'user-1' },
		);
		expect(JSON.stringify(result)).not.toContain('oauthTokenData');
		expect(result.structuredContent).toEqual(
			expect.objectContaining({
				credentialId: 'cred-1',
				credentialName: 'Example OAuth account',
				credentialType: 'exampleOAuth2Api',
				status: 'authorization_required',
				authorizationUrl: 'https://auth.example/start',
			}),
		);
	});

	it('polls OAuth status using only safe metadata', async () => {
		const { tool, dependencies } = findTool(CREDENTIAL_SETUP_STATUS_TOOL);
		dependencies.credentialsService.getOne.mockResolvedValue({
			id: 'cred-1',
			name: 'Example OAuth account',
			type: 'exampleOAuth2Api',
			data: { oauthTokenData: true },
		} as unknown as Awaited<ReturnType<CredentialsService['getOne']>>);

		const result = await tool.handler({ credentialId: 'cred-1' }, {} as never);

		expect(JSON.stringify(result)).not.toContain('access_token');
		expect(result.structuredContent).toEqual(
			expect.objectContaining({
				credentialId: 'cred-1',
				status: 'connected',
				connected: true,
			}),
		);
	});

	it('tests credentials without returning submitted test data', async () => {
		const { tool, dependencies } = findTool(CREDENTIAL_SETUP_TEST_TOOL);
		dependencies.credentialsService.getOne.mockResolvedValue({
			id: 'cred-1',
			name: 'Example account',
			type: 'exampleApi',
		} as Awaited<ReturnType<CredentialsService['getOne']>>);
		dependencies.credentialsService.testWithCredentials.mockResolvedValue({
			status: 'OK',
			message: 'Credential tested successfully',
		});

		const result = await tool.handler(
			{ credentialId: 'cred-1', data: { apiKey: 'secret-api-key' } },
			{} as never,
		);

		expect(dependencies.credentialsService.testWithCredentials).toHaveBeenCalledWith(
			user,
			expect.objectContaining({ data: { apiKey: 'secret-api-key' } }),
		);
		expect(JSON.stringify(result)).not.toContain('secret-api-key');
		expect(result.structuredContent).toEqual(
			expect.objectContaining({
				credentialId: 'cred-1',
				status: 'tested',
				connected: true,
			}),
		);
	});

	it('deletes credential drafts from the app-only delete tool', async () => {
		const { tool, dependencies } = findTool(CREDENTIAL_SETUP_DELETE_DRAFT_TOOL);

		const result = await tool.handler({ credentialId: 'cred-1' }, {} as never);

		expect(dependencies.credentialsService.delete).toHaveBeenCalledWith(user, 'cred-1');
		expect(result.structuredContent).toEqual(
			expect.objectContaining({
				credentialId: 'cred-1',
				status: 'deleted',
			}),
		);
	});

	it('exposes only the setup launcher to the model by default', () => {
		const tools = createCredentialSetupTools(createDependencies());
		const setupTool = tools.find((tool) => tool.name === SETUP_CREDENTIAL_TOOL);
		const appOnlyTool = tools.find((tool) => tool.name === CREDENTIAL_SETUP_CREATE_TOOL);
		const describeTool = tools.find((tool) => tool.name === CREDENTIAL_SETUP_DESCRIBE_TOOL);

		expect(setupTool?.config._meta).toEqual(
			expect.objectContaining({
				ui: expect.objectContaining({ resourceUri: expect.any(String) }),
			}),
		);
		expect(appOnlyTool?.config._meta).toEqual({
			ui: { visibility: ['app'] },
		});
		expect(describeTool?.config._meta).toEqual({
			ui: { visibility: ['app'] },
		});
	});
});
