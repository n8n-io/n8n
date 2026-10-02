import { credentialType, t, toCredentialType, type AnyCredentialType } from '@n8n/node-sdk';
import { DatadogApi } from 'n8n-nodes-base/dist/credentials/DatadogApi.credentials';
import { FacebookGraphApi } from 'n8n-nodes-base/dist/credentials/FacebookGraphApi.credentials';
import { FacebookGraphAppApi } from 'n8n-nodes-base/dist/credentials/FacebookGraphAppApi.credentials';
import { GithubApi } from 'n8n-nodes-base/dist/credentials/GithubApi.credentials';
import { NotionApi } from 'n8n-nodes-base/dist/credentials/NotionApi.credentials';
import { NotionOAuth2Api } from 'n8n-nodes-base/dist/credentials/NotionOAuth2Api.credentials';
import { OpenAiApi } from 'n8n-nodes-base/dist/credentials/OpenAiApi.credentials';
import { SlackApi } from 'n8n-nodes-base/dist/credentials/SlackApi.credentials';
import { SupabaseApi } from 'n8n-nodes-base/dist/credentials/SupabaseApi.credentials';
import { TrelloApi } from 'n8n-nodes-base/dist/credentials/TrelloApi.credentials';
import { WhatsAppApi } from 'n8n-nodes-base/dist/credentials/WhatsAppApi.credentials';
import { WhatsAppTriggerApi } from 'n8n-nodes-base/dist/credentials/WhatsAppTriggerApi.credentials';
import { ZendeskApi } from 'n8n-nodes-base/dist/credentials/ZendeskApi.credentials';
import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
} from 'n8n-workflow';

import { anthropicKey } from '../../nodes/anthropic/anthropic.node';
import { facebookApp } from '../../nodes/facebook-trigger/facebook-trigger.node';
import { githubToken } from '../../nodes/github/github.node';
import { geminiKey } from '../../nodes/google-gemini/google-gemini.node';
import { minimaxKey } from '../../nodes/minimax/minimax.node';
import { notionOAuth2, notionToken } from '../../nodes/notion/credentials';
import { openAiKey } from '../../nodes/open-ai/open-ai.node';
import { slackToken } from '../../nodes/slack/slack.node';
import { supabaseKey } from '../../nodes/supabase/supabase.node';
import { whatsAppToken } from '../../nodes/whats-app/whats-app.node';
import { whatsAppApp } from '../../nodes/whats-app-trigger/whats-app-trigger.node';
import { xAiKey } from '../../nodes/x-ai/x-ai.node';
import {
	differences,
	explained,
	readCredential,
	requireBuilt,
	signRequest,
	type AllowedDifference,
} from './harness';

// These legacy types ship in nodes-langchain, which this package does not depend on.
const langchain = (name: string) =>
	(
		requireBuilt(`@n8n/nodes-langchain/dist/credentials/${name}.credentials.js`) as Record<
			string,
			new () => ICredentialType
		>
	)[name];
const GooglePalmApi = langchain('GooglePalmApi');
const XAiApi = langchain('XAiApi');
const MinimaxApi = langchain('MinimaxApi');
const AnthropicApi = langchain('AnthropicApi');

// Shape proofs: these three types are not ported, so they live here and not in a node folder.
const zendeskToken = credentialType({
	id: 'zendesk.token',
	legacyName: 'zendeskApi',
	displayName: 'Zendesk API',
	docs: 'zendesk',
	fields: {
		subdomain: t
			.text('Subdomain')
			.describe('The subdomain of your Zendesk work environment')
			.with({ examples: ['company'] }),
		email: t.text('Email').with({ examples: ['name@email.com'] }),
		apiToken: t.secret('API Token'),
	},
	baseUrl: 'https://{subdomain}.zendesk.com/api/v2',
	auth: (a) => a.basic('{email}/token', '{apiToken}'),
	test: { get: '/ticket_fields.json' },
});

const datadogApiKey = credentialType({
	id: 'datadog.apiKey',
	legacyName: 'datadogApi',
	displayName: 'Datadog API',
	docs: 'datadog',
	fields: {
		url: t.url('URL').default('https://api.datadoghq.com'),
		apiKey: t.secret('API Key'),
		appKey: t
			.secret('APP Key')
			.optional()
			.describe('For some endpoints, you also need an Application key.'),
	},
	baseUrl: '{url}',
	auth: (a) => a.apply({ headers: { 'DD-API-KEY': '{apiKey}', 'DD-APPLICATION-KEY': '{appKey}' } }),
	test: { get: '/api/v1/validate' },
});

