/**
 * The manifest format of the Node Contract: what freeze writes for each version of an action,
 * trigger, provider or credential. `scripts/spec.ts` writes these schemas to
 * `spec/manifest.schema.json`, and `parseManifest` reads with them.
 */
import type { INodeTypeDescription } from 'n8n-workflow';

import type {
	AnyCredentialType,
	BaseUrlMap,
	BodyMatch,
	CredentialScheme,
	CredentialTest,
	CustomAuth,
	Notice,
} from './credentials';
import type { ContractDocument } from './define';
import {
	arr,
	bool,
	int,
	num,
	obj,
	oneOf,
	record,
	Schema,
	str,
	union,
	type AnySchema,
	type Infer,
	type JsonSchema,
} from './schema';
import type { NodeContractVersion, VersionManifest } from './version';

const constant = <const V extends string | number | boolean>(value: V) =>
	new Schema<V>({ const: value }, false);

const SINCE_2_5 = { 'x-n8n-since': '2.5.0' } as const satisfies JsonSchema;

/**
 * A reader ignores a top-level field it does not know, so a newer SDK can add an annotation.
 * A field that changes what a host must do comes with a higher `nodeContract`.
 */
const OPEN = { additionalProperties: true } as const satisfies JsonSchema;

/** Keys of `T` that `S` lacks, and keys of `S` that `T` lacks. */
type KeyDrift<T, S> = Exclude<keyof T, keyof Infer<S>> | Exclude<keyof Infer<S>, keyof T>;

/** The schema of a TS type. `tsc` fails when a value of `T` does not fit the schema. */
const fits =
	<T>() =>
	<S extends AnySchema>(
		schema: S & ([T] extends [Infer<S>] ? unknown : { readonly mismatch: T }),
	) =>
		new Schema<T>(schema.json, false);

/** `fits`, and `tsc` also fails when the keys of `T` and of the schema differ. */
const typed =
	<T>() =>
	<S extends AnySchema>(
		schema: S &
			([KeyDrift<T, S>] extends [never] ? unknown : { readonly missing: KeyDrift<T, S> }) &
			([T] extends [Infer<S>] ? unknown : { readonly mismatch: T }),
	) =>
		new Schema<T>(schema.json, false);

const semver = () => str().with({ pattern: '^\\d+\\.\\d+\\.\\d+$' });

