import {
	buildCatalog,
	classifyNode,
	credentialProbes,
	indexNodeTypes,
	staticHost,
} from '../coverage';
import type { SimService } from '../sim-admin-client';

const service = (slug: string, hosts: string[], n8nTypes: string[] = []): SimService => ({
	slug,
	hosts,
	kinds: [],
	kindSchemas: [],
	credentialInfo: n8nTypes.map((n8nType, i) => ({ id: `c${i}`, n8nType, isDefault: i === 0 })),
	adminPrefix: '/_sim/v1',
});

const nodeTypes = indexNodeTypes([
	{
		name: 'n8n-nodes-base.slack',
		group: ['output'],
		credentials: [
			{ name: 'slackApi', displayOptions: { show: { authentication: ['accessToken'] } } },
			{ name: 'slackOAuth2Api', displayOptions: { show: { authentication: ['oAuth2'] } } },
		],
	},
	{ name: 'n8n-nodes-base.set', group: ['input'] },
	{ name: 'n8n-nodes-base.scheduleTrigger', group: ['trigger', 'schedule'] },
	{ name: 'n8n-nodes-base.github', group: ['input'], credentials: [{ name: 'githubApi' }] },
	{
		name: 'n8n-nodes-base.gmailTrigger',
		version: [1, 1.1],
		group: ['trigger'],
		polling: true,
		credentials: [
			{ name: 'googleApi', displayOptions: { show: { authentication: ['serviceAccount'] } } },
			{ name: 'gmailOAuth2', displayOptions: { show: { authentication: ['oAuth2'] } } },
		],
		properties: [{ name: 'authentication', default: 'oAuth2' }],
	},
]);

const catalog = buildCatalog([
	service('slack', ['slack.com', 'hooks.slack.com'], ['slackApi']),
	service('shop', ['*.myshopify.com']),
	service('gmail', ['gmail.googleapis.com'], ['gmailOAuth2']),
	service('sheets', ['sheets.googleapis.com'], ['googleSheetsOAuth2Api', 'googleApi']),
]);

describe('indexNodeTypes', () => {
	it('reads credentials with the authentication values that select them, and trigger kinds', () => {
		expect(nodeTypes.get('n8n-nodes-base.slack')?.versions.get(1)?.credentials).toEqual([
			{ type: 'slackApi', show: { authentication: ['accessToken'] } },
			{ type: 'slackOAuth2Api', show: { authentication: ['oAuth2'] } },
		]);
		expect(nodeTypes.get('n8n-nodes-base.scheduleTrigger')).toMatchObject({
			isTrigger: true,
			isPolling: false,
		});
		expect(nodeTypes.get('n8n-nodes-base.gmailTrigger')?.isPolling).toBe(true);
	});
});

