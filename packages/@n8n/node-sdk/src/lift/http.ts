/**
 * HTTP lift: the action of a declarative HTTP config, which the generic HTTP guest runs. The
 * config holds the contract document of the manifest and the request; it holds no code. The
 * action has the same `request` or `list` binding as an action written in TS.
 */
import { isRecord } from '@n8n/utils/is-record';

import { compat, credential, type AnyCredentialType } from '../credentials';
import {
	defineNode,
	toContract,
	type Action,
	type ContractDocument,
	type NodeDefinition,
	type Pages,
} from '../define';
import { UserError } from '../errors';
import { contractDocumentSchema } from '../manifest';
import { canonicalJson, Schema, t, type Infer, type JsonSchema, type Shape } from '../schema';
import { matches } from '../validate';
import { validate } from '../validator';

const pointer = () =>
	t
		.str()
		.with({ pattern: '^(/([^~]|~[01])*)*$' })
		.hint('A JSON Pointer (RFC 6901), e.g. /results; empty for the whole body');

const requestValue = () =>
	t.union(t.str(), t.num(), t.bool(), t.obj({ input: t.str().with({ minLength: 1 }) }));

const pageParam = () =>
	t.union(
		t.obj({ query: t.str().with({ minLength: 1 }) }),
		t.obj({ body: t.str().with({ minLength: 1 }) }),
	);

const pageSize = () =>
	t.union(
		t.obj({ query: t.str().with({ minLength: 1 }), max: t.int().with({ minimum: 1 }) }),
		t.obj({ body: t.str().with({ minLength: 1 }), max: t.int().with({ minimum: 1 }) }),
	);

const request = {
	method: t.oneOf('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD').optional(),
	path: t.str().with({ pattern: '^/' }),
	query: t.record(requestValue()).optional(),
	headers: t.record(t.str()).optional(),
	body: t.record(requestValue()).optional(),
};

const pagesSchema = t.union(
	t.obj({
		style: t.lit('cursor'),
		next: pointer(),
		send: pageParam(),
		size: pageSize().optional(),
	}),
	t.obj({ style: t.lit('link'), size: pageSize().optional() }),
	t.obj({
		style: t.lit('offset'),
		unit: t.lit('item'),
		send: pageParam(),
		size: pageSize().optional(),
	}),
	t.obj({
		style: t.lit('offset'),
		unit: t.lit('page'),
		start: t.int().optional(),
		send: pageParam(),
		size: pageSize().optional(),
	}),
);

/** A credential type of the action, by its n8n name, and what the action reads of it. */
const credentialSchema = t.obj({
	name: t.str().with({ minLength: 1 }),
	baseUrl: t
		.str()
		.hint('The API base URL of the stored credential, e.g. {server}/api; overrides baseUrl')
		.optional(),
	fields: t
		.record(new Schema<JsonSchema>({ type: 'object' }, false))
		.hint('The JSON Schema of each field that baseUrl reads, e.g. { server: { type: "string" } }')
		.optional(),
});

const configSchema = t.obj({
	contract: contractDocumentSchema,
	minor: t.int().with({ minimum: 0 }).hint('Bump for an additive contract change').optional(),
	node: t
		.obj({
			displayName: t.str().with({ minLength: 1 }).optional(),
			icon: t
				.str()
				.with({ pattern: '^(fa|node):.+$' })
				.hint('An n8n icon, e.g. fa:globe, or the icon of another node: node:n8n-nodes-base.github')
				.optional(),
		})
		.optional(),
	extends: t
		.str()
		.hint('The id of the n8n node that the action extends; publish copies its settings')
		.optional(),
	resourceFields: t
		.arr(t.str())
		.hint('The input fields that every action of the resource shares, e.g. owner, repository')
		.optional(),
	credentials: t
		.arr(credentialSchema)
		.hint('Absent: each credential type of the contract by name, with no fields')
		.optional(),
	baseUrl: t.str().optional(),
	errorOf: new Schema<`=${string}`>({ type: 'string', pattern: '^=' }, false)
		.hint(
			'An n8n expression over $response.body that gives the error message, e.g. ={{ $response.body.ok === false ? $response.body.error : undefined }}',
		)
		.optional(),
	request: t.obj(request).optional(),
	list: t
		.obj({
			...request,
			response: new Schema<JsonSchema>({ type: 'object' }, false).optional(),
			items: pointer(),
			pages: pagesSchema.optional(),
		})
		.optional(),
});

/** The config that the generic HTTP guest runs: one action, as data. */
export type HttpGuestConfig = Infer<typeof configSchema>;

