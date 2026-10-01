import { isRecord } from '@n8n/utils/is-record';
import {
	UserError,
	type IAuthenticateGeneric,
	type ICredentialDataDecryptedObject,
	type ICredentialTestRequest,
	type ICredentialType,
	type IHttpRequestHelper,
	type IHttpRequestOptions,
	type INodeProperties,
	type IOAuth2Options,
} from 'n8n-workflow';

import type { RunInput } from './define';
import { toProperty } from './properties';
import { obj, str, type JsonSchema, type Schema, type Shape } from './schema';
import { applyDefaults, validate } from './validate';

type NoFields = Record<never, never>;

/** The decrypted data of a credential, each default filled in. */
export type CredentialData<F extends Shape, S extends Shape> = RunInput<F> & RunInput<S>;

/** The hidden fields of an `oAuth2Api` child. n8n core runs the flow from them. */
export interface OAuth2Settings {
	readonly grantType: 'authorizationCode' | 'pkce' | 'clientCredentials';
	readonly authUrl: string;
	readonly accessTokenUrl: string;
	readonly scope: string;
	readonly authQueryParameters: string;
	readonly authentication: 'header' | 'body';
}

/** How the HTTP client signs a request. It is data, so `toCredentialType` can project it. */
export type CredentialScheme =
	| { readonly kind: 'generic'; readonly authenticate: IAuthenticateGeneric }
	| {
			readonly kind: 'oauth2';
			readonly settings: OAuth2Settings;
			/** Refresh options. The HTTP client passes them on each request. */
			readonly options: IOAuth2Options;
	  }
	| { readonly kind: 'custom' }
	/** The credential type stays a legacy class in nodes-base. Only its name is shared. */
	| { readonly kind: 'compat'; readonly options: IOAuth2Options };

/**
 * A credential type as a value. A node lists the value, so `tsc` finds a typo or a missing
 * import, and `run()` gets the typed `fields`. The secrets reach the HTTP client only.
 */
export interface Credential<
	Name extends string = string,
	F extends Shape = Shape,
	S extends Shape = Shape,
> {
	/** The stored type name. Saved credentials refer to it, so it never changes. */
	readonly name: Name;
	readonly displayName: string;
	readonly documentationUrl?: string;
	/** Settings an action may read, e.g. a region or a server URL. */
	readonly fields?: F;
	/** Values only the HTTP client reads. The UI masks them. */
	readonly secrets?: S;
	readonly scheme: CredentialScheme;
	readonly test?: ICredentialTestRequest;
	/** The API base URL of this account, e.g. a GitHub Enterprise server. It replaces the node's. */
	baseUrl?(fields: RunInput<F>): string;
	/** The custom scheme: sign one request. */
	authenticate?(
		data: CredentialData<F, S>,
		request: IHttpRequestOptions,
	): Promise<IHttpRequestOptions>;
	/** The custom scheme: a token exchange. n8n keeps the token in a hidden expirable field. */
	readonly session?: {
		readonly field: string;
		fetch(data: CredentialData<F, S>, helpers: IHttpRequestHelper['helpers']): Promise<string>;
	};
}

export type AnyCredential = Credential<string, Shape, Shape>;

/** What `run()` reads of a credential: its type and its settings, never its secrets. */
export type CredentialFields<C> = C extends Credential<infer Name, infer F, Shape>
	? { readonly type: Name } & RunInput<F>
	: never;

/** The data keys every credential in `C` has, e.g. for a webhook secret field. */
export type CredentialKey<C> = keyof (C extends Credential<string, infer F, infer S>
	? CredentialData<F, S>
	: never) &
	string;

interface CommonSpec<Name extends string, F extends Shape> {
	readonly name: Name;
	readonly displayName: string;
	readonly documentationUrl?: string;
	readonly fields?: F;
	readonly test?: ICredentialTestRequest;
	baseUrl?(fields: RunInput<F>): string;
}

// `baseUrl` is not here: its parameter type depends on the builder (`basic` adds `user`).
const common = <Name extends string, F extends Shape>(
	spec: Omit<CommonSpec<Name, F>, 'baseUrl'>,
) => ({
	name: spec.name,
	displayName: spec.displayName,
	...(spec.documentationUrl ? { documentationUrl: spec.documentationUrl } : {}),
	...(spec.fields ? { fields: spec.fields } : {}),
	...(spec.test ? { test: spec.test } : {}),
});

const secret = (title: string) => str().with({ title });

// n8n resolves `{{$credentials.<field>}}` in the stored data when it signs a request.
const template = (field: string, prefix = '') => `=${prefix}{{$credentials.${field}}}`;

const generic = (properties: IAuthenticateGeneric['properties']): CredentialScheme => ({
	kind: 'generic',
	authenticate: { type: 'generic', properties },
});

