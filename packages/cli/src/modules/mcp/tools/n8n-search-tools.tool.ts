import type { User } from '@n8n/db';
import type {
	IDisplayOptions,
	INodeCredentialDescription,
	INodeProperties,
	INodePropertyCollection,
	INodePropertyOptions,
	INodeTypeDescription,
	NodePropertyTypes,
} from 'n8n-workflow';
import z from 'zod';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { NodeCatalogService } from '@/node-catalog';
import type { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';

const MAX_CREDENTIALS = 200;

/**
 * NodePropertyTypes that we never want to surface to LLM tool consumers.
 * - `loadOptions` (any `options` field with `typeOptions.loadOptionsMethod`)
 * - `resourceLocator`, `resourceMapper`: complex UI-only types
 * - `button`, `hidden`, `notice`, `callout`, `icon`, `color`, `curlImport`,
 *   `credentialsSelect`, `credentials`, `filter`, `assignmentCollection`,
 *   `workflowSelector`: non-data UI sugar / unsupported here
 *
 * Plain "data" types kept: string, number, boolean, dateTime, json, options,
 * multiOptions, collection, fixedCollection.
 */
const UI_ONLY_PROPERTY_TYPES = new Set<NodePropertyTypes>([
	'resourceLocator',
	'resourceMapper',
	'button',
	'hidden',
	'notice',
	'callout',
	'icon',
	'color',
	'curlImport',
	'credentialsSelect',
	'credentials',
	'filter',
	'assignmentCollection',
	'workflowSelector',
]);

const inputSchema = {
	query: z.string().describe('Free-text search, e.g. "post message to slack"'),
	filters: z
		.object({
			hasCredential: z
				.boolean()
				.optional()
				.describe(
					'When true, only return nodes that require a credential. The result includes `userCredentials` so you can see whether the user has any matching credentials connected.',
				),
		})
		.optional()
		.describe('Optional filters to narrow the search'),
} satisfies z.ZodRawShape;

const jsonSchemaShape = z.object({
	type: z.literal('object'),
	properties: z.record(z.unknown()),
	required: z.array(z.string()).optional(),
});

const outputSchema = {
	results: z
		.array(
			z.object({
				id: z
					.string()
					.describe('"<nodeType>.<resource>.<operation>" identifier, e.g. "slack.message.send"'),
				displayName: z.string(),
				description: z.string(),
				inputSchema: jsonSchemaShape.describe('JSON Schema for the tool input'),
				userCredentials: z
					.array(z.object({ id: z.string(), name: z.string() }))
					.describe('User credentials matching this node type. Names only — never secret data.'),
			}),
		)
		.describe('Matching operations from the node catalog'),
	error: z.string().optional().describe('Error message when the tool failed'),
} satisfies z.ZodRawShape;

export type N8nSearchToolsParams = {
	query: string;
	filters?: {
		hasCredential?: boolean;
	};
};

export type N8nSearchToolsCredential = {
	id: string;
	name: string;
};

export type N8nSearchToolsJsonSchema = {
	type: 'object';
	properties: Record<string, JsonSchemaProperty>;
	required?: string[];
};

export type JsonSchemaProperty = {
	type: 'string' | 'number' | 'boolean' | 'object' | 'array';
	description?: string;
	enum?: Array<string | number | boolean>;
};

export type N8nSearchToolsItem = {
	id: string;
	displayName: string;
	description: string;
	inputSchema: N8nSearchToolsJsonSchema;
	userCredentials: N8nSearchToolsCredential[];
};

export type N8nSearchToolsResult = {
	results: N8nSearchToolsItem[];
	error?: string;
};

export const createN8nSearchToolsTool = (
	user: User,
	credentialsService: CredentialsService,
	nodeCatalogService: NodeCatalogService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'n8n_search_tools',
	config: {
		description:
			"Search the n8n node catalog. Returns matching operations as `<nodeType>.<operation>` (e.g. `slack.message.send`) along with their input schema and any of the user's credentials that match the node type.",
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Search n8n Tools',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ query, filters }: N8nSearchToolsParams) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'n8n_search_tools',
			parameters: {
				query,
				hasCredentialFilter: filters?.hasCredential === true,
			},
		};

		try {
			const payload = await searchN8nTools(user, credentialsService, nodeCatalogService, {
				query,
				filters,
			});

			telemetryPayload.results = {
				success: true,
				data: { count: payload.results.length },
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: JSON.stringify(payload) }],
				structuredContent: payload,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			telemetryPayload.results = {
				success: false,
				error: errorMessage,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const output: N8nSearchToolsResult = {
				results: [],
				error: errorMessage,
			};
			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
				isError: true,
			};
		}
	},
});

