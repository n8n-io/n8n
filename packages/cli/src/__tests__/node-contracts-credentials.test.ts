import { OutboundHttp, type HttpRequestClient } from '@n8n/backend-network';
import { mockInstance } from '@n8n/backend-test-utils';
import type { CommaSeparatedStringArray, GlobalConfig } from '@n8n/config';
import { hostRuntime } from '@n8n/node-sdk/host';
import { bundledCredentialsOf } from '@test/first-party-contracts';
import { LazyPackageDirectoryLoader } from 'n8n-core';
import type {
	ICredentialDataDecryptedObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	IVersionedNodeType,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { generateKeyPairSync, verify } from 'node:crypto';
import path from 'node:path';
import { mock } from 'vitest-mock-extended';

import { CredentialTypes } from '../credential-types';
import { CredentialsHelper } from '../credentials-helper';
import { CredentialsOverwrites } from '../credentials-overwrites';
import { LoadNodesAndCredentials } from '../load-nodes-and-credentials';
import { ContractNodeLoader } from '../node-contracts-registry';

const PACKAGES = path.resolve(__dirname, '../../..');
const NEXT = '@n8n/nodes-integrations';

/** The real packages, the contract package registered first, so the order does not decide. */
async function loaded(nodeContractsEnabled: boolean) {
	const globalConfig = mock<GlobalConfig>({
		instanceAi: { nodeContractsEnabled },
		nodes: { exclude: [], include: [] },
	});
	const instance = new LoadNodesAndCredentials(
		mock(),
		mock(),
		mock(),
		globalConfig,
		mock(),
		mock(),
	);
	const runtime = hostRuntime({
		credentialManifestOf: async (name) =>
			await Promise.resolve(
				bundledCredentialsOf().find(({ manifest }) => manifest.name === name)?.manifest,
			),
	});
	const next = new ContractNodeLoader(runtime, [], [], async () => ({
		versions: async () => new Map(),
		credentials: async () => new Map(),
	}));
	const nodesBase = new LazyPackageDirectoryLoader(path.join(PACKAGES, 'nodes-base'));
	await Promise.all([next.loadAll(), nodesBase.loadAll()]);
	instance.loaders = { [NEXT]: next, 'n8n-nodes-base': nodesBase };
	await instance.postProcessLoaders();
	const credentialTypes = new CredentialTypes(instance);
	const credentialsOverwrites = mock<CredentialsOverwrites>();
	credentialsOverwrites.applyOverwrite.mockImplementation((_type, data) => data);
	const helper = new CredentialsHelper(
		credentialTypes,
		credentialsOverwrites,
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
		mock(),
	);
	return { instance, credentialTypes, helper };
}

const notionKey: ICredentialDataDecryptedObject = { apiKey: 'secret_k' };

interface Signed {
	readonly type: string;
	readonly options: IHttpRequestOptions;
}

/** Runs a node with n8n's credential helper as the signer and records each signed request. */
async function signedRequests(
	nodeType: IVersionedNodeType,
	version: number,
	parameters: Record<string, unknown>,
	sign: (type: string, options: IHttpRequestOptions) => Promise<IHttpRequestOptions>,
) {
	const signed: Signed[] = [];
	const record = async (type: string, options: IHttpRequestOptions) => {
		signed.push({ type, options: await sign(type, structuredClone(options)) });
		return { object: 'user', id: 'u-1', name: 'Ada', type: 'person' };
	};
	const context = {
		getInputData: () => [{ json: {} }],
		getNode: () => ({
			name: 'Notion',
			typeVersion: version,
			credentials: { notionApi: { id: '1', name: 'Notion' } },
		}),
		getNodeParameter: (name: string, _item: number, fallback?: unknown) =>
			parameters[name] ?? fallback,
		getCredentials: async () => notionKey,
		getTimezone: () => 'UTC',
		continueOnFail: () => false,
		setMetadata: () => {},
		helpers: {
			httpRequestWithAuthentication: record,
			requestWithAuthentication: record,
			returnJsonArray: (data: unknown) => [data].flat().map((json) => ({ json })),
			constructExecutionMetaData: (items: unknown) => items,
		},
	} as unknown as IExecuteFunctions;
	await nodeType.getNodeType(version).execute?.call(context);
	return signed;
}

describe('credential types of the node contracts package', () => {
	it('replace the legacy class of the same name with node contracts on', async () => {
		const { instance, credentialTypes } = await loaded(true);

		const token = credentialTypes.getByName('notionApi');
		expect(typeof token.authenticate).toBe('function');
		expect(instance.knownCredentials.notionApi.sourcePath).toBe(
			bundledCredentialsOf().find(({ manifest }) => manifest.id === 'notion.token')?.file,
		);
		expect(credentialTypes.getSupportedNodes('notionApi')).toEqual(
			expect.arrayContaining([
				'n8n-nodes-base.notion',
				'n8n-nodes-base.notionTrigger',
				`${NEXT}.notionUserGet`,
			]),
		);

		const oauth2 = credentialTypes.getByName('notionOAuth2Api');
		expect(oauth2.extends).toEqual(['oAuth2Api']);
		expect(credentialTypes.getParentTypes('notionOAuth2Api')).toEqual(['oAuth2Api']);
		expect(instance.knownCredentials.notionOAuth2Api.sourcePath).toContain(NEXT);
		expect(credentialTypes.getByName('oAuth2Api').name).toBe('oAuth2Api');

		const listed = instance.types.credentials.filter(({ name }) => name === 'notionApi');
		expect(listed).toHaveLength(1);
		expect(listed[0]).toMatchObject({
			documentationUrl: 'notion',
			iconUrl: {
				light: 'icons/n8n-nodes-base/dist/nodes/Notion/notion.svg',
				dark: 'icons/n8n-nodes-base/dist/nodes/Notion/notion.dark.svg',
			},
			test: { request: { baseURL: 'https://api.notion.com/v1', url: '/users/me' } },
		});
		// As for legacy types, the AI tool variants go to the known entry only.
		expect(credentialTypes.getSupportedNodes('notionApi')).toEqual([
			...(listed[0].supportedNodes ?? []),
			'n8n-nodes-base.notionTool',
			'n8n-nodes-base.notionTool',
			'@n8n/nodes-integrations.notionDatabasePageGetAllTool',
			'@n8n/nodes-integrations.notionUserGetTool',
		]);
		// The editor shows the HTTP Request option only for a type with `authenticate`.
		expect(JSON.stringify(listed[0])).toContain('"authenticate":{}');
		expect(
			instance.types.credentials.filter(({ name }) => name === 'notionOAuth2Api'),
		).toHaveLength(1);

		for (const [name, legacyNode] of [
			['githubApi', 'n8n-nodes-base.github'],
			['supabaseApi', 'n8n-nodes-base.supabase'],
			['openAiApi', 'n8n-nodes-base.openAi'],
			['slackApi', 'n8n-nodes-base.slack'],
			['whatsAppApi', 'n8n-nodes-base.whatsApp'],
			['whatsAppTriggerApi', 'n8n-nodes-base.whatsAppTrigger'],
			['facebookGraphAppApi', 'n8n-nodes-base.facebookTrigger'],
			['gmailOAuth2', 'n8n-nodes-base.gmail'],
			['googleSheetsOAuth2Api', 'n8n-nodes-base.googleSheets'],
			['googleDriveOAuth2Api', 'n8n-nodes-base.googleDrive'],
			['googleDocsOAuth2Api', 'n8n-nodes-base.googleDocs'],
			['googleSheetsTriggerOAuth2Api', 'n8n-nodes-base.googleSheetsTrigger'],
			['facebookGraphAppOAuth2Api', 'n8n-nodes-base.facebookTrigger'],
		]) {
			expect(instance.knownCredentials[name].sourcePath).toContain(NEXT);
			expect(credentialTypes.getSupportedNodes(name)).toContain(legacyNode);
			expect(instance.types.credentials.filter((type) => type.name === name)).toHaveLength(1);
		}
		// The Google sign-in and the overwrites of the legacy parent still apply.
		expect(credentialTypes.getParentTypes('gmailOAuth2')).toEqual(['googleOAuth2Api', 'oAuth2Api']);
		expect(credentialTypes.getParentTypes('facebookGraphAppOAuth2Api')).toEqual([
			'facebookGraphApiOAuth2Api',
			'oAuth2Api',
		]);
		expect(credentialTypes.getByName('googleSheetsOAuth2Api').properties).toContainEqual(
			expect.objectContaining({ name: 'enabledScopes', type: 'string' }),
		);
		expect(credentialTypes.getByName('slackApi').test).toEqual({
			request: { baseURL: 'https://slack.com/api', url: '/users.profile.get' },
			rules: [
				{
					type: 'responseSuccessBody',
					properties: { key: 'error', value: 'invalid_auth', message: 'Invalid access token' },
				},
			],
		});
	});

	it('sign with the user header of openAiApi as the legacy class does', async () => {
		const data: ICredentialDataDecryptedObject = {
			apiKey: 'sk-1',
			organizationId: 'org-1',
			url: 'https://api.openai.com/v1',
			header: true,
			headerName: 'X-Proxy',
			headerValue: 'p-1',
		};
		const request = { url: 'https://api.openai.com/v1/models', headers: { Accept: '*/*' } };
		const signed = await Promise.all(
			[true, false].map(async (enabled) => {
				const { instance, helper } = await loaded(enabled);
				const source = instance.knownCredentials.openAiApi.sourcePath;
				const options = await helper.authenticate(data, 'openAiApi', structuredClone(request));
				return { source: path.relative(PACKAGES, source), headers: options.headers };
			}),
		);
		const headers = {
			Accept: '*/*',
			Authorization: 'Bearer sk-1',
			'OpenAI-Organization': 'org-1',
			'X-Proxy': 'p-1',
		};
		expect(signed).toEqual([
			{
				source: path.relative(
					PACKAGES,
					bundledCredentialsOf().find(({ manifest }) => manifest.id === 'openAi.apiKey')?.file ??
						'',
				),
				headers,
			},
			{ source: 'nodes-base/dist/credentials/OpenAiApi.credentials.js', headers },
		]);
	});

	it('apply the overwrites of the legacy parent of facebookGraphAppApi as the legacy class does', async () => {
		const [on, off] = await Promise.all(
			[true, false].map(async (enabled) => {
				const { instance, credentialTypes, helper } = await loaded(enabled);
				const overwrites = new CredentialsOverwrites(
					mock<GlobalConfig>({
						credentials: {
							overwrite: {
								data: JSON.stringify({ facebookGraphApi: { accessToken: 'o-1' } }),
								persistence: false,
								skipTypes: [] as unknown as CommaSeparatedStringArray<string>,
							},
						},
					}),
					credentialTypes,
					mock(),
					mock(),
					mock(),
				);
				await overwrites.init();
				return {
					source: instance.knownCredentials.facebookGraphAppApi.sourcePath,
					parents: credentialTypes.getParentTypes('facebookGraphAppApi'),
					form: helper.getCredentialsProperties('facebookGraphAppApi'),
					data: overwrites.applyOverwrite('facebookGraphAppApi', { appSecret: 's-1' }),
				};
			}),
		);

		expect(on.source).toContain(NEXT);
		expect(path.relative(PACKAGES, off.source)).toBe(
			'nodes-base/dist/credentials/FacebookGraphAppApi.credentials.js',
		);
		expect(on.parents).toEqual(['facebookGraphApi']);
		expect(on.data).toEqual({ appSecret: 's-1', accessToken: 'o-1' });
		expect({ ...on, source: undefined }).toEqual({ ...off, source: undefined });
	});

	it('sign a stored openAiApi credential without its newer fields', async () => {
		const { helper } = await loaded(true);
		const stored: ICredentialDataDecryptedObject = Object.freeze({ apiKey: 'sk-1' });

		const data = await helper.applyDefaultsAndOverwrites(
			mock<IWorkflowExecuteAdditionalData>({ variables: {} }),
			stored,
			'openAiApi',
			'internal',
		);
		const options = await helper.authenticate(data, 'openAiApi', {
			url: `${String(data.url)}/models`,
		});

		expect(data).toEqual({
			apiKey: 'sk-1',
			organizationId: '',
			url: 'https://api.openai.com/v1',
			header: false,
			allowedHttpRequestDomains: 'all',
		});
		expect(options).toEqual({
			url: 'https://api.openai.com/v1/models',
			headers: { Authorization: 'Bearer sk-1' },
		});
	});

	it('sign the requests of a contract Notion node and of a legacy Notion v2 node', async () => {
		const { instance, helper } = await loaded(true);
		const sign = async (type: string, options: IHttpRequestOptions) =>
			await helper.authenticate(notionKey, type, options);

		const contract = instance.getNode(`${NEXT}.notionUserGet`).type as IVersionedNodeType;
		const legacy = instance.getNode('n8n-nodes-base.notion').type as IVersionedNodeType;
		const user = '0f4c7d2a-1b3e-4c5d-8e9f-0a1b2c3d4e5f';

		const fromContract = await signedRequests(
			contract,
			contract.currentVersion,
			{ authentication: 'notionApi', user },
			sign,
		);
		const fromLegacy = await signedRequests(
			legacy,
			2,
			{ resource: 'user', operation: 'get', userId: user },
			sign,
		);

		expect(fromContract).toEqual([
			{
				type: 'notionApi',
				options: expect.objectContaining({
					url: `https://api.notion.com/v1/users/${user}`,
					headers: expect.objectContaining({
						Authorization: 'Bearer secret_k',
						'Notion-Version': '2026-03-11',
					}),
				}),
			},
		]);
		expect(fromLegacy).toEqual([
			{
				type: 'notionApi',
				options: expect.objectContaining({
					uri: `https://api.notion.com/v1/users/${user}`,
					headers: { Authorization: 'Bearer secret_k', 'Notion-Version': '2021-08-16' },
				}),
			},
		]);
	});

	it('give githubOAuth2Api the OAuth2 data of the legacy class, with the endpoints from derive', async () => {
		const [contract, legacy] = await Promise.all([loaded(true), loaded(false)]);
		const oauth2Of = async ({ helper }: typeof contract, server?: string) =>
			await helper.applyDefaultsAndOverwrites(
				mock<IWorkflowExecuteAdditionalData>({ variables: {} }),
				{ clientId: 'client-1', clientSecret: 'secret-1', ...(server ? { server } : {}) },
				'githubOAuth2Api',
				'internal',
			);

		expect(contract.instance.knownCredentials.githubOAuth2Api.sourcePath).toContain(NEXT);
		expect(contract.credentialTypes.getParentTypes('githubOAuth2Api')).toEqual(['oAuth2Api']);
		expect(contract.credentialTypes.getSupportedNodes('githubOAuth2Api')).toEqual(
			expect.arrayContaining(['n8n-nodes-base.github', 'n8n-nodes-base.githubTrigger']),
		);
		const enterprise = await oauth2Of(contract, 'https://ghe.example.com/api/v3');
		expect(enterprise).toMatchObject({
			authUrl: 'https://ghe.example.com/login/oauth/authorize',
			accessTokenUrl: 'https://ghe.example.com/login/oauth/access_token',
			scope:
				'repo,admin:repo_hook,admin:org,admin:org_hook,gist,notifications,user,write:packages,read:packages,delete:packages,workflow',
		});
		const keys = [
			'grantType',
			'server',
			'authUrl',
			'accessTokenUrl',
			'scope',
			'authQueryParameters',
			'authentication',
		];
		const pick = (data: ICredentialDataDecryptedObject) =>
			Object.fromEntries(keys.map((key) => [key, data[key]]));
		expect(pick(enterprise)).toEqual(
			pick(await oauth2Of(legacy, 'https://ghe.example.com/api/v3')),
		);
		expect(pick(await oauth2Of(contract))).toEqual(pick(await oauth2Of(legacy)));
	});

	it('give googleApi a JWT bearer grant that the host signs with the claims from derive', async () => {
		const request = vi.fn().mockResolvedValue({ access_token: 'at-1' });
		mockInstance(OutboundHttp, {
			requests: vi.fn().mockReturnValue(mock<HttpRequestClient>({ request })),
		});
		const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
		const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
		const { instance, credentialTypes, helper } = await loaded(true);
		const stored = {
			email: ' sa@acme.iam.gserviceaccount.com ',
			privateKey: pem.replace(/\n/g, '\\n'),
			inpersonate: true,
			delegatedEmail: 'ada@acme.test',
			httpNode: true,
			scopes:
				'https://www.googleapis.com/auth/drive,\nhttps://www.googleapis.com/auth/spreadsheets',
		};

		expect(instance.knownCredentials.googleApi.sourcePath).toContain(NEXT);
		expect(credentialTypes.getSupportedNodes('googleApi')).toEqual(
			expect.arrayContaining(['n8n-nodes-base.gmail', 'n8n-nodes-base.googleSheetsTrigger']),
		);
		const data = await helper.applyDefaultsAndOverwrites(
			mock<IWorkflowExecuteAdditionalData>({ variables: {} }),
			stored,
			'googleApi',
			'internal',
		);
		// derive gives claims only; the cli writes no OAuth2 data for them.
		expect(data).not.toHaveProperty('scope');
		const signed = await helper.authenticate(data, 'googleApi', {
			url: 'https://www.googleapis.com/drive/v3/files',
		});

		expect(signed.headers).toEqual({ Authorization: 'Bearer at-1' });
		expect(request).toHaveBeenCalledTimes(1);
		const [options] = request.mock.calls[0] as unknown as [IHttpRequestOptions];
		expect(options).toMatchObject({ method: 'POST', url: 'https://oauth2.googleapis.com/token' });
		const body = new URLSearchParams(String(options.body));
		expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');
		const [header = '', payload = '', signature = ''] = (body.get('assertion') ?? '').split('.');
		const json = (part: string): unknown => JSON.parse(Buffer.from(part, 'base64url').toString());
		expect(json(header)).toEqual({ alg: 'RS256', typ: 'JWT' });
		expect(
			verify(
				'sha256',
				Buffer.from(`${header}.${payload}`),
				publicKey,
				Buffer.from(signature, 'base64url'),
			),
		).toBe(true);
		expect(json(payload)).toMatchObject({
			iss: 'sa@acme.iam.gserviceaccount.com',
			sub: 'ada@acme.test',
			scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets',
			aud: 'https://oauth2.googleapis.com/token',
		});

		// Gmail and Firestore put their own token in the request, without httpNode.
		request.mockClear();
		const own = {
			url: 'https://www.googleapis.com/gmail/v1/users/me/labels',
			headers: { Authorization: 'Bearer own' },
		};
		await expect(
			helper.authenticate({ ...data, httpNode: false }, 'googleApi', structuredClone(own)),
		).resolves.toEqual(own);
		expect(request).not.toHaveBeenCalled();
	});

	it('keep the legacy classes with node contracts off', async () => {
		const { instance, credentialTypes, helper } = await loaded(false);

		expect(instance.knownCredentials.notionApi.sourcePath).toBe(
			path.join(PACKAGES, 'nodes-base', 'dist/credentials/NotionApi.credentials.js'),
		);
		const supported = credentialTypes.getSupportedNodes('notionApi');
		expect(supported).toEqual(
			expect.arrayContaining(['n8n-nodes-base.notion', 'n8n-nodes-base.notionTrigger']),
		);
		expect(supported.filter((node) => node.startsWith(NEXT))).toEqual([]);
		const signed = await helper.authenticate(notionKey, 'notionApi', { url: 'https://x.test' });
		expect(signed.headers).toEqual({
			Authorization: 'Bearer secret_k ',
			'Notion-Version': '2022-02-22',
		});
	});
});
