import { isRecord } from '@n8n/utils/is-record';
import { DEFAULT_PLACEHOLDER } from '@n8n/utils/redaction/redact-text';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';
import {
	OperationalError,
	UserError,
	type IAuthenticateGeneric,
	type IAuthenticateRuleResponseSuccessBody,
	type ICredentialDataDecryptedObject,
	type ICredentialTestRequest,
	type ICredentialType,
	type IDataObject,
	type IHttpRequestHelper,
	type IHttpRequestOptions,
	type INodeProperties,
} from 'n8n-workflow';

import { isHostPattern, type RunInput } from './define';
import { allowsHost, credentialHostsOf } from './egress';
import {
	obj,
	Schema,
	str,
	type AnySchema,
	type Infer,
	type JsonSchema,
	type OptionLabel,
	type Shape,
} from './schema';
import { applyDefaults, validate } from './validate';

type NoFields = Record<never, never>;
type Values = Readonly<Record<string, string>>;

declare const secretBrand: unique symbol;

/** A secret value. Only n8n and `custom` code read it. */
export type Secret = string & { readonly [secretBrand]: true };

/** The fields of a credential type. Any schema builder also works, e.g. `oneOf(...)` for `when`. */
export const t = {
	/** A value only n8n reads when it signs a request, e.g. an API key. The UI masks it. */
	secret: (title: string) => new Schema<Secret>({ type: 'string', title, writeOnly: true }, false),
	text: (title: string) => str().with({ title }),
	/** A server URL, e.g. of a self-hosted instance. */
	url: (title: string) => str().with({ title, format: 'uri' }),
	/** An options field with a label for each value, e.g. `{ eu: { name: 'Europe' } }`. */
	options: <const O extends Readonly<Record<string, OptionLabel>>>(title: string, options: O) =>
		new Schema<keyof O & string>(
			{ title, enum: Object.keys(options), 'x-n8n-options': options },
			false,
		),
	/** A value that n8n sets, not the user, e.g. the ID of a managed app. The form hides it. */
	hidden: (title: string, value = '') => str().default(value).with({ title, readOnly: true }),
	/**
	 * A hidden field that holds the `baseUrl` of the type, filled from the other fields. Legacy
	 * nodes that read the URL from the credential data, e.g. `url`, get the same value.
	 */
	baseUrl: (title = 'Base URL') =>
		str().optional().with({ title, readOnly: true, 'x-n8n-base-url': true }),
};

/** The decrypted data of a credential type, each default filled in. */
export type CredentialData<F extends Shape> = RunInput<F>;

type FieldName<F extends Shape> = keyof F & string;
type SecretName<F extends Shape> = {
	[K in keyof F]: F[K] extends Schema<Secret, boolean> ? K : never;
}[keyof F] &
	string;
type OptionName<F extends Shape> = {
	[K in keyof F]: F[K] extends Schema<Secret, boolean>
		? never
		: string extends Infer<F[K]>
			? never
			: Infer<F[K]> extends string
				? K
				: never;
}[keyof F] &
	string;

type Vars<T extends string> = T extends `${string}{${infer V}}${infer R}` ? V | Vars<R> : never;
type Checked<T extends string, Allowed extends string, Problem extends string> = [Vars<T>] extends [
	Allowed,
]
	? T
	: `${Problem}: ${Exclude<Vars<T>, Allowed>}`;

/** A value with `{field}` placeholders, e.g. `Bearer {apiKey}`. Each one names a field. */
export type Template<F extends Shape, T extends string> = Checked<T, FieldName<F>, 'not a field'>;

/** A base URL: `https://…`, or a URL field first. A placeholder never names a secret. */
export type UrlTemplate<F extends Shape, T extends string> = T extends
	| `https://${string}`
	| `{${string}}${string}`
	? Checked<T, Exclude<FieldName<F>, SecretName<F>>, 'not a field, or a secret'>
	: 'must start with https:// or a {field}';

type Templates<F extends Shape, R extends Values> = { readonly [K in keyof R]: Template<F, R[K]> };

/** A placement value of `exchange`: `{$token}` is the token, e.g. `Bearer {$token}`. */
type TokenTemplates<F extends Shape, R extends Values> = {
	readonly [K in keyof R]: Checked<R[K], FieldName<F> | '$token', 'not a field or $token'>;
};

/** A JWT claim: `{$scopes}` is the scopes the actions need. A claim never holds a secret. */
type ClaimTemplates<F extends Shape, R extends Values> = {
	readonly [K in keyof R]: Checked<
		R[K],
		Exclude<FieldName<F>, SecretName<F>> | '$scopes',
		'not a field or $scopes, or a secret'
	>;
};

/** One https base URL per value of an options field, e.g. a region. */
export interface BaseUrlMap {
	readonly on: string;
	readonly values: Values;
}

type TypedBaseUrlMap<F extends Shape> = {
	[K in OptionName<F>]: {
		readonly on: K;
		readonly values: { readonly [V in Infer<F[K]> & string]: `https://${string}` };
	};
}[OptionName<F>];

/** A base URL template, or one base URL per value of an options field. */
export type BaseUrl<F extends Shape, T extends string> = UrlTemplate<F, T> | TypedBaseUrlMap<F>;

/** Where n8n puts the credential values in a request. Data, so n8n core applies it. */
export interface Placement {
	readonly kind: 'apply';
	readonly headers: Values;
	readonly query: Values;
	/** Headers n8n sets only when the request has no header of that name. */
	readonly defaults: Values;
	readonly basic?: { readonly username: string; readonly password: string };
	/** The user may add one header of their own, e.g. for a proxy in front of the API. */
	readonly userHeader?: true;
}

/** One placement per value of an options field. */
export interface When {
	readonly kind: 'when';
	readonly field: string;
	readonly cases: Readonly<Record<string, Placement>>;
}

/** How the token request sends the client ID and secret (RFC 6749 §2.3.1). */
export type ClientAuth = 'client_secret_basic' | 'client_secret_post';

/** An OAuth2 grant that n8n core runs: connect button, token request, refresh. */
export interface OAuth2Grant {
	readonly kind: 'oauth2';
	readonly grant: 'authorizationCode' | 'clientCredentials';
	/** An https URL, or a template over fields, e.g. `{server}/login/oauth/authorize`. */
	readonly authorizationEndpoint?: string;
	readonly tokenEndpoint: string;
	readonly scope: readonly string[];
	readonly clientAuth: ClientAuth;
	readonly pkce: boolean;
	readonly authorizationQuery: Values;
	/** The user may replace `scope` in the form. */
	readonly editableScopes?: true;
}

/** RFC 8628: the user approves the app on a second device. n8n core does not run it yet. */
export interface DeviceCodeGrant {
	readonly kind: 'oauth2';
	readonly grant: 'deviceCode';
	readonly deviceAuthorizationEndpoint: string;
	readonly tokenEndpoint: string;
	readonly scope: readonly string[];
}

/**
 * RFC 7523 §2.1: a JWT that n8n signs with the key of a field is the grant, e.g. a Google
 * service account. n8n core does not run it yet.
 */
export interface JwtBearerGrant {
	readonly kind: 'oauth2';
	readonly grant: 'jwtBearer';
	readonly tokenEndpoint: string;
	/** The secret field with the PEM private key. */
	readonly key: string;
	readonly algorithm: 'RS256';
	/** Claim templates, e.g. `{ iss: '{email}', scope: '{$scopes}' }`. */
	readonly claims: Values;
	readonly scope: readonly string[];
}

/** RFC 8693: n8n trades the token of a field for an access token. n8n core does not run it yet. */
export interface TokenExchangeGrant {
	readonly kind: 'oauth2';
	readonly grant: 'tokenExchange';
	readonly tokenEndpoint: string;
	/** The secret field with the subject token. */
	readonly subjectToken: string;
	/** A token type URI of RFC 8693 §3, e.g. `urn:ietf:params:oauth:token-type:jwt`. */
	readonly subjectTokenType: string;
	readonly audience?: string;
	/** RFC 8707: the API the token is for. */
	readonly resource?: string;
	readonly scope: readonly string[];
	readonly clientAuth: ClientAuth;
}

/**
 * OpenID Connect with the authorization code grant. The endpoints come from the discovery
 * document of `issuer`, see `discoverOidc`. n8n core does not run it yet.
 */