export async function searchN8nTools(
	user: User,
	credentialsService: CredentialsService,
	nodeCatalogService: NodeCatalogService,
	{ query, filters }: N8nSearchToolsParams,
): Promise<N8nSearchToolsResult> {
	const hits = await nodeCatalogService.searchNodesStructured([query], {
		hasCredential: filters?.hasCredential,
	});

	if (hits.length === 0) {
		return { results: [] };
	}

	// Resolve the parser once — used for getNodeType(nodeId). If the catalog
	// is not initialized, treat all nodes as "schema unavailable".
	let getNodeType: ((nodeId: string) => INodeTypeDescription | null) | undefined;
	try {
		const parser = nodeCatalogService.getNodeTypeParser();
		getNodeType = (nodeId: string) => parser.getNodeType(nodeId);
	} catch {
		getNodeType = undefined;
	}

	// Collect all the credential types we'll need to enrich, so we can do
	// at most one credentialsService.getMany() call total (cheaper than per-node).
	const credentialTypeNames = new Set<string>();
	type NodeContext = {
		hit: (typeof hits)[number];
		description: INodeTypeDescription | null;
	};
	const contexts: NodeContext[] = hits.map((hit) => {
		const description = getNodeType ? getNodeType(hit.nodeId) : null;
		if (description?.credentials) {
			for (const cred of description.credentials) {
				if (cred.name) credentialTypeNames.add(cred.name);
			}
		}
		return { hit, description };
	});

	const credentialsByType = credentialTypeNames.size
		? await fetchCredentialsByType(user, credentialsService, [...credentialTypeNames])
		: new Map<string, N8nSearchToolsCredential[]>();

	const results: N8nSearchToolsItem[] = [];
	for (const { hit, description } of contexts) {
		if (!description) {
			// Schema unavailable: emit a single placeholder result rather than dropping.
			results.push({
				id: hit.nodeId,
				displayName: hit.displayName,
				description: hit.description || 'schema unavailable',
				inputSchema: { type: 'object', properties: {} },
				userCredentials: [],
			});
			continue;
		}

		const userCreds = collectUserCredentials(description.credentials, credentialsByType);
		const entries = expandNodeIntoOperations(hit.nodeId, hit.displayName, description);

		for (const entry of entries) {
			results.push({
				id: entry.id,
				displayName: entry.displayName,
				description: entry.description,
				inputSchema: entry.inputSchema,
				userCredentials: userCreds,
			});
		}
	}

	return { results };
}

/**
 * Fetch the user's credentials whose `type` matches any of the given types.
 * Returns a map of `type -> credentials[]`. Projection strips everything but
 * `{id, name}` — never expose `data`, `apiKey`, scopes etc.
 */