describe('classifyNode', () => {
	it('gives a vendor node the credential the simulation issues, with its authentication value', () => {
		const coverage = classifyNode(
			{ name: 'Post', type: 'n8n-nodes-base.slack', parameters: { authentication: 'oAuth2' } },
			nodeTypes,
			catalog,
		);
		expect(coverage).toMatchObject({
			kind: 'service',
			credentialType: 'slackApi',
			authValue: 'accessToken',
		});
	});

	it('uses the default authentication when the node keeps it', () => {
		const coverage = classifyNode(
			{ name: 'New Email', type: 'n8n-nodes-base.gmailTrigger', typeVersion: 1.1 },
			nodeTypes,
			catalog,
		);
		expect(coverage).toMatchObject({ kind: 'service', credentialType: 'gmailOAuth2' });
	});

	it('treats a node whose authentication needs no credential as internal', () => {
		const webhookTypes = indexNodeTypes([
			{
				name: 'n8n-nodes-base.webhook',
				version: 2,
				group: ['trigger'],
				credentials: [
					{ name: 'httpBasicAuth', displayOptions: { show: { authentication: ['basicAuth'] } } },
				],
				properties: [{ name: 'authentication', default: 'none' }],
			},
		]);
		expect(
			classifyNode(
				{ name: 'Hook', type: 'n8n-nodes-base.webhook', typeVersion: 2 },
				webhookTypes,
				catalog,
			),
		).toEqual({ kind: 'internal' });
	});

	it('needs no credential when the parameter that requires it has another value', () => {
		const respondTypes = indexNodeTypes([
			{
				name: 'n8n-nodes-base.respondToWebhook',
				version: [1, 1.1],
				credentials: [{ name: 'jwtAuth', displayOptions: { show: { respondWith: ['jwt'] } } }],
				properties: [{ name: 'respondWith', default: 'firstIncomingItem' }],
			},
		]);
		const respond = (parameters: Record<string, unknown>) =>
			classifyNode(
				{ name: 'Respond', type: 'n8n-nodes-base.respondToWebhook', typeVersion: 1.1, parameters },
				respondTypes,
				catalog,
			);
		expect(respond({})).toEqual({ kind: 'internal' });
		expect(respond({ respondWith: 'jwt' })).toMatchObject({ kind: 'not-covered' });
	});

	it('treats a node without credentials as internal', () => {
		expect(classifyNode({ name: 'Set', type: 'n8n-nodes-base.set' }, nodeTypes, catalog)).toEqual({
			kind: 'internal',
		});
	});

	it('reports a vendor node no simulated service issues credentials for', () => {
		expect(
			classifyNode({ name: 'GH', type: 'n8n-nodes-base.github' }, nodeTypes, catalog),
		).toMatchObject({
			kind: 'not-covered',
		});
	});

	it('routes an HTTP Request by host, wildcards included, and refuses unknown hosts', () => {
		const http = (url: string) => ({
			name: 'HTTP',
			type: 'n8n-nodes-base.httpRequest',
			parameters: { url },
		});
		expect(
			classifyNode(http('https://hooks.slack.com/services/x'), nodeTypes, catalog),
		).toMatchObject({
			kind: 'service',
		});
		expect(
			classifyNode(http('=https://acme.myshopify.com/admin/{{ $json.id }}'), nodeTypes, catalog),
		).toMatchObject({
			kind: 'service',
		});
		expect(classifyNode(http('https://api.example.com/x'), nodeTypes, catalog)).toMatchObject({
			kind: 'not-covered',
		});
	});

	it('gives a shared host or credential type to a modelled service, the dedicated one before a combined one', () => {
		const modelled = (slug: string, hosts: string[]) => ({
			...service(slug, hosts, ['googleSheetsOAuth2Api']),
			kinds: ['table'],
		});
		const shared = buildCatalog([
			service('legacy', ['sheets.googleapis.com'], ['googleSheetsOAuth2Api']),
			modelled('google', ['sheets.googleapis.com', 'gmail.googleapis.com', 'www.googleapis.com']),
			modelled('google-sheets', ['sheets.googleapis.com', 'www.googleapis.com']),
		]);
		expect(shared.serviceForHost('sheets.googleapis.com')?.slug).toBe('google-sheets');
		expect(shared.serviceForHost('gmail.googleapis.com')?.slug).toBe('google');
		expect(shared.credentialSource('googleSheetsOAuth2Api')?.service.slug).toBe('google-sheets');
	});
});

describe('staticHost', () => {
	it('reads a static host, also from an expression, and gives up on a computed one', () => {
		const node = (url: string) => ({ name: 'n', type: 't', parameters: { url } });
		expect(staticHost(node('https://Slack.com:443/api'))).toBe('slack.com');
		expect(staticHost(node('=https://api.notion.com/v1/pages/{{ $json.id }}'))).toBe(
			'api.notion.com',
		);
		expect(staticHost(node('={{ $json.url }}'))).toBeNull();
	});
});

describe('credentialProbes', () => {
	it('derives product names from an n8n credential type, then tries the default', () => {
		expect(credentialProbes('googleSheetsOAuth2Api')).toEqual([
			{ service: 'googlesheets' },
			{ service: 'google-sheets' },
			{ service: 'sheets' },
			{},
		]);
		expect(credentialProbes('gmailOAuth2')).toEqual([{ service: 'gmail' }, {}]);
	});
});