export interface OidcGrant {
	readonly kind: 'oidc';
	readonly issuer: string;
	/** Always holds `openid`. */
	readonly scope: readonly string[];
	readonly clientAuth: ClientAuth;
	readonly pkce: boolean;
}

/**
 * A token request that n8n sends before the requests of a credential, e.g. a login that gives a
 * session token. n8n stores the token, sends it again until it expires or the API answers 401,
 * and then sends the token request again.
 */
export interface Exchange {
	readonly kind: 'exchange';
	readonly request: {
		readonly method: 'POST';
		/** A URL template, as `baseUrl`. */
		readonly url: string;
		/** A JSON body. The values are templates and may hold secrets. */
		readonly json: Values;
	};
	readonly token: {
		/** The dot path of the token in the JSON response, e.g. `data.token`. */
		readonly path: string;
		/** The hidden field that stores the token. */
		readonly field: string;
		/** The dot path of the lifetime in seconds, e.g. `expires_in`. */
		readonly expiresIn?: string;
	};
	/** Where the token goes. `{$token}` is the token. */
	readonly apply: Placement;
}

/** n8n puts nothing into requests. The built-in node that uses the type reads its fields. */
export interface NoAuth {
	readonly kind: 'none';
}

/** The escape hatch: code signs each request. It sees every secret. */
export interface CustomAuth<F extends Shape = Shape> {
	readonly kind: 'custom';
	/** Why no declarative placement fits. A reviewer reads it. */
	readonly reason: string;
	sign(data: CredentialData<F>, request: IHttpRequestOptions): Promise<IHttpRequestOptions>;
}

/** How n8n signs a request. All kinds but `custom` are data. */
export type CredentialScheme<F extends Shape = Shape> =
	| Placement
	| When
	| OAuth2Grant
	| DeviceCodeGrant
	| JwtBearerGrant
	| TokenExchangeGrant
	| OidcGrant
	| Exchange
	| NoAuth
	| CustomAuth<F>
	/** The type stays a legacy class in nodes-base. Only its name is shared. */
	| { readonly kind: 'compat' };

interface AuthorizationCodeSpec<F extends Shape, A extends string, T extends string> {
	readonly authorizationEndpoint: UrlTemplate<F, A>;
	readonly tokenEndpoint: UrlTemplate<F, T>;
	/** The provider scopes the app asks for at consent. */
	readonly scope?: readonly string[];
	/** Default `client_secret_basic`. */
	readonly clientAuth?: ClientAuth;
	/** PKCE with S256 (RFC 7636). Default `true`. */
	readonly pkce?: boolean;
	/** Extra query parameters of the authorization request, e.g. `{ access_type: 'offline' }`. */
	readonly authorizationQuery?: Values;
	/** The form lets the user replace `scope`, e.g. to ask for less. */
	readonly editableScopes?: true;
}

interface ClientCredentialsSpec<F extends Shape, T extends string> {
	readonly tokenEndpoint: UrlTemplate<F, T>;
	readonly scope?: readonly string[];
	/** Default `client_secret_basic`. */
	readonly clientAuth?: ClientAuth;
	readonly editableScopes?: true;
}

/** The auth builders, typed by the fields of the credential type. A typo in a field fails `tsc`. */
export interface AuthBuilders<F extends Shape> {
	/** `Authorization: Bearer <field>`. */
	bearer<const D extends Values = NoFields>(
		field: FieldName<F>,
		options?: { readonly defaults?: Templates<F, D> },
	): Placement;
	header<const T extends string>(name: string, value: Template<F, T>): Placement;
	query<const T extends string>(name: string, value: Template<F, T>): Placement;
	/** HTTP basic authentication, e.g. `a.basic('{email}/token', '{apiToken}')`. */
	basic<const U extends string, const P extends string>(
		username: Template<F, U>,
		password: Template<F, P>,
	): Placement;
	/**
	 * Several places at once. A placeholder of an optional field without a value drops its entry.
	 * `defaults` are headers a request may set itself.
	 */
	apply<
		const H extends Values = NoFields,
		const Q extends Values = NoFields,
		const D extends Values = NoFields,
	>(spec: {
		readonly headers?: Templates<F, H>;
		readonly query?: Templates<F, Q>;
		readonly defaults?: Templates<F, D>;
		/**
		 * Adds the fields `header`, `headerName` and `headerValue`: one header the user names. It
		 * replaces a header of the same name.
		 */
		readonly userHeader?: true;
	}): Placement;
	/** The placement depends on an options field. `tsc` needs one case per value. */
	when<const K extends OptionName<F>>(
		field: K,
		cases: { readonly [V in Infer<F[K]> & string]: Placement },
	): When;
	/** The OAuth2 grants, named as in their RFCs. Endpoints are https URLs or templates. */
	readonly oauth2: {
		/** RFC 6749 §4.1, with PKCE (RFC 7636) unless `pkce: false`. */
		authorizationCode<const A extends string, const T extends string>(
			spec: AuthorizationCodeSpec<F, A, T>,
		): OAuth2Grant;
		/** RFC 6749 §4.4. */
		clientCredentials<const T extends string>(spec: ClientCredentialsSpec<F, T>): OAuth2Grant;
		/** RFC 8628. */
		deviceCode<const D extends string, const T extends string>(spec: {
			readonly deviceAuthorizationEndpoint: UrlTemplate<F, D>;
			readonly tokenEndpoint: UrlTemplate<F, T>;
			readonly scope?: readonly string[];
		}): DeviceCodeGrant;
		/** RFC 7523 §2.1, signed with RS256. */
		jwtBearer<const T extends string, const C extends Values>(spec: {
			readonly tokenEndpoint: UrlTemplate<F, T>;
			readonly key: SecretName<F>;
			readonly claims: ClaimTemplates<F, C>;
			readonly scope?: readonly string[];
		}): JwtBearerGrant;
		/** RFC 8693. */
		tokenExchange<const T extends string>(spec: {
			readonly tokenEndpoint: UrlTemplate<F, T>;
			readonly subjectToken: SecretName<F>;
			readonly subjectTokenType: `urn:${string}`;
			readonly audience?: string;
			readonly resource?: `https://${string}`;
			readonly scope?: readonly string[];
			readonly clientAuth?: ClientAuth;
		}): TokenExchangeGrant;
	};
	/** OpenID Connect: the endpoints come from the discovery document of `issuer`. */
	oidc<const I extends string>(spec: {
		readonly issuer: UrlTemplate<F, I>;
		/** `openid` is always added. */
		readonly scope?: readonly string[];
		readonly clientAuth?: ClientAuth;
		readonly pkce?: boolean;
	}): OidcGrant;
	/**
	 * A token request before the requests, e.g. a login for a session token. The token goes where
	 * `headers` and `query` put `{$token}`.
	 */
	exchange<
		const U extends string,
		const J extends Values = NoFields,
		const H extends Values = NoFields,
		const Q extends Values = NoFields,
	>(spec: {
		readonly post: UrlTemplate<F, U>;
		readonly json?: Templates<F, J>;
		readonly token: {
			readonly path: string;
			/** Default `token`. Keep the legacy name, so a stored token stays valid. */
			readonly field?: string;
			readonly expiresIn?: string;
		};
		readonly headers?: TokenTemplates<F, H>;
		readonly query?: TokenTemplates<F, Q>;
	}): Exchange;
	/** Fields only: n8n puts nothing into requests, e.g. an app secret that verifies webhooks. */
	none(): NoAuth;
	/** The last resort, when no placement fits. `reason` says why. */
	custom(spec: {
		readonly reason: string;
		sign(data: CredentialData<F>, request: IHttpRequestOptions): Promise<IHttpRequestOptions>;
	}): CustomAuth<F>;
}

/**
 * One n8n credential type, e.g. `notion.token`. A node lists the value, so `tsc` finds a typo or a
 * missing import.
 */
