import { credentialType, t, toCredentialType, type AnyCredentialType } from '@n8n/node-sdk';
import { DatadogApi } from 'n8n-nodes-base/dist/credentials/DatadogApi.credentials';
import { GithubApi } from 'n8n-nodes-base/dist/credentials/GithubApi.credentials';
import { NotionApi } from 'n8n-nodes-base/dist/credentials/NotionApi.credentials';
import { NotionOAuth2Api } from 'n8n-nodes-base/dist/credentials/NotionOAuth2Api.credentials';
import { SupabaseApi } from 'n8n-nodes-base/dist/credentials/SupabaseApi.credentials';
import { TrelloApi } from 'n8n-nodes-base/dist/credentials/TrelloApi.credentials';
import { ZendeskApi } from 'n8n-nodes-base/dist/credentials/ZendeskApi.credentials';
import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
} from 'n8n-workflow';

import { githubToken } from '../../nodes/github/github.node';
import { geminiKey } from '../../nodes/google-gemini/google-gemini.node';
import { notionOAuth2, notionToken } from '../../nodes/notion/credentials';
import { supabaseKey } from '../../nodes/supabase/supabase.node';
import {
	differences,
	explained,
	requireBuilt,
	signRequest,
	type AllowedDifference,
} from './harness';

// The legacy type ships in nodes-langchain, which this package does not depend on.
const { GooglePalmApi } = requireBuilt(
	'@n8n/nodes-langchain/dist/credentials/GooglePalmApi.credentials.js',
) as { GooglePalmApi: new () => ICredentialType };

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
});
