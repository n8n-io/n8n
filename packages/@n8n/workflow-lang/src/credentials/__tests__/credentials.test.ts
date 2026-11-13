import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
	buildCredentialsFile,
	CredentialsToolError,
	parseExport,
	parseMappings,
	slotsFromModule,
	slotsFromSource,
} from '../build.ts';
import { runCredentialsCommand } from '../command.ts';
import { fillTemplate, toTemplate } from '../expression.ts';
import { deriveInject, OAUTH2_INJECT } from '../inject.ts';
import type { CredentialTypeInfo } from '../types.ts';
import { DEFAULT_NODE_PACKAGES, loadCredentialTypes, registryOf } from '../types.ts';
import { compile } from '../../compiler/index.ts';

describe('toTemplate', () => {
	it.each([
		['={{$credentials.apiKey}}', '{{$credentials.apiKey}}'],
		['=Bearer {{$credentials.accessToken}}', 'Bearer {{$credentials.accessToken}}'],
		['=Bearer {{ $credentials?.apiKey }}', 'Bearer {{$credentials.apiKey}}'],
		['={{"Token " + $credentials.token}}', 'Token {{$credentials.token}}'],
		['={{ "DeepL-Auth-Key " + $credentials.apiKey }}', 'DeepL-Auth-Key {{$credentials.apiKey}}'],
		// A JavaScript template literal inside an n8n expression.
		['={{`Key $' + '{$credentials.key}!`}}', 'Key {{$credentials.key}}!'],
		['={{$credentials["api_key"]}}', '{{$credentials.api_key}}'],
		[
			'=token {{$credentials.apiKey}}:{{$credentials.apiSecret}}',
			'token {{$credentials.apiKey}}:{{$credentials.apiSecret}}',
		],
		['application/json', 'application/json'],
		[true, 'true'],
		[3, '3'],
	])('converts %j', (input, expected) => {
		expect(toTemplate(input)).toEqual({ ok: true, template: expected });
	});

	it.each([
		'={{ $credentials.authType === "apiKey" ? $credentials.apiKeySid : $credentials.accountSid }}',
		'={{ Buffer.from($credentials.user).toString("base64") }}',
		'={{$credentials.a + $credentials.b}}',
		'={{$credentials["a b"]}}',
		'={{$credentials.apiKey',
		'={{ $parameter.x }}',
	])('reports %j as not convertible', (input) => {
		const result = toTemplate(input);
		expect(result.ok).toBe(false);
	});
});

describe('fillTemplate', () => {
	it('fills paths, numbers and nested fields', () => {
		expect(
			fillTemplate('{{$credentials.a}}/{{$credentials.n}}/{{$credentials.o.t}}', {
				a: 'x',
				n: 2,
				o: { t: 'y' },
			}),
		).toBe('x/2/y');
	});

	it('gives undefined when a path has no value', () => {
		expect(fillTemplate('{{$credentials.missing}}', {})).toBeUndefined();
	});
});

