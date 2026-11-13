/**
 * Derives the `inject` member of a credentials file entry (spec section 7)
 * from an n8n credential type.
 */
import { fillTemplate, toTemplate } from './expression.ts';
import type { CredentialTypeRegistry } from './types.ts';
import { parentTypes } from './types.ts';

export interface Inject {
	headers?: Record<string, string>;
	qs?: Record<string, string>;
	/** Fields that the runtime merges into a JSON object body. */
	body?: Record<string, string>;
	basicAuth?: { user: string; password: string };
}

/**
 * How the tool got the inject:
 * - `generic`: from a generic `authenticate` property,
 * - `oauth2`: the type extends `oAuth2Api`; a bearer token header,
 * - `manual`: a hand-written rule in this file, for a type with no generic `authenticate`,
 * - `none`: the type has no `authenticate`; node code applies the credential,
 * - `unsupported`: the tool cannot convert the type.
 */
export type InjectKind = 'generic' | 'oauth2' | 'manual' | 'none' | 'unsupported';

export interface InjectResult {
	kind: InjectKind;
	inject?: Inject;
	/** Why the tool cannot convert the type, or what the user must know. */
	reasons: string[];
}

export const OAUTH2_INJECT: Inject = {
	headers: { Authorization: 'Bearer {{$credentials.oauthTokenData.access_token}}' },
};

/**
 * OAuth2 types whose token n8n also sends in a header of its own
 * (`keyToIncludeInAccessTokenHeader` of the HTTP Request and Shopify nodes).
 */
const OAUTH2_TOKEN_HEADERS: Record<string, string> = {
	shopifyOAuth2Api: 'X-Shopify-Access-Token',
};

/**
 * OAuth2 types whose node signs with another token of the token data
 * (`oAuth2Options.property` in n8n-core: that token when it is set, else
 * `accessToken`, else `access_token`). The rule gives the template path of
 * the token that v1 uses, so the file holds no copy of a token.
 */
const OAUTH2_TOKEN_PATHS: Record<
	string,
	(data: Record<string, unknown> | undefined) => string | undefined
> = {
	// The Slack v2 node signs with the user token (`authed_user.access_token`) when the
	// credential has one.
	slackOAuth2Api: (data) => {
		const token = isRecord(data?.oauthTokenData) ? data.oauthTokenData : {};
		const user = isRecord(token.authed_user) ? token.authed_user.access_token : undefined;
		if (user) return 'oauthTokenData.authed_user.access_token';
		if (token.accessToken) return 'oauthTokenData.accessToken';
		return undefined;
	},
};

type ManualRule = (data: Record<string, unknown> | undefined) => Inject;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const isSet = (value: unknown) => value !== undefined && value !== null && value !== '';

/**
 * Rules for types whose `authenticate` is a function or missing, and that the
 * compiled node library needs. Each rule follows the n8n code of the type.
 * With credential data, a rule leaves out headers that the data does not set.
 */
const MANUAL_RULES: Record<string, ManualRule> = {
	// NotionApi.authenticate. It also sets `Notion-Version` when the request has
	// none; the Notion library node always sends one.
	notionApi: () => ({ headers: { Authorization: 'Bearer {{$credentials.apiKey}} ' } }),
	// OpenAiApi.authenticate.
	openAiApi: (data) => {
		const headers: Record<string, string> = { Authorization: 'Bearer {{$credentials.apiKey}}' };
		if (!data || isSet(data.organizationId)) {
			headers['OpenAI-Organization'] = '{{$credentials.organizationId}}';
		}
		if (data?.header === true && typeof data.headerName === 'string' && data.headerName !== '') {
			headers[data.headerName] = '{{$credentials.headerValue}}';
		}
		return { headers };
	},
	// AnthropicApi.authenticate.
	anthropicApi: (data) => {
		const headers: Record<string, string> = { 'x-api-key': '{{$credentials.apiKey}}' };
		if (data?.header === true && typeof data.headerName === 'string' && data.headerName !== '') {
			headers[data.headerName] = '{{$credentials.headerValue}}';
		}
		return { headers };
	},
	// HttpRequestV3: the node parses the JSON of the credential and merges its `headers`,
	// `qs` and `body` into the request; they win over the parameters of the node. The
	// values are in a JSON text, which a template cannot address, so the inject has them.
	httpCustomAuth: (data) => {
		let parsed: unknown;
		try {
			parsed = typeof data?.json === 'string' ? JSON.parse(data.json) : undefined;
		} catch {
			parsed = undefined;
		}
		const inject: Inject = {};
		if (!isRecord(parsed)) return inject;
		const strings = (value: unknown): Record<string, string> | undefined => {
			if (!isRecord(value)) return undefined;
			const out: Record<string, string> = {};
			for (const [k, v] of Object.entries(value)) {
				out[k] = typeof v === 'string' ? v : JSON.stringify(v);
			}
			return out;
		};
		const headers = strings(parsed.headers);
		const qs = strings(parsed.qs);
		const body = strings(parsed.body);
		if (headers) inject.headers = headers;
		if (qs) inject.qs = qs;
		if (body) inject.body = body;
		return inject;
	},
	// TwilioApi.authenticate: basic auth with the API key or the account SID, by `authType`
	// (its generic form has a ternary, which a template cannot hold).
	twilioApi: (data) =>
		data?.authType === 'apiKey'
			? {
					basicAuth: {
						user: '{{$credentials.apiKeySid}}',
						password: '{{$credentials.apiKeySecret}}',
					},
				}
			: {
					basicAuth: {
						user: '{{$credentials.accountSid}}',
						password: '{{$credentials.authToken}}',
					},
				},
	// The HTTP Request node applies these generic types in its own code.
	httpBasicAuth: () => ({
		basicAuth: { user: '{{$credentials.user}}', password: '{{$credentials.password}}' },
	}),
	httpQueryAuth: (data) => ({
		qs: {
			[typeof data?.name === 'string' ? data.name : '{{$credentials.name}}']:
				'{{$credentials.value}}',
		},
	}),
};