const nodeContractVersion = () =>
	new Schema<NodeContractVersion>({ type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' }, false);

/** A JSON Schema. The contract format restricts it further, see `lintContract`. */
const jsonSchema = () =>
	new Schema<JsonSchema>({ type: 'object', description: 'A JSON Schema.' }, false);

const hex = () => str().with({ pattern: '^[0-9a-f]{64}$' });

const names = () => arr(str());

const flow = typed<ContractDocument['flow']>()(
	obj({
		effect: oneOf('read', 'write', 'transform'),
		cardinality: oneOf('per-item', '1:N', 'batch'),
		idempotent: bool().optional(),
		passthrough: constant('replace'),
	}),
);

const contract = typed<ContractDocument>()(
	obj({
		id: str(),
		version: int().with({ minimum: 1 }),
		node: str(),
		action: str(),
		summary: str(),
		flow,
		credentials: names(),
		scopes: names().optional(),
		trigger: oneOf('webhook', 'poll', 'event', 'manual', 'schedule', 'form').optional(),
		input: jsonSchema(),
		output: jsonSchema(),
		outputs: union(
			names().with({ minItems: 1 }),
			obj({ each: str(), then: names().optional() }),
		).optional(),
		egress: obj({ hosts: names().optional(), fromInput: str().optional() }).optional(),
		imports: arr(oneOf('dataTables', 'code', 'wait', 'inputOf')).optional(),
		inputs: names().with({ minItems: 2 }).optional(),
	}),
);

const versionFields = {
	id: str(),
	semver: semver(),
	contractHash: hex(),
	bundleHash: hex(),
	contract,
	description: new Schema<INodeTypeDescription>(
		{ type: 'object', description: 'The n8n node description at freeze time.' },
		false,
	),
};

/** The manifest of one version of an action, trigger or provider. */
export const versionManifestSchema = typed<VersionManifest>()(
	obj({
		kind: oneOf('action', 'trigger', 'provider').with(SINCE_2_5),
		nodeContract: nodeContractVersion().with(SINCE_2_5),
		sdk: str().with(SINCE_2_5).optional(),
		credentials: arr(str().with({ pattern: '^[^@]+@\\d+$' }))
			.describe('`<name>@<major>` of each credential type with a credential manifest.')
			.with(SINCE_2_5)
			.optional(),
		...versionFields,
	}).with({ title: 'Action, trigger or provider manifest', ...OPEN }),
);

/** A manifest that freeze wrote before 2.5.0: `apiVersion`, or `abi` before that. */
export const legacyManifestSchema = union(
	obj({ apiVersion: str().with({ pattern: '^n8n:action@\\d+\\.\\d+\\.\\d+$' }), ...versionFields }),
	obj({ abi: union(constant(1), constant(2)), ...versionFields }),
).with({ title: 'Action manifest before 2.5.0. A host still reads it.' });

const values = () => record(str());

const placement = typed<Extract<CredentialScheme, { kind: 'apply' }>>()(
	obj({
		kind: constant('apply'),
		headers: values(),
		query: values(),
		defaults: values(),
		basic: obj({ username: str(), password: str() }).optional(),
		userHeader: constant(true).optional(),
	}),
);

/** A `custom` scheme without its code: the code is a bundle for the credential interface. */
export type CredentialSchemeData =
	| Exclude<CredentialScheme, CustomAuth | { readonly kind: 'compat' }>
	| Pick<CustomAuth, 'kind' | 'reason'>;

const scheme = fits<CredentialSchemeData>()(
	union(
		placement,
		obj({ kind: constant('when'), field: str(), cases: record(placement) }),
		obj({
			kind: constant('oauth2'),
			grant: oneOf('authorizationCode', 'clientCredentials'),
			authorizationEndpoint: str().optional(),
			tokenEndpoint: str(),
			scope: names(),
			clientAuth: oneOf('client_secret_basic', 'client_secret_post'),
			pkce: bool(),
			authorizationQuery: values(),
			editableScopes: constant(true).optional(),
		}),
		obj({
			kind: constant('oauth2'),
			grant: constant('deviceCode'),
			deviceAuthorizationEndpoint: str(),
			tokenEndpoint: str(),
			scope: names(),
		}),
		obj({
			kind: constant('oauth2'),
			grant: constant('jwtBearer'),
			tokenEndpoint: str(),
			key: str(),
			algorithm: constant('RS256'),
			claims: values(),
			scope: names(),
		}),
		obj({
			kind: constant('oauth2'),
			grant: constant('tokenExchange'),
			tokenEndpoint: str(),
			subjectToken: str(),
			subjectTokenType: str(),
			audience: str().optional(),
			resource: str().optional(),
			scope: names(),
			clientAuth: oneOf('client_secret_basic', 'client_secret_post'),
		}),
		obj({
			kind: constant('oidc'),
			issuer: str(),
			scope: names(),
			clientAuth: oneOf('client_secret_basic', 'client_secret_post'),
			pkce: bool(),
		}),
		obj({
			kind: constant('exchange'),
			request: obj({ method: constant('POST'), url: str(), json: values() }),
			token: obj({ path: str(), field: str(), expiresIn: str().optional() }),
			apply: placement,
		}),
		obj({ kind: constant('none') }),
		obj({ kind: constant('custom'), reason: str() }),
	),
);

const testOptions = {
	headers: values().optional(),
	ignoreHttpStatusErrors: constant(true).optional(),
	failWhen: arr(
		obj({
			body: new Schema<BodyMatch>(
				{ type: 'object', description: 'A JSON body pattern with one value at its end.' },
				false,
			),
			message: str(),
		}),
	).optional(),
};

const test = fits<CredentialTest>()(
	union(
		obj({ get: str(), ...testOptions }),
		obj({ post: str(), body: values().optional(), ...testOptions }),
	),
);

// `when` is a partial record. JSON leaves out a value of `undefined`.
const whenValue = new Schema<string | number | boolean | undefined>(
	union(str(), num(), bool()).json,
	false,
);

const notice = fits<Notice>()(
	obj({
		text: str(),
		when: record(whenValue).optional(),
		deployment: oneOf('cloud', 'hosted').optional(),
	}),
);

/** The data of one version of a credential type. Only a `custom` scheme has code. */
export interface CredentialManifest {
	readonly kind: 'credential';
	/** `service.scheme`, e.g. `notion.token`. */
	readonly id: string;
	/** The n8n type name. Saved credentials and workflows refer to it. */
	readonly name: string;
	readonly semver: string;
	readonly nodeContract: NodeContractVersion;
	readonly sdk: string;
	readonly displayName: string;
	readonly documentationUrl?: string;
	/** The stored fields: secrets are `writeOnly`, hidden fields `readOnly`. */
	readonly fields: JsonSchema;
	readonly scheme: CredentialSchemeData;
	readonly baseUrl?: string | BaseUrlMap;
	readonly hosts?: readonly string[];
	readonly test?: CredentialTest;
	readonly notice?: Notice;
}

export const credentialManifestSchema = typed<CredentialManifest>()(
	obj({
		kind: constant('credential'),
		id: str().with({ pattern: '^[^.]+\\.[^.]+$' }),
		name: str(),
		semver: semver(),
		nodeContract: nodeContractVersion(),
		sdk: str(),
		displayName: str(),
		documentationUrl: str().optional(),
		fields: jsonSchema(),
		scheme,
		baseUrl: union(str(), obj({ on: str(), values: values() })).optional(),
		hosts: names().optional(),
		test: test.optional(),
		notice: notice.optional(),
	}).with({ title: 'Credential manifest', ...SINCE_2_5, ...OPEN }),
);

/** `spec/manifest.schema.json`: every manifest that a host reads. */
export const manifestJsonSchema = (version: string) => ({
	$schema: 'https://json-schema.org/draft/2020-12/schema',
	$id: `urn:n8n:node-contract:manifest@${version}`,
	title: 'n8n Node Contract manifest',
	description:
		'Generated from src/manifest.ts by scripts/spec.ts. Do not edit. `x-n8n-since` is the Node Contract version that added a field. The `contract.input` and `contract.output` schemas follow the contract format of the SDK.',
	oneOf: [versionManifestSchema.json, credentialManifestSchema.json, legacyManifestSchema.json],
});

/** The credential manifest that freeze writes. A compat type has none. */
export function credentialManifestOf(
	type: AnyCredentialType,
	sdk: string,
): CredentialManifest | undefined {
	const { scheme: typeScheme } = type;
	if (typeScheme.kind === 'compat' || type.semver === undefined) return undefined;
	return {
		kind: 'credential',
		id: type.id,
		name: type.name,
		semver: type.semver,
		nodeContract: '2.5.0',
		sdk,
		displayName: type.displayName,
		...(type.documentationUrl ? { documentationUrl: type.documentationUrl } : {}),
		fields: obj(type.fields ?? {}).json,
		scheme:
			typeScheme.kind === 'custom' ? { kind: 'custom', reason: typeScheme.reason } : typeScheme,
		...(type.baseUrl === undefined ? {} : { baseUrl: type.baseUrl }),
		...(type.hosts ? { hosts: type.hosts } : {}),
		...(type.test ? { test: type.test } : {}),
		...(type.notice ? { notice: type.notice } : {}),
	};
}