/** An API key in a header or a query parameter. The secret field is `apiKey`. */
export function apiKey<const Name extends string, F extends Shape = NoFields>(
	spec: CommonSpec<Name, F> & {
		readonly in?: 'header' | 'query';
		/** The header or query parameter name, e.g. `X-API-Key`. */
		readonly key: string;
		readonly prefix?: string;
		readonly label?: string;
	},
): Credential<Name, F, { apiKey: Schema<string> }> {
	const value = { [spec.key]: template('apiKey', spec.prefix) };
	return {
		...common(spec),
		...(spec.baseUrl ? { baseUrl: spec.baseUrl } : {}),
		secrets: { apiKey: secret(spec.label ?? 'API Key') },
		scheme: generic(spec.in === 'query' ? { qs: value } : { headers: value }),
	};
}

/** A token in `Authorization: Bearer <token>`. The secret field is `token`. */
export function bearer<const Name extends string, F extends Shape = NoFields>(
	spec: CommonSpec<Name, F> & { readonly label?: string },
): Credential<Name, F, { token: Schema<string> }> {
	return {
		...common(spec),
		...(spec.baseUrl ? { baseUrl: spec.baseUrl } : {}),
		secrets: { token: secret(spec.label ?? 'Access Token') },
		scheme: generic({ headers: { Authorization: template('token', 'Bearer ') } }),
	};
}

type BasicUser = { user: Schema<string> };

/** HTTP basic auth. `user` is a field an action may read; `password` is a secret. */
export function basic<const Name extends string, F extends Shape = NoFields>(
	spec: Omit<CommonSpec<Name, F>, 'baseUrl'> & {
		baseUrl?(fields: RunInput<F & BasicUser>): string;
	},
): Credential<Name, F & BasicUser, { password: Schema<string> }> {
	return {
		...common(spec),
		...(spec.baseUrl ? { baseUrl: spec.baseUrl } : {}),
		// `Object.assign` keeps the type `F & { user }`; a spread of an optional `F` drops `F`.
		fields: Object.assign({}, spec.fields, { user: str().with({ title: 'User' }) }),
		secrets: { password: secret('Password') },
		scheme: generic({
			auth: { username: template('user'), password: template('password') },
		}),
	};
}

/**
 * A standard OAuth2 app: config only. n8n core runs the flow (connect button, token exchange,
 * refresh) because the projection extends `oAuth2Api`.
 */
export function oauth2<const Name extends string, F extends Shape = NoFields>(
	spec: CommonSpec<Name, F> & {
		readonly authorizationUrl: string;
		readonly tokenUrl: string;
		readonly scopes?: readonly string[];
		readonly pkce?: boolean;
		readonly grant?: 'authorizationCode' | 'clientCredentials';
		/** How the token request sends the client ID and secret. 'header' is basic auth. */
		readonly clientAuth?: 'header' | 'body';
		/** Extra query of the authorization URL, e.g. `access_type=offline`. */
		readonly authQuery?: string;
		readonly refresh?: {
			/** The statuses that mean an expired token. 401 when not set. */
			readonly onStatus?: number | number[];
			readonly credentialsInBody?: boolean;
		};
	},
): Credential<Name, F, NoFields> {
	const { refresh } = spec;
	return {
		...common(spec),
		...(spec.baseUrl ? { baseUrl: spec.baseUrl } : {}),
		scheme: {
			kind: 'oauth2',
			settings: {
				grantType: spec.pkce ? 'pkce' : (spec.grant ?? 'authorizationCode'),
				authUrl: spec.authorizationUrl,
				accessTokenUrl: spec.tokenUrl,
				scope: (spec.scopes ?? []).join(' '),
				authQueryParameters: spec.authQuery ?? '',
				authentication: spec.clientAuth ?? 'header',
			},
			options: {
				...(refresh?.onStatus !== undefined ? { tokenExpiredStatusCode: refresh.onStatus } : {}),
				...(refresh?.credentialsInBody ? { includeCredentialsOnRefreshOnBody: true } : {}),
			},
		},
	};
}

/**
 * The escape hatch: code signs each request (a signed request, a custom header). `session` is a
 * token exchange: n8n stores its result in a hidden field and runs it again when the field is
 * empty or the token expires.
 */
export function custom<
	const Name extends string,
	F extends Shape = NoFields,
	S extends Shape = NoFields,
	const T extends string = never,
>(
	spec: CommonSpec<Name, F> & {
		readonly secrets?: S;
		authenticate(
			data: CredentialData<F, S> & { readonly [K in T]: string },
			request: IHttpRequestOptions,
		): Promise<IHttpRequestOptions>;
		readonly session?: {
			readonly field: T;
			fetch(data: CredentialData<F, S>, helpers: IHttpRequestHelper['helpers']): Promise<string>;
		};
	},
): Credential<Name, F, S> {
	return {
		...common(spec),
		...(spec.baseUrl ? { baseUrl: spec.baseUrl } : {}),
		...(spec.secrets ? { secrets: spec.secrets } : {}),
		...(spec.session ? { session: spec.session } : {}),
		scheme: { kind: 'custom' },
		authenticate: spec.authenticate,
	};
}