export function hasManualRule(type: string): boolean {
	return Object.hasOwn(MANUAL_RULES, type);
}

function convertMap(
	values: Record<string, unknown> | undefined,
	data: Record<string, unknown> | undefined,
	where: string,
	reasons: string[],
): Record<string, string> | undefined {
	if (values === undefined) return undefined;
	const out: Record<string, string> = {};
	for (const [rawKey, rawValue] of Object.entries(values)) {
		const key = toTemplate(rawKey);
		const value = toTemplate(rawValue);
		if (!key.ok) {
			reasons.push(`${where} name ${rawKey}: ${key.reason}`);
			continue;
		}
		if (!value.ok) {
			reasons.push(`${where} ${rawKey}: ${value.reason}`);
			continue;
		}
		// The runtime fills templates in values only. A templated name is filled now.
		let name = key.template;
		if (name.includes('{{')) {
			const filled = data ? fillTemplate(name, data) : undefined;
			if (data && filled === undefined) {
				reasons.push(`${where} name ${rawKey}: the credential data has no value for it`);
				continue;
			}
			name = filled ?? name;
		}
		out[name] = value.template;
	}
	return out;
}

/**
 * Derives the inject of credential type `type`. With `data`, the result is
 * specific to that credential: templated header and query names are filled.
 */
export function deriveInject(
	registry: CredentialTypeRegistry,
	type: string,
	data?: Record<string, unknown>,
): InjectResult {
	const info = registry.get(type);
	if (!info) return { kind: 'unsupported', reasons: [`unknown credential type "${type}"`] };
	const parents = parentTypes(registry, type);
	// n8n-core sends a request with an OAuth2 credential through `requestOAuth2`,
	// before it looks at `authenticate`.
	if (type === 'oAuth2Api' || parents.includes('oAuth2Api')) {
		const path = OAUTH2_TOKEN_PATHS[type]?.(data);
		if (path) {
			return {
				kind: 'oauth2',
				inject: { headers: { Authorization: `Bearer {{$credentials.${path}}}` } },
				reasons: ['the runtime does not refresh the access token'],
			};
		}
		const key = OAUTH2_TOKEN_HEADERS[type];
		return {
			kind: 'oauth2',
			inject: key
				? {
						headers: {
							...OAUTH2_INJECT.headers,
							[key]: '{{$credentials.oauthTokenData.access_token}}',
						},
					}
				: OAUTH2_INJECT,
			reasons: ['the runtime does not refresh the access token'],
		};
	}
	if (type === 'oAuth1Api' || parents.includes('oAuth1Api')) {
		return { kind: 'unsupported', reasons: ['OAuth1 signs each request'] };
	}
	const manual = MANUAL_RULES[type];
	if (manual) return { kind: 'manual', inject: manual(data), reasons: [] };
	if (info.preAuthentication) {
		return {
			kind: 'unsupported',
			reasons: ['preAuthentication: the type gets a token with a request first'],
		};
	}
	const auth = info.authenticate;
	if (auth === undefined) {
		return { kind: 'none', reasons: ['no authenticate: the node code applies the credential'] };
	}
	if (auth === 'function') {
		return { kind: 'unsupported', reasons: ['authenticate is a function'] };
	}
	if (auth.type !== 'generic') {
		return { kind: 'unsupported', reasons: [`authenticate type "${auth.type}"`] };
	}
	const reasons: string[] = [];
	const inject: Inject = {};
	const { headers, qs, body, auth: basic } = auth.properties;
	const h = convertMap(headers, data, 'header', reasons);
	if (h && Object.keys(h).length > 0) inject.headers = h;
	const q = convertMap(qs, data, 'query parameter', reasons);
	if (q && Object.keys(q).length > 0) inject.qs = q;
	const b = convertMap(body, data, 'body field', reasons);
	if (b && Object.keys(b).length > 0) inject.body = b;
	if (basic !== undefined) {
		const user = toTemplate(basic.username ?? '');
		const password = toTemplate(basic.password ?? '');
		if (!user.ok) reasons.push(`basic auth user: ${user.reason}`);
		if (!password.ok) reasons.push(`basic auth password: ${password.reason}`);
		if (user.ok && password.ok) {
			inject.basicAuth = { user: user.template, password: password.template };
		}
	}
	if (reasons.length > 0) return { kind: 'unsupported', reasons };
	return { kind: 'generic', inject, reasons: [] };
}
