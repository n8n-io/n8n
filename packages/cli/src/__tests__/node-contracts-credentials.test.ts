import type { GlobalConfig } from '@n8n/config';
import { LazyPackageDirectoryLoader } from 'n8n-core';
import type {
	ICredentialDataDecryptedObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	IVersionedNodeType,
} from 'n8n-workflow';
import path from 'node:path';
import { mock } from 'vitest-mock-extended';

import { CredentialTypes } from '../credential-types';
import { CredentialsHelper } from '../credentials-helper';
import { LoadNodesAndCredentials } from '../load-nodes-and-credentials';

const PACKAGES = path.resolve(__dirname, '../../..');
const NEXT = '@n8n/nodes-base-next';

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
	const next = new LazyPackageDirectoryLoader(path.join(PACKAGES, NEXT));
	const nodesBase = new LazyPackageDirectoryLoader(path.join(PACKAGES, 'nodes-base'));
	await Promise.all([next.loadAll(), nodesBase.loadAll()]);
	instance.loaders = { [NEXT]: next, 'n8n-nodes-base': nodesBase };
	await instance.postProcessLoaders();
	const credentialTypes = new CredentialTypes(instance);
	const helper = new CredentialsHelper(
		credentialTypes,
		mock(),
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
		expect(token.constructor.name).toBe('NotionApi');
		expect(typeof token.authenticate).toBe('function');
		expect(instance.knownCredentials.notionApi.sourcePath).toBe(
			path.join(PACKAGES, NEXT, 'dist/credentials/NotionApi.credentials.js'),
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
		]) {
			expect(instance.knownCredentials[name].sourcePath).toContain(NEXT);
			expect(credentialTypes.getSupportedNodes(name)).toContain(legacyNode);
			expect(instance.types.credentials.filter((type) => type.name === name)).toHaveLength(1);
		}
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
			{ source: `${NEXT}/dist/credentials/OpenAiApi.credentials.js`, headers },
			{ source: 'nodes-base/dist/credentials/OpenAiApi.credentials.js', headers },
		]);
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