/**
 * An existing n8n credential type, by name, e.g. `gmailOAuth2`. Saved credentials keep working
 * because the legacy class still defines the type. `fields` declares what an action reads; the
 * HTTP client checks them when it reads the credential.
 */
export function compat<const Name extends string, F extends Shape = NoFields>(
	name: Name,
	spec: {
		readonly fields?: F;
		baseUrl?(fields: RunInput<F>): string;
		/** OAuth2 request options of the legacy node, e.g. `{ tokenType: 'Bearer' }`. */
		readonly oauth2?: IOAuth2Options;
	} = {},
): Credential<Name, F, NoFields> {
	return {
		...common({ name, displayName: name, ...spec }),
		...(spec.baseUrl ? { baseUrl: spec.baseUrl } : {}),
		scheme: { kind: 'compat', options: spec.oauth2 ?? {} },
	};
}

const dataSchemaOf = (credential: AnyCredential): JsonSchema => ({
	...obj({ ...credential.fields, ...credential.secrets }).json,
	// Stored data also holds hidden fields and OAuth tokens.
	additionalProperties: true,
});

/** The stored data, each default filled in and checked against the declared fields. */
export function credentialDataOf(
	credential: AnyCredential,
	raw: unknown,
): CredentialData<Shape, Shape> {
	const schema = dataSchemaOf(credential);
	const data = applyDefaults(raw, schema);
	const issues = validate(data, schema, { path: credential.name });
	const isData = (value: unknown): value is CredentialData<Shape, Shape> =>
		isRecord(value) && issues.length === 0;
	if (!isData(data)) throw new UserError(`Credential ${credential.name}: ${issues.join('; ')}`);
	return data;
}

/** The `fields` of the stored data, with the credential type, as `run()` reads them. */
export function credentialFieldsOf(
	credential: AnyCredential,
	raw: unknown,
): CredentialFields<AnyCredential> {
	const data = credentialDataOf(credential, raw);
	const keys = Object.keys(credential.fields ?? {});
	return {
		...Object.fromEntries(Object.entries(data).filter(([key]) => keys.includes(key))),
		type: credential.name,
	};
}

/**
 * The OAuth2 options the HTTP client passes to `httpRequestWithAuthentication`. Without any, it
 * passes none, as the legacy nodes do.
 */
export function oauth2OptionsOf({ scheme }: AnyCredential): IOAuth2Options | undefined {
	const options = scheme.kind === 'oauth2' || scheme.kind === 'compat' ? scheme.options : {};
	return Object.keys(options).length > 0 ? options : undefined;
}

const fieldProperties = (shape: Shape | undefined, password: boolean): INodeProperties[] =>
	Object.entries(shape ?? {}).map(([name, schema]) => ({
		...toProperty(name, schema),
		...(password ? { typeOptions: { password: true } } : {}),
	}));

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

const oauth2Properties = (settings: OAuth2Settings): INodeProperties[] => [
	hidden('Grant Type', 'grantType', settings.grantType),
	hidden('Authorization URL', 'authUrl', settings.authUrl, true),
	hidden('Access Token URL', 'accessTokenUrl', settings.accessTokenUrl, true),
	hidden('Scope', 'scope', settings.scope),
	hidden('Auth URI Query Parameters', 'authQueryParameters', settings.authQueryParameters),
	hidden('Authentication', 'authentication', settings.authentication),
];

/**
 * The n8n credential type of a credential value. A compat credential has none: its legacy class
 * stays the definition.
 */
export function toCredentialType(credential: AnyCredential): ICredentialType | undefined {
	const { scheme, session } = credential;
	if (scheme.kind === 'compat') return undefined;
	const base = {
		name: credential.name,
		displayName: credential.displayName,
		...(credential.documentationUrl ? { documentationUrl: credential.documentationUrl } : {}),
	};
	const properties = [
		...fieldProperties(credential.fields, false),
		...fieldProperties(credential.secrets, true),
	];
	const test = credential.test ? { test: credential.test } : {};
	switch (scheme.kind) {
		case 'oauth2':
			return {
				...base,
				extends: ['oAuth2Api'],
				properties: [...oauth2Properties(scheme.settings), ...properties],
			};
		case 'generic':
			return { ...base, properties, authenticate: scheme.authenticate, ...test };
		case 'custom': {
			const { authenticate } = credential;
			return {
				...base,
				properties: [
					...properties,
					...(session
						? [{ ...hidden(session.field, session.field, ''), typeOptions: { expirable: true } }]
						: []),
				],
				...(authenticate
					? {
							authenticate: async (
								data: ICredentialDataDecryptedObject,
								request: IHttpRequestOptions,
							) => await authenticate(credentialDataOf(credential, data), request),
						}
					: {}),
				...(session
					? {
							async preAuthentication(
								this: IHttpRequestHelper,
								data: ICredentialDataDecryptedObject,
							) {
								const token = await session.fetch(credentialDataOf(credential, data), this.helpers);
								return { [session.field]: token };
							},
						}
					: {}),
				...test,
			};
		}
	}
}