async function fetchCredentialsByType(
	user: User,
	credentialsService: CredentialsService,
	types: string[],
): Promise<Map<string, N8nSearchToolsCredential[]>> {
	const map = new Map<string, N8nSearchToolsCredential[]>();
	if (types.length === 0) return map;

	// One round-trip per type keeps the filter syntax simple (single-string LIKE)
	// and consistent with `n8n_list_credentials`. The credential type cardinality
	// per node is small (typically 1-2), so this is cheap.
	await Promise.all(
		types.map(async (type) => {
			const creds = await credentialsService.getMany(user, {
				listQueryOptions: {
					take: MAX_CREDENTIALS,
					filter: { type },
				},
				includeScopes: false,
				includeData: false,
				includeGlobal: true,
				onlySharedWithMe: false,
			});

			// Filter again locally for an exact match — `getMany`'s filter is a
			// substring (LIKE) match, but here we want strict type equality.
			const projected = creds
				.filter((c) => c.type === type)
				.map((c) => ({ id: c.id, name: c.name }));
			map.set(type, projected);
		}),
	);

	return map;
}

/**
 * Collect the user's credentials for any credential type declared by the node.
 * De-duplicates by credential id (the same credential could match multiple types
 * declared by the node, though this is rare).
 */
function collectUserCredentials(
	declared: INodeCredentialDescription[] | undefined,
	credentialsByType: Map<string, N8nSearchToolsCredential[]>,
): N8nSearchToolsCredential[] {
	if (!declared || declared.length === 0) return [];
	const seen = new Set<string>();
	const out: N8nSearchToolsCredential[] = [];
	for (const cred of declared) {
		if (!cred.name) continue;
		const matches = credentialsByType.get(cred.name) ?? [];
		for (const m of matches) {
			if (seen.has(m.id)) continue;
			seen.add(m.id);
			out.push(m);
		}
	}
	return out;
}

type Operation = {
	id: string;
	displayName: string;
	description: string;
	inputSchema: N8nSearchToolsJsonSchema;
};

/**
 * Expand a node description into one entry per `(nodeType, resource?, operation?)` tuple.
 *
 * Strategy (best-effort, defensive):
 *  1. Find the top-level `resource` property (`name === 'resource'`, type `options`).
 *  2. For each resource option, find an `operation` property whose `displayOptions`
 *     show it for that resource — emit one entry per operation option.
 *  3. If there's no `resource` discriminator but there is a top-level `operation`,
 *     emit one entry per operation option with id `<nodeId>.<operation>`.
 *  4. If neither exists, emit a single entry with id `<nodeId>`.
 *
 * If parsing fails for an emitted tuple, fall back to an empty `inputSchema.properties`
 * with a description note rather than throwing.
 */
function expandNodeIntoOperations(
	nodeId: string,
	displayName: string,
	description: INodeTypeDescription,
): Operation[] {
	const properties = description.properties ?? [];
	const resourceProp = findOptionsProperty(properties, 'resource');

	if (resourceProp) {
		const entries: Operation[] = [];
		const resourceOptions = extractOptionValues(resourceProp);
		for (const resource of resourceOptions) {
			const opProp = findOperationPropertyForResource(properties, resource);
			if (opProp) {
				const opOptions = extractOptionEntries(opProp);
				for (const op of opOptions) {
					entries.push(buildOperationEntry(nodeId, displayName, description, resource, op));
				}
			} else {
				// Resource without an operation discriminator — emit a single entry per resource.
				entries.push(buildOperationEntry(nodeId, displayName, description, resource, null));
			}
		}
		// Fallback when no resource options could be extracted (e.g. options came from loadOptions).
		if (entries.length === 0) {
			return [buildOperationEntry(nodeId, displayName, description, null, null)];
		}
		return entries;
	}

	// No resource — maybe a top-level operation discriminator.
	const operationProp = findOptionsProperty(properties, 'operation');
	if (operationProp) {
		const opOptions = extractOptionEntries(operationProp);
		if (opOptions.length > 0) {
			return opOptions.map((op) => buildOperationEntry(nodeId, displayName, description, null, op));
		}
	}

	return [buildOperationEntry(nodeId, displayName, description, null, null)];
}

function findOptionsProperty(
	properties: INodeProperties[],
	name: string,
): INodeProperties | undefined {
	return properties.find(
		(p) => p.name === name && (p.type === 'options' || p.type === 'multiOptions'),
	);
}

