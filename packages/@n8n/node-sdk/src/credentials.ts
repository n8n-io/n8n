import { isRecord } from '@n8n/utils/is-record';
import {
	UserError,
	type IAuthenticateGeneric,
	type ICredentialDataDecryptedObject,
	type ICredentialTestRequest,
	type ICredentialType,
	type IHttpRequestOptions,
	type INodeProperties,
} from 'n8n-workflow';

import { isHostPattern, type RunInput } from './define';
import { toProperty } from './properties';
import { obj, str, type JsonSchema, type Schema, type Shape } from './schema';
import { applyDefaults, validate } from './validate';

type NoFields = Record<never, never>;

/** The decrypted data of a credential type, each default filled in. */
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

/** How n8n signs a request. All kinds but `custom` are data, so `toCredentialType` can project them. */
export type CredentialScheme<F extends Shape = Shape, S extends Shape = Shape> =
	| { readonly kind: 'generic'; readonly authenticate: IAuthenticateGeneric }
	| { readonly kind: 'oauth2'; readonly settings: OAuth2Settings }
	| {
			readonly kind: 'custom';
			/** Signs one request. */
			authenticate(
				data: CredentialData<F, S>,
				request: IHttpRequestOptions,
			): Promise<IHttpRequestOptions>;
	  }
	/** The type stays a legacy class in nodes-base. Only its name is shared. */
	| { readonly kind: 'compat' };

/**
 * One n8n credential type, e.g. `notionApi`. A node lists the value, so `tsc` finds a typo or a
 * missing import. Saved credentials refer to `name`, so it never changes.
 */
export interface CredentialType<
	Name extends string = string,
	F extends Shape = Shape,
	S extends Shape = Shape,
> {
	readonly name: Name;
	readonly displayName: string;
	readonly documentationUrl?: string;
	/** Settings code may read, e.g. a server URL. */
	readonly fields?: F;
	/** Values only n8n reads when it signs a request. The UI masks them. */
	readonly secrets?: S;
	readonly scheme: CredentialScheme<F, S>;
	readonly test?: ICredentialTestRequest;
	/**
	 * The hosts n8n may send this credential to: `api.example.com`, or `*.example.com` for its
	 * subdomains only. The host of `baseUrl` is added. The user's "Allowed HTTP Request Domains"
	 * list adds hosts. A type without hosts and without `baseUrl` keeps the legacy meaning of that
	 * setting.
	 */
	readonly hosts?: readonly string[];
	/** The API base URL of this account, e.g. a GitHub Enterprise server. It replaces the node's. */
	baseUrl?(fields: RunInput<F>): string;
}

export type AnyCredentialType = CredentialType<string, Shape, Shape>;

/** The data keys every type in `T` has, e.g. for a webhook signing secret. */
export type CredentialKey<T> = keyof (T extends CredentialType<string, infer F, infer S>
	? CredentialData<F, S>
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

interface CommonSpec<Name extends string, F extends Shape> {
	readonly name: Name;
	readonly displayName: string;
	readonly documentationUrl?: string;
	readonly fields?: F;
	readonly test?: ICredentialTestRequest;
	readonly hosts?: readonly string[];
	baseUrl?(fields: RunInput<F>): string;
}

const common = <Name extends string, F extends Shape>(spec: CommonSpec<Name, F>) => {
	const invalid = (spec.hosts ?? []).filter((host) => !isHostPattern(host));
	if (invalid.length > 0) {
		throw new UserError(
			`Credential ${spec.name}: ${invalid.join(', ')} is not a host. Use api.example.com or *.example.com.`,
		);
	}
	return {
		name: spec.name,
		displayName: spec.displayName,
		...(spec.documentationUrl ? { documentationUrl: spec.documentationUrl } : {}),
		...(spec.fields ? { fields: spec.fields } : {}),
		...(spec.test ? { test: spec.test } : {}),
		...(spec.hosts ? { hosts: spec.hosts } : {}),
		...(spec.baseUrl ? { baseUrl: spec.baseUrl } : {}),
	};
};

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
): CredentialType<Name, F, { apiKey: Schema<string> }> {
	const value = { [spec.key]: template('apiKey', spec.prefix) };
	return {
		...common(spec),
		secrets: { apiKey: secret(spec.label ?? 'API Key') },
		scheme: generic(spec.in === 'query' ? { qs: value } : { headers: value }),
	};
}

