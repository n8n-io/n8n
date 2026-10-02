import { defineCredential, field, type AnyCredentialType } from '@n8n/node-sdk/credentials';
import { toCredentialType } from '@n8n/node-sdk/host';
import { DatadogApi } from 'n8n-nodes-base/dist/credentials/DatadogApi.credentials';
import { FacebookGraphApi } from 'n8n-nodes-base/dist/credentials/FacebookGraphApi.credentials';
import { FacebookGraphApiOAuth2Api } from 'n8n-nodes-base/dist/credentials/FacebookGraphApiOAuth2Api.credentials';
import { FacebookGraphAppApi } from 'n8n-nodes-base/dist/credentials/FacebookGraphAppApi.credentials';
import { FacebookGraphAppOAuth2Api } from 'n8n-nodes-base/dist/credentials/FacebookGraphAppOAuth2Api.credentials';
import { GithubApi } from 'n8n-nodes-base/dist/credentials/GithubApi.credentials';
import { GmailOAuth2Api } from 'n8n-nodes-base/dist/credentials/GmailOAuth2Api.credentials';
import { GoogleDocsOAuth2Api } from 'n8n-nodes-base/dist/credentials/GoogleDocsOAuth2Api.credentials';
import { GoogleDriveOAuth2Api } from 'n8n-nodes-base/dist/credentials/GoogleDriveOAuth2Api.credentials';
import { GoogleOAuth2Api } from 'n8n-nodes-base/dist/credentials/GoogleOAuth2Api.credentials';
import { GoogleSheetsOAuth2Api } from 'n8n-nodes-base/dist/credentials/GoogleSheetsOAuth2Api.credentials';
import { GoogleSheetsTriggerOAuth2Api } from 'n8n-nodes-base/dist/credentials/GoogleSheetsTriggerOAuth2Api.credentials';
import { MetabaseApi } from 'n8n-nodes-base/dist/credentials/MetabaseApi.credentials';
import { NotionApi } from 'n8n-nodes-base/dist/credentials/NotionApi.credentials';
import { NotionOAuth2Api } from 'n8n-nodes-base/dist/credentials/NotionOAuth2Api.credentials';
import { OpenAiApi } from 'n8n-nodes-base/dist/credentials/OpenAiApi.credentials';
import { SlackApi } from 'n8n-nodes-base/dist/credentials/SlackApi.credentials';
import { SupabaseApi } from 'n8n-nodes-base/dist/credentials/SupabaseApi.credentials';
import { TrelloApi } from 'n8n-nodes-base/dist/credentials/TrelloApi.credentials';
import { WhatsAppApi } from 'n8n-nodes-base/dist/credentials/WhatsAppApi.credentials';
import { WhatsAppTriggerApi } from 'n8n-nodes-base/dist/credentials/WhatsAppTriggerApi.credentials';
import { ZendeskApi } from 'n8n-nodes-base/dist/credentials/ZendeskApi.credentials';
import {
	NodeHelpers,
	type ICredentialDataDecryptedObject,
	type ICredentialType,
	type IHttpRequestHelper,
	type IHttpRequestOptions,
	type INodeProperties,
} from 'n8n-workflow';

import { anthropicKey } from '../../nodes/anthropic/anthropic.node';
import { facebookApp, facebookAppOAuth2 } from '../../nodes/facebook-trigger/facebook-trigger.node';
import { gmailOAuth2 } from '../../nodes/gmail/gmail.node';
import { googleDocsOAuth2 } from '../../nodes/google-docs/google-docs.node';
import { googleDriveOAuth2 } from '../../nodes/google-drive/google-drive.node';
import { googleSheetsOAuth2 } from '../../nodes/google-sheets/google-sheets.node';
import { googleSheetsTriggerOAuth2 } from '../../nodes/google-sheets-trigger/google-sheets-trigger.node';
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
const zendeskToken = defineCredential({
	id: 'zendesk.token',
	legacyName: 'zendeskApi',
	displayName: 'Zendesk API',
	docs: 'zendesk',
	fields: {
		subdomain: field
			.text('Subdomain')
			.describe('The subdomain of your Zendesk work environment')
			.with({ examples: ['company'] }),
		email: field.text('Email').with({ examples: ['name@email.com'] }),
		apiToken: field.secret('API Token'),
	},
	baseUrl: 'https://{subdomain}.zendesk.com/api/v2',
	auth: (a) => a.basic('{email}/token', '{apiToken}'),
	test: { get: '/ticket_fields.json' },
});

