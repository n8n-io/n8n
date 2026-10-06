/**
 * OpenAPI mapper: the HTTP guest configs of a dereferenced OpenAPI 3.0 or 3.1 document. It maps
 * only what a config expresses, and lists each other operation as skipped, with the reason. The
 * credential is a proposal as data: the user defines the credential type from it.
 */
import { isRecord } from '@n8n/utils/is-record';

import { toContract, type ContractDocument } from '../define';
import { UserError } from '../errors';
import { nodeNameOf } from '../runtime';
import type { JsonSchema } from '../schema';
import { httpGuestActionOf, type HttpGuestConfig } from './http';

/** Where the proposed credential type puts the secret. */
export type CredentialPlacement =
	| { readonly kind: 'header' | 'query'; readonly key: string }
	| { readonly kind: 'bearer' | 'basic' }
	| {
			readonly kind: 'oauth2AuthorizationCode';
			readonly authorizationEndpoint: string;
			readonly tokenEndpoint: string;
			readonly scope: readonly string[];
	  }
	| {
			readonly kind: 'oauth2ClientCredentials';
			readonly tokenEndpoint: string;
			readonly scope: readonly string[];
	  };

/** The credential type that a security scheme of the document proposes. */
export type OpenApiCredential = CredentialPlacement & {
	/** The proposed credential type name, e.g. `customSearchlyApi`. */
	readonly name: string;
};

/** What `mapOpenApi` gives: the node, the credential proposal, the actions and the skipped operations. */
export interface OpenApiMapping {
	readonly node: {
		readonly id: string;
		readonly displayName: string;
		readonly baseUrl: string;
		/** The path parameters that every action of a resource has, by resource. */
		readonly resources: Readonly<Record<string, readonly string[]>>;
	};
	readonly credential?: OpenApiCredential;
	readonly actions: readonly HttpGuestConfig[];
	/** Each operation that no config expresses, e.g. `GET /files/{id}`, with the reason. */
	readonly skipped: ReadonlyArray<{ readonly operation: string; readonly reason: string }>;
}

type Method = NonNullable<NonNullable<HttpGuestConfig['request']>['method']>;

const METHODS: readonly Method[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'];

const PATH_ITEM_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

const isMethod = (value: string): value is Method => METHODS.some((method) => method === value);

const isJsonSchema = (value: unknown): value is JsonSchema => isRecord(value);

const recordAt = (value: unknown, key: string): Record<string, unknown> => {
	const found = isRecord(value) ? value[key] : undefined;
	return isRecord(found) ? found : {};
};

const stringAt = (value: unknown, key: string): string | undefined => {
	const found = isRecord(value) ? value[key] : undefined;
	return typeof found === 'string' ? found : undefined;
};

const listAt = (value: unknown, key: string): readonly unknown[] | undefined => {
	const found = isRecord(value) ? value[key] : undefined;
	return Array.isArray(found) ? found : undefined;
};

/** `List users`, `list_users` and `listUsers` → `listUsers`. Empty when no letter starts it. */
function identifierOf(text: string): string {
	const camel = text
		.normalize('NFKD')
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.split(/[^A-Za-z0-9]+/)
		.filter(Boolean)
		.map((word, index) =>
			index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
		)
		.join('');
	return /^[a-z]/.test(camel) ? camel : '';
}

// Dereference makes a cyclic schema a cyclic object, and canonicalJson would not end on it.
const MAX_DEPTH = 5;
const SUBSCHEMA = ['items', 'additionalProperties', 'not', 'contains'];
const SUBSCHEMA_MAPS = ['properties', 'patternProperties'];
const SUBSCHEMA_LISTS = ['oneOf', 'anyOf', 'allOf', 'prefixItems'];

/** The schema with each subschema past `MAX_DEPTH` replaced with `{}`. */
function cut(schema: unknown, depth = 0): JsonSchema {
	if (!isRecord(schema) || depth > MAX_DEPTH) return {};
	const deeper = (value: unknown) => (isRecord(value) ? cut(value, depth + 1) : value);
	const copy = Object.fromEntries(
		Object.entries(schema).map(([key, value]) => {
			if (SUBSCHEMA.includes(key)) return [key, deeper(value)];
			if (SUBSCHEMA_MAPS.includes(key) && isRecord(value)) {
				return [key, Object.fromEntries(Object.entries(value).map(([k, v]) => [k, deeper(v)]))];
			}
			if (SUBSCHEMA_LISTS.includes(key) && Array.isArray(value)) return [key, value.map(deeper)];
			return [key, value];
		}),
	);
	return isJsonSchema(copy) ? copy : {};
}

/** The names in the `{name}` holes of a path. */
const holesOf = (path: string) =>
	[...path.matchAll(/\{([^}]+)\}/g)].flatMap(([, hole]) => (hole ? [hole] : []));