/**
 * Find the `operation` property that is shown for the given resource.
 * Falls back to the first `name === 'operation'` property if no displayOptions match.
 */
function findOperationPropertyForResource(
	properties: INodeProperties[],
	resource: string,
): INodeProperties | undefined {
	const candidates = properties.filter((p) => p.name === 'operation' && p.type === 'options');
	if (candidates.length === 0) return undefined;

	const matching = candidates.find((p) => displayedFor(p.displayOptions, { resource }));
	return matching ?? candidates[0];
}

function extractOptionValues(prop: INodeProperties): string[] {
	const opts = extractOptionEntries(prop);
	return opts.map((o) => o.value);
}

function extractOptionEntries(
	prop: INodeProperties,
): Array<{ value: string; name: string; description?: string }> {
	if (!prop.options || prop.options.length === 0) return [];
	const out: Array<{ value: string; name: string; description?: string }> = [];
	for (const o of prop.options) {
		if (!isPropertyOption(o)) continue;
		const value = o.value;
		// We only support string-valued resource/operation options. Numbers/booleans
		// are technically valid in n8n but extremely rare for discriminators and
		// would produce malformed ids.
		if (typeof value !== 'string') continue;
		out.push({ value, name: o.name, description: o.description });
	}
	return out;
}

function isPropertyOption(
	o: INodeProperties | INodePropertyOptions | INodePropertyCollection,
): o is INodePropertyOptions {
	if (typeof o !== 'object' || o === null) return false;
	if (!('value' in o)) return false;
	const candidate: { name?: unknown; value?: unknown } = o;
	return typeof candidate.name === 'string';
}

/**
 * Test whether a property's `displayOptions` declare it visible for the given context.
 * Returns true when:
 *   - the property has no displayOptions (always visible), OR
 *   - every key in `displayOptions.show` is satisfied by `context`, AND
 *   - no key in `displayOptions.hide` is satisfied by `context`.
 *
 * Keys not in the context are treated as compatible (we don't have ground truth for them).
 * `@version`/`@feature`/`@tool` special keys are ignored.
 */
function displayedFor(
	displayOptions: IDisplayOptions | undefined,
	context: { resource?: string | null; operation?: string | null },
): boolean {
	if (!displayOptions) return true;

	if (displayOptions.show) {
		// Every show-key with a known context value must match.
		// If any defined key has a known context value that doesn't match → hidden.
		for (const key of Object.keys(displayOptions.show)) {
			if (key.startsWith('@')) continue;
			const expected = displayOptions.show[key];
			if (!Array.isArray(expected)) continue;
			const provided = readContextValue(context, key);
			if (provided === undefined) continue;
			if (!expected.some((v) => valueMatches(v, provided))) {
				return false;
			}
		}
	}

	if (displayOptions.hide) {
		// All hide-keys are known and match → hidden.
		// If any hide-key is unknown, conservatively assume not-hidden.
		let allKnownAndMatched = true;
		for (const key of Object.keys(displayOptions.hide)) {
			if (key.startsWith('@')) continue;
			const expected = displayOptions.hide[key];
			if (!Array.isArray(expected)) {
				allKnownAndMatched = false;
				break;
			}
			const provided = readContextValue(context, key);
			if (provided === undefined) {
				allKnownAndMatched = false;
				break;
			}
			if (!expected.some((v) => valueMatches(v, provided))) {
				allKnownAndMatched = false;
				break;
			}
		}
		if (allKnownAndMatched) return false;
	}

	return true;
}

function readContextValue(
	context: { resource?: string | null; operation?: string | null },
	key: string,
): string | undefined {
	if (key === 'resource') return context.resource ?? undefined;
	if (key === 'operation') return context.operation ?? undefined;
	return undefined;
}