const TYPES: CredentialTypeInfo[] = [
	{
		name: 'slackApi',
		authenticate: {
			type: 'generic',
			properties: { headers: { Authorization: '=Bearer {{$credentials.accessToken}}' } },
		},
		defaults: { url: 'https://slack.com' },
	},
	{
		name: 'airtableApi',
		authenticate: { type: 'generic', properties: { qs: { api_key: '={{$credentials.apiKey}}' } } },
	},
	{
		name: 'httpHeaderAuth',
		authenticate: {
			type: 'generic',
			properties: { headers: { '={{$credentials.name}}': '={{$credentials.value}}' } },
		},
	},
	{
		name: 'mailgunApi',
		authenticate: {
			type: 'generic',
			properties: { auth: { username: 'api', password: '={{$credentials.apiKey}}' } },
		},
	},
	{
		name: 'beeminderApi',
		authenticate: {
			type: 'generic',
			properties: { body: { auth_token: '={{$credentials.authToken}}' } },
		},
	},
	{
		name: 'twilioApi',
		authenticate: {
			type: 'generic',
			properties: {
				auth: {
					username:
						'={{ $credentials.authType === "apiKey" ? $credentials.sid : $credentials.accountSid }}',
					password: '={{$credentials.authToken}}',
				},
			},
		},
	},
	{ name: 'oAuth2Api' },
	{ name: 'googleOAuth2Api', extends: ['oAuth2Api'] },
	{ name: 'googleSheetsOAuth2Api', extends: ['googleOAuth2Api'] },
	{ name: 'shopifyOAuth2Api', extends: ['oAuth2Api'] },
	{ name: 'oAuth1Api' },
	{ name: 'twitterOAuth1Api', extends: ['oAuth1Api'] },
	{ name: 'notionApi', authenticate: 'function' },
	{ name: 'openAiApi', authenticate: 'function' },
	{ name: 'anthropicApi', authenticate: 'function' },
	{ name: 'awsApi', authenticate: 'function' },
	{ name: 'telegramApi' },
	{
		name: 'metabaseApi',
		preAuthentication: true,
		authenticate: {
			type: 'generic',
			properties: { headers: { 'X-Metabase-Session': '={{$credentials.sessionToken}}' } },
		},
	},
];
const registry = registryOf(TYPES);

describe('deriveInject', () => {
	it('converts generic headers', () => {
		expect(deriveInject(registry, 'slackApi')).toEqual({
			kind: 'generic',
			inject: { headers: { Authorization: 'Bearer {{$credentials.accessToken}}' } },
			reasons: [],
		});
	});

	it('converts generic query parameters and body fields', () => {
		expect(deriveInject(registry, 'airtableApi').inject).toEqual({
			qs: { api_key: '{{$credentials.apiKey}}' },
		});
		expect(deriveInject(registry, 'beeminderApi').inject).toEqual({
			body: { auth_token: '{{$credentials.authToken}}' },
		});
	});

	it('converts auth to basicAuth', () => {
		expect(deriveInject(registry, 'mailgunApi').inject).toEqual({
			basicAuth: { user: 'api', password: '{{$credentials.apiKey}}' },
		});
	});

	it('fills a templated header name from the credential data', () => {
		expect(deriveInject(registry, 'httpHeaderAuth', { name: 'X-Key', value: 'v' }).inject).toEqual({
			headers: { 'X-Key': '{{$credentials.value}}' },
		});
		expect(deriveInject(registry, 'httpHeaderAuth', { value: 'v' }).kind).toBe('unsupported');
	});

	it('gives a bearer token header for OAuth2 types and their extensions', () => {
		for (const type of ['oAuth2Api', 'googleOAuth2Api', 'googleSheetsOAuth2Api']) {
			const result = deriveInject(registry, type);
			expect(result.kind).toBe('oauth2');
			expect(result.inject).toEqual(OAUTH2_INJECT);
		}
	});

	it('sends the Anthropic key in x-api-key, as AnthropicApi.authenticate does', () => {
		expect(deriveInject(registry, 'anthropicApi', { apiKey: 'k' })).toEqual({
			kind: 'manual',
			inject: { headers: { 'x-api-key': '{{$credentials.apiKey}}' } },
			reasons: [],
		});
	});

	it('also sends the Shopify token in X-Shopify-Access-Token, as n8n does', () => {
		expect(deriveInject(registry, 'shopifyOAuth2Api').inject).toEqual({
			headers: {
				Authorization: 'Bearer {{$credentials.oauthTokenData.access_token}}',
				'X-Shopify-Access-Token': '{{$credentials.oauthTokenData.access_token}}',
			},
		});
	});

	it('reports types that it cannot convert', () => {
		expect(deriveInject(registry, 'awsApi')).toEqual({
			kind: 'unsupported',
			reasons: ['authenticate is a function'],
		});
		expect(deriveInject(registry, 'metabaseApi').reasons[0]).toContain('preAuthentication');
		expect(deriveInject(registry, 'twitterOAuth1Api').kind).toBe('unsupported');
		expect(deriveInject(registry, 'unknownApi').kind).toBe('unsupported');
	});

	it('has a manual rule for Twilio that follows the auth type', () => {
		expect(deriveInject(registry, 'twilioApi', { authType: 'authToken' }).inject).toEqual({
			basicAuth: { user: '{{$credentials.accountSid}}', password: '{{$credentials.authToken}}' },
		});
		expect(deriveInject(registry, 'twilioApi', { authType: 'apiKey' }).inject).toEqual({
			basicAuth: {
				user: '{{$credentials.apiKeySid}}',
				password: '{{$credentials.apiKeySecret}}',
			},
		});
	});

	it('marks types without authenticate', () => {
		expect(deriveInject(registry, 'telegramApi').kind).toBe('none');
	});

	it('has manual rules for the Notion and OpenAI types', () => {
		expect(deriveInject(registry, 'notionApi')).toEqual({
			kind: 'manual',
			inject: { headers: { Authorization: 'Bearer {{$credentials.apiKey}} ' } },
			reasons: [],
		});
		expect(deriveInject(registry, 'openAiApi', { apiKey: 'k', organizationId: '' }).inject).toEqual(
			{ headers: { Authorization: 'Bearer {{$credentials.apiKey}}' } },
		);
		expect(
			deriveInject(registry, 'openAiApi', {
				apiKey: 'k',
				organizationId: 'org',
				header: true,
				headerName: 'X-Extra',
				headerValue: 'v',
			}).inject,
		).toEqual({
			headers: {
				Authorization: 'Bearer {{$credentials.apiKey}}',
				'OpenAI-Organization': '{{$credentials.organizationId}}',
				'X-Extra': '{{$credentials.headerValue}}',
			},
		});
	});
});