/** A credential type of a config. */
export type HttpGuestCredential = Infer<typeof credentialSchema>;

/** The input fields of a resource, as the contract input lists them. */
export interface ResourceInput {
	/** The JSON Schema of each field. */
	readonly properties: Readonly<Record<string, JsonSchema>>;
	/** The fields that every action of the resource needs. */
	readonly required: readonly string[];
}

/** A node that an action may extend: what the action copies from it, as data. */
export interface ExtendableNode {
	/** The node id, e.g. `github`. */
	readonly id: string;
	/** An action may extend the node. */
	readonly extendable: true;
	/** The node name in the n8n UI, e.g. `GitHub`. */
	readonly displayName: string;
	/** The API base URL, when the credential does not give one. */
	readonly baseUrl?: string;
	/** The error expression of the node. */
	readonly errorOf?: `=${string}`;
	/** The credential types, with the base URL template and the fields it reads. */
	readonly credentials: readonly HttpGuestCredential[];
	/** The input of each resource, by resource name. */
	readonly resources: Readonly<Record<string, ResourceInput>>;
}

/** A node that no action may extend. */
export interface FixedNode {
	/** The node id. */
	readonly id: string;
	/** No action may extend the node. */
	readonly extendable: false;
	/** Why, e.g. the node checks its responses with code, which a copy cannot keep. */
	readonly reason: string;
}

/** A node as an action that extends it sees it. */
export type ParentNode = ExtendableNode | FixedNode;

const placeholdersOf = (template: string) =>
	[...template.matchAll(/\{([^}]+)\}/g)].flatMap(([, name]) => (name ? [name] : []));

/** A credential type as data: its base URL template and the fields that the template reads. */
export function credentialDataOf(type: AnyCredentialType): HttpGuestCredential | string {
	const { name, baseUrl, fields = {} } = type;
	if (baseUrl === undefined) return { name };
	if (typeof baseUrl !== 'string') return `the credential type ${name} has a base URL per option`;
	const read = placeholdersOf(baseUrl).flatMap((field) => {
		const schema = fields[field];
		return schema ? [[field, schema.json] as const] : [];
	});
	return { name, baseUrl, ...(read.length > 0 ? { fields: Object.fromEntries(read) } : {}) };
}

/** The input of each resource of a node's actions. */
function resourcesOf(actions: readonly Action[]): Record<string, ResourceInput> {
	return Object.fromEntries(
		actions.flatMap(({ resource, resourceFields = [], inputSchema }) => {
			if (resource === undefined) return [];
			const properties = inputSchema.properties ?? {};
			return [
				[
					resource,
					{
						properties: Object.fromEntries(
							resourceFields.flatMap((field) => {
								const schema = properties[field];
								return schema ? [[field, schema] as const] : [];
							}),
						),
						required: (inputSchema.required ?? []).filter((field) =>
							resourceFields.includes(field),
						),
					},
				] as const,
			];
		}),
	);
}

/** The node `nodeId` of these actions, as an action that extends it copies it. */
export function parentNodeOf(actions: readonly Action[], nodeId: string): ParentNode | undefined {
	const own = actions.filter(({ node }) => node.id === nodeId);
	const node = own[0]?.node;
	if (!node) return undefined;
	if (typeof node.errorOf === 'function') {
		return { id: nodeId, extendable: false, reason: `${nodeId} checks its responses with code` };
	}
	const credentials = (node.credential?.types ?? []).map(credentialDataOf);
	const refused = credentials.find((entry) => typeof entry === 'string');
	if (refused !== undefined) return { id: nodeId, extendable: false, reason: refused };
	const reachesApi =
		node.baseUrl !== undefined ||
		credentials.some((entry) => typeof entry !== 'string' && entry.baseUrl !== undefined);
	// A request needs a base URL, e.g. not the Code node or the HTTP Request node.
	if (!reachesApi)
		return { id: nodeId, extendable: false, reason: `${nodeId} has no API base URL` };
	return {
		id: nodeId,
		extendable: true,
		displayName: node.displayName,
		...(node.baseUrl === undefined ? {} : { baseUrl: node.baseUrl }),
		...(node.errorOf === undefined ? {} : { errorOf: node.errorOf }),
		credentials: credentials.filter((entry) => typeof entry !== 'string'),
		resources: resourcesOf(own),
	};
}

/**
 * The config with the settings of its parent copied in: the display name, the base URL, the
 * credentials, `errorOf` and the input of the resource. The parent's settings win, so every
 * action of a node reaches the same service the same way. The copy never reads its parent again.
 */