const escapePointer = (token: string) => token.replace(/~/g, '~0').replace(/\//g, '~1');

const SUMMARY_MAX = 120;

const firstLine = (text: string | undefined) => text?.split('\n')[0]?.trim() ?? '';

/** The contract needs a summary of one sentence that ends with a period. */
const sentenceOf = (text: string) => `${text.replace(/\.$/, '').slice(0, SUMMARY_MAX - 1)}.`;

const describeScheme = (scheme: Record<string, unknown>) =>
	[
		scheme.type,
		scheme.in,
		scheme.scheme,
		...(scheme.type === 'oauth2' ? Object.keys(recordAt(scheme, 'flows')) : []),
	]
		.filter((part) => typeof part === 'string')
		.join(' ');

/** The placement of a security scheme, or why the credential types of the SDK cannot express it. */
function placementOf(key: string, scheme: unknown): CredentialPlacement | string {
	if (!isRecord(scheme)) return `the security scheme ${key} is not defined`;
	const name = stringAt(scheme, 'name');
	if (scheme.type === 'apiKey' && name && (scheme.in === 'header' || scheme.in === 'query')) {
		return { kind: scheme.in, key: name };
	}
	const http = stringAt(scheme, 'scheme')?.toLowerCase();
	if (scheme.type === 'http' && (http === 'bearer' || http === 'basic')) return { kind: http };
	const code = recordAt(recordAt(scheme, 'flows'), 'authorizationCode');
	const client = recordAt(recordAt(scheme, 'flows'), 'clientCredentials');
	const authorizationEndpoint = stringAt(code, 'authorizationUrl');
	const codeToken = stringAt(code, 'tokenUrl');
	const clientToken = stringAt(client, 'tokenUrl');
	if (scheme.type === 'oauth2' && authorizationEndpoint && codeToken) {
		return {
			kind: 'oauth2AuthorizationCode',
			authorizationEndpoint,
			tokenEndpoint: codeToken,
			scope: Object.keys(recordAt(code, 'scopes')),
		};
	}
	if (scheme.type === 'oauth2' && clientToken) {
		return {
			kind: 'oauth2ClientCredentials',
			tokenEndpoint: clientToken,
			scope: Object.keys(recordAt(client, 'scopes')),
		};
	}
	return `the security scheme ${key} (${describeScheme(scheme)}) is not supported`;
}

/** Each alternative of a security requirement list: the names of the schemes it needs together. */
const alternativesOf = (requirements: readonly unknown[]) =>
	requirements.filter(isRecord).map((requirement) => Object.keys(requirement));

/** The credential types of an operation, or why it is skipped. */
function credentialsOf(
	requirements: readonly unknown[],
	schemes: Record<string, unknown>,
	credential: { readonly scheme: string; readonly name: string } | undefined,
): string[] | string {
	const alternatives = alternativesOf(requirements);
	if (alternatives.length === 0) return [];
	if (credential && alternatives.some((keys) => keys.length === 1 && keys[0] === credential.scheme))
		return [credential.name];
	if (alternatives.some((keys) => keys.length === 0)) return [];
	const [keys = []] = alternatives;
	if (keys.length > 1) return `it needs the security schemes ${keys.join(' and ')} together`;
	const key = keys[0] ?? '';
	const placement = placementOf(key, schemes[key]);
	return typeof placement === 'string'
		? placement
		: `it needs the security scheme ${key}, and the node uses ${credential?.scheme ?? 'none'}`;
}

/** The parameters of an operation: those of the path item, unless the operation has the same. */
function parametersOf(pathItem: unknown, operation: unknown): Array<Record<string, unknown>> {
	const own = (listAt(operation, 'parameters') ?? []).filter(isRecord);
	const shared = (listAt(pathItem, 'parameters') ?? [])
		.filter(isRecord)
		.filter((param) => !own.some(({ name, in: at }) => name === param.name && at === param.in));
	return [...shared, ...own];
}

/** The schema of the JSON content, or the media types when none is JSON. */
function jsonSchemaOf(content: Record<string, unknown>): { schema: unknown } | string[] {
	const type = Object.keys(content).find((key) => key.split(';')[0]?.trim() === 'application/json');
	return type === undefined ? Object.keys(content) : { schema: recordAt(content, type).schema };
}

const isObjectSchema = (schema: unknown) =>
	isRecord(schema) && (schema.type === 'object' || isRecord(schema.properties));

const isArraySchema = (schema: unknown) =>
	isRecord(schema) && (schema.type === 'array' || isRecord(schema.items));

const normalized = (name: string) => name.toLowerCase().replace(/[-_]/g, '');

const CURSOR_PARAMS = ['cursor', 'startingafter', 'pagetoken'];
const NEXT_FIELDS = ['nextcursor', 'next', 'nextpagetoken'];
const SIZE_PARAMS = ['perpage', 'limit', 'pagesize'];
const DEFAULT_PAGE_MAX = 100;

type Pages = NonNullable<NonNullable<HttpGuestConfig['list']>['pages']>;

/** The proposed paging of a list, and the query parameters that it sends. */
function pagesOf(
	query: ReadonlyArray<Record<string, unknown>>,
	response: unknown,
	linked: boolean,
): { pages: Pages; sent: string[] } | undefined {
	const find = (names: readonly string[]) =>
		query.find(({ name }) => typeof name === 'string' && names.includes(normalized(name)));
	const named = (param: Record<string, unknown> | undefined) => stringAt(param, 'name') ?? '';
	const sizeParam = find(SIZE_PARAMS);
	const maximum = recordAt(sizeParam, 'schema').maximum;
	const size = sizeParam && {
		size: {
			query: named(sizeParam),
			max: Number.isInteger(maximum) && Number(maximum) >= 1 ? Number(maximum) : DEFAULT_PAGE_MAX,
		},
	};
	const sized = (pages: Pages, sent: Array<Record<string, unknown> | undefined>) => ({
		pages: { ...pages, ...size },
		sent: [...sent, sizeParam].flatMap((param) => (param ? [named(param)] : [])),
	});
	const cursor = find(CURSOR_PARAMS);
	const next = Object.keys(recordAt(response, 'properties')).find((field) =>
		NEXT_FIELDS.includes(normalized(field)),
	);
	const page = find(['page']);
	const offset = find(['offset']);
	if (linked) return sized({ style: 'link' }, []);
	if (cursor && next !== undefined) {
		const send = { query: named(cursor) };
		return sized({ style: 'cursor', next: `/${escapePointer(next)}`, send }, [cursor]);
	}
	if (page) {
		const start = recordAt(page, 'schema').default;
		const send = { query: named(page) };
		return sized(
			{
				style: 'offset',
				unit: 'page',
				send,
				...(Number.isInteger(start) ? { start: Number(start) } : {}),
			},
			[page],
		);
	}
	if (offset)
		return sized({ style: 'offset', unit: 'item', send: { query: named(offset) } }, [offset]);
	return undefined;
}

/** The items pointer of a list response: the whole array, or the one array field of an object. */
function itemsOf(schema: unknown): { items: string; item: unknown } | undefined {
	if (isArraySchema(schema)) return { items: '', item: recordAt(schema, 'items') };
	const arrays = Object.entries(recordAt(schema, 'properties')).filter(([, field]) =>
		isArraySchema(field),
	);
	const [only] = arrays;
	return arrays.length === 1 && only
		? { items: `/${escapePointer(only[0])}`, item: recordAt(only[1], 'items') }
		: undefined;
}

const IGNORED_HEADERS = ['accept', 'content-type', 'authorization'];

interface OperationContext {
	readonly nodeId: string;
	readonly displayName: string;
	readonly baseUrl: string;
	readonly id: string;
	readonly method: Method;
	readonly path: string;
	readonly pathItem: unknown;
	readonly operation: Record<string, unknown>;
	readonly credentials: readonly string[];
}

/** The config of one operation, or why it is skipped. */
function configOf(context: OperationContext): HttpGuestConfig | string {
	const { method, path, operation } = context;
	const parameters = parametersOf(context.pathItem, operation);
	const named = (at: string) => parameters.filter((param) => param.in === at);
	const cookie = named('cookie').find(({ required }) => required === true);
	if (cookie) return `the cookie parameter ${String(cookie.name)} is not supported`;
	const headers = named('header').filter(
		({ name }) => typeof name === 'string' && !IGNORED_HEADERS.includes(name.toLowerCase()),
	);
	const fixedOf = (param: Record<string, unknown>) => {
		const schema = recordAt(param, 'schema');
		const choices = listAt(schema, 'enum');
		const value = schema.default ?? (choices?.length === 1 ? choices[0] : undefined);
		return ['string', 'number', 'boolean'].includes(typeof value) ? String(value) : undefined;
	};
	const unfixed = headers.find((param) => param.required === true && fixedOf(param) === undefined);
	if (unfixed) return `the header ${String(unfixed.name)} needs a value from the user`;
	const fixedHeaders = Object.fromEntries(
		headers.flatMap((param) => {
			const value = fixedOf(param);
			return value === undefined ? [] : [[String(param.name), value]];
		}),
	);

	const body = recordAt(operation, 'requestBody');
	const bodyJson = isRecord(operation.requestBody)
		? jsonSchemaOf(recordAt(body, 'content'))
		: undefined;
	if (Array.isArray(bodyJson)) return `the body is ${bodyJson.join(', ')}, not JSON`;
	const bodySchema = bodyJson?.schema;
	if (bodyJson && !isObjectSchema(bodySchema)) {
		const type = stringAt(bodySchema, 'type');
		return `the JSON body is a top-level ${type ?? 'value'}, not an object`;
	}
	const bodyFields = Object.entries(recordAt(bodySchema, 'properties'));
	if (bodyJson && bodyFields.length === 0) return 'the JSON body has no top-level properties';

	const responses = recordAt(operation, 'responses');
	const success = Object.keys(responses)
		.filter((code) => /^2(\d\d|XX)$/i.test(code))
		.sort()
		.map((code) => recordAt(responses, code))[0];
	const responseJson = success ? jsonSchemaOf(recordAt(success, 'content')) : [];
	const responseSchema = Array.isArray(responseJson) ? undefined : responseJson.schema;
	const listed = itemsOf(responseSchema);
	const linked = Object.keys(recordAt(success, 'headers')).some(
		(name) => name.toLowerCase() === 'link',
	);
	const query = named('query');
	const paging = listed ? pagesOf(query, responseSchema, linked) : undefined;

	const holes = holesOf(path);
	const fieldOf = (param: Record<string, unknown>) => {
		const schema = cut(param.schema);
		const description = stringAt(param, 'description');
		return [
			String(param.name),
			description && !schema.description ? { ...schema, description } : schema,
		] as const;
	};
	const pathFields = [
		...named('path').map(fieldOf),
		...holes
			.filter((hole) => !named('path').some(({ name }) => name === hole))
			.map((hole) => [hole, { type: 'string' } satisfies JsonSchema] as const),
	];
	const queryParams = query.filter(({ name }) => !paging?.sent.includes(String(name)));
	const fields = [
		...pathFields,
		...queryParams.map(fieldOf),
		...bodyFields.map(([name, schema]) => [name, cut(schema)] as const),
	];
	const names = fields.map(([name]) => name);
	const repeated = names.find((name, index) => names.indexOf(name) !== index);
	if (repeated !== undefined) return `two inputs are named ${repeated}`;
	const required = [
		...pathFields.map(([name]) => name),
		...queryParams
			.filter(({ required: needed }) => needed === true)
			.map(({ name }) => String(name)),
		...(body.required === true ? (listAt(bodySchema, 'required') ?? []).map(String) : []),
	];

	const label = firstLine(stringAt(operation, 'summary')) || `${method} ${path}`;
	const contract: ContractDocument = {
		id: context.id,
		version: 1,
		node: context.nodeId,
		nodeDisplayName: context.displayName,
		action: label,
		summary: sentenceOf(firstLine(stringAt(operation, 'description')) || label),
		flow: {
			effect: method === 'GET' || method === 'HEAD' ? 'read' : 'write',
			cardinality: listed ? '1:N' : 'per-item',
			idempotent: ['GET', 'HEAD', 'PUT', 'DELETE'].includes(method),
			passthrough: 'replace',
		},
		credentials: [...context.credentials],
		input: { type: 'object', properties: Object.fromEntries(fields), required },
		output: listed
			? cut(listed.item)
			: isRecord(responseSchema)
				? cut(responseSchema)
				: { type: 'object' },
	};
	const asInput = (entries: ReadonlyArray<readonly [string, unknown]>) =>
		Object.fromEntries(entries.map(([name]) => [name, { input: name }]));
	const request = {
		method,
		path,
		...(queryParams.length > 0 ? { query: asInput(queryParams.map(fieldOf)) } : {}),
		...(Object.keys(fixedHeaders).length > 0 ? { headers: fixedHeaders } : {}),
		...(bodyFields.length > 0 ? { body: asInput(bodyFields) } : {}),
	};
	const draft: HttpGuestConfig = {
		contract,
		node: { displayName: context.displayName },
		baseUrl: context.baseUrl,
		...(listed
			? {
					list: {
						...request,
						response: cut(responseSchema),
						items: listed.items,
						...(paging ? { pages: paging.pages } : {}),
					},
				}
			: { request }),
	};
	// The binding gives the rest of the contract, e.g. `egress` and the `paging` input of a list.
	return { ...draft, contract: toContract(httpGuestActionOf(draft)) };
}

type Outcome =
	| { readonly label: string; readonly reason: string }
	| {
			readonly label: string;
			readonly config: HttpGuestConfig;
			readonly resource: string;
			readonly path: string;
	  };

/** The id, or the id with the lowest number suffix whose n8n node type name is free. */
function freeId(id: string, taken: readonly string[], suffix = 1): string {
	const candidate = suffix === 1 ? id : `${id}${suffix}`;
	return taken.includes(nodeNameOf(candidate)) ? freeId(id, taken, suffix + 1) : candidate;
}

/** The URL of the first server, with the default of each server variable. */
function baseUrlOf(document: Record<string, unknown>): string {
	const [server] = listAt(document, 'servers') ?? [];
	const variables = recordAt(server, 'variables');
	const url = (stringAt(server, 'url') ?? '').replace(
		/\{([^}]+)\}/g,
		(hole, name: string) => stringAt(variables[name], 'default') ?? hole,
	);
	if (!/^https?:\/\/[^{}]+$/.test(url)) {
		throw new UserError(
			`The document needs a first server with an absolute http or https URL, not "${url}"`,
		);
	}
	return url;
}

