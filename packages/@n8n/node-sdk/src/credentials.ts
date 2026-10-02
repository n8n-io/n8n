import { isRecord } from '@n8n/utils/is-record';
import {
	UserError,
	type IAuthenticateGeneric,
	type IAuthenticateRuleResponseSuccessBody,
	type ICredentialDataDecryptedObject,
	type ICredentialTestRequest,
	type ICredentialType,
	type IHttpRequestOptions,
	type INodeProperties,
} from 'n8n-workflow';

import { isHostPattern, type RunInput } from './define';
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
	readonly authorizationEndpoint?: string;
	readonly tokenEndpoint: string;
	readonly scope: readonly string[];
	readonly clientAuth: ClientAuth;
	readonly pkce: boolean;
	readonly authorizationQuery: Values;
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
	| NoAuth
	| CustomAuth<F>
	/** The type stays a legacy class in nodes-base. Only its name is shared. */
	| { readonly kind: 'compat' };

interface AuthorizationCodeSpec {
	readonly authorizationEndpoint: `https://${string}`;
	readonly tokenEndpoint: `https://${string}`;
	/** The provider scopes the app asks for at consent. */
	readonly scope?: readonly string[];
	/** Default `client_secret_basic`. */
	readonly clientAuth?: ClientAuth;
	/** PKCE with S256 (RFC 7636). Default `true`. */
	readonly pkce?: boolean;
	/** Extra query parameters of the authorization request, e.g. `{ access_type: 'offline' }`. */
	readonly authorizationQuery?: Values;
}

interface ClientCredentialsSpec {
	readonly tokenEndpoint: `https://${string}`;
	readonly scope?: readonly string[];
	/** Default `client_secret_basic`. */
	readonly clientAuth?: ClientAuth;
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
	/** The OAuth2 grants that n8n core runs, named as in RFC 6749. */
	readonly oauth2: {
		/** RFC 6749 §4.1, with PKCE (RFC 7636) unless `pkce: false`. */
		authorizationCode(spec: AuthorizationCodeSpec): OAuth2Grant;
		/** RFC 6749 §4.4. */
		clientCredentials(spec: ClientCredentialsSpec): OAuth2Grant;
	};
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
}

export type AnyCredentialType = CredentialType<string, Shape>;

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
			}),
			clientCredentials: (spec) => ({
				kind: 'oauth2',
				grant: 'clientCredentials',
				tokenEndpoint: spec.tokenEndpoint,
				scope: spec.scope ?? [],
				clientAuth: spec.clientAuth ?? 'client_secret_basic',
				pkce: false,
				authorizationQuery: {},
			}),
		},
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
	return [
		...(type.hosts ?? [])
			.filter((host) => !isHostPattern(host))
			.map((host) => `${host} is not a host. Use api.example.com or *.example.com.`),
		...unknown(placements.flatMap(templatesOf), (name) => name in fields).map(
			(name) => `{${name}} is not a field`,
		),
		...(typeof baseUrl === 'string' && !/^(https:\/\/|\{)/.test(baseUrl)
			? ['baseUrl must start with https:// or a {field}']
			: []),
		...unknown(typeof baseUrl === 'string' ? [baseUrl] : [], plainField).map(
			(name) => `baseUrl: {${name}} is not a field, or a secret`,
		),
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
	};
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

/** The stored data, each default filled in and checked against the declared fields. */
export function credentialDataOf(type: AnyCredentialType, raw: unknown): CredentialData<Shape> {
	const schema = dataSchemaOf(type);
	const data = applyDefaults(raw, schema);
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

/** The hidden fields of an `oAuth2Api` child. n8n core runs the flow from them. */
const oauth2Properties = (grant: OAuth2Grant): INodeProperties[] => {
	const isCode = grant.grant === 'authorizationCode';
	return [
		hidden(
			'Grant Type',
			'grantType',
			isCode ? (grant.pkce ? 'pkce' : 'authorizationCode') : 'clientCredentials',
		),
		...(grant.authorizationEndpoint === undefined
			? []
			: [hidden('Authorization URL', 'authUrl', grant.authorizationEndpoint, true)]),
		hidden('Access Token URL', 'accessTokenUrl', grant.tokenEndpoint, true),
		hidden('Scope', 'scope', grant.scope.join(' ')),
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

const noticeProperty = ({ text, when }: Notice): INodeProperties => ({
	displayName: text,
	name: 'notice',
	type: 'notice',
	default: '',
	...(when
		? {
				displayOptions: {
					show: Object.fromEntries(
						Object.entries(when).flatMap(([field, value]) =>
							value === undefined ? [] : [[field, [value]]],
						),
					),
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

/**
 * The n8n credential type of a value. A compat type has none: its legacy class stays the
 * definition. Placements become a generic block; what the block cannot express becomes a
 * function the SDK generates.
 */
export function toCredentialType(type: AnyCredentialType): ICredentialType | undefined {
	const { scheme } = type;
	if (scheme.kind === 'compat') return undefined;
	const properties = [
		...Object.entries(type.fields ?? {}).map(([name, schema]) => fieldProperty(type, name, schema)),
		...(placementsOf(scheme).some(({ userHeader }) => userHeader) ? userHeaderProperties() : []),
		...(type.notice ? [noticeProperty(type.notice)] : []),
	];
	const base = {
		name: type.name,
		displayName: type.displayName,
		...(type.documentationUrl ? { documentationUrl: type.documentationUrl } : {}),
	};
	const test = testOf(type);
	if (scheme.kind === 'none') return { ...base, properties, ...test };
	if (scheme.kind === 'oauth2') {
		return {
			...base,
			extends: ['oAuth2Api'],
			properties: [...oauth2Properties(scheme), ...properties],
			...test,
		};
	}
	if (scheme.kind === 'apply' && isGeneric(type, scheme)) {
		return { ...base, properties, authenticate: genericOf(scheme), ...test };
	}
	const authenticate: Authenticate = async (data, request) => {
		const stored = credentialDataOf(type, data);
		if (scheme.kind !== 'custom') {
			return applyPlacement(type, placementOf(type, scheme, stored), stored, request);
		}
		const signed = await scheme.sign(stored, request);
		// The request layer checks each redirect hop against `allowedDomains`, so a signer that
		// builds new options must not drop it.
		return request.allowedDomains === undefined
			? signed
			: { ...signed, allowedDomains: request.allowedDomains };
	};
	return { ...base, properties, authenticate, ...test };
}