export function extendedConfig(
	config: HttpGuestConfig,
	parent: ExtendableNode,
	icon?: string,
): HttpGuestConfig {
	const { contract } = config;
	if (!contract.id.startsWith(`${parent.id}.`)) {
		throw new UserError(`An action of ${parent.id} needs an id that starts with ${parent.id}.`);
	}
	const { resource } = pathOf({ ...contract, node: parent.id });
	const shared = resource === undefined ? undefined : parent.resources[resource];
	if (resource !== undefined && !shared) {
		throw new UserError(`${parent.id} has no resource ${resource}`);
	}
	const input = {
		...contract.input,
		properties: { ...contract.input.properties, ...shared?.properties },
		required: [...new Set([...(shared?.required ?? []), ...(contract.input.required ?? [])])],
	};
	const displayIcon = config.node?.icon ?? icon;
	const resourceFields = Object.keys(shared?.properties ?? {});
	return {
		...config,
		extends: parent.id,
		...(resourceFields.length > 0 ? { resourceFields } : {}),
		node: { displayName: parent.displayName, ...(displayIcon ? { icon: displayIcon } : {}) },
		contract: {
			...contract,
			node: parent.id,
			nodeDisplayName: parent.displayName,
			credentials: parent.credentials.map(({ name }) => name),
			input,
		},
		credentials: [...parent.credentials],
		...(parent.baseUrl === undefined ? {} : { baseUrl: parent.baseUrl }),
		...(parent.errorOf === undefined ? {} : { errorOf: parent.errorOf }),
	};
}

/** The config, checked. Each problem names its path, e.g. `input.list.items`. */
export function parseHttpGuestConfig(value: unknown): HttpGuestConfig {
	const problems = validate(value, configSchema.json);
	if (problems.length > 0 || !matches(configSchema, value)) {
		throw new UserError(`The HTTP guest config is not valid: ${problems.join('; ')}`);
	}
	if ((value.request === undefined) === (value.list === undefined)) {
		throw new UserError('The HTTP guest config needs exactly one of request and list');
	}
	return value;
}

const unescape = (token: string) => token.replace(/~1/g, '/').replace(/~0/g, '~');

/** The value at a JSON Pointer (RFC 6901), or `undefined` when a token is missing. */
export function valueAt(value: unknown, at: string): unknown {
	if (at === '') return value;
	return at
		.slice(1)
		.split('/')
		.map(unescape)
		.reduce<unknown>((current: unknown, token) => {
			if (Array.isArray(current))
				return /^(0|[1-9]\d*)$/.test(token) ? current[Number(token)] : undefined;
			return isRecord(current) ? current[token] : undefined;
		}, value);
}

const PAGING = 'paging';

/** The fields of the contract input. A paged list gets its `paging` field from the SDK. */
function inputOf(schema: JsonSchema, paged: boolean): Shape {
	const required = new Set(schema.required ?? []);
	return Object.fromEntries(
		Object.entries(schema.properties ?? {})
			.filter(([name]) => !(paged && name === PAGING))
			.map(([name, field]) => [name, new Schema<unknown, boolean>(field, !required.has(name))]),
	);
}

/** `notion.user.get` → node `notion`, resource `user`, operation `get`. */
function pathOf({ id, node }: ContractDocument) {
	const [first, ...rest] = id.split('.');
	const operation = rest.at(-1);
	if (first !== node || operation === undefined || rest.length > 2) {
		throw new UserError(
			`The contract id ${id} must be <node>.<operation> or <node>.<resource>.<operation>`,
		);
	}
	return { resource: rest.length === 2 ? rest[0] : undefined, operation };
}

function pagesOf(pages: Infer<typeof pagesSchema> | undefined): Pages<unknown> | undefined {
	if (pages?.style !== 'cursor') return pages;
	const { next, ...rest } = pages;
	return {
		...rest,
		next: (page) => {
			const cursor = valueAt(page, next);
			return typeof cursor === 'string' || typeof cursor === 'number' ? cursor : undefined;
		},
	};
}

function itemsAt(at: string) {
	return (page: unknown): readonly unknown[] => {
		const items = valueAt(page, at);
		if (!Array.isArray(items)) throw new UserError(`The response has no list at ${at || '(root)'}`);
		return items;
	};
}

/** A credential type of the contract, with the base URL and fields that the config gives it. */
function credentialTypeOf(config: HttpGuestConfig, name: string) {
	const given = config.credentials?.find((entry) => entry.name === name);
	const fields = Object.fromEntries(
		Object.entries(given?.fields ?? {}).map(([field, json]) => [
			field,
			new Schema<unknown, boolean>(json, json.default !== undefined),
		]),
	);
	const baseUrl = given?.baseUrl;
	if (baseUrl !== undefined && !isUrlTemplate(baseUrl)) {
		throw new UserError(`The base URL of ${name} must start with https:// or a {field}`);
	}
	return compat(name, {
		...(given?.fields ? { fields } : {}),
		...(baseUrl === undefined ? {} : { baseUrl }),
	});
}