const trelloApiKey = credentialType({
	id: 'trello.apiKey',
	legacyName: 'trelloApi',
	displayName: 'Trello API',
	docs: 'trello',
	fields: {
		apiKey: t.secret('API Key'),
		apiToken: t.secret('API Token'),
		oauthSecret: t
			.secret('OAuth Secret')
			.optional()
			.describe(
				'Used to verify webhook authenticity. Found under the API Key tab at trello.com/power-ups/admin.',
			),
	},
	baseUrl: 'https://api.trello.com/1',
	auth: (a) => a.apply({ query: { key: '{apiKey}', token: '{apiToken}' } }),
	test: { get: '/members/me' },
});

/** The members of a credential type that n8n reads, without class methods. */
const described = (type: ICredentialType) => ({
	name: type.name,
	displayName: type.displayName,
	documentationUrl: type.documentationUrl,
	icon: type.icon,
	httpRequestNode: type.httpRequestNode,
	extends: type.extends,
	properties: type.properties,
	test: type.test,
	...(typeof type.authenticate === 'object' ? { authenticate: type.authenticate } : {}),
});

const projected = (type: AnyCredentialType) => {
	const result = toCredentialType(type);
	if (!result) throw new Error(`${type.name} has no projection`);
	return result;
};

interface SignCase {
	readonly data: ICredentialDataDecryptedObject;
	readonly request: IHttpRequestOptions;
}

/** Projected members and signed requests against the legacy class, minus the listed differences. */
async function compareCredential(
	legacy: ICredentialType,
	next: AnyCredentialType,
	cases: readonly SignCase[],
	allowlist: readonly AllowedDifference[],
) {
	const type = projected(next);
	const signed = async (of: ICredentialType) =>
		await Promise.all(cases.map(async ({ data, request }) => await signRequest(of, data, request)));
	const found = differences(
		{ described: described(legacy), signed: await signed(legacy) },
		{ described: described(type), signed: await signed(type) },
	);
	return explained(found, allowlist);
}

const clean = { unexplained: [], stale: [] };
const SPLIT = 'The same request, split at the base URL';
const OPTIONAL_URL = 'The field always has a value';
const DEFAULTED = 'The field has a default, so the form fills it';
const NEEDED = 'The type cannot sign without the field; the legacy class leaves it optional';
const intended = (path: string, reason: string): AllowedDifference => ({
	path,
	kind: 'intended',
	reason,
});