export interface CredentialType<Name extends string = string, F extends Shape = Shape> {
	/** `service.scheme`, e.g. `notion.token`. */
	readonly id: string;
	/** The n8n type name. Saved credentials and workflows refer to it, so it never changes. */
	readonly name: Name;
	/**
	 * `major.minor.patch` of the credential manifest. Actions pin the major. A compat type has
	 * none: its legacy class defines it.
	 */
	readonly semver?: string;
	readonly displayName: string;
	readonly documentationUrl?: string;
	/** The stored fields. `t.secret` fields go only to n8n and to `custom` code. */
	readonly fields?: F;
	readonly scheme: CredentialScheme<F>;
	/**
	 * The API base URL, e.g. `https://{subdomain}.zendesk.com/api/v2`. It replaces the node's, and
	 * its host is a credential host.
	 */
	readonly baseUrl?: string | BaseUrlMap;
	/**
	 * More hosts n8n may send this credential to: `api.example.com`, or `*.example.com` for its
	 * subdomains only. The user's "Allowed HTTP Request Domains" list adds hosts. A type without
	 * hosts and without `baseUrl` keeps the legacy meaning of that setting.
	 */
	readonly hosts?: readonly string[];
	/** The request that tests a credential, after `baseUrl` with the credential applied. */
	readonly test?: CredentialTest;
	/** A text the form shows after the fields. */
	readonly notice?: Notice;
	/**
	 * The legacy n8n type this type extends, e.g. `googleOAuth2Api`. Instance credential
	 * overwrites and the editor's sign-in button of that type then apply.
	 */
	readonly legacyParent?: string;
	/** Stored fields with an old name, by old name, e.g. `{ token: 'accessToken' }`. */
	readonly renamed?: Values;
}

/** A JSON body pattern with one value at its end, e.g. `{ error: { type: 'OAuthException' } }`. */
export interface BodyMatch {
	readonly [key: string]: string | number | boolean | BodyMatch;
}

/** The test fails with `message` when the response body matches `body`. */
export interface TestRule {
	readonly body: BodyMatch;
	readonly message: string;
}

interface TestOptions {
	/** Literal headers the API needs on each request, e.g. a version. */
	readonly headers?: Values;
	/** An HTTP error status does not fail the test. Only `failWhen` does. */
	readonly ignoreHttpStatusErrors?: true;
	/** For an API that answers 2xx to a bad key, e.g. Slack `{ ok: false, error: 'invalid_auth' }`. */
	readonly failWhen?: readonly TestRule[];
}

/** A GET of a path, or a POST of a path with a body. */
export type CredentialTest = TestOptions &
	({ readonly get: string } | { readonly post: string; readonly body?: Values });

/** A text the form shows, e.g. a security tip. */
export interface Notice {
	readonly text: string;
	/** The form shows it only while each named field has this value. */
	readonly when?: Readonly<Partial<Record<string, string | number | boolean>>>;
	/** The form shows it only on this kind of n8n deployment. */
	readonly deployment?: 'cloud' | 'hosted';
}

export type AnyCredentialType = CredentialType<string, Shape>;

type PlainShape<F extends Shape> = {
	[K in keyof F as F[K] extends Schema<Secret, boolean> ? never : K]: F[K];
};

/** The credential that `run()` reads: the type name, and its fields without the secrets. */
export type RunCredential<T> = T extends CredentialType<infer Name, infer F>
	? { readonly type: Name; readonly fields: CredentialData<PlainShape<F>> }
	: never;

/** The data keys every type in `T` has, e.g. for a webhook signing secret. */
export type CredentialKey<T> = keyof (T extends CredentialType<string, infer F>
	? CredentialData<F>
	: never) &
	string;

/**
 * The one credential of a node: the credential types a user may pick, and the scopes the
 * node's actions may need. Each action lists its scopes; a workflow needs their union.
 */
export interface Credential<
	T extends AnyCredentialType = AnyCredentialType,
	Scope extends string = string,
> {
	readonly types: readonly T[];
	/** Each scope with what it allows, e.g. `{ 'content:read': 'Read pages and databases' }`. */
	readonly scopes: Readonly<Record<Scope, string>>;
	/** The node also runs without a credential (a public HTTP API). */
	readonly optional: boolean;
}

export function credential<const T extends AnyCredentialType>(spec: {
	readonly types: readonly T[];
	readonly optional?: boolean;
}): Credential<T, never>;
export function credential<const T extends AnyCredentialType, const Scope extends string>(spec: {
	readonly types: readonly T[];
	readonly scopes: Readonly<Record<Scope, string>>;
	readonly optional?: boolean;
}): Credential<T, Scope>;
export function credential(spec: {
	readonly types: readonly AnyCredentialType[];
	readonly scopes?: Readonly<Record<string, string>>;
	readonly optional?: boolean;
}): Credential {
	return { types: spec.types, scopes: spec.scopes ?? {}, optional: spec.optional ?? false };
}

const PLACEHOLDER = /\{([^}]+)\}/g;

const varsOf = (template: string) =>
	[...template.matchAll(PLACEHOLDER)].map(([, name]) => name ?? '');

export const isSecretField = (schema: AnySchema) => schema.json.writeOnly === true;

/** An optional field without a default can be empty. */
const canBeEmpty = (schema: AnySchema | undefined) =>
	schema !== undefined && schema.isOptional && schema.json.default === undefined;

const placement = (spec: Partial<Omit<Placement, 'kind'>>): Placement => ({
	kind: 'apply',
	headers: spec.headers ?? {},
	query: spec.query ?? {},
	defaults: spec.defaults ?? {},
	...(spec.basic ? { basic: spec.basic } : {}),
	...(spec.userHeader ? { userHeader: true } : {}),
});

const templatesOf = (scheme: Placement): string[] => [
	...Object.values(scheme.headers),
	...Object.values(scheme.query),
	...Object.values(scheme.defaults),
	...(scheme.basic ? [scheme.basic.username, scheme.basic.password] : []),
];

function authBuilders<F extends Shape>(): AuthBuilders<F> {
	return {
		bearer: (field, options) =>
			placement({ headers: { Authorization: `Bearer {${field}}` }, defaults: options?.defaults }),
		header: (name, value) => placement({ headers: { [name]: value } }),
		query: (name, value) => placement({ query: { [name]: value } }),
		basic: (username, password) => placement({ basic: { username, password } }),
		apply: (spec) => placement(spec),
		when: (field, cases) => ({ kind: 'when', field, cases }),
		oauth2: {
			authorizationCode: (spec) => ({
				kind: 'oauth2',
				grant: 'authorizationCode',
				authorizationEndpoint: spec.authorizationEndpoint,
				tokenEndpoint: spec.tokenEndpoint,
				scope: spec.scope ?? [],
				clientAuth: spec.clientAuth ?? 'client_secret_basic',
				pkce: spec.pkce ?? true,
				authorizationQuery: spec.authorizationQuery ?? {},
				...(spec.editableScopes ? { editableScopes: true } : {}),
			}),
			clientCredentials: (spec) => ({
				kind: 'oauth2',
				grant: 'clientCredentials',
				tokenEndpoint: spec.tokenEndpoint,
				scope: spec.scope ?? [],
				clientAuth: spec.clientAuth ?? 'client_secret_basic',
				pkce: false,
				authorizationQuery: {},
				...(spec.editableScopes ? { editableScopes: true } : {}),
			}),
			deviceCode: (spec) => ({
				kind: 'oauth2',
				grant: 'deviceCode',
				deviceAuthorizationEndpoint: spec.deviceAuthorizationEndpoint,
				tokenEndpoint: spec.tokenEndpoint,
				scope: spec.scope ?? [],
			}),
			jwtBearer: (spec) => ({
				kind: 'oauth2',
				grant: 'jwtBearer',
				tokenEndpoint: spec.tokenEndpoint,
				key: spec.key,
				algorithm: 'RS256',
				claims: spec.claims,
				scope: spec.scope ?? [],
			}),
			tokenExchange: (spec) => ({
				kind: 'oauth2',
				grant: 'tokenExchange',
				tokenEndpoint: spec.tokenEndpoint,
				subjectToken: spec.subjectToken,
				subjectTokenType: spec.subjectTokenType,
				...(spec.audience === undefined ? {} : { audience: spec.audience }),
				...(spec.resource === undefined ? {} : { resource: spec.resource }),
				scope: spec.scope ?? [],
				clientAuth: spec.clientAuth ?? 'client_secret_basic',
			}),
		},
		oidc: (spec) => ({
			kind: 'oidc',
			issuer: spec.issuer,
			scope: ['openid', ...(spec.scope ?? []).filter((scope) => scope !== 'openid')],
			clientAuth: spec.clientAuth ?? 'client_secret_basic',
			pkce: spec.pkce ?? true,
		}),
		exchange: (spec) => ({
			kind: 'exchange',
			request: { method: 'POST', url: spec.post, json: spec.json ?? {} },
			token: { ...spec.token, field: spec.token.field ?? 'token' },
			apply: placement({ headers: spec.headers, query: spec.query }),
		}),
		none: () => ({ kind: 'none' }),
		custom: (spec) => ({ kind: 'custom', reason: spec.reason, sign: spec.sign }),
	};
}