const EXPORT = [
	{
		id: 'c1',
		name: 'Team Slack',
		type: 'slackApi',
		data: { accessToken: 'xoxb-fake' },
		shared: [],
	},
	{
		id: 'c2',
		name: 'Sheets',
		type: 'googleSheetsOAuth2Api',
		data: { oauthTokenData: { access_token: 'fake-access' } },
	},
	{ id: 'c3', name: 'Other Slack', type: 'slackApi', data: { accessToken: 'xoxb-other' } },
];

describe('parseExport', () => {
	it('reads an array and a single object', () => {
		expect(parseExport(EXPORT)).toHaveLength(3);
		expect(parseExport(EXPORT[0])[0]).toEqual({
			id: 'c1',
			name: 'Team Slack',
			type: 'slackApi',
			data: { accessToken: 'xoxb-fake' },
		});
	});

	it('rejects an encrypted export', () => {
		expect(() => parseExport([{ id: '1', name: 'x', type: 'slackApi', data: 'U2FsdGVk' }])).toThrow(
			'--decrypted',
		);
	});
});

const WORKFLOW = `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'x' })],
	credentials: { slack: { type: 'slackApi' }, sheets: { type: 'googleSheetsOAuth2Api' } },
	async run(ctx) {
		return 1;
	},
});
`;

describe('slots', () => {
	it('reads slots from a workflow source', () => {
		expect(slotsFromSource(WORKFLOW)).toEqual([
			{ slot: 'slack', type: 'slackApi' },
			{ slot: 'sheets', type: 'googleSheetsOAuth2Api' },
		]);
	});

	it('reads slots from the META section of a module', () => {
		const result = compile(WORKFLOW);
		expect(result.ok).toBe(true);
		expect(slotsFromModule(result.module ?? new Uint8Array())).toEqual(slotsFromSource(WORKFLOW));
	});

	it('parses --map values', () => {
		expect(parseMappings(['slack=Team Slack', 'x=a=b'])).toEqual(
			new Map([
				['slack', 'Team Slack'],
				['x', 'a=b'],
			]),
		);
		expect(() => parseMappings(['slack'])).toThrow(CredentialsToolError);
	});
});

