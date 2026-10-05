/**
 * The manifest format of the Node Contract: what freeze writes for each version of an action,
 * trigger, provider or credential. `scripts/spec.ts` writes these schemas to
 * `spec/manifest.schema.json`, and `parseManifest` reads with them.
 */
import { UnexpectedError } from 'n8n-workflow';

import type {
	AnyCredentialType,
	BaseUrlMap,
	BodyMatch,
	CredentialScheme,
	CredentialTest,
	CustomAuth,
	Notice,
} from './credentials';
import type { ActionRuntime, ContractDocument, NativeNode } from './define';
import type { ActionUiDocument, FieldUiDocument } from './properties';
import { Schema, t, type AnySchema, type Infer, type JsonSchema } from './schema';
import { matches } from './validate';
import type { StoreDeprecation, StoreRecord, StoreRevoke, StoreYank } from './store';
import type { Signature, WebhookEndpoint } from './triggers';
import type { NodeContractVersion, VersionManifest } from './version';

const constant = <const V extends string | number | boolean>(value: V) =>
	new Schema<V>({ const: value }, false);

const SINCE_2_5 = { 'x-n8n-since': '2.5.0' } as const satisfies JsonSchema;
const SINCE_2_6 = { 'x-n8n-since': '2.6.0' } as const satisfies JsonSchema;
const SINCE_2_7 = { 'x-n8n-since': '2.7.0' } as const satisfies JsonSchema;

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

const semver = () => t.str().with({ pattern: '^\\d+\\.\\d+\\.\\d+$' });

