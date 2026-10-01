import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
} from 'n8n-workflow';

import {
	obj,
	type AnySchema,
	type Infer,
	type JsonSchema,
	type ObjectOf,
	type Schema,
	type Shape,
} from './schema';

/** The integration identity: name, credentials, and base URL shared by its actions. */
export interface NodeDefinition {
	/** Short id, the first segment of every action id: `notion`. */
	readonly id: string;
	readonly displayName: string;
	/** Credential types any action of this node accepts. */
	readonly credentials: readonly string[];
	readonly baseUrl?: string;
	readonly icon?: string;
	/** The node also runs without a credential (a public HTTP API). */
	readonly authOptional?: boolean;
}

export const defineNode = <const N extends NodeDefinition>(node: N): N => node;

/** An n8n credential type. `defineCredential` builds one. */
export type CredentialDefinition = ICredentialType;

export interface CredentialField {
	readonly name: string;
	readonly displayName: string;
	readonly type: 'string';
	readonly typeOptions?: { readonly password?: boolean };
	readonly default?: string;
	readonly required?: boolean;
	readonly description?: string;
}

export interface CredentialSpec {
	/** The credential type a node lists in `credentials`, e.g. `todoApi`. */
	readonly name: string;
	readonly displayName: string;
	readonly documentationUrl?: string;
	readonly properties: readonly CredentialField[];
	/** Header and query values are templates, e.g. `'=Bearer {{$credentials.apiKey}}'`. */
	readonly authenticate:
		| {
				readonly headers?: Readonly<Record<string, string>>;
				readonly qs?: Readonly<Record<string, string>>;
		  }
		| ((
				credentials: ICredentialDataDecryptedObject,
				request: IHttpRequestOptions,
		  ) => Promise<IHttpRequestOptions>);
	readonly test?: ICredentialTestRequest;
}

export function defineCredential(spec: CredentialSpec): CredentialDefinition {
	const { authenticate } = spec;
	return {
		name: spec.name,
		displayName: spec.displayName,
		...(spec.documentationUrl ? { documentationUrl: spec.documentationUrl } : {}),
		properties: spec.properties.map((field) => ({
			...field,
			typeOptions: { ...field.typeOptions },
			default: field.default ?? '',
		})),
		authenticate:
			typeof authenticate === 'function'
				? authenticate
				: {
						type: 'generic',
						properties: { headers: { ...authenticate.headers }, qs: { ...authenticate.qs } },
					},
		...(spec.test ? { test: spec.test } : {}),
	};
}