/** A token in `Authorization: Bearer <token>`. The secret field is `token`. */
export function bearer<const Name extends string, F extends Shape = NoFields>(
	spec: CommonSpec<Name, F> & { readonly label?: string },
): CredentialType<Name, F, { token: Schema<string> }> {
	return {
		...common(spec),
		secrets: { token: secret(spec.label ?? 'Access Token') },
		scheme: generic({ headers: { Authorization: template('token', 'Bearer ') } }),
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
		/** The provider scopes the app asks for at consent. */
		readonly scopes?: readonly string[];
		readonly pkce?: boolean;
		readonly grant?: 'authorizationCode' | 'clientCredentials';
		/** How the token request sends the client ID and secret. 'header' is basic auth. */
		readonly clientAuth?: 'header' | 'body';
		/** Extra query of the authorization URL, e.g. `access_type=offline`. */
		readonly authQuery?: string;
	},
): CredentialType<Name, F, NoFields> {
	return {
		...common(spec),
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
		},
	};
}

/** The escape hatch: code signs each request, e.g. a header that depends on the request. */
export function custom<
	const Name extends string,
	F extends Shape = NoFields,
	S extends Shape = NoFields,
>(
	spec: CommonSpec<Name, F> & {
		readonly secrets?: S;
		authenticate(
			data: CredentialData<F, S>,
			request: IHttpRequestOptions,
		): Promise<IHttpRequestOptions>;
	},
): CredentialType<Name, F, S> {
	return {
		...common(spec),
		...(spec.secrets ? { secrets: spec.secrets } : {}),
		scheme: { kind: 'custom', authenticate: spec.authenticate },
	};
}

/**
 * An existing n8n credential type, by name, e.g. `gmailOAuth2`. Saved credentials keep working
 * because the legacy class still defines the type. `fields` declares what code reads; the
 * runtime checks them when it reads the credential.
 */
export function compat<const Name extends string, F extends Shape = NoFields>(
	name: Name,
	spec: {
		readonly fields?: F;
		readonly hosts?: readonly string[];
		baseUrl?(fields: RunInput<F>): string;
	} = {},
): CredentialType<Name, F, NoFields> {
	return { ...common({ name, displayName: name, ...spec }), scheme: { kind: 'compat' } };
}

const dataSchemaOf = (type: AnyCredentialType): JsonSchema => ({
	...obj({ ...type.fields, ...type.secrets }).json,
	// Stored data also holds hidden fields and OAuth tokens.
	additionalProperties: true,
});

/** The stored data, each default filled in and checked against the declared fields. */
export function credentialDataOf(
	type: AnyCredentialType,
	raw: unknown,
): CredentialData<Shape, Shape> {
	const schema = dataSchemaOf(type);
	const data = applyDefaults(raw, schema);
	const issues = validate(data, schema, { path: type.name });
	const isData = (value: unknown): value is CredentialData<Shape, Shape> =>
		isRecord(value) && issues.length === 0;
	if (!isData(data)) throw new UserError(`Credential ${type.name}: ${issues.join('; ')}`);
	return data;
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
 * The n8n credential type of a value. A compat type has none: its legacy class stays the
 * definition.
 */
export function toCredentialType(type: AnyCredentialType): ICredentialType | undefined {
	const { scheme } = type;
	if (scheme.kind === 'compat') return undefined;
	const base = {
		name: type.name,
		displayName: type.displayName,
		...(type.documentationUrl ? { documentationUrl: type.documentationUrl } : {}),
	};
	const properties = [
		...fieldProperties(type.fields, false),
		...fieldProperties(type.secrets, true),
	];
	const test = type.test ? { test: type.test } : {};
	switch (scheme.kind) {
		case 'oauth2':
			return {
				...base,
				extends: ['oAuth2Api'],
				properties: [...oauth2Properties(scheme.settings), ...properties],
				...test,
			};
		case 'generic':
			return { ...base, properties, authenticate: scheme.authenticate, ...test };
		case 'custom':
			return {
				...base,
				properties,
				// The request layer checks each redirect hop against `allowedDomains`, so a signer
				// that builds new options must not drop it.
				authenticate: async (
					data: ICredentialDataDecryptedObject,
					request: IHttpRequestOptions,
				) => {
					const signed = await scheme.authenticate(credentialDataOf(type, data), request);
					return request.allowedDomains === undefined
						? signed
						: { ...signed, allowedDomains: request.allowedDomains };
				},
				...test,
			};
	}
}