const isUrlTemplate = (value: string): value is `https://${string}` | `{${string}}${string}` =>
	/^(https:\/\/|\{[^}]+\})/.test(value);

/** Top-level fields of the contract that the binding gives in another form, e.g. `egress`. */
function driftOf(config: HttpGuestConfig, action: Action): string[] {
	const given = new Map(Object.entries(toContract(action)));
	const declared = new Map(Object.entries(config.contract));
	return [...new Set([...given.keys(), ...declared.keys()])].filter(
		(key) => canonicalJson(given.get(key)) !== canonicalJson(declared.get(key)),
	);
}

/**
 * The action of a config. The config holds the contract of its manifest, so the action must
 * give the same contract: a base URL of another host would change `egress`, for example.
 */
export function liftHttpGuest(config: HttpGuestConfig): Action {
	const action = httpGuestActionOf(config);
	const drift = driftOf(config, action);
	if (drift.length > 0) {
		throw new UserError(
			`The binding of ${config.contract.id} does not give its contract: ${drift.join(', ')} differ`,
		);
	}
	return action;
}

/**
 * The action of a config without the contract check. Freeze uses it to write the contract that
 * the binding gives, e.g. the `egress` of the base URL.
 */
export function httpGuestActionOf(config: HttpGuestConfig): Action {
	const { contract } = config;
	const { resource, operation } = pathOf(contract);
	const { errorOf } = config;
	const definition: NodeDefinition = {
		id: contract.node,
		displayName: config.node?.displayName ?? contract.nodeDisplayName,
		...(contract.credentials.length > 0
			? {
					credential: credential({
						types: contract.credentials.map((name) => credentialTypeOf(config, name)),
						scopes: Object.fromEntries((contract.scopes ?? []).map((scope) => [scope, scope])),
					}),
				}
			: {}),
		...(config.baseUrl === undefined ? {} : { baseUrl: config.baseUrl }),
		...(errorOf ? { errorOf } : {}),
	};
	const node = defineNode(definition);
	// The resource keeps its shared fields, so a node made of these actions can be extended.
	const shared = new Set(config.resourceFields ?? []);
	const target =
		resource === undefined
			? node
			: node.resource(resource, {
					input: Object.fromEntries(
						Object.entries(inputOf(contract.input, false)).filter(([name]) => shared.has(name)),
					),
				});
	const { effect, cardinality, idempotent } = contract.flow;
	const spec = {
		version: contract.version,
		...(config.minor === undefined ? {} : { minor: config.minor }),
		action: contract.action,
		summary: contract.summary,
		...(contract.scopes ? { scopes: contract.scopes } : {}),
		output: new Schema<unknown>(contract.output, false),
	};
	const idempotence = idempotent === undefined ? {} : { idempotent };
	if (config.request) {
		if (cardinality !== 'per-item') {
			throw new UserError(`A request is per item, but ${contract.id} is ${cardinality}`);
		}
		const { method, path, query, headers, body } = config.request;
		const lifted = target.action(operation, {
			...spec,
			flow: { effect, cardinality, ...idempotence },
			input: inputOf(contract.input, false),
			request: { method, path: pathString(path), query, headers, body },
		});
		const action: Action = lifted;
		return action;
	}
	if (!config.list)
		throw new UserError('The HTTP guest config needs exactly one of request and list');
	if (cardinality !== '1:N') {
		throw new UserError(`A list is 1:N, but ${contract.id} is ${cardinality}`);
	}
	const { method, path, query, headers, body, response, items, pages } = config.list;
	const paged = pages !== undefined;
	const lifted = target.action(operation, {
		...spec,
		flow: { effect, cardinality, ...idempotence },
		input: inputOf(contract.input, paged),
		list: {
			method,
			path: pathString(path),
			query,
			headers,
			body,
			response: new Schema<unknown>(response ?? {}, false),
			items: itemsAt(items),
			...(paged ? { pages: pagesOf(pages) } : {}),
		},
	});
	const action: Action = lifted;
	return action;
}

/** The config schema checks the leading slash. */
function pathString(path: string): `/${string}` {
	if (!path.startsWith('/')) throw new UserError(`The request path ${path} must start with /`);
	return `/${path.slice(1)}`;
}