/** What the action does to the item stream. */
export interface ActionFlow {
	readonly effect: 'read' | 'write' | 'transform';
	readonly cardinality: 'per-item' | '1:N' | 'N:1';
	/** `merge` keeps the input item's fields; `replace` emits only `output`. */
	readonly passthrough: 'replace' | 'merge';
	readonly idempotent?: boolean;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';

export interface HttpRequest {
	readonly method?: HttpMethod;
	/** Absolute URL. Use `path` for a URL under the node's `baseUrl`. */
	readonly url?: string;
	readonly path?: string;
	readonly query?: Readonly<Record<string, string | number | boolean | undefined>>;
	readonly headers?: Readonly<Record<string, string>>;
	readonly body?: unknown;
	/** Return `{ body, headers, statusCode }` instead of the body. */
	readonly fullResponse?: boolean;
}

/** An HTTP client with the node's credential already applied. A non-2xx response throws an `HttpError`. */
export interface Http {
	request(request: HttpRequest): Promise<unknown>;
}

/** The error `http.request` throws for a non-2xx response. */
export interface HttpError extends Error {
	readonly status: number;
	/** Header names are lower case, e.g. `retry-after`. */
	readonly headers: Readonly<Record<string, string>>;
	readonly body: unknown;
}

// A property check, not `instanceof`: a frozen bundle has its own copy of the SDK.
export const isHttpError = (error: unknown): error is HttpError =>
	error instanceof Error &&
	'status' in error &&
	typeof error.status === 'number' &&
	'headers' in error &&
	typeof error.headers === 'object' &&
	error.headers !== null &&
	'body' in error;

type DefaultedKeys<S extends Shape> = {
	[K in keyof S]: S[K] extends Schema<unknown, true, true> ? K : never;
}[keyof S];

/** The input `run()` gets. n8n fills in each default, so a field with `.default(v)` is always set. */
export type RunInput<S extends Shape> = ObjectOf<S> & { [K in DefaultedKeys<S>]: Infer<S[K]> };

export interface RunContext<Input, Output> {
	/** Parameters for the current item, expressions resolved and validated. */
	readonly input: Input;
	readonly http: Http;
	/** Emit one output item for the current input item. */
	emit(item: Output): void;
}

/** A field of the resource an action reads (a Notion property, a sheet column), as a host lookup lists it. */
export interface ResourceField {
	readonly name: string;
	readonly value: string | number | boolean;
}

export interface ActionDefinition<S extends Shape, O extends AnySchema> {
	readonly node: NodeDefinition;
	/** `<node>.<resource>.<operation>`, e.g. `notion.databasePage.getAll`. */
	readonly id: string;
	/** Integer major, 1 when omitted. A frozen version never changes: any change needs a new one. */
	readonly version?: number;
	/** The label users pick, e.g. "Get many database pages". */
	readonly action: string;
	/** At most 120 characters. */
	readonly summary: string;
	readonly flow: ActionFlow;
	/** Credential types this action accepts, when they differ from the node's. */
	readonly credentials?: readonly string[];
	readonly input: S;
	readonly output: O;
	/**
	 * Pure hatch: the output shape for these parameters (fields a filter guarantees, fields a
	 * mapping creates). Leaves other than discriminators may still be expression strings.
	 */
	deriveOutput?(input: ObjectOf<S>): JsonSchema;
	/**
	 * Pure hatch: the output shape from the fields of the resource these parameters name.
	 * `method` names a lookup the host runs with the node's credential. Without fields, the host
	 * keeps `deriveOutput`.
	 */
	readonly resourceOutput?: {
		readonly method: string;
		toOutput(fields: readonly ResourceField[], input: ObjectOf<S>): JsonSchema;
	};
	/** Runs once per input item; emit one or more output items. */
	run(context: RunContext<RunInput<S>, Infer<O>>): Promise<void>;
}

export interface Action<S extends Shape = Shape, O extends AnySchema = AnySchema>
	extends ActionDefinition<S, O> {
	readonly version: number;
	readonly inputSchema: JsonSchema;
	readonly credentialTypes: readonly string[];
}

export function defineAction<S extends Shape, O extends AnySchema>(
	definition: ActionDefinition<S, O>,
): Action<S, O> {
	return {
		...definition,
		version: definition.version ?? 1,
		inputSchema: obj(definition.input).json,
		credentialTypes: definition.credentials ?? definition.node.credentials,
	};
}

/** The JSON document agents and tools read. Execution details are never part of it. */
export interface ContractDocument {
	readonly id: string;
	readonly version: number;
	readonly node: string;
	readonly action: string;
	readonly summary: string;
	readonly flow: ActionFlow;
	readonly credentials: readonly string[];
	readonly input: JsonSchema;
	readonly output: JsonSchema;
}

export const toContract = (action: Action): ContractDocument => ({
	id: action.id,
	version: action.version,
	node: action.node.id,
	action: action.action,
	summary: action.summary,
	flow: action.flow,
	credentials: action.credentialTypes,
	input: action.inputSchema,
	output: action.output.json,
});

function hints(schema: JsonSchema): string[] {
	const children = [
		...Object.values(schema.properties ?? {}),
		...(schema.items ? [schema.items] : []),
		...(schema.oneOf ?? []),
		...(schema.anyOf ?? []),
	];
	return [...(schema['x-n8n-hint'] ? [schema['x-n8n-hint']] : []), ...children.flatMap(hints)];
}

/** Prose budgets from the contract format: summary at most 120, each hint at most 80. */
export function lintContract(contract: ContractDocument): string[] {
	return [
		...(contract.summary.length > 120 ? [`${contract.id}: summary is over 120 characters`] : []),
		...[...hints(contract.input), ...hints(contract.output)]
			.filter((hint) => hint.length > 80)
			.map((hint) => `${contract.id}: hint is over 80 characters: ${hint}`),
	];
}