const datadogApiKey = defineCredential({
	id: 'datadog.apiKey',
	legacyName: 'datadogApi',
	displayName: 'Datadog API',
	docs: 'datadog',
	fields: {
		url: field.url('URL').default('https://api.datadoghq.com'),
		apiKey: field.secret('API Key'),
		appKey: field
			.secret('APP Key')
			.optional()
			.describe('For some endpoints, you also need an Application key.'),
	},
	baseUrl: '{url}',
	auth: (a) => a.apply({ headers: { 'DD-API-KEY': '{apiKey}', 'DD-APPLICATION-KEY': '{appKey}' } }),
	test: { get: '/api/v1/validate' },
});

const trelloApiKey = defineCredential({
	id: 'trello.apiKey',
	legacyName: 'trelloApi',
	displayName: 'Trello API',
	docs: 'trello',
	fields: {
		apiKey: field.secret('API Key'),
		apiToken: field.secret('API Token'),
		oauthSecret: field
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

// The exchange port: no ported node uses an exchange type yet, so it lives here.
const metabaseSession = defineCredential({
	id: 'metabase.session',
	legacyName: 'metabaseApi',
	displayName: 'Metabase API',
	docs: 'metabase',
	fields: {
		url: field.url('URL'),
		username: field.text('Username'),
		password: field.secret('Password'),
	},
	baseUrl: '{url}',
	auth: (a) =>
		a.exchange({
			post: '{url}/api/session',
			json: { username: '{username}', password: '{password}' },
			token: { path: 'id', field: 'sessionToken' },
			headers: { 'X-Metabase-Session': '{$token}' },
		}),
	test: { get: '/api/user/current' },
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

/** The form of a type that extends `parent`, as `CredentialsHelper.getCredentialsProperties` merges it. */
const formOf = (parent: ICredentialType, type: ICredentialType): ICredentialType => {
	const properties: INodeProperties[] = [];
	NodeHelpers.mergeNodeProperties(properties, parent.properties);
	NodeHelpers.mergeNodeProperties(properties, type.properties);
	return { ...type, properties };
};

/** The merged forms, and the OAuth2 settings n8n reads with the default and with custom scopes. */
function compareOAuth2(
	legacy: ICredentialType,
	parent: ICredentialType,
	next: AnyCredentialType,
	allowlist: readonly AllowedDifference[],
) {
	const read = (form: ICredentialType) =>
		[false, true].map((customScopes) =>
			readCredential(form.properties, {
				customScopes,
				enabledScopes: 'only.this',
				clientId: 'c-1',
			}),
		);
	const legacyForm = formOf(parent, legacy);
	const nextForm = formOf(parent, projected(next));
	return explained(
		differences(
			{ described: described(legacyForm), read: read(legacyForm) },
			{ described: described(nextForm), read: read(nextForm) },
		),
		allowlist,
	);
}

const REQUIRED_ENDPOINT = 'The flow needs the endpoint; the Google parent leaves it optional';
const NOTICE_TEXT = 'Two sentences, not a comma splice';
const googleCases = [
	['gmailOAuth2', new GmailOAuth2Api(), gmailOAuth2],
	['googleSheetsOAuth2Api', new GoogleSheetsOAuth2Api(), googleSheetsOAuth2],
	['googleDriveOAuth2Api', new GoogleDriveOAuth2Api(), googleDriveOAuth2],
	['googleDocsOAuth2Api', new GoogleDocsOAuth2Api(), googleDocsOAuth2],
	['googleSheetsTriggerOAuth2Api', new GoogleSheetsTriggerOAuth2Api(), googleSheetsTriggerOAuth2],
] as const;

describe('OAuth2 types with editable scopes against the legacy classes', () => {
	it.each(googleCases)(
		'%s extends googleOAuth2Api with the same form and scopes',
		(name, legacy, next) => {
			expect(projected(next)).toMatchObject({ name, extends: ['googleOAuth2Api'] });
			expect(
				compareOAuth2(legacy, new GoogleOAuth2Api(), next, [
					intended('described.properties[1].required', REQUIRED_ENDPOINT),
					intended('described.properties[2].required', REQUIRED_ENDPOINT),
					intended('described.properties[6].displayName', NOTICE_TEXT),
					...('icon' in legacy ? [intended('described.icon', 'The node package owns icons')] : []),
				]),
			).toEqual(clean);
		},
	);

	it('the Google types send the scopes of the legacy types, or the custom ones', () => {
		const scope = (type: ICredentialType, customScopes: boolean) =>
			(
				readCredential(formOf(new GoogleOAuth2Api(), type).properties, {
					customScopes,
					enabledScopes: 'only.this',
				}) as { scope: string }
			).scope;
		expect(scope(projected(gmailOAuth2), false)).toBe(scope(new GmailOAuth2Api(), false));
		expect(scope(projected(gmailOAuth2), false)).toContain('https://mail.google.com/');
		expect(scope(projected(gmailOAuth2), true)).toBe('only.this');
	});

	it('facebookApp.oauth2 extends facebookGraphApiOAuth2Api with the same form and scopes', () => {
		expect(projected(facebookAppOAuth2)).toMatchObject({
			name: 'facebookGraphAppOAuth2Api',
			extends: ['facebookGraphApiOAuth2Api'],
		});
		expect(
			compareOAuth2(
				new FacebookGraphAppOAuth2Api(),
				new FacebookGraphApiOAuth2Api(),
				facebookAppOAuth2,
				[
					intended('described.properties[5].description', 'The SDK text of the editable scopes'),
					intended('described.properties[7].description', 'The SDK text of the editable scopes'),
				],
			),
		).toEqual(clean);
	});
});

/** A request helper that answers each token request with a session and records it. */
const sessionHelper = () => {
	const sent: IHttpRequestOptions[] = [];
	const helper: IHttpRequestHelper = {
		helpers: {
			httpRequest: async (options: IHttpRequestOptions) => {
				sent.push(options);
				return await Promise.resolve({ id: 'session-1' });
			},
		},
	};
	return { helper, sent };
};

describe('exchange types against the legacy classes', () => {
	it('metabase.session: the same token request, token field and session header', async () => {
		const data = {
			url: 'https://bi.acme.test/',
			username: 'ada',
			password: 'pw-1',
			sessionToken: '',
		};
		const login = async (type: ICredentialType) => {
			const { helper, sent } = sessionHelper();
			const output = await type.preAuthentication?.call(helper, { ...data });
			return { output, sent };
		};
		const signedData = { ...data, sessionToken: 'session-1' };
		const request = { url: 'https://bi.acme.test/api/card', headers: { Accept: '*/*' } };
		const found = differences(
			{
				described: described(new MetabaseApi()),
				login: await login(new MetabaseApi()),
				signed: await signRequest(new MetabaseApi(), signedData, request),
			},
			{
				described: described(projected(metabaseSession)),
				login: await login(projected(metabaseSession)),
				signed: await signRequest(projected(metabaseSession), signedData, request),
			},
		);
		expect(
			explained(found, [
				intended(
					'described.properties[0].typeOptions.password',
					'The token is a secret for redaction',
				),
				intended('described.properties[0].displayName', 'One name for every token field'),
				intended('described.properties[1].required', NEEDED),
				intended('described.properties[2].required', NEEDED),
				intended('described.properties[3].required', NEEDED),
				intended('described.test.request.baseURL', OPTIONAL_URL),
				intended('login.sent[0].json', 'The response is JSON'),
				intended('login.sent[0].allowedDomains', 'Redirect hops stay on the credential host'),
			]),
		).toEqual(clean);
	});
});