describe('buildCredentialsFile', () => {
	const exported = parseExport(EXPORT);

	it('maps slots by name and id, and picks the only credential of a type', () => {
		const { file, report } = buildCredentialsFile({
			exported,
			slots: slotsFromSource(WORKFLOW),
			mappings: parseMappings(['slack=c3']),
			registry,
		});
		expect(file).toEqual({
			slack: {
				type: 'slackApi',
				data: { url: 'https://slack.com', accessToken: 'xoxb-other' },
				inject: { headers: { Authorization: 'Bearer {{$credentials.accessToken}}' } },
			},
			sheets: {
				type: 'googleSheetsOAuth2Api',
				data: { oauthTokenData: { access_token: 'fake-access' } },
				inject: OAUTH2_INJECT,
			},
		});
		expect(report.map((r) => r.kind)).toEqual(['generic', 'oauth2']);
	});

	it('works from --map alone', () => {
		const { file } = buildCredentialsFile({
			exported,
			slots: [],
			mappings: parseMappings(['s=Team Slack']),
			registry,
		});
		expect(Object.keys(file)).toEqual(['s']);
		expect(file.s.data.accessToken).toBe('xoxb-fake');
	});

	it('fails when a slot is ambiguous', () => {
		expect(() =>
			buildCredentialsFile({
				exported,
				slots: [{ slot: 'slack', type: 'slackApi' }],
				mappings: new Map(),
				registry,
			}),
		).toThrow('2 credentials have the type "slackApi"');
	});

	it('fails when the mapped credential has another type', () => {
		expect(() =>
			buildCredentialsFile({
				exported,
				slots: [{ slot: 'slack', type: 'slackApi' }],
				mappings: parseMappings(['slack=Sheets']),
				registry,
			}),
		).toThrow('needs type "slackApi"');
	});
});

const nodesBaseBuilt = existsSync(join(DEFAULT_NODE_PACKAGES[0], 'dist/known/credentials.json'));

describe.runIf(nodesBaseBuilt)('with the built n8n-nodes-base package', () => {
	const loaded = loadCredentialTypes([DEFAULT_NODE_PACKAGES[0]]);
	const real = registryOf(loaded.types);

	it('loads the credential types', () => {
		expect(loaded.failures).toEqual([]);
		expect(loaded.types.length).toBeGreaterThan(300);
	});

	it.each([
		['slackApi', { headers: { Authorization: 'Bearer {{$credentials.accessToken}}' } }],
		['airtableTokenApi', { headers: { Authorization: 'Bearer {{$credentials.accessToken}}' } }],
		['gmailOAuth2', OAUTH2_INJECT],
		['googleSheetsOAuth2Api', OAUTH2_INJECT],
		['notionApi', { headers: { Authorization: 'Bearer {{$credentials.apiKey}} ' } }],
	])('derives the inject of %s', (type, inject) => {
		expect(deriveInject(real, type).inject).toEqual(inject);
	});

	it('runs the command end to end', () => {
		const dir = mkdtempSync(join(tmpdir(), 'wfc-credentials-'));
		try {
			writeFileSync(join(dir, 'export.json'), JSON.stringify(EXPORT));
			writeFileSync(join(dir, 'workflow.ts'), WORKFLOW);
			const out = join(dir, 'credentials.json');
			const messages: string[] = [];
			const code = runCredentialsCommand(
				[
					'--export',
					join(dir, 'export.json'),
					'--workflow',
					join(dir, 'workflow.ts'),
					'--map',
					'slack=Team Slack',
					'--nodes',
					DEFAULT_NODE_PACKAGES[0],
					'-o',
					out,
				],
				{ stderr: (t) => messages.push(t) },
			);
			expect(messages.join('')).toContain('slack: "Team Slack" slackApi, inject generic');
			expect(code).toBe(0);
			const file: unknown = JSON.parse(readFileSync(out, 'utf8'));
			expect(file).toMatchObject({
				slack: { type: 'slackApi', data: { accessToken: 'xoxb-fake' } },
				sheets: { type: 'googleSheetsOAuth2Api', inject: OAUTH2_INJECT },
			});
			expect(statSync(out).mode & 0o777).toBe(0o600);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it('exits with 2 and a message on bad arguments', () => {
		const messages: string[] = [];
		expect(runCredentialsCommand(['--map', 'x=y'], { stderr: (t) => messages.push(t) })).toBe(2);
		expect(messages.join('')).toContain('--export is required');
	});
});