const nodeContractVersion = () =>
	new Schema<NodeContractVersion>({ type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' }, false);

/** A JSON Schema. The contract format restricts it further, see `lintContract`. */
const jsonSchema = () =>
	new Schema<JsonSchema>({ type: 'object', description: 'A JSON Schema.' }, false);

const hex = () => t.str().with({ pattern: '^[0-9a-f]{64}$' });

const names = () => t.arr(t.str());

const flow = typed<ContractDocument['flow']>()(
	t.obj({
		effect: t.oneOf('read', 'write', 'transform'),
		cardinality: t.oneOf('per-item', '1:N', 'batch'),
		idempotent: t.bool().optional(),
		passthrough: constant('replace'),
	}),
);

const endpoint = typed<WebhookEndpoint>()(
	t.obj({
		method: t.oneOf('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD').optional(),
		path: t.str().optional(),
	}),
);

const signature = typed<Signature>()(
	t.obj({
		algorithm: t.oneOf('sha1', 'sha256', 'sha512'),
		header: t.str(),
		prefix: t.str().optional(),
		encoding: t.oneOf('hex', 'base64').optional(),
		secret: t.union(constant('generated'), t.obj({ credential: t.str() })),
	}),
);

const runtime = typed<ActionRuntime>()(
	t.obj({
		image: t.str().with({ pattern: '@sha256:[0-9a-f]{64}$' }),
		childProcess: t.bool().optional(),
		addons: names().optional(),
	}),
);

const contract = typed<ContractDocument>()(
	t.obj({
		id: t.str(),
		version: t.int().with({ minimum: 1 }),
		node: t.str(),
		nodeDisplayName: t.str(),
		action: t.str(),
		summary: t.str(),
		flow,
		credentials: names(),
		credentialOptional: constant(true).optional(),
		scopes: names().optional(),
		trigger: t.oneOf('webhook', 'poll', 'event', 'manual', 'schedule', 'form').optional(),
		endpoint: endpoint.optional(),
		verify: signature.with(SINCE_2_6).optional(),
		input: jsonSchema(),
		output: jsonSchema(),
		outputs: t
			.union(names().with({ minItems: 1 }), t.obj({ each: t.str(), then: names().optional() }))
			.optional(),
		egress: t.obj({ hosts: names().optional(), fromInput: t.str().optional() }).optional(),
		imports: t.arr(t.oneOf('dataTables', 'code', 'wait', 'inputOf')).optional(),
		inputs: t
			.union(
				names().with({ minItems: 2 }),
				t
					.obj({ count: t.str() })
					.describe('Inputs counted by the integer input field `count`.')
					.with(SINCE_2_6),
			)
			.optional(),
		runtime: runtime
			.describe('The container image the action needs. Absent: web APIs and host imports only.')
			.with(SINCE_2_7)
			.optional(),
	}),
);

/** The `ui` block of a manifest. */
export const actionUiSchema = typed<ActionUiDocument>()(
	t
		.obj({
			order: names().optional(),
			advanced: names().optional(),
			fields: t
				.record(
					typed<FieldUiDocument>()(
						t.obj({
							widget: t.str().optional(),
							config: t.record(t.jsonValue()).optional(),
							placeholder: t.str().optional(),
						}),
					),
				)
				.optional(),
		})
		.describe(
			'The layout and widgets of the n8n form. Not in contractHash; agents and MCP do not read it.',
		),
);

const versionFields = {
	id: t.str(),
	semver: semver(),
	contractHash: hex(),
	bundleHash: hex(),
	contract,
};

/** The manifest of one version of an action, trigger or provider. */
export const versionManifestSchema = typed<VersionManifest>()(
	t
		.obj({
			kind: t.oneOf('action', 'trigger', 'provider').with(SINCE_2_5),
			nodeContract: nodeContractVersion().with(SINCE_2_5),
			sdk: t.str().with(SINCE_2_5).optional(),
			credentials: t
				.arr(t.str().with({ pattern: '^[^@]+@\\d+$' }))
				.describe('`<name>@<major>` of each credential type with a credential manifest.')
				.with(SINCE_2_5)
				.optional(),
			...versionFields,
			ui: actionUiSchema.optional(),
		})
		.with({ title: 'Action, trigger or provider manifest', ...OPEN }),
);

const values = () => t.record(t.str());

const placement = typed<Extract<CredentialScheme, { kind: 'apply' }>>()(
	t.obj({
		kind: constant('apply'),
		headers: values(),
		query: values(),
		defaults: values(),
		basic: t.obj({ username: t.str(), password: t.str() }).optional(),
		userHeader: constant(true).optional(),
	}),
);

/** A `custom` scheme without its code: the code is a bundle for the credential interface. */
export type CredentialSchemeData =
	| Exclude<
			CredentialScheme,
			| CustomAuth
			| {
					/** A compat type has no manifest. */
					readonly kind: 'compat';
			  }
	  >
	| Pick<CustomAuth, 'kind' | 'reason'>;

const scheme = fits<CredentialSchemeData>()(
	t.union(
		placement,
		t.obj({ kind: constant('when'), field: t.str(), cases: t.record(placement) }),
		t.obj({
			kind: constant('oauth2'),
			grant: t.oneOf('authorizationCode', 'clientCredentials'),
			authorizationEndpoint: t.str().optional(),
			tokenEndpoint: t.str(),
			scope: names(),
			clientAuth: t.oneOf('client_secret_basic', 'client_secret_post'),
			pkce: t.bool(),
			authorizationQuery: values(),
			editableScopes: constant(true).optional(),
		}),
		t.obj({
			kind: constant('oauth2'),
			grant: constant('deviceCode'),
			deviceAuthorizationEndpoint: t.str(),
			tokenEndpoint: t.str(),
			scope: names(),
		}),
		t.obj({
			kind: constant('oauth2'),
			grant: constant('jwtBearer'),
			tokenEndpoint: t.str(),
			key: t.str(),
			algorithm: constant('RS256'),
			claims: values(),
			scope: names(),
		}),
		t.obj({
			kind: constant('oauth2'),
			grant: constant('tokenExchange'),
			tokenEndpoint: t.str(),
			subjectToken: t.str(),
			subjectTokenType: t.str(),
			audience: t.str().optional(),
			resource: t.str().optional(),
			scope: names(),
			clientAuth: t.oneOf('client_secret_basic', 'client_secret_post'),
		}),
		t.obj({
			kind: constant('oidc'),
			issuer: t.str(),
			scope: names(),
			clientAuth: t.oneOf('client_secret_basic', 'client_secret_post'),
			pkce: t.bool(),
		}),
		t.obj({
			kind: constant('exchange'),
			request: t.obj({ method: constant('POST'), url: t.str(), json: values() }),
			token: t.obj({ path: t.str(), field: t.str(), expiresIn: t.str().optional() }),
			apply: placement,
		}),
		t.obj({ kind: constant('none') }),
		t.obj({ kind: constant('custom'), reason: t.str() }),
	),
);

const testOptions = {
	headers: values().optional(),
	ignoreHttpStatusErrors: constant(true).optional(),
	failWhen: t
		.arr(
			t.obj({
				body: new Schema<BodyMatch>(
					{ type: 'object', description: 'A JSON body pattern with one value at its end.' },
					false,
				),
				message: t.str(),
			}),
		)
		.optional(),
};

const test = fits<CredentialTest>()(
	t.union(
		t.obj({ get: t.str(), ...testOptions }),
		t.obj({ post: t.str(), body: values().optional(), ...testOptions }),
	),
);

// `when` is a partial record. JSON leaves out a value of `undefined`.
const whenValue = new Schema<string | number | boolean | undefined>(
	t.union(t.str(), t.num(), t.bool()).json,
	false,
);

const notice = fits<Notice>()(
	t.obj({
		text: t.str(),
		when: t.record(whenValue).optional(),
		deployment: t.oneOf('cloud', 'hosted').optional(),
	}),
);

/** The data of one version of a credential type. Only a `custom` scheme has code. */
export interface CredentialManifest {
	/** Marks a credential manifest. */
	readonly kind: 'credential';
	/** `service.scheme`, e.g. `notion.token`. */
	readonly id: string;
	/** The n8n type name. Saved credentials and workflows refer to it. */
	readonly name: string;
	/** `major.minor.patch` of the credential type. Actions pin the major. */
	readonly semver: string;
	/** The lowest Node Contract version that has what the type uses. */
	readonly nodeContract: NodeContractVersion;
	/** The `@n8n/node-sdk` version that froze it, for traceability only. */
	readonly sdk: string;
	/** The type name in the n8n UI. */
	readonly displayName: string;
	/** The n8n docs page of the type. */
	readonly documentationUrl?: string;
	/** The stored fields: secrets are `writeOnly`, hidden fields `readOnly`. */
	readonly fields: JsonSchema;
	/** How n8n signs a request. A `custom` scheme keeps only its `reason`. */
	readonly scheme: CredentialSchemeData;
	/** The API base URL, or one per value of an options field. */
	readonly baseUrl?: string | BaseUrlMap;
	/** More hosts that n8n may send the credential to. */
	readonly hosts?: readonly string[];
	/** The request that tests a credential. */
	readonly test?: CredentialTest;
	/** A text the form shows after the fields. */
	readonly notice?: Notice;
	/** The legacy n8n type this type extends, e.g. `googleOAuth2Api`. */
	readonly legacyParent?: string;
	/** Stored fields with an old name, by old name. */
	readonly renamed?: Readonly<Record<string, string>>;
}

export const credentialManifestSchema = typed<CredentialManifest>()(
	t
		.obj({
			kind: constant('credential'),
			id: t.str().with({ pattern: '^[^.]+\\.[^.]+$' }),
			name: t.str(),
			semver: semver(),
			nodeContract: nodeContractVersion(),
			sdk: t.str(),
			displayName: t.str(),
			documentationUrl: t.str().optional(),
			fields: jsonSchema(),
			scheme,
			baseUrl: t.union(t.str(), t.obj({ on: t.str(), values: values() })).optional(),
			hosts: names().optional(),
			test: test.optional(),
			notice: notice.optional(),
			legacyParent: t.str().optional(),
			renamed: values().optional(),
		})
		.with({ title: 'Credential manifest', ...SINCE_2_5, ...OPEN }),
);

/**
 * The data of one version of a native action or trigger. A legacy node runs it, so it has no
 * bundle and no description of its own: the contract types the parameters and the items of the
 * legacy node.
 */
export interface NativeManifest {
	/** What the version is: an action or a trigger. */
	readonly kind: 'action' | 'trigger';
	/** The contract id, e.g. `webhook.trigger`. */
	readonly id: string;
	/** `major.minor.patch`; the major is `contract.version`. */
	readonly semver: string;
	/** The lowest Node Contract version that has native manifests. */
	readonly nodeContract: NodeContractVersion;
	/** The `@n8n/node-sdk` version that froze it, for traceability only. */
	readonly sdk: string;
	/** `<name>@<major>` of each credential type with a credential manifest. Absent when none has one. */
	readonly credentials?: readonly string[];
	/** The normative hash of `contract`, see `contractHash`. */
	readonly contractHash: string;
	/** The contract document of the version. */
	readonly contract: ContractDocument;
	/** The legacy node that runs the version. */
	readonly native: NativeNode;
	/** The step that answers the caller of a native trigger, e.g. Respond to Webhook. */
	readonly reply?: {
		/** The reply step as an action contract. */
		readonly contract: ContractDocument;
		/** The legacy node of the reply step. */
		readonly native: NativeNode;
		/** The trigger field value that makes the caller wait for the reply. */
		readonly awaits?: {
			/** The trigger field, e.g. `responseMode`. */
			readonly field: string;
			/** The value of the field, e.g. `responseNode`. */
			readonly value: string;
		};
	};
}

const nativeNode = typed<NativeNode>()(t.obj({ type: t.str(), version: t.num() }));

/** The manifest of one version of a native action or trigger. */
export const nativeManifestSchema = typed<NativeManifest>()(
	t
		.obj({
			kind: t.oneOf('action', 'trigger'),
			id: t.str(),
			semver: semver(),
			nodeContract: nodeContractVersion(),
			sdk: t.str(),
			credentials: t.arr(t.str().with({ pattern: '^[^@]+@\\d+$' })).optional(),
			contractHash: hex(),
			contract,
			native: nativeNode,
			reply: t
				.obj({
					contract,
					native: nativeNode,
					awaits: t.obj({ field: t.str(), value: t.str() }).optional(),
				})
				.optional(),
		})
		.with({ title: 'Native action or trigger manifest', ...SINCE_2_5, ...OPEN }),
);

const digest = () => t.str().with({ pattern: '^sha256:[0-9a-f]{64}$' });

const signatures = () => t.arr(t.obj({ key: digest(), sig: t.str() })).optional();

/** One version line of a store index, `index/<id>.ndjson`. It is not part of the Node Contract. */
export const storeRecordSchema = typed<StoreRecord>()(
	t
		.obj({
			id: t.str(),
			version: semver(),
			kind: t.oneOf('action', 'trigger', 'provider', 'credential'),
			nodeContract: nodeContractVersion(),
			manifest: digest(),
			bundle: digest().optional(),
			contractHash: hex().optional(),
			credentials: names().optional(),
			permissions: t.obj({ egress: names(), imports: names() }).optional(),
			native: t.str().optional(),
			name: t.str().optional(),
			fixtures: digest().optional(),
			signatures: signatures(),
			published: t.str().optional(),
		})
		.with(OPEN),
);

/** One status line of a store index: a yank, a revoke or a deprecation. */
export const storeStatusRecordSchema = t.union(
	typed<StoreYank>()(
		t
			.obj({ id: t.str(), yank: semver(), reason: t.str(), at: t.str(), signatures: signatures() })
			.with(OPEN),
	),
	typed<StoreRevoke>()(
		t
			.obj({
				id: t.str(),
				revoke: semver(),
				reason: t.str(),
				at: t.str(),
				signatures: signatures(),
			})
			.with(OPEN),
	),
	typed<StoreDeprecation>()(
		t
			.obj({
				id: t.str(),
				deprecate: t.str().with({ pattern: '^\\d+(\\.\\d+){0,2}$' }),
				message: t.str(),
				use: t.str().optional(),
				at: t.str(),
				signatures: signatures(),
			})
			.with(OPEN),
	),
);

/** `spec/manifest.schema.json`: every manifest that a host reads. */
export const manifestJsonSchema = (version: string) => ({
	$schema: 'https://json-schema.org/draft/2020-12/schema',
	$id: `urn:n8n:node-contract:manifest@${version}`,
	title: 'n8n Node Contract manifest',
	description:
		'Generated from src/manifest.ts by scripts/spec.ts. Do not edit. `x-n8n-since` is the Node Contract version that added a field. The `contract.input` and `contract.output` schemas follow the contract format of the SDK.',
	oneOf: [versionManifestSchema.json, credentialManifestSchema.json, nativeManifestSchema.json],
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
		fields: t.obj(type.fields ?? {}).json,
		scheme:
			typeScheme.kind === 'custom' ? { kind: 'custom', reason: typeScheme.reason } : typeScheme,
		...(type.baseUrl === undefined ? {} : { baseUrl: type.baseUrl }),
		...(type.hosts ? { hosts: type.hosts } : {}),
		...(type.test ? { test: type.test } : {}),
		...(type.notice ? { notice: type.notice } : {}),
		...(type.legacyParent ? { legacyParent: type.legacyParent } : {}),
		...(type.renamed ? { renamed: type.renamed } : {}),
	};
}

/** Reads a credential manifest that freeze wrote. */
export function parseCredentialManifest(text: string): CredentialManifest {
	const value: unknown = JSON.parse(text);
	if (!matches(credentialManifestSchema, value)) {
		throw new UnexpectedError('The credential manifest is not valid');
	}
	return value;
}