const placementsOf = (scheme: CredentialScheme): readonly Placement[] =>
	scheme.kind === 'apply' ? [scheme] : scheme.kind === 'when' ? Object.values(scheme.cases) : [];

const isBaseUrlField = (schema: AnySchema | undefined) => schema?.json['x-n8n-base-url'] === true;

const testPathOf = (test: CredentialTest) => ('get' in test ? test.get : test.post);

/** Each value of a body pattern with the keys on its way, e.g. `[['error', 'type'], 'x']`. */
const leavesOf = (
	match: BodyMatch,
	at: readonly string[] = [],
): Array<readonly [readonly string[], string | number | boolean]> =>
	Object.entries(match).flatMap(([key, value]) => {
		if (typeof value === 'object') return leavesOf(value, [...at, key]);
		const leaf: readonly [readonly string[], string | number | boolean] = [[...at, key], value];
		return [leaf];
	});

function testIssues(type: AnyCredentialType): string[] {
	const { test, fields = {} } = type;
	if (!test) return [];
	const path = testPathOf(test);
	const body = 'post' in test ? Object.values(test.body ?? {}) : [];
	return [
		...(type.baseUrl === undefined ? ['test needs a baseUrl'] : []),
		// `//host` would leave the base URL host.
		...(/^\/(?!\/)[^{\\]*$/.test(path) ? [] : [`test: ${path} must be a path without {field}`]),
		...body
			.flatMap(varsOf)
			.filter((name) => !(name in fields))
			.map((name) => `test.body: {${name}} is not a field`),
		...Object.values(test.headers ?? {})
			.filter((value) => value.includes('{'))
			.map((value) => `test.headers: ${value} must be a literal`),
		...(test.failWhen ?? []).flatMap(({ body: match }) => {
			const leaves = leavesOf(match);
			const keys = leaves.flatMap(([keyPath]) => keyPath);
			return [
				...(leaves.length === 1 ? [] : ['failWhen: each body names one value']),
				...keys
					.filter((key) => /[.[\]]/.test(key))
					.map((key) => `failWhen: the key ${key} has a . or a bracket`),
			];
		}),
	];
}

/**
 * RFC 6749 \u00a73.3: a scope token has no space, quote or backslash. The scope also goes into an n8n
 * expression, so it has no brace and does not start with `=`.
 */
const SCOPE_TOKEN = /^(?!=)[\x21\x23-\x5B\x5D-\x7A\x7C\x7E]+$/;

/** The URL templates of a scheme by name, e.g. `tokenEndpoint`. */
const schemeUrlsOf = (scheme: CredentialScheme): Array<readonly [string, string]> => {
	if (scheme.kind === 'exchange') return [['exchange', scheme.request.url]];
	if (scheme.kind === 'oidc') return [['issuer', scheme.issuer]];
	if (scheme.kind !== 'oauth2') return [];
	const first =
		scheme.grant === 'deviceCode'
			? scheme.deviceAuthorizationEndpoint
			: 'authorizationEndpoint' in scheme
				? scheme.authorizationEndpoint
				: undefined;
	return [
		...(first === undefined ? [] : [['authorization', first] as const]),
		['tokenEndpoint', scheme.tokenEndpoint],
	];
};

/** The problems of the token parts of `exchange`, `jwtBearer` and `tokenExchange`. */
function tokenIssues(type: AnyCredentialType): string[] {
	const fields = type.fields ?? {};
	const { scheme } = type;
	const secret = (name: string) => name in fields && isSecretField(fields[name]);
	if (scheme.kind === 'exchange') {
		const { apply, request, token } = scheme;
		const placed = templatesOf(apply);
		return [
			// The token request goes only to a credential host, so the type must have one.
			...(type.baseUrl === undefined && type.hosts === undefined
				? ['exchange needs a baseUrl or hosts']
				: []),
			...Object.values(request.json)
				.flatMap(varsOf)
				.filter((name) => !(name in fields))
				.map((name) => `exchange.json: {${name}} is not a field`),
			...placed
				.flatMap(varsOf)
				.filter((name) => name !== '$token' && !(name in fields))
				.map((name) => `exchange: {${name}} is not a field or $token`),
			...(placed.some((value) => value.includes('{$token}')) ? [] : ['exchange: no {$token}']),
			...(token.field in fields || !/^[A-Za-z_]\w*$/.test(token.field)
				? [`exchange: ${token.field} must be a new field name`]
				: []),
			...[token.path, token.expiresIn ?? 'x']
				.filter((path) => !/^[^.[\]]+(\.[^.[\]]+)*$/.test(path))
				.map((path) => `exchange: ${path} is not a dot path`),
		];
	}
	if (scheme.kind !== 'oauth2') return [];
	if (scheme.grant === 'jwtBearer') {
		return [
			...(secret(scheme.key) ? [] : [`jwtBearer: ${scheme.key} is not a secret field`]),
			...Object.values(scheme.claims)
				.flatMap(varsOf)
				.filter((name) => name !== '$scopes' && (!(name in fields) || secret(name)))
				.map((name) => `jwtBearer: {${name}} is not a field or $scopes, or a secret`),
		];
	}
	if (scheme.grant === 'tokenExchange' && !secret(scheme.subjectToken)) {
		return [`tokenExchange: ${scheme.subjectToken} is not a secret field`];
	}
	return [];
}

/** The problems of a definition that `tsc` does not see in plain JavaScript. */
function definitionIssues(type: AnyCredentialType): string[] {
	const fields = type.fields ?? {};
	const unknown = (templates: readonly string[], allowed: (name: string) => boolean) =>
		templates.flatMap(varsOf).filter((name) => !allowed(name));
	const { scheme, baseUrl } = type;
	const placements = placementsOf(scheme);
	const plainField = (name: string) =>
		name in fields && !isSecretField(fields[name]) && !isBaseUrlField(fields[name]);
	const hasBaseUrlField = Object.values(fields).some(isBaseUrlField);
	const urls: Array<readonly [string, string]> = [
		...(typeof baseUrl === 'string' ? [['baseUrl', baseUrl] as const] : []),
		...schemeUrlsOf(scheme),
	];
	const scopes = 'scope' in scheme ? scheme.scope : [];
	// n8n core and `credentialBaseUrlOf` read these fields from the stored data, without `renamed`.
	const readByName = new Set([
		...urls.flatMap(([, url]) => varsOf(url)),
		...(typeof baseUrl === 'object' ? [baseUrl.on] : []),
		...(type.test && 'post' in type.test ? Object.values(type.test.body ?? {}) : []).flatMap(
			varsOf,
		),
	]);
	return [
		...(type.hosts ?? [])
			.filter((host) => !isHostPattern(host))
			.map((host) => `${host} is not a host. Use api.example.com or *.example.com.`),
		...unknown(placements.flatMap(templatesOf), (name) => name in fields).map(
			(name) => `{${name}} is not a field`,
		),
		...urls.flatMap(([label, url]) => [
			...(/^(https:\/\/|\{)/.test(url) ? [] : [`${label} must start with https:// or a {field}`]),
			...unknown([url], plainField).map(
				(name) => `${label}: {${name}} is not a field, or a secret`,
			),
		]),
		...scopes
			.filter((scope) => !SCOPE_TOKEN.test(scope))
			.map((scope) => `scope: "${scope}" is not one scope token`),
		...tokenIssues(type),
		...Object.entries(type.renamed ?? {})
			.filter(([from, to]) => from in fields || !(to in fields))
			.map(([from, to]) => `renamed: ${from} must be an old name of the field ${to}`),
		...Object.values(type.renamed ?? {})
			.filter((to) => readByName.has(to))
			.map((to) => `renamed: ${to} is in baseUrl, test or a URL, which do not read an old name`),
		...(typeof baseUrl === 'object' && !plainField(baseUrl.on)
			? [`baseUrl: ${baseUrl.on} is not a field`]
			: []),
		...(typeof baseUrl === 'object'
			? Object.values(baseUrl.values)
					.filter((url) => !url.startsWith('https://') || url.includes('{'))
					.map((url) => `baseUrl: ${url} is not an https URL`)
			: []),
		...(scheme.kind === 'when' && !(scheme.field in fields)
			? [`when: ${scheme.field} is not a field`]
			: []),
		...(scheme.kind === 'custom' && scheme.reason.trim() === '' ? ['custom needs a reason'] : []),
		...(hasBaseUrlField && baseUrl === undefined ? ['a base URL field needs a baseUrl'] : []),
		...(placements.some((placement) => placement.userHeader)
			? userHeaderProperties()
					.filter(({ name }) => name in fields)
					.map(({ name }) => `userHeader: ${name} is a field of userHeader`)
			: []),
		...Object.keys(type.notice?.when ?? {})
			.filter((name) => !(name in fields))
			.map((name) => `notice: ${name} is not a field`),
		...testIssues(type),
	];
}

const checked = <T extends AnyCredentialType>(type: T): T => {
	const issues = definitionIssues(type);
	if (issues.length > 0) throw new UserError(`Credential ${type.id}: ${issues.join('; ')}`);
	return type;
};

/**
 * A credential type. Prefer a declarative `auth`; n8n then owns the secrets. `a.custom` is the
 * last resort.
 *
 * @example
 * export const notionToken = credentialType({
 *   id: 'notion.token',
 *   legacyName: 'notionApi',
 *   displayName: 'Notion API',
 *   fields: { apiKey: t.secret('Internal Integration Secret') },
 *   baseUrl: 'https://api.notion.com/v1',
 *   auth: (a) => a.bearer('apiKey'),
 *   test: { get: '/users/me' },
 * });
 */
export function credentialType<
	const Id extends `${string}.${string}`,
	const F extends Shape = NoFields,
	const Name extends string = Id,
	const B extends string = never,
	const TB extends Values = NoFields,
>(spec: {
	/** `service.scheme`, e.g. `notion.token`. */
	readonly id: Id;
	/** The name of the legacy n8n type this replaces, e.g. `notionApi`, so stored data resolves. */
	readonly legacyName?: Name;
	/**
	 * The major, 1 when omitted. Bump it when stored data or a saved workflow can break: a new
	 * required field, a new host, a new scheme.
	 */
	readonly version?: number;
	/** Bump for an additive change, e.g. a new optional field. 0 when omitted. */
	readonly minor?: number;
	/** Bump for a change of text only. 0 when omitted. */
	readonly patch?: number;
	readonly displayName: string;
	/** The n8n docs page, e.g. `notion`. */
	readonly docs?: string;
	readonly fields?: F;
	readonly baseUrl?: BaseUrl<F, B>;
	/** Hosts besides the host of `baseUrl`. */
	readonly hosts?: readonly string[];
	readonly auth: (a: AuthBuilders<F>) => CredentialScheme<F>;
	/**
	 * A GET of this path, or a POST with a body, after `baseUrl` with the credential applied. The
	 * body may hold secrets; the path never does.
	 */
	readonly test?: TestOptions &
		(
			| { readonly get: `/${string}` }
			| { readonly post: `/${string}`; readonly body?: Templates<F, TB> }
		);
	readonly notice?: {
		readonly text: string;
		readonly when?: { readonly [K in FieldName<F>]?: string | number | boolean };
		readonly deployment?: 'cloud' | 'hosted';
	};
	/**
	 * The legacy n8n type this type extends, e.g. `googleOAuth2Api`, so its instance overwrites
	 * and its sign-in button apply.
	 */
	readonly legacyParent?: string;
	/** Stored fields with an old name: n8n reads `{ old: 'new' }` as `new`. */
	readonly renamed?: { readonly [old: string]: FieldName<F> };
}): CredentialType<Name, F> {
	// `Name` is `legacyName`, or `Id` without it. tsc cannot link the default, so a guard narrows.
	const name: string = spec.legacyName ?? spec.id;
	const isName = (value: string): value is Name => value === name;
	if (!isName(name)) throw new UserError(`Credential ${spec.id}: no name`);
	return checked({
		id: spec.id,
		name,
		semver: `${spec.version ?? 1}.${spec.minor ?? 0}.${spec.patch ?? 0}`,
		displayName: spec.displayName,
		...(spec.docs ? { documentationUrl: spec.docs } : {}),
		...(spec.fields ? { fields: spec.fields } : {}),
		scheme: spec.auth(authBuilders<F>()),
		...(spec.baseUrl === undefined ? {} : { baseUrl: spec.baseUrl }),
		...(spec.hosts ? { hosts: spec.hosts } : {}),
		...(spec.test ? { test: spec.test } : {}),
		...(spec.notice ? { notice: spec.notice } : {}),
		...(spec.legacyParent ? { legacyParent: spec.legacyParent } : {}),
		...(spec.renamed ? { renamed: spec.renamed } : {}),
	});
}

/**
 * An existing n8n credential type, by name, e.g. `gmailOAuth2`. Saved credentials keep working
 * because the legacy class still defines the type. `fields` declares what code reads; the
 * runtime checks them when it reads the credential.
 */
export function compat<
	const Name extends string,
	const F extends Shape = NoFields,
	const B extends string = never,
>(
	name: Name,
	spec: {
		/** `service.scheme`. The legacy name when not set. */
		readonly id?: string;
		readonly fields?: F;
		readonly hosts?: readonly string[];
		readonly baseUrl?: BaseUrl<F, B>;
	} = {},
): CredentialType<Name, F> {
	return checked({
		id: spec.id ?? name,
		name,
		displayName: name,
		...(spec.fields ? { fields: spec.fields } : {}),
		scheme: { kind: 'compat' },
		...(spec.baseUrl === undefined ? {} : { baseUrl: spec.baseUrl }),
		...(spec.hosts ? { hosts: spec.hosts } : {}),
	});
}

const dataSchemaOf = (type: AnyCredentialType): JsonSchema => ({
	...obj(type.fields ?? {}).json,
	// Stored data also holds hidden fields and OAuth tokens.
	additionalProperties: true,
});

/** The declared fields without the secrets, each default filled in, for `run()`. */
export function plainFieldsOf(type: AnyCredentialType, raw: unknown): Record<string, unknown> {
	const fields = type.fields ?? {};
	const names = Object.keys(fields).filter((name) => !isSecretField(fields[name]));
	if (names.length === 0) return {};
	const data = credentialDataOf(type, raw);
	return Object.freeze(
		Object.fromEntries(
			names.flatMap((name) => (data[name] === undefined ? [] : [[name, data[name]]])),
		),
	);
}

/** A value under an old name moves to the new name while the new one is empty or its default. */
function migrated(type: AnyCredentialType, raw: unknown): unknown {
	if (!isRecord(raw) || type.renamed === undefined) return raw;
	const moved = Object.entries(type.renamed).flatMap(([from, to]) => {
		const empty: unknown[] = [undefined, '', type.fields?.[to]?.json.default];
		const unset = empty.includes(raw[to]);
		return unset && raw[from] !== undefined && raw[from] !== '' ? [[to, raw[from]]] : [];
	});
	return moved.length > 0 ? { ...raw, ...Object.fromEntries(moved) } : raw;
}

/** The stored data, each default filled in and checked against the declared fields. */
export function credentialDataOf(type: AnyCredentialType, raw: unknown): CredentialData<Shape> {
	const schema = dataSchemaOf(type);
	const data = applyDefaults(migrated(type, raw), schema);
	const issues = validate(data, schema, { path: type.name });
	const isData = (value: unknown): value is CredentialData<Shape> =>
		isRecord(value) && issues.length === 0;
	if (!isData(data)) throw new UserError(`Credential ${type.name}: ${issues.join('; ')}`);
	return data;
}

const asText = (value: unknown) =>
	typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
		? String(value)
		: '';

/** A stored value. An empty value of a field with a default is the default, as legacy types read it. */
const storedValue = (type: AnyCredentialType, data: Record<string, unknown>, name: string) => {
	const value = data[name];
	return value === undefined || value === ''
		? asText(type.fields?.[name]?.json.default)
		: asText(value);
};

/**
 * The base URL of one credential with its stored data. A value at the start is the URL itself, a
 * value in the host is one host label, and a value in the path is URL-encoded.
 */
export function credentialBaseUrlOf(type: AnyCredentialType, raw: unknown): string | undefined {
	const template = type.baseUrl;
	if (template === undefined) return undefined;
	if (typeof template === 'object') {
		const value = storedValue(type, credentialDataOf(type, raw), template.on);
		const url = template.values[value];
		if (url === undefined)
			throw new UserError(`Credential ${type.name}: ${template.on} "${value}" has no base URL`);
		return url;
	}
	if (!template.includes('{')) return template;
	const data = credentialDataOf(type, raw);
	const slash = template.startsWith('https://') ? template.indexOf('/', 'https://'.length) : 0;
	const hostEnd = slash === -1 ? template.length : slash;
	return template.replace(PLACEHOLDER, (_, name: string, offset: number) => {
		const value = storedValue(type, data, name);
		// The template adds the path, so a URL value loses its trailing slashes.
		if (offset === 0) return value.replace(/\/+$/, '');
		if (offset >= hostEnd) return encodeURIComponent(value);
		if (!/^[a-z0-9-]+$/i.test(value)) {
			throw new UserError(`Credential ${type.name}: ${name} must be one host label`);
		}
		return value;
	});
}

/**
 * n8n core resolves `{{$credentials.<field>}}` when it signs a request or runs a test, and
 * `{{$self.<field>}}` in the default of a hidden field when it reads the credential.
 */
type DataVariable = '$credentials' | '$self';

const toExpression = (template: string, data: DataVariable = '$credentials') =>
	varsOf(template).length === 0
		? template
		: `=${template.replace(PLACEHOLDER, (_, name: string) => `{{${data}.${name}}}`)}`;

const baseUrlExpression = (baseUrl: string | BaseUrlMap, data: DataVariable = '$credentials') =>
	typeof baseUrl === 'string'
		? toExpression(baseUrl, data)
		: `={{ ${JSON.stringify(baseUrl.values)}[${data}.${baseUrl.on}] }}`;

const mapValues = (values: Values, map: (value: string) => string) =>
	Object.fromEntries(Object.entries(values).map(([key, value]) => [key, map(value)]));

const hasEntries = (values: Values) => Object.keys(values).length > 0;

function genericOf(scheme: Placement): IAuthenticateGeneric {
	const { headers, query, basic } = scheme;
	return {
		type: 'generic',
		properties: {
			...(hasEntries(headers) ? { headers: mapValues(headers, toExpression) } : {}),
			...(hasEntries(query) ? { qs: mapValues(query, toExpression) } : {}),
			...(basic
				? {
						auth: {
							username: toExpression(basic.username),
							password: toExpression(basic.password),
						},
					}
				: {}),
		},
	};
}

/** The generic block of core sends an empty value and has no defaults, so these need a function. */
const isGeneric = (type: AnyCredentialType, scheme: Placement) =>
	!hasEntries(scheme.defaults) &&
	!scheme.userHeader &&
	templatesOf(scheme)
		.flatMap(varsOf)
		.every((name) => !canBeEmpty(type.fields?.[name]));

/** Applies a placement to a new request. A value of an empty optional field drops its entry. */
function applyPlacement(
	type: AnyCredentialType,
	scheme: Placement,
	data: Record<string, unknown>,
	request: IHttpRequestOptions,
): IHttpRequestOptions {
	const fill = (template: string) => {
		const names = varsOf(template);
		const empty = names.some((name) => canBeEmpty(type.fields?.[name]) && !asText(data[name]));
		return empty
			? undefined
			: template.replace(PLACEHOLDER, (_, name: string) => storedValue(type, data, name));
	};
	const filled = (values: Values) =>
		Object.fromEntries(
			Object.entries(values).flatMap(([key, template]) => {
				const value = fill(template);
				return value === undefined ? [] : [[key, value]];
			}),
		);
	const lower = (values: object) => new Set(Object.keys(values).map((key) => key.toLowerCase()));
	const without = (values: object, names: Set<string>) =>
		Object.entries(values).filter(([key]) => !names.has(key.toLowerCase()));
	const { header, headerName, headerValue } = data;
	const user =
		scheme.userHeader && header === true && typeof headerName === 'string' && headerName !== ''
			? { [headerName]: asText(headerValue) }
			: {};
	const placed = { ...Object.fromEntries(without(filled(scheme.headers), lower(user))), ...user };
	const sent = without(request.headers ?? {}, lower(placed));
	const present = lower({ ...request.headers, ...placed });
	const defaults = without(filled(scheme.defaults), present);
	const username = scheme.basic ? fill(scheme.basic.username) : undefined;
	const password = scheme.basic ? fill(scheme.basic.password) : undefined;
	return {
		...request,
		...(hasEntries(scheme.headers) || hasEntries(scheme.defaults) || scheme.userHeader
			? { headers: { ...Object.fromEntries(sent), ...placed, ...Object.fromEntries(defaults) } }
			: {}),
		...(hasEntries(scheme.query) ? { qs: { ...request.qs, ...filled(scheme.query) } } : {}),
		...(username !== undefined && password !== undefined ? { auth: { username, password } } : {}),
	};
}

function placementOf(
	type: AnyCredentialType,
	scheme: Placement | When,
	data: CredentialData<Shape>,
) {
	if (scheme.kind === 'apply') return scheme;
	const value = storedValue(type, data, scheme.field);
	const chosen = scheme.cases[value];
	if (!chosen) {
		throw new UserError(`Credential ${type.name}: ${scheme.field} "${value}" has no auth case`);
	}
	return chosen;
}

const fieldProperty = (
	type: AnyCredentialType,
	name: string,
	schema: AnySchema,
): INodeProperties => {
	const { json } = schema;
	const displayName = json.title ?? name;
	if (json.readOnly) {
		const value =
			isBaseUrlField(schema) && type.baseUrl !== undefined
				? baseUrlExpression(type.baseUrl, '$self')
				: asText(json.default);
		return hidden(displayName, name, value);
	}
	const placeholder = json.examples?.[0];
	const hint = json['x-n8n-hint'];
	const base = {
		displayName,
		name,
		...(canBeEmpty(schema) ? {} : { required: true }),
		...(json.description ? { description: json.description } : {}),
		...(hint ? { hint } : {}),
		...(typeof placeholder === 'string' ? { placeholder } : {}),
		...(isSecretField(schema) ? { typeOptions: { password: true } } : {}),
	};
	if (json.enum) {
		const labels = json['x-n8n-options'] ?? {};
		const options = json.enum.flatMap((value) => {
			if (typeof value !== 'string' && typeof value !== 'number') return [];
			const label = labels[String(value)];
			return [
				{
					name: label?.name ?? String(value),
					value,
					...(label?.description ? { description: label.description } : {}),
				},
			];
		});
		const fallback = options[0]?.value ?? '';
		const initial = json.default;
		return {
			...base,
			type: 'options',
			options,
			default: typeof initial === 'string' || typeof initial === 'number' ? initial : fallback,
		};
	}
	switch (json.type) {
		case 'boolean':
			return { ...base, type: 'boolean', default: json.default === true };
		case 'number':
		case 'integer':
			return {
				...base,
				type: 'number',
				default: typeof json.default === 'number' ? json.default : 0,
			};
		default:
			return {
				...base,
				type: 'string',
				default: typeof json.default === 'string' ? json.default : '',
			};
	}
};

const hidden = (
	displayName: string,
	name: string,
	value: string,
	required = false,
): INodeProperties => ({
	displayName,
	name,
	type: 'hidden',
	default: value,
	...(required ? { required: true } : {}),
});

const shownWhenCustom = { displayOptions: { show: { customScopes: [true] } } };

/** The scope fields of the legacy types with editable scopes, e.g. `gmailOAuth2`. */
const editableScopeProperties = (scope: string): INodeProperties[] => [
	{
		displayName: 'Custom Scopes',
		name: 'customScopes',
		type: 'boolean',
		default: false,
		description: 'Define custom scopes',
	},
	{
		displayName:
			'The default scopes needed for the node to work are already set. If you change these the node may not function correctly.',
		name: 'customScopesNotice',
		type: 'notice',
		default: '',
		...shownWhenCustom,
	},
	{
		displayName: 'Enabled Scopes',
		name: 'enabledScopes',
		type: 'string',
		...shownWhenCustom,
		default: scope,
		description: 'Scopes that should be enabled',
	},
	// A scope token has no quote (`SCOPE_TOKEN`), so the text is a safe string literal.
	hidden('Scope', 'scope', `={{$self["customScopes"] ? $self["enabledScopes"] : "${scope}"}}`),
];

/** The hidden fields of an `oAuth2Api` child. n8n core runs the flow from them. */
const oauth2Properties = (grant: OAuth2Grant): INodeProperties[] => {
	const isCode = grant.grant === 'authorizationCode';
	const scope = grant.scope.join(' ');
	// n8n core resolves `$self` in hidden defaults before it runs the flow.
	const endpoint = (url: string) => toExpression(url, '$self');
	return [
		hidden(
			'Grant Type',
			'grantType',
			isCode ? (grant.pkce ? 'pkce' : 'authorizationCode') : 'clientCredentials',
		),
		...(grant.authorizationEndpoint === undefined
			? []
			: [hidden('Authorization URL', 'authUrl', endpoint(grant.authorizationEndpoint), true)]),
		hidden('Access Token URL', 'accessTokenUrl', endpoint(grant.tokenEndpoint), true),
		...(grant.editableScopes ? editableScopeProperties(scope) : [hidden('Scope', 'scope', scope)]),
		...(isCode
			? [
					hidden(
						'Auth URI Query Parameters',
						'authQueryParameters',
						new URLSearchParams(grant.authorizationQuery).toString(),
					),
				]
			: []),
		hidden(
			'Authentication',
			'authentication',
			grant.clientAuth === 'client_secret_post' ? 'body' : 'header',
		),
	];
};

/** The form fields of `userHeader`, as the legacy OpenAI and Anthropic types have them. */
const userHeaderProperties = (): INodeProperties[] => {
	const shown = {
		typeOptions: { ignoreCredentialExpressionResolveError: true },
		displayOptions: { show: { header: [true] } },
		default: '',
	};
	return [
		{ displayName: 'Add Custom Header', name: 'header', type: 'boolean', default: false },
		{ displayName: 'Header Name', name: 'headerName', type: 'string', ...shown },
		{
			displayName: 'Header Value',
			name: 'headerValue',
			type: 'string',
			...shown,
			typeOptions: { ...shown.typeOptions, password: true },
		},
	];
};

const noticeProperty = ({ text, when, deployment }: Notice): INodeProperties => ({
	displayName: text,
	name: 'notice',
	type: 'notice',
	default: '',
	...(when || deployment
		? {
				displayOptions: {
					...(when
						? {
								show: Object.fromEntries(
									Object.entries(when).flatMap(([field, value]) =>
										value === undefined ? [] : [[field, [value]]],
									),
								),
							}
						: {}),
					...(deployment ? { showOnDeployment: deployment } : {}),
				},
			}
		: {}),
});

const rulesOf = (rules: readonly TestRule[]): IAuthenticateRuleResponseSuccessBody[] =>
	rules.flatMap(({ body, message }) =>
		leavesOf(body).map(([path, value]) => ({
			type: 'responseSuccessBody',
			properties: { key: path.join('.'), value, message },
		})),
	);

function testOf(type: AnyCredentialType): { test?: ICredentialTestRequest } {
	const { test, baseUrl } = type;
	if (!test || baseUrl === undefined) return {};
	const request: ICredentialTestRequest['request'] = {
		baseURL: baseUrlExpression(baseUrl),
		url: testPathOf(test),
		...(test.headers ? { headers: test.headers } : {}),
		...('post' in test
			? { method: 'POST', ...(test.body ? { body: mapValues(test.body, toExpression) } : {}) }
			: {}),
		...(test.ignoreHttpStatusErrors ? { ignoreHttpStatusErrors: true } : {}),
	};
	const rules = rulesOf(test.failWhen ?? []);
	return { test: { request, ...(rules.length > 0 ? { rules } : {}) } };
}

type Authenticate = (
	data: ICredentialDataDecryptedObject,
	request: IHttpRequestOptions,
) => Promise<IHttpRequestOptions>;

const TOKEN_KEYS = ['access_token', 'refresh_token', 'id_token'];

/** Settings that n8n and legacy OAuth2 parents store. A compat type does not mark its secrets. */
const SETTING_KEYS = new Set([
	'grantType',
	'authUrl',
	'accessTokenUrl',
	'scope',
	'enabledScopes',
	'authQueryParameters',
	'authentication',
	'allowedHttpRequestDomains',
	'allowedDomains',
	'n8n_expires_at',
]);

/** A compat type does not mark its secrets, so a short value is more likely a setting. */
const MIN_UNMARKED_SECRET = 8;
/** Removing a shorter value removes the same characters from every message. */
const MIN_MARKED_SECRET = 4;

/**
 * The secret values of stored data: the secret fields and the tokens n8n derived from them. For a
 * compat type, each string value that is not a declared plain field or a setting.
 */
function secretValuesOf(type: AnyCredentialType | undefined, raw: Record<string, unknown>) {
	const fields = type?.fields ?? {};
	const plain = (key: string) => key in fields && !isSecretField(fields[key]);
	const scheme = type?.scheme;
	const unmarked = scheme === undefined || scheme.kind === 'compat';
	const named = unmarked
		? Object.keys(raw).filter((key) => !plain(key) && !SETTING_KEYS.has(key))
		: [
				...Object.keys(fields).filter((key) => !plain(key)),
				...(scheme.kind === 'exchange' ? [scheme.token.field] : []),
				// The `oAuth2Api` parent declares the client secret.
				...(scheme.kind === 'oauth2' || scheme.kind === 'oidc' ? ['clientSecret'] : []),
				'headerValue',
			];
	const { oauthTokenData } = raw;
	const tokens = isRecord(oauthTokenData) ? TOKEN_KEYS.map((key) => oauthTokenData[key]) : [];
	const min = unmarked ? MIN_UNMARKED_SECRET : MIN_MARKED_SECRET;
	return [...named.map((key) => raw[key]), ...tokens].filter(
		(value): value is string => typeof value === 'string' && value.length >= min,
	);
}

/** The `user:password` of each basic placement, which a request sends in base64. */
function basicPairsOf(type: AnyCredentialType | undefined, raw: Record<string, unknown>) {
	if (type === undefined) return [];
	const fill = (template: string) =>
		template.replace(PLACEHOLDER, (_, name: string) => storedValue(type, raw, name));
	return placementsOf(type.scheme)
		.flatMap(({ basic }) => (basic ? [`${fill(basic.username)}:${fill(basic.password)}`] : []))
		.filter((pair) => pair.length >= MIN_MARKED_SECRET);
}

/**
 * Removes the secrets of one credential from a text: each secret in raw, base64 and URL-encoded
 * form, then the secret patterns of `@n8n/utils`, which also find tokens n8n refreshed during
 * the run.
 */
export function secretRedactorOf(
	type: AnyCredentialType | undefined,
	raw: unknown,
): (text: string) => string {
	const data = isRecord(raw) ? raw : {};
	const forms = [
		...new Set(
			[...secretValuesOf(type, data), ...basicPairsOf(type, data)].flatMap((value) => [
				value,
				Buffer.from(value).toString('base64'),
				encodeURIComponent(value),
			]),
		),
	].sort((a, b) => b.length - a.length);
	return (text) =>
		scrubSecretsInText(
			forms.reduce((redacted, form) => redacted.split(form).join(DEFAULT_PLACEHOLDER), text),
		);
}

const MAX_REDACTION_DEPTH = 8;

/** A copy of a JSON value with each string redacted. A subtree too deep to walk is withheld. */
export function redactedValue(
	value: unknown,
	redact: (text: string) => string,
	depth = 0,
): unknown {
	if (typeof value === 'string') return redact(value);
	if (value === null || typeof value !== 'object') return value;
	if (depth >= MAX_REDACTION_DEPTH) return DEFAULT_PLACEHOLDER;
	if (Array.isArray(value)) return value.map((entry) => redactedValue(entry, redact, depth + 1));
	// A Buffer or a stream is not JSON, and its bytes are not text.
	if (Object.getPrototypeOf(value) !== Object.prototype) return value;
	return Object.fromEntries(
		Object.entries(value).map(([key, entry]) => [key, redactedValue(entry, redact, depth + 1)]),
	);
}

/** The value at a dot path of a JSON value, e.g. `data.token`. */
const valueAt = (value: unknown, path: string): unknown =>
	path.split('.').reduce<unknown>((at, key) => (isRecord(at) ? at[key] : undefined), value);

/** The placement of `exchange` with `{$token}` as its stored field. */
const withTokenField = ({ apply, token }: Exchange): Placement => {
	const named = (values: Values) =>
		mapValues(values, (value) => value.split('{$token}').join(`{${token.field}}`));
	return { ...apply, headers: named(apply.headers), query: named(apply.query) };
};

/**
 * The `preAuthentication` of `exchange`. n8n core calls it when the token field is empty, has
 * expired, or the API answered 401, and stores the result in the credential.
 */
function tokenRequestOf(type: AnyCredentialType, scheme: Exchange) {
	const { request, token } = scheme;
	return async function preAuthentication(
		this: IHttpRequestHelper,
		raw: ICredentialDataDecryptedObject,
	): Promise<IDataObject> {
		const data = credentialDataOf(type, raw);
		const url = credentialBaseUrlOf({ ...type, baseUrl: request.url }, raw) ?? request.url;
		const hosts = credentialHostsOf(type, raw, {
			surface: type.displayName,
			baseUrl: credentialBaseUrlOf(type, raw),
		});
		const host = new URL(url).hostname.toLowerCase();
		if (hosts !== undefined && !allowsHost(hosts, host)) {
			throw new UserError(`Credential ${type.name}: the token request goes to ${host}`);
		}
		const json = mapValues(request.json, (template) =>
			template.replace(PLACEHOLDER, (_, name: string) => storedValue(type, data, name)),
		);
		// With the user list, the n8n credential helper binds the request to it.
		const bound =
			hosts !== undefined && raw.allowedHttpRequestDomains !== 'domains'
				? { allowedDomains: hosts.join(',') }
				: {};
		const response: unknown = await this.helpers
			.httpRequest({ method: request.method, url, body: json, json: true, ...bound })
			.catch((error: unknown) => {
				const message = error instanceof Error ? error.message : String(error);
				const redact = secretRedactorOf(type, raw);
				throw new OperationalError(
					`Credential ${type.name}: the token request failed: ${redact(message)}`,
				);
			});
		const value = valueAt(response, token.path);
		if (typeof value !== 'string' || value === '') {
			throw new OperationalError(
				`Credential ${type.name}: the token response has no ${token.path}`,
			);
		}
		if (token.expiresIn === undefined) return { [token.field]: value };
		const seconds = Number(valueAt(response, token.expiresIn));
		// An unknown expiry is '': n8n then sends the token again until the API answers 401.
		const expiresAt = seconds > 0 ? String(Date.now() + seconds * 1000) : '';
		return { [token.field]: value, n8n_expires_at: expiresAt };
	};
}

/** The hidden fields that keep a token and its expiry. The password flag marks them as secrets. */
const tokenProperties = ({ token }: Exchange): INodeProperties[] => [
	{
		...hidden('Token', token.field, ''),
		typeOptions: { expirable: true, password: true },
	},
	// Declared, so the defaults step of n8n keeps the value.
	...(token.expiresIn === undefined ? [] : [hidden('Token Expires At', 'n8n_expires_at', '')]),
];

/** A grant that n8n core does not run yet has data, but no n8n credential type. */
const notRunBy = (type: AnyCredentialType, what: string) =>
	new UserError(`Credential ${type.id}: n8n core does not run ${what} yet`);

/**
 * The n8n credential type of a value. A compat type has none: its legacy class stays the
 * definition. Placements become a generic block; what the block cannot express becomes a
 * function the SDK generates.
 */
export function toCredentialType(type: AnyCredentialType): ICredentialType | undefined {
	const { scheme } = type;
	if (scheme.kind === 'compat') return undefined;
	if (scheme.kind === 'oidc') throw notRunBy(type, 'oidc');
	const properties = [
		...(scheme.kind === 'exchange' ? tokenProperties(scheme) : []),
		...Object.entries(type.fields ?? {}).map(([name, schema]) => fieldProperty(type, name, schema)),
		// Declared, so the defaults step of n8n keeps the old value for `renamed`.
		...Object.keys(type.renamed ?? {}).map((name) => hidden(name, name, '')),
		...(placementsOf(scheme).some(({ userHeader }) => userHeader) ? userHeaderProperties() : []),
		...(type.notice ? [noticeProperty(type.notice)] : []),
	];
	const base = {
		name: type.name,
		displayName: type.displayName,
		...(type.documentationUrl ? { documentationUrl: type.documentationUrl } : {}),
		...(type.legacyParent ? { extends: [type.legacyParent] } : {}),
	};
	const test = testOf(type);
	if (scheme.kind === 'none') return { ...base, properties, ...test };
	if (scheme.kind === 'oauth2') {
		if (scheme.grant !== 'authorizationCode' && scheme.grant !== 'clientCredentials') {
			throw notRunBy(type, scheme.grant);
		}
		return {
			...base,
			extends: [type.legacyParent ?? 'oAuth2Api'],
			properties: [...oauth2Properties(scheme), ...properties],
			...test,
		};
	}
	const placed =
		scheme.kind === 'exchange'
			? withTokenField(scheme)
			: scheme.kind === 'apply'
				? scheme
				: undefined;
	const exchange =
		scheme.kind === 'exchange' ? { preAuthentication: tokenRequestOf(type, scheme) } : {};
	// Core reads a generic block directly, so an old field name of `renamed` needs the function.
	if (placed && type.renamed === undefined && isGeneric(type, placed)) {
		return { ...base, properties, ...exchange, authenticate: genericOf(placed), ...test };
	}
	const authenticate: Authenticate = async (data, request) => {
		const stored = credentialDataOf(type, data);
		if (placed) return applyPlacement(type, placed, stored, request);
		if (scheme.kind === 'when') {
			return applyPlacement(type, placementOf(type, scheme, stored), stored, request);
		}
		if (scheme.kind !== 'custom') throw notRunBy(type, scheme.kind);
		const signed = await scheme.sign(stored, request);
		// The request layer checks each redirect hop against `allowedDomains`, so a signer that
		// builds new options must not drop it.
		return request.allowedDomains === undefined
			? signed
			: { ...signed, allowedDomains: request.allowedDomains };
	};
	return { ...base, properties, ...exchange, authenticate, ...test };
}

/** The endpoints of an OpenID provider, from its discovery document. */
export interface OidcEndpoints {
	readonly authorizationEndpoint: string;
	readonly tokenEndpoint: string;
	readonly jwksUri: string;
	readonly userinfoEndpoint?: string;
	readonly revocationEndpoint?: string;
}

/**
 * OpenID Connect Discovery 1.0 §4: reads `/.well-known/openid-configuration` of `issuer` with
 * `get`. The document must name the same issuer (§4.3), and each endpoint must be https.
 */
export async function discoverOidc(
	issuer: string,
	get: (url: string) => Promise<unknown>,
): Promise<OidcEndpoints> {
	if (!issuer.startsWith('https://')) throw new UserError(`OIDC: ${issuer} is not an https URL`);
	const document = await get(`${issuer.replace(/\/+$/, '')}/.well-known/openid-configuration`);
	const member = (name: string) => (isRecord(document) ? document[name] : undefined);
	if (member('issuer') !== issuer) {
		throw new UserError(`OIDC: the discovery document of ${issuer} names another issuer`);
	}
	const url = (name: string) => {
		const value = member(name);
		if (typeof value !== 'string' || !value.startsWith('https://')) {
			throw new UserError(`OIDC: ${name} of ${issuer} is not an https URL`);
		}
		return value;
	};
	const optional = (name: string, key: keyof OidcEndpoints) =>
		member(name) === undefined ? {} : { [key]: url(name) };
	return {
		authorizationEndpoint: url('authorization_endpoint'),
		tokenEndpoint: url('token_endpoint'),
		jwksUri: url('jwks_uri'),
		...optional('userinfo_endpoint', 'userinfoEndpoint'),
		...optional('revocation_endpoint', 'revocationEndpoint'),
	};
}