function valueMatches(expected: unknown, provided: string): boolean {
	if (typeof expected === 'string') return expected === provided;
	if (typeof expected === 'number' || typeof expected === 'boolean') {
		return String(expected) === provided;
	}
	// DisplayCondition (object) values aren't evaluated here — assume match
	// to err on the side of inclusion.
	return true;
}

function buildOperationEntry(
	nodeId: string,
	nodeDisplayName: string,
	description: INodeTypeDescription,
	resource: string | null,
	operation: { value: string; name: string; description?: string } | null,
): Operation {
	const idParts = [nodeId];
	if (resource) idParts.push(resource);
	if (operation) idParts.push(operation.value);
	const id = idParts.join('.');

	const displayName = operation?.name ? `${nodeDisplayName}: ${operation.name}` : nodeDisplayName;

	const descriptionText =
		operation?.description ??
		// Some operations encode their human-facing label in `action`, but we don't have
		// the option `action` field on INodePropertyOptions's optional types map; fall back
		// to nodeDisplayName.description.
		description.description ??
		'';

	let inputSchema: N8nSearchToolsJsonSchema;
	try {
		inputSchema = buildInputSchema(description.properties ?? [], {
			resource,
			operation: operation?.value ?? null,
		});
	} catch {
		inputSchema = { type: 'object', properties: {} };
	}

	return {
		id,
		displayName,
		description: descriptionText,
		inputSchema,
	};
}

/**
 * Build a JSON Schema object from the subset of properties visible in the
 * given (resource, operation) context. Skips:
 *   - the `resource` / `operation` discriminators themselves
 *   - UI-only types (resourceLocator, resourceMapper, button, hidden, etc.)
 *   - properties with `typeOptions.loadOptionsMethod` (dynamic UI loaders)
 */
function buildInputSchema(
	properties: INodeProperties[],
	context: { resource: string | null; operation: string | null },
): N8nSearchToolsJsonSchema {
	const jsonProperties: Record<string, JsonSchemaProperty> = {};
	const required: string[] = [];

	for (const prop of properties) {
		if (prop.name === 'resource' || prop.name === 'operation') continue;
		if (UI_ONLY_PROPERTY_TYPES.has(prop.type)) continue;
		if (prop.typeOptions?.loadOptionsMethod) continue;
		if (!displayedFor(prop.displayOptions, context)) continue;

		const jsonProp = mapPropertyToJsonSchema(prop);
		if (!jsonProp) continue;

		jsonProperties[prop.name] = jsonProp;
		if (prop.required === true) required.push(prop.name);
	}

	const schema: N8nSearchToolsJsonSchema = {
		type: 'object',
		properties: jsonProperties,
	};
	if (required.length > 0) schema.required = required;
	return schema;
}

function mapPropertyToJsonSchema(prop: INodeProperties): JsonSchemaProperty | null {
	const description = prop.description ?? prop.displayName;

	switch (prop.type) {
		case 'string':
		case 'dateTime':
			return jsonSchemaString(description, undefined);
		case 'number':
			return { type: 'number', description };
		case 'boolean':
			return { type: 'boolean', description };
		case 'options': {
			const enumValues = staticOptionValues(prop);
			return jsonSchemaString(description, enumValues);
		}
		case 'multiOptions':
			return { type: 'array', description };
		case 'json':
		case 'collection':
		case 'fixedCollection':
			return { type: 'object', description };
		default:
			return null;
	}
}

function jsonSchemaString(
	description: string | undefined,
	enumValues: Array<string | number | boolean> | undefined,
): JsonSchemaProperty {
	const base: JsonSchemaProperty = { type: 'string' };
	if (description) base.description = description;
	if (enumValues && enumValues.length > 0) base.enum = enumValues;
	return base;
}

function staticOptionValues(prop: INodeProperties): Array<string | number | boolean> | undefined {
	if (!prop.options) return undefined;
	const values: Array<string | number | boolean> = [];
	for (const o of prop.options) {
		if (!isPropertyOption(o)) return undefined;
		values.push(o.value);
	}
	return values.length > 0 ? values : undefined;
}