/**
 * The node, the credential proposal and one HTTP guest config per operation of a dereferenced
 * OpenAPI 3.0 or 3.1 document. An operation that a config cannot express is in `skipped`.
 */
export function mapOpenApi(document: unknown): OpenApiMapping {
	if (!isRecord(document)) throw new UserError('The OpenAPI document must be a JSON object');
	if (document.swagger !== undefined) {
		throw new UserError(
			'Swagger 2.0 is not supported. Convert the document to OpenAPI 3 first, e.g. with swagger2openapi.',
		);
	}
	if (!stringAt(document, 'openapi')?.startsWith('3.')) {
		throw new UserError('The document is not OpenAPI 3.0 or 3.1: it has no "openapi": "3.x" field');
	}
	const title = stringAt(recordAt(document, 'info'), 'title') ?? '';
	const nodeId = identifierOf(title.replace(/\s+api\s*$/i, ''));
	if (nodeId === '')
		throw new UserError('The document needs an info.title that starts with a letter');
	const displayName = title.replace(/\s+api\s*$/i, '').trim();
	const baseUrl = baseUrlOf(document);

	const operations = Object.entries(recordAt(document, 'paths')).flatMap(([path, pathItem]) =>
		Object.entries(isRecord(pathItem) ? pathItem : {})
			.filter(([key, operation]) => PATH_ITEM_METHODS.includes(key) && isRecord(operation))
			.map(([key]) => ({
				path,
				pathItem,
				method: key.toUpperCase(),
				operation: recordAt(pathItem, key),
			})),
	);

	const schemes = recordAt(recordAt(document, 'components'), 'securitySchemes');
	const requirementsOf = (operation: Record<string, unknown>) =>
		listAt(operation, 'security') ?? listAt(document, 'security') ?? [];
	const proposed = operations
		.flatMap(({ operation }) => alternativesOf(requirementsOf(operation)))
		.flatMap((keys) => {
			const [key] = keys;
			const placement = keys.length === 1 && key ? placementOf(key, schemes[key]) : undefined;
			return placement && typeof placement !== 'string' ? [{ scheme: key ?? '', placement }] : [];
		})[0];
	// D16: an instance credential type has a reserved prefix, so no n8n type has its name.
	const credentialName = `custom${nodeId.charAt(0).toUpperCase()}${nodeId.slice(1)}Api`;
	const credential = proposed && { ...proposed.placement, name: credentialName };

	const resourceOf = (operation: Record<string, unknown>) => {
		const [tag] = listAt(operation, 'tags') ?? [];
		return typeof tag === 'string' ? identifierOf(tag) : '';
	};
	const baseIds = operations.map(({ method, path, operation }) => {
		const name =
			identifierOf(stringAt(operation, 'operationId') ?? '') ||
			identifierOf(`${method} ${path}`) ||
			method.toLowerCase();
		return [nodeId, resourceOf(operation), name].filter(Boolean).join('.');
	});
	const ids = baseIds.reduce<string[]>(
		(taken, id) => [...taken, freeId(id, taken.map(nodeNameOf))],
		[],
	);

	const results = operations.map(({ path, pathItem, method, operation }, index): Outcome => {
		const label = `${method} ${path}`;
		if (!isMethod(method)) return { label, reason: `the HTTP guest does not send ${method}` };
		const credentials = credentialsOf(
			requirementsOf(operation),
			schemes,
			proposed && { scheme: proposed.scheme, name: credentialName },
		);
		if (typeof credentials === 'string') return { label, reason: credentials };
		const id = ids[index] ?? '';
		const config = configOf({
			nodeId,
			displayName,
			baseUrl,
			id,
			method,
			path,
			pathItem,
			operation,
			credentials,
		});
		return typeof config === 'string'
			? { label, reason: config }
			: { label, config, resource: resourceOf(operation), path };
	});
	const mapped = results.flatMap((result) => ('config' in result ? [result] : []));
	const resources = Object.fromEntries(
		[...new Set(mapped.map(({ resource }) => resource).filter(Boolean))].map((resource) => {
			const paths = mapped.filter((action) => action.resource === resource).map(({ path }) => path);
			const [first = '', ...rest] = paths;
			return [
				resource,
				holesOf(first).filter((hole) => rest.every((path) => holesOf(path).includes(hole))),
			] as const;
		}),
	);
	return {
		node: { id: nodeId, displayName, baseUrl, resources },
		...(credential ? { credential } : {}),
		actions: mapped.map(({ config, resource }) => {
			const fields = resources[resource] ?? [];
			if (fields.length === 0) return config;
			// The shared fields change the order of the input, so the binding gives the contract again.
			const shared = { ...config, resourceFields: [...fields] };
			return { ...shared, contract: toContract(httpGuestActionOf(shared)) };
		}),
		skipped: results.flatMap((result) =>
			'reason' in result ? [{ operation: result.label, reason: result.reason }] : [],
		),
	};
}