describe('credential types against the legacy classes', () => {
	it('notion.token projects to notionApi and signs without code', async () => {
		const space = 'RFC 9110 §5.5: a field value has no trailing whitespace';
		expect(projected(notionToken).name).toBe('notionApi');
		expect(
			await compareCredential(
				new NotionApi(),
				notionToken,
				[
					{ data: { apiKey: 'secret_1' }, request: { url: 'https://api.notion.com/v1/users/me' } },
					{
						data: { apiKey: 'secret_1' },
						request: {
							url: 'https://api.notion.com/v1/pages',
							headers: { 'Notion-Version': '2026-03-11' },
						},
					},
				],
				[
					intended('signed[0].headers.Authorization', space),
					intended('signed[1].headers.Authorization', space),
				],
			),
		).toEqual(clean);
		const legacy = await signRequest(new NotionApi(), { apiKey: 'k' }, { url: 'https://x.test' });
		const next = await signRequest(
			projected(notionToken),
			{ apiKey: 'k' },
			{ url: 'https://x.test' },
		);
		expect([legacy.headers?.Authorization, next.headers?.Authorization]).toEqual([
			'Bearer k ',
			'Bearer k',
		]);
	});

	it('notion.oauth2 projects to notionOAuth2Api', async () => {
		expect(await compareCredential(new NotionOAuth2Api(), notionOAuth2, [], [])).toEqual(clean);
	});

	it('zendesk.token: basic auth as a generic block', async () => {
		const required = 'The type needs the field; the legacy class leaves it optional';
		expect(
			await compareCredential(
				new ZendeskApi(),
				zendeskToken,
				[
					{
						data: { subdomain: 'acme', email: 'ada@acme.test', apiToken: 'z-1' },
						request: { url: 'https://acme.zendesk.com/api/v2/tickets', headers: { Accept: '*/*' } },
					},
				],
				[
					intended('described.properties[0].required', required),
					intended('described.properties[1].required', required),
					intended('described.properties[2].required', required),
					intended('described.authenticate', 'Data instead of an authenticate function'),
				],
			),
		).toEqual(clean);
	});

	it('datadog.apiKey: an optional key drops its header, and node headers stay', async () => {
		const data = { url: 'https://api.datadoghq.com', apiKey: 'd-1' };
		const request = { url: 'https://api.datadoghq.com/api/v1/validate' };
		expect(
			await compareCredential(
				new DatadogApi(),
				datadogApiKey,
				[
					{ data: { ...data, appKey: '' }, request },
					{ data: { ...data, appKey: 'app-1' }, request },
					{ data: { ...data, appKey: '' }, request: { ...request, headers: { Accept: '*/*' } } },
				],
				[
					intended('described.properties[2].required', 'Optional is the n8n default'),
					intended('described.icon', 'The node package owns icons'),
					intended('described.httpRequestNode', 'HTTP Request node metadata is not projected'),
					intended('described.test.request.method', 'GET is the default'),
					intended('signed[2].headers.Accept', 'The legacy type drops every node header'),
				],
			),
		).toEqual(clean);
	});

	it('trello.apiKey: two query parameters as a generic block', async () => {
		expect(
			await compareCredential(
				new TrelloApi(),
				trelloApiKey,
				[
					{
						data: { apiKey: 'k-1', apiToken: 't-1' },
						request: {
							url: 'https://api.trello.com/1/boards/b',
							headers: { Accept: '*/*' },
							qs: { fields: 'name' },
						},
					},
				],
				[
					intended('described.authenticate', 'Data instead of an authenticate function'),
					intended('described.test.request.baseURL', 'The API base URL'),
					intended('described.test.request.url', 'A secret never goes into a URL'),
				],
			),
		).toEqual(clean);
	});
	it('supabase.secretKey: two headers as a generic block', async () => {
		expect(
			await compareCredential(
				new SupabaseApi(),
				supabaseKey,
				[
					{
						data: { host: 'https://acme.supabase.co', serviceRole: 'sb-1' },
						request: {
							url: 'https://acme.supabase.co/rest/v1/customers',
							headers: { Prefer: 'return=representation' },
						},
					},
				],
				[
					intended('described.properties[0].required', NEEDED),
					intended('described.properties[1].required', NEEDED),
					intended('described.test.request.headers', 'Prefer applies to writes; the test reads'),
				],
			),
		).toEqual(clean);
	});

	it('github.token: a token header as a generic block', async () => {
		expect(
			await compareCredential(
				new GithubApi(),
				githubToken,
				[
					{
						data: { server: 'https://api.github.com', user: 'ada', accessToken: 'ghp-1' },
						request: { url: 'https://api.github.com/repos/a/b/issues', headers: { Accept: '*/*' } },
					},
				],
				[
					intended('described.properties[0].required', NEEDED),
					intended('described.properties[2].required', NEEDED),
					intended('described.test.request.baseURL', 'The field always has a value'),
					intended('described.test.request.method', 'GET is the default'),
					intended(
						'described.authenticate.properties.headers.Authorization',
						'The field always has a value',
					),
				],
			),
		).toEqual(clean);
	});

	it('googleGemini.apiKey: a query parameter as a generic block', async () => {
		expect(
			await compareCredential(
				new GooglePalmApi(),
				geminiKey,
				[
					{
						data: { host: 'https://generativelanguage.googleapis.com', apiKey: 'g-1' },
						request: {
							url: 'https://generativelanguage.googleapis.com/v1beta/models',
							qs: { pageSize: 1 },
						},
					},
				],
				[
					intended('described.test.request.baseURL', 'The base URL of the actions'),
					intended('described.test.request.url', 'The same request, split at the base URL'),
				],
			),
		).toEqual(clean);
	});

	it('slack.token: hidden managed-app fields, a notice and a test rule', async () => {
		expect(
			await compareCredential(
				new SlackApi(),
				slackToken,
				[{ data: { accessToken: 'xoxb-1' }, request: { url: 'https://slack.com/api/auth.test' } }],
				[
					intended('described.test.request.baseURL', SPLIT),
					intended('described.test.request.url', SPLIT),
				],
			),
		).toEqual(clean);
	});

	it('whatsApp.token: a test that ignores the status and fails on an OAuthException', async () => {
		expect(
			await compareCredential(
				new WhatsAppApi(),
				whatsAppToken,
				[
					{
						data: { accessToken: 'EAAG-1', businessAccountId: '1' },
						request: { url: 'https://graph.facebook.com/v13.0/1/messages' },
					},
				],
				[],
			),
		).toEqual(clean);
	});

	it('whatsApp.app: fields only, with a POST test', async () => {
		expect(
			await compareCredential(
				new WhatsAppTriggerApi(),
				whatsAppApp,
				[],
				[
					intended('described.test.request.baseURL', SPLIT),
					intended('described.test.request.url', SPLIT),
				],
			),
		).toEqual(clean);
	});

	it('facebook.app: fields only, the same form as the legacy type with its parent', async () => {
		const legacy = new FacebookGraphAppApi();
		// As `CredentialsHelper.getCredentialsProperties`: the parent fields first.
		const form = {
			...legacy,
			properties: [...new FacebookGraphApi().properties, ...legacy.properties],
		};
		expect(
			await compareCredential(
				form,
				facebookApp,
				[
					{
						data: { accessToken: 'a-1', appSecret: 's-1' },
						request: { url: 'https://graph.facebook.com/v8.0/me' },
					},
				],
				[
					intended(
						'described.extends',
						'The type declares the parent field; nothing reads the parent',
					),
				],
			),
		).toEqual(clean);
	});

	it('xAi.apiKey: a hidden base URL field that legacy nodes read', async () => {
		expect(
			await compareCredential(
				new XAiApi(),
				xAiKey,
				[{ data: { apiKey: 'xai-1' }, request: { url: 'https://api.x.ai/v1/models' } }],
				[intended('described.test.request.baseURL', 'The base URL itself')],
			),
		).toEqual(clean);
		const url = (type: ICredentialType) => readCredential(type.properties, { apiKey: 'xai-1' });
		expect(url(projected(xAiKey))).toEqual(url(new XAiApi()));
	});

	it('minimax.apiKey: a base URL field from the region, and test rules', async () => {
		expect(
			await compareCredential(
				new MinimaxApi(),
				minimaxKey,
				[
					{
						data: { apiKey: 'mm-1', region: 'china' },
						request: { url: 'https://api.minimaxi.com/v1/x' },
					},
				],
				[
					intended('described.properties[1].required', DEFAULTED),
					intended('described.properties[2].default', 'A map instead of a ternary, same value'),
					intended('described.test.request.baseURL', 'The base URL map'),
					intended('described.test.request.url', 'The query is in the path'),
					intended('described.test.request.qs', 'The query is in the path'),
				],
			),
		).toEqual(clean);
		const read = (type: ICredentialType, region: string) =>
			readCredential(type.properties, { apiKey: 'mm-1', region });
		for (const region of ['international', 'china']) {
			expect(read(projected(minimaxKey), region)).toEqual(read(new MinimaxApi(), region));
		}
		expect(read(new MinimaxApi(), 'china')).toMatchObject({ url: 'https://api.minimaxi.com/v1' });
	});

	it('openAi.apiKey: an organization header and a user header', async () => {
		const data = {
			apiKey: 'sk-1',
			url: 'https://api.openai.com/v1',
			headerName: 'X-Proxy',
			headerValue: 'p-1',
		};
		const request = { url: 'https://api.openai.com/v1/models', headers: { Accept: '*/*' } };
		expect(
			await compareCredential(
				new OpenAiApi(),
				openAiKey,
				[
					{ data: { ...data, organizationId: '', header: false }, request },
					{ data: { ...data, organizationId: 'org-1', header: true }, request },
				],
				[
					intended('described.properties[2].required', DEFAULTED),
					intended('described.test.request.baseURL', OPTIONAL_URL),
					intended(
						'signed[0].headers.OpenAI-Organization',
						'An empty optional value drops its header',
					),
				],
			),
		).toEqual(clean);
	});

	it('anthropic.apiKey: an API key header and a user header', async () => {
		const data = {
			apiKey: 'sk-ant-1',
			url: 'https://api.anthropic.com',
			headerName: 'X-Proxy',
			headerValue: 'p-1',
		};
		const request = {
			url: 'https://api.anthropic.com/v1/messages',
			headers: { 'anthropic-version': '2023-06-01' },
		};
		expect(
			await compareCredential(
				new AnthropicApi(),
				anthropicKey,
				[
					{ data: { ...data, header: false }, request },
					{ data: { ...data, header: true }, request },
				],
				[
					intended('described.properties[1].required', DEFAULTED),
					intended('described.test.request.baseURL', OPTIONAL_URL),
					intended('described.test.request.method', 'GET is the default'),
				],
			),
		).toEqual(clean);
	});
});
