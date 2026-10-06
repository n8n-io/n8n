import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import { TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE } from '@n8n/api-types';
import {
	hasPageValue,
	validate,
	type Action,
	type JsonSchema,
	type ResourceField,
} from '@n8n/node-sdk';
import {
	isProviderConnection,
	modelCatalogDeclaration,
	outputItemSchema,
	PROVIDER_FIELDS,
	toTs,
} from '@n8n/node-sdk/codegen';
import {
	contractInputOf,
	contractParametersOf,
	credentialHostsOf,
	egressIssuesOf,
	exampleOf,
	fieldRefOf,
	parameterPathOf,
	storedParametersOf,
	toolUiOf,
	type FieldRef,
} from '@n8n/node-sdk/host';
import { isRecord } from '@n8n/utils/is-record';
import { hasPlaceholderDeep } from '@n8n/utils/placeholder';
import { sublimeSearch } from '@n8n/utils/search/sublime-search';
import { toEngineConnections, type IDataObject, type WorkflowJSON } from '@n8n/workflow-sdk';
import {
	getChildNodes,
	isFromAIOnlyExpression,
	NodeConnectionTypes,
	NodeVersionNotFoundError,
	safeRegex,
	type INodeTypeDescription,
	type INodeTypes,
} from 'n8n-workflow';
import { z } from 'zod';

import type { ValidationWarning } from './workflow-validation-warnings';
import {
	actionOfNode,
	contractActions,
	firstPartyCatalog,
	isContractNodeType,
	toolActionOfNode,
} from '../contract-catalog';
import type { InstanceAiContext } from '../../types';
import type { FixtureOrigin } from '../../workflow-loop/workflow-loop-state';
import {
	coreStepRowOf,
	contractReplacementOf,
	derivedNodeModuleText,
	factoryPathOf,
	isInstalledNodeType,
	missingNodeTypeIssue,
	nextNodeIds,
	nodeModuleText,
	nodeTypeOfModulePath,
	type DeriveSource,
} from '../next-modules';
import { escapeSingleQuotes, runInSandbox } from '../../workspace/sandbox-fs';
import { WORKFLOW_DIAGNOSTICS_FILENAME } from '../../workspace/sandbox-typescript';
import { joinWorkspacePath } from '../../workspace/workspace-paths';

/**
 * Node contracts build workflows written with `@n8n/workflow-sdk/next` in the sandbox. The
 * host generates the typed node modules the source imports (`@n8n/nodes/<id>`) and the
 * per-node output types; `tsc --strict` in the sandbox does every check.
 */

export const NEXT_TSCONFIG_FILENAME = 'tsconfig.next.json';
export const NODE_OUTPUTS_PATH = '.n8n/node-outputs.d.ts';
export const MODEL_CATALOG_PATH = '.n8n/model-catalog.d.ts';
/** The strings the type check reads as n8n expressions and as Code node JavaScript. */
export const EXPRESSIONS_PATH = '.n8n/expressions.json';

const NEXT_TSCONFIG = JSON.stringify(
	{
		extends: './tsconfig.json',
		compilerOptions: {
			strictNullChecks: true,
			paths: { '@n8n/nodes/*': ['./.n8n/nodes/*'] },
		},
		include: ['src/**/*.ts', '.n8n/**/*.ts'],
	},
	null,
	2,
);

// A typed module id (`notion`) or a derived module path (`n8n-nodes-base/airtable`).
const NODE_IMPORT = /from\s+['"]@n8n\/nodes\/([\w@./-]+)['"]/g;

export const usedNodeIds = (source: string) => [
	...new Set([...source.matchAll(NODE_IMPORT)].flatMap(([, id]) => (id ? [id] : []))),
];

function nodeModule(nodeId: string, source: DeriveSource): string | undefined {
	const nodeType = nodeTypeOfModulePath(nodeId);
	const text =
		nodeType === undefined ? nodeModuleText(nodeId) : derivedNodeModuleText(nodeType, source);
	// tsc reads the per-node output types through this reference; tsx ignores it.
	const up = '../'.repeat(nodeId.split('/').length);
	return text === undefined
		? undefined
		: `/// <reference path="${up}node-outputs.d.ts" />\n${text}`;
}

export const EMPTY_OUTPUTS = 'export {};\n';

export const EMPTY_EXPRESSIONS = `${JSON.stringify({ expressions: [], code: [] })}\n`;

/**
 * A line for each node type that the source imports as a derived module, or names in
 * `node()`, `provider()` or `trigger()`, and that the instance does not have, e.g. a community
 * node that is not installed.
 */
export async function missingNodeTypeErrors(
	source: string,
	deriveSource: DeriveSource,
): Promise<string[]> {
	const { locateNextNodes } = await import('@n8n/workflow-sdk/next');
	const imported = usedNodeIds(source).flatMap((id) => {
		const nodeType = nodeTypeOfModulePath(id);
		return nodeType === undefined ? [] : [{ at: `"@n8n/nodes/${id}"`, nodeType }];
	});
	const named = locateNextNodes(source).flatMap(({ name, type, line }) =>
		type === undefined ? [] : [{ at: `"${name}" (line ${line})`, nodeType: type }],
	);
	return [...imported, ...named]
		.filter(({ nodeType }) => !isInstalledNodeType(nodeType, deriveSource))
		.map(({ at, nodeType }) => `${at}: ${missingNodeTypeIssue(nodeType, deriveSource)}`);
}

/** Files to write before the build: the tsconfig, the imported node modules, empty outputs. */
export function nextWorkspaceFiles(
	source: string,
	deriveSource: DeriveSource = {},
): { ok: true; files: Map<string, string> } | { ok: false; errors: string[] } {
	const modules = usedNodeIds(source).map((id) => [id, nodeModule(id, deriveSource)] as const);
	const unknown = modules.filter(([, text]) => text === undefined).map(([id]) => id);
	if (unknown.length > 0) {
		return {
			ok: false,
			errors: unknown.map(
				(id) =>
					`No node module "@n8n/nodes/${id}". Typed modules: ${nextNodeIds.join(', ')}. Another node <package>.<name> has a derived module "@n8n/nodes/<package>/<name>" when type-definition returns one. Use node({ type, version, parameters }) from '@n8n/workflow-sdk/next' for other nodes.`,
			),
		};
	}
	return {
		ok: true,
		files: new Map([
			[NEXT_TSCONFIG_FILENAME, NEXT_TSCONFIG],
			[NODE_OUTPUTS_PATH, EMPTY_OUTPUTS],
			[EXPRESSIONS_PATH, EMPTY_EXPRESSIONS],
			...modules.flatMap(([id, text]) => (text ? [[`.n8n/nodes/${id}.ts`, text] as const] : [])),
		]),
	};
}

/** The model catalog providers that the model fields of the imported modules name. */
export const catalogProvidersOf = (source: string) => [
	...new Set(
		contractActions()
			.filter(({ node }) => usedNodeIds(source).includes(node.id))
			.flatMap(({ inputSchema }) =>
				Object.values(inputSchema.properties ?? {}).flatMap((field) =>
					field['x-n8n-model-catalog'] ? [field['x-n8n-model-catalog']] : [],
				),
			),
	),
];

/**
 * The declaration that types the model fields of the imported modules by the model catalog,
 * so `tsc` rejects a model ID that the provider does not offer. A provider that the catalog
 * does not know keeps any model ID.
 */
export async function modelCatalogFile(
	source: string,
	modelIds: (provider: string) => Promise<readonly string[] | undefined>,
): Promise<string> {
	const entries = await Promise.all(
		catalogProvidersOf(source).map(
			async (provider) =>
				[provider, (await modelIds(provider).catch(() => undefined)) ?? []] as const,
		),
	);
	return modelCatalogDeclaration(Object.fromEntries(entries));
}

type WorkflowNode = WorkflowJSON['nodes'][number];

/** The form of a contract node: a tool node has the tool form. */
const formOf = (node: Pick<WorkflowNode, 'type'>, action: Action) =>
	toolActionOfNode(node) === action ? toolUiOf(action.inputSchema, action.ui) : action.ui;

/** The contract input of a node, decoded from its stored parameters as the run reads them. */
export const nodeInputOf = (node: Pick<WorkflowNode, 'type' | 'parameters'>, action: Action) =>
	contractInputOf(node.parameters ?? {}, action.inputSchema, formOf(node, action));

// n8n node parameters are JSON values.
const isDataObject = (value: unknown): value is IDataObject => isRecord(value);

/** The workflow with `map` applied to the parameters of each contract node. */
const mapContractParameters = (
	workflow: WorkflowJSON,
	map: typeof storedParametersOf,
): WorkflowJSON => ({
	...workflow,
	nodes: workflow.nodes.map((node) => {
		const action = actionOfNode(node) ?? toolActionOfNode(node);
		const parameters =
			action && map(node.parameters ?? {}, action.inputSchema, formOf(node, action));
		return parameters && isDataObject(parameters) ? { ...node, parameters } : node;
	}),
});

/**
 * The workflow as the editor saves it: each field of a contract node that a codec widget edits
 * holds the value of the widget, e.g. the n8n filter value of a `where`.
 */
export const storedWorkflowOf = (workflow: WorkflowJSON) =>
	mapContractParameters(workflow, storedParametersOf);

/**
 * The workflow with each field of a contract node that a codec widget edits as its contract
 * value, for the readers of contract values, e.g. `decompileWorkflow`.
 */
export const contractWorkflowOf = (workflow: WorkflowJSON) =>
	mapContractParameters(workflow, contractParametersOf);

/**
 * The action's output for this node's input and its resource fields. A hatch that cannot
 * read them keeps the default.
 */
export function outputOf(
	action: Action,
	input: Record<string, unknown>,
	fields?: readonly ResourceField[],
): JsonSchema {
	try {
		if (fields?.length && action.resourceOutput) {
			return action.resourceOutput.toOutput(fields, input);
		}
		return action.deriveOutput?.(input) ?? action.output.json;
	} catch {
		return action.output.json;
	}
}

/**
 * The output that the workflow declares for the node: the output for its parameters when an input
 * marked `x-n8n-declared` holds a JSON Schema, e.g. the body `schema` of an HTTP step.
 */
export function declaredOutputOf(node: WorkflowJSON['nodes'][number]): JsonSchema | undefined {
	const action = actionOfNode(node);
	if (!action) return undefined;
	const input = nodeInputOf(node, action);
	const declares = Object.entries(action.inputSchema.properties ?? {}).some(
		([key, field]) => field['x-n8n-declared'] === true && isRecord(input[key]),
	);
	const output = declares ? outputOf(action, input) : undefined;
	return output === action.output.json ? undefined : output;
}

/** Resource fields by node name, from `fetchResourceFields`. */
export type ResourceFields = ReadonlyMap<string, readonly ResourceField[]>;

const RESOURCE_LOOKUP_TIMEOUT_MS = 5_000;

async function withTimeout<T>(work: Promise<T>, fallback: T, timeoutMs: number): Promise<T> {
	return await new Promise((resolve) => {
		const timer = setTimeout(() => resolve(fallback), timeoutMs);
		work.then(resolve, () => resolve(fallback)).finally(() => clearTimeout(timer));
	});
}

/** How a lookup ended. `mocked`: the eval mock answered it. */
type LookupOutcome = 'ok' | 'mocked' | 'failed' | 'timeout' | 'no-credential';

/** How a lookup that gave no fields ended. */
export type LookupMiss = Exclude<LookupOutcome, 'ok' | 'mocked'>;

/** The resource fields of each node, and why a lookup gave none, by node name. */
export interface ResourceLookups {
	fields: ResourceFields;
	misses: ReadonlyMap<string, LookupMiss>;
}

interface Lookup {
	fields: ResourceField[];
	outcome: LookupOutcome;
}

/** The input field of the resource whose fields type the step: `resourceOutput` or `resourceInput`. */
const resourcePointerOf = (action: Action) => action.resourceOutput ?? action.resourceInput;

/**
 * The resource that a node names in the input field of its resource pointer, with its field
 * lookup. None for an expression, or a value without a resource with a field lookup.
 */
export function fieldRefOfNode(
	node: Pick<WorkflowNode, 'type' | 'parameters'>,
	action: Action,
): FieldRef | undefined {
	const pointer = resourcePointerOf(action);
	const field = pointer && action.inputSchema.properties?.[pointer.input];
	return field && fieldRefOf(field, nodeInputOf(node, action)[pointer.input]);
}

/**
 * The fields of the resource each node reads, for actions with a resource pointer. The node
 * type gives the field lookup of the resource as a `loadOptions` method named by the resource
 * id, so the host runs it as a step: with the egress check and the eval mocks. The source binds
 * no credential, so the lookup uses the node's credential or else the sole stored credential
 * the action accepts. Best effort: a failed or slow lookup leaves the node out.
 */
export async function fetchResourceFields(
	context: InstanceAiContext,
	workflow: WorkflowJSON,
): Promise<ResourceLookups> {
	const none: ResourceLookups = { fields: new Map(), misses: new Map() };
	const explore = context.nodeService.exploreResources?.bind(context.nodeService);
	if (!explore) return none;
	const targets = workflow.nodes.flatMap((node) => {
		const action = actionOfNode(node);
		const ref = action && fieldRefOfNode(node, action);
		return action && node.name && ref ? [{ name: node.name, node, action, ref }] : [];
	});
	if (targets.length === 0) return none;
	const stored = await context.credentialService.list().catch(() => []);
	const timeoutMs =
		(await context.nodeService.resourceLookupTimeoutMs?.().catch(() => undefined)) ??
		RESOURCE_LOOKUP_TIMEOUT_MS;
	const fetched = await Promise.all(
		targets.map(async ({ name, node, action, ref }) => {
			const bound = Object.entries(node.credentials ?? {}).flatMap(([type, value]) =>
				action.credentialTypes.includes(type) && typeof value?.id === 'string'
					? [{ credentialType: type, credentialId: value.id }]
					: [],
			);
			const accepted = stored.filter(({ type }) => action.credentialTypes.includes(type));
			const [credential] =
				bound.length > 0
					? bound
					: accepted.length === 1
						? accepted.map(({ id, type }) => ({ credentialType: type, credentialId: id }))
						: [];
			const lookup = async (): Promise<Lookup> => {
				if (!credential) return { fields: [], outcome: 'no-credential' };
				const result = await explore({
					nodeType: node.type,
					version: node.typeVersion,
					methodName: ref.resource,
					methodType: 'loadOptions',
					currentNodeParameters: node.parameters ?? {},
					...credential,
				}).catch(() => undefined);
				// No fields is an answer, e.g. a sheet without header cells. A failure rejects.
				return result
					? {
							fields: result.results.map(({ name: field, value }) => ({ name: field, value })),
							outcome: result.mocked ? 'mocked' : 'ok',
						}
					: { fields: [], outcome: 'failed' };
			};
			const { fields, outcome } = await withTimeout(
				lookup(),
				{ fields: [], outcome: 'timeout' },
				timeoutMs,
			);
			context.logger.debug('Resource lookup for a node contract', {
				nodeName: name,
				resource: ref.resource,
				outcome,
				fields: fields.length,
			});
			return { name, fields, outcome };
		}),
	);
	return {
		fields: new Map(
			fetched.flatMap(
				({ name, fields }): Array<[string, ResourceField[]]> =>
					fields.length > 0 ? [[name, fields]] : [],
			),
		),
		misses: new Map(
			fetched.flatMap(
				({ name, fields, outcome }): Array<[string, LookupMiss]> =>
					fields.length === 0 && outcome !== 'ok' && outcome !== 'mocked' ? [[name, outcome]] : [],
			),
		),
	};
}

type Fixtures = NonNullable<WorkflowJSON['pinData']>;

// `.json` of the input item: `$json`, `$input.item.json`, `$input.first().json`, …
const ITEM_JSON =
	/\$json\b|\$input\s*\.\s*(?:item|first\(\s*\)|last\(\s*\)|all\(\s*\)\s*\[\s*\d+\s*\])\s*\.\s*json\b/g;
// `.json` of a named node: `$("Node").item.json`, `$("Node").first().json`, `$node["Node"].json`, …
const NODE_JSON =
	/\$\(\s*(['"])(.*?)\1\s*\)\s*\.\s*(?:item|first\(\s*\)|last\(\s*\)|all\(\s*\)\s*\[\s*\d+\s*\]|itemMatching\([^)]*\))\s*\.\s*json\b|\$node\[\s*(['"])(.*?)\3\s*\]\s*\.\s*json\b/g;
// The key that follows `.json`: `.key` or `["key"]`.
const KEY_READ = /^\s*(?:\.\s*([A-Za-z_$][\w$]*)|\[\s*(['"])(.*?)\2\s*\])/;

const keyAfter = (text: string, at: number) => {
	const match = KEY_READ.exec(text.slice(at));
	return match?.[1] ?? match?.[3];
};

/** A top-level key read of an output item. `nodeName` is absent for a read of the input item. */
export interface FieldRead {
	readonly nodeName?: string;
	readonly key: string;
}

/** The top-level key reads of `.json` in an expression or script, in text order. */
export const fieldReadsOf = (text: string): FieldRead[] =>
	[
		...[...text.matchAll(ITEM_JSON)].map((match) => ({ match, read: {} })),
		...[...text.matchAll(NODE_JSON)].map((match) => ({
			match,
			read: { nodeName: match[2] ?? match[4] ?? '' },
		})),
	]
		.sort((left, right) => left.match.index - right.match.index)
		.flatMap(({ match, read }) => {
			const key = keyAfter(text, match.index + match[0].length);
			return key === undefined ? [] : [{ ...read, key }];
		});

const scriptsOf = (node: WorkflowJSON['nodes'][number]) => [
	...expressionStrings(node.parameters),
	...javaScriptOf(node),
];

/**
 * n8n runs the action on its input without a credential or a request of its own, e.g. Set,
 * Filter or Code. Verification runs such a node, so it gets no synthesized fixture.
 */
export const runsLocally = ({ flow, output, credentialTypes, egress }: Action) =>
	credentialTypes.length === 0 &&
	egress === undefined &&
	(flow.effect === 'transform' || output.json['x-n8n-passed'] === true);

/**
 * The nodes whose `$json` is an output item of `nodeName`: its main children, and the children
 * of each local node that passes its items on unchanged.
 */
function itemReadersOf(workflow: WorkflowJSON, nodeName: string): Set<string> {
	const connections = toEngineConnections(workflow.connections);
	const passesOn = (name: string) => {
		const node = workflow.nodes.find((candidate) => candidate.name === name);
		const action = node && actionOfNode(node);
		return (
			action !== undefined && runsLocally(action) && action.output.json['x-n8n-passed'] === true
		);
	};
	const walk = (name: string, seen: ReadonlySet<string>): string[] =>
		getChildNodes(connections, name, NodeConnectionTypes.Main, 1)
			.filter((child) => !seen.has(child))
			.flatMap((child) =>
				passesOn(child) ? [child, ...walk(child, new Set([...seen, child]))] : [child],
			);
	return new Set(walk(nodeName, new Set([nodeName])));
}

/**
 * The top-level output keys of `nodeName` that the workflow reads: `$json` reads in the nodes
 * that read its items, and reads by node name anywhere.
 */
function readKeysOf(workflow: WorkflowJSON, nodeName: string): Set<string> {
	const readers = itemReadersOf(workflow, nodeName);
	return new Set(
		workflow.nodes.flatMap((node) =>
			scriptsOf(node).flatMap((text) =>
				fieldReadsOf(text)
					.filter((read) =>
						read.nodeName === undefined
							? node.name !== undefined && readers.has(node.name)
							: read.nodeName === nodeName,
					)
					.map(({ key }) => key),
			),
		),
	);
}

/**
 * An example value for each read key that an open output allows but the example lacks, so a
 * correct read of an open key does not resolve to empty. A key that the schema does not allow
 * stays absent.
 */
function readKeyExamples(
	schema: JsonSchema,
	example: Record<string, unknown>,
	keys: ReadonlySet<string>,
): Record<string, unknown> {
	const { patternProperties = {}, additionalProperties } = schema;
	return Object.fromEntries(
		[...keys].flatMap((key): Array<[string, unknown]> => {
			if (key in example || schema.properties?.[key]) return [];
			const child =
				Object.entries(patternProperties).find(([pattern]) => safeRegex.test(pattern, key))?.[1] ??
				(additionalProperties === true ? {} : additionalProperties || undefined);
			if (!child) return [];
			return [[key, child.type === undefined ? `example ${key}` : exampleOf(child)]];
		}),
	);
}

/** `sample` with the fields it leaves out taken from `example`, at any depth. */
const filledSample = (
	example: Record<string, unknown>,
	sample: object,
): Record<string, unknown> => ({
	...example,
	...Object.fromEntries(
		Object.entries(sample).map(([key, value]: [string, unknown]) => {
			const fill = example[key];
			return [key, isRecord(fill) && isRecord(value) ? filledSample(fill, value) : value];
		}),
	),
});

/** The names of the contract action nodes that run locally (`true`) or call a service (`false`). */
const actionNodeNames = (workflow: WorkflowJSON, local: boolean) =>
	new Set(
		workflow.nodes.flatMap((node) => {
			const action = actionOfNode(node);
			return node.name && action && runsLocally(action) === local ? [node.name] : [];
		}),
	);

/**
 * One example item for each contract node that calls a service, and for a declared sample of
 * such a node, the sample with the fields it leaves out taken from the example. Verification then
 * simulates read nodes instead of calling the service, and needs no LLM to invent the output of
 * simulated write nodes. Local nodes run on their real input, also with a sample. Other declared
 * fixtures stay as they are.
 */
export function synthesizedFixtures(
	workflow: WorkflowJSON,
	declared: Fixtures = {},
	resourceFields: ResourceFields = new Map(),
): Fixtures {
	const local = actionNodeNames(workflow, true);
	const synthesized = workflow.nodes.flatMap((node): Array<[string, Fixtures[string]]> => {
		const action = actionOfNode(node);
		if (!action || !node.name || local.has(node.name)) return [];
		const given = declared[node.name];
		const schema = outputOf(action, nodeInputOf(node, action), resourceFields.get(node.name));
		const example = exampleOf(schema);
		if (!isRecord(example)) return given ? [[node.name, given]] : [];
		const item = {
			...example,
			...readKeyExamples(schema, example, readKeysOf(workflow, node.name)),
		};
		const items: object[] = given?.map((sample) => filledSample(item, sample)) ?? [item];
		return [[node.name, items.map((filled) => Object.fromEntries(Object.entries(filled)))]];
	});
	const kept = Object.entries(declared).filter(([name]) => !local.has(name));
	return { ...Object.fromEntries(kept), ...Object.fromEntries(synthesized) };
}

/**
 * The origin of each fixture of {@link synthesizedFixtures}. A service node's sample is filled
 * from the example, so its fixture has the origin of the example, and {@link sampledKeysOf}
 * names the keys that the sample gives.
 */
export function fixtureOriginsOf(
	workflow: WorkflowJSON,
	fixtures: Fixtures,
	declared: Fixtures = {},
	resourceFields: ResourceFields = new Map(),
): Record<string, FixtureOrigin> {
	const filled = actionNodeNames(workflow, false);
	const declaresOutput = (name: string) => {
		const node = workflow.nodes.find((candidate) => candidate.name === name);
		return node !== undefined && declaredOutputOf(node) !== undefined;
	};
	return Object.fromEntries(
		Object.keys(fixtures).map((name): [string, FixtureOrigin] => [
			name,
			declared[name] && !filled.has(name)
				? 'sample'
				: resourceFields.has(name)
					? 'lookup'
					: declaresOutput(name)
						? 'declared'
						: 'synthesized',
		]),
	);
}

/** A read that build verification can do once: idempotent. */
const readsOnce = (action: Action) =>
	action.flow.effect === 'read' && action.flow.idempotent === true;

/** The set inputs that follow pages, e.g. HTTP `pages`: a page value below their top level. */
const pageInputsOf = (action: Action, input: Record<string, unknown>) =>
	Object.entries(action.inputSchema.properties ?? {}).flatMap(([key, field]) =>
		input[key] !== undefined && field['x-n8n-page'] === undefined && hasPageValue(field)
			? [key]
			: [],
	);

/**
 * The nodes that build verification reads live, so a drift check sees the real response: a read
 * action that is idempotent (`flow`), with a declared output and no `sample`. The contract flow is
 * the allow rule; for HTTP it is a GET, as RFC 9110 makes GET safe. A `sample` pins the step, so a
 * GET endpoint that changes state takes one. A paged read reads its first page, see
 * {@link firstPageOmissions}.
 */
export function liveReadNodeNames(workflow: WorkflowJSON, declared: Fixtures = {}): string[] {
	return workflow.nodes.flatMap((node) => {
		const action = actionOfNode(node);
		if (!action || !node.name || node.disabled || declared[node.name]?.length) return [];
		return readsOnce(action) && declaredOutputOf(node) !== undefined ? [node.name] : [];
	});
}

/**
 * The inputs of each live read that follow pages. Verification runs the read without them, so one
 * request gives the first page, and the drift check reads its items.
 */
export function firstPageOmissions(
	workflow: WorkflowJSON,
	liveReads: readonly string[],
): Array<{ nodeName: string; parameter: string }> {
	return workflow.nodes.flatMap((node) => {
		const nodeName = node.name;
		const action = nodeName && liveReads.includes(nodeName) ? actionOfNode(node) : undefined;
		return action && nodeName
			? pageInputsOf(action, nodeInputOf(node, action)).map((key) => ({
					nodeName,
					parameter: parameterPathOf(action.inputSchema, action.ui)(key),
				}))
			: [];
	});
}

/**
 * A note for each read with a `sample` and no declared shape, which {@link liveReadNodeNames}
 * would read live with one: the sample pins the step, so no run checks the real response.
 */
export function sampledReadIssues(
	workflow: WorkflowJSON,
	declared: Fixtures = {},
): ValidationWarning[] {
	return workflow.nodes.flatMap((node): ValidationWarning[] => {
		const action = actionOfNode(node);
		if (!action || !node.name || node.disabled || !declared[node.name]?.length) return [];
		const key = Object.entries(action.inputSchema.properties ?? {}).find(
			([, field]) => field['x-n8n-declared'] === true,
		)?.[0];
		if (key === undefined || nodeInputOf(node, action)[key] !== undefined || !readsOnce(action)) {
			return [];
		}
		return [
			{
				code: 'SAMPLE_PINS_READ',
				nodeName: node.name,
				severity: 'informational',
				message: `"${node.name}" has a \`sample\` and no \`${key}\`, so verification pins the sample and does not read the API. Replace the sample with \`${key}\`, the JSON Schema from the API docs: verification then reads it live and checks the response. Keep a sample only to skip the live read.`,
			},
		];
	});
}

/** `schema` with no field required at any depth: a sample gives only the fields that it needs. */
function partialOf(schema: JsonSchema): JsonSchema {
	const { additionalProperties, properties, items, anyOf, oneOf, patternProperties } = schema;
	const each = (children: Record<string, JsonSchema>) =>
		Object.fromEntries(Object.entries(children).map(([key, child]) => [key, partialOf(child)]));
	return {
		...Object.fromEntries(Object.entries(schema).filter(([key]) => key !== 'required')),
		...(properties ? { properties: each(properties) } : {}),
		...(patternProperties ? { patternProperties: each(patternProperties) } : {}),
		...(items ? { items: partialOf(items) } : {}),
		...(anyOf ? { anyOf: anyOf.map(partialOf) } : {}),
		...(oneOf ? { oneOf: oneOf.map(partialOf) } : {}),
		...(isRecord(additionalProperties)
			? { additionalProperties: partialOf(additionalProperties) }
			: {}),
	};
}

// One warning names this many issues of a node, as the output drift warning of verification.
const MAX_SAMPLE_ISSUES = 10;

/**
 * One informational warning for each contract node whose `sample` items do not fit its output
 * schema: the output for its parameters and resource fields, e.g. after a declared HTTP `schema`.
 * The sample types the output and pins the step in verification, so a wrong one hides a defect.
 * A field that the sample leaves out is no issue.
 */
export function sampleSchemaIssues(
	workflow: WorkflowJSON,
	declared: Fixtures = {},
	resourceFields: ResourceFields = new Map(),
): ValidationWarning[] {
	return workflow.nodes.flatMap((node): ValidationWarning[] => {
		const action = actionOfNode(node);
		const items = node.name ? declared[node.name] : undefined;
		if (!action || !node.name || !items?.length) return [];
		const schema = partialOf(
			outputItemSchema(outputOf(action, nodeInputOf(node, action), resourceFields.get(node.name))),
		);
		const issues = [
			...new Set(
				items.flatMap((item) =>
					validate(item, schema, { path: '$json' }).map((issue) =>
						issue.replace(/\[\d+\]/g, '[]').replace(/, got .*$/, ''),
					),
				),
			),
		];
		if (issues.length === 0) return [];
		const shown = issues.slice(0, MAX_SAMPLE_ISSUES).join('; ');
		const more =
			issues.length > MAX_SAMPLE_ISSUES ? ` (${issues.length - MAX_SAMPLE_ISSUES} more)` : '';
		return [
			{
				code: 'SAMPLE_SCHEMA_MISMATCH',
				nodeName: node.name,
				severity: 'informational',
				message: `"${node.name}": the sample does not match the output schema: ${shown}${more}. Fix the sample to match the real output.`,
			},
		];
	});
}

/**
 * Splits the fixtures of the live reads out: verification runs a live read, and pins its fixture
 * only when the read fails. A node with a mocked credential cannot read, so its fixture stays.
 */
export function splitLiveReadFixtures(
	fixtures: Fixtures,
	liveReads: readonly string[],
	mockedNodeNames: readonly string[] = [],
): { pinned: Fixtures; liveReadFallbacks: Fixtures } {
	const live = new Set(
		liveReads.filter((name) => !mockedNodeNames.includes(name) && fixtures[name]?.length),
	);
	const entries = Object.entries(fixtures);
	return {
		pinned: Object.fromEntries(entries.filter(([name]) => !live.has(name))),
		liveReadFallbacks: Object.fromEntries(entries.filter(([name]) => live.has(name))),
	};
}

/** The top-level keys that the sample of a service node gives, in any item, by node name. */
export function sampledKeysOf(
	workflow: WorkflowJSON,
	declared: Fixtures = {},
): Record<string, string[]> {
	return Object.fromEntries(
		[...actionNodeNames(workflow, false)].flatMap((name) => {
			const given = declared[name];
			return given ? [[name, [...new Set(given.flatMap((item) => Object.keys(item)))]]] : [];
		}),
	);
}

/**
 * The input fields that the resource fields of a node type, from the action's `resourceInput`
 * pure hatch, as one object schema. None without fields, or when the hatch types no field.
 */
export function resourceInputOf(
	action: Action,
	input: Record<string, unknown>,
	fields: readonly ResourceField[] | undefined,
): JsonSchema | undefined {
	if (!fields?.length || !action.resourceInput) return undefined;
	const properties = action.inputSchema.properties ?? {};
	try {
		const typed = Object.entries(action.resourceInput.toInput(fields, input)).flatMap(
			([key, schema]): Array<[string, JsonSchema]> =>
				key in properties && schema ? [[key, schema]] : [],
		);
		if (typed.length === 0) return undefined;
		const required = action.inputSchema.required ?? [];
		return {
			type: 'object',
			properties: Object.fromEntries(typed),
			required: typed.flatMap(([key]) => (required.includes(key) ? [key] : [])),
			additionalProperties: false,
		};
	} catch {
		return undefined;
	}
}

/** The names of the `@n8n/workflow-sdk/next` types that a member text uses. */
const DECLARED_TYPES = ['Json', 'Maybe', 'OpenValue', 'Value'] as const;

/**
 * Output and input types for the nodes of a built workflow. The outputs come from each action's
 * `deriveOutput` or `resourceOutput` pure hatch: keyed by node name, they narrow `$('Node')` and
 * the next node's item in `tsc`. The inputs come from the `resourceInput` hatch, e.g. the keys of
 * a sheet row from its header cells. The nodes with `onError: 'continueRegularOutput'` go in
 * `ContinuedNodes`, so `tsc` types their items as the output or `{ error }`.
 */
export function nodeOutputsDeclaration(
	workflow: WorkflowJSON,
	resourceFields: ResourceFields = new Map(),
): string {
	const members = workflow.nodes.flatMap((node) => {
		const action = actionOfNode(node);
		const fields = node.name ? resourceFields.get(node.name) : undefined;
		if (!action || !node.name || !(action.deriveOutput || (fields && action.resourceOutput))) {
			return [];
		}
		const schema = outputOf(action, nodeInputOf(node, action), fields);
		// The default output types the node already.
		if (schema === action.output.json) return [];
		// A binary leaves the JSON, as in the generated `<Name>Output` type.
		const item = toTs(outputItemSchema(schema), { input: false, indent: '\t\t' });
		return [`\t\t${JSON.stringify(node.name)}: ${item};`];
	});
	// A routed contract step sends the error item to its last output, not to the one `Step` types.
	const continued = workflow.nodes.flatMap((node) =>
		node.name && node.onError === 'continueRegularOutput' && !actionOfNode(node)?.outputs
			? [`\t\t${JSON.stringify(node.name)}: true;`]
			: [],
	);
	const inputs = workflow.nodes.flatMap((node) => {
		const action = actionOfNode(node);
		const fields = node.name ? resourceFields.get(node.name) : undefined;
		const schema = action && resourceInputOf(action, nodeInputOf(node, action), fields);
		if (!schema || !node.name) return [];
		const typed = toTs(schema, { input: true, absentUndefined: true, indent: '\t\t' });
		return [`\t\t${JSON.stringify(node.name)}: ${typed};`];
	});
	if (members.length + continued.length + inputs.length === 0) return EMPTY_OUTPUTS;
	// skipLibCheck hides a name that does not resolve here, and tsc then reads it as `any`.
	const text = [...members, ...inputs].join('\n');
	const used = DECLARED_TYPES.filter((name) => new RegExp(`\\b${name}\\b`).test(text));
	return [
		used.length > 0
			? `import type { ${used.join(', ')} } from '@n8n/workflow-sdk/next';`
			: 'export {};',
		"declare module '@n8n/workflow-sdk/next' {",
		...(members.length > 0 ? ['\tinterface NodeOutputs {', ...members, '\t}'] : []),
		...(inputs.length > 0 ? ['\tinterface NodeInputs<I, C> {', ...inputs, '\t}'] : []),
		...(continued.length > 0 ? ['\tinterface ContinuedNodes {', ...continued, '\t}'] : []),
		'}',
		'',
	].join('\n');
}

/**
 * The egress check of each contract node, with the rules the host applies at run time: a
 * static host outside the hosts of the node's credential is an error, an expression is a
 * warning. A credential type with `baseUrl` takes its host from stored fields, so the build
 * cannot check it.
 */
export async function contractEgressWarnings(
	context: InstanceAiContext,
	workflow: WorkflowJSON,
): Promise<ValidationWarning[]> {
	const checks = await Promise.all(
		workflow.nodes.map(async (node): Promise<ValidationWarning[]> => {
			const action = actionOfNode(node) ?? toolActionOfNode(node);
			if (!action?.egress || !node.name || node.disabled) return [];
			const authentication = node.parameters?.authentication;
			const [bound] = Object.entries(node.credentials ?? {}).filter(
				([type]) =>
					action.credentialTypes.includes(type) &&
					(authentication === undefined || authentication === type),
			);
			const type = action.node.credential?.types.find(({ name }) => name === bound?.[0]);
			if (!bound || !type || type.baseUrl) return [];
			const [, { id, name }] = bound;
			const stored = id
				? await context.credentialService.getAllowedHttpRequestDomains?.(id).catch(() => undefined)
				: undefined;
			const issue = (severity: 'error' | 'warning', message: string): ValidationWarning => ({
				code: 'CONTRACT_EGRESS',
				message,
				nodeName: node.name,
				severity,
			});
			try {
				const hosts = credentialHostsOf(type, stored ?? {}, { surface: action.node.displayName });
				if (!hosts) return [];
				const { errors, warnings } = egressIssuesOf(action.egress, nodeInputOf(node, action), {
					name,
					hosts,
				});
				return [
					...errors.map((message) => issue('error', message)),
					...warnings.map((message) => issue('warning', message)),
				];
			} catch (error) {
				return [
					issue(
						'error',
						`Credential "${name}": ${error instanceof Error ? error.message : String(error)}`,
					),
				];
			}
		}),
	);
	return checks.flat();
}

/** The JavaScript field of each node type that runs JavaScript in the Code runner. */
const JAVASCRIPT_CODE_FIELDS: ReadonlyMap<string, string> = new Map([
	['n8n-nodes-base.code', 'jsCode'],
	['@n8n/nodes-core.codeJavaScript', 'code'],
]);

const expressionStrings = (value: unknown): string[] => {
	if (typeof value === 'string') return value.startsWith('=') ? [value] : [];
	if (Array.isArray(value)) return value.flatMap(expressionStrings);
	return isRecord(value) ? Object.values(value).flatMap(expressionStrings) : [];
};

function javaScriptOf({ type, parameters = {} }: WorkflowJSON['nodes'][number]): string[] {
	const field = JAVASCRIPT_CODE_FIELDS.get(type);
	const text = field === undefined ? undefined : parameters[field];
	const { language = 'javaScript' } = parameters;
	return language === 'javaScript' && typeof text === 'string' && !text.startsWith('=')
		? [text]
		: [];
}

/**
 * The strings the built workflow keeps as n8n expressions, and the JavaScript of its Code nodes,
 * for {@link EXPRESSIONS_PATH}. The type check finds the `expr()` call or literal of each in the
 * source and checks it in place. A constant that a lambda compiles to is quoted, so it is not in
 * the list.
 */
export function workflowExpressions(workflow: WorkflowJSON): string {
	const expressions = [
		...new Set(workflow.nodes.flatMap((node) => expressionStrings(node.parameters))),
	];
	const code = [...new Set(workflow.nodes.flatMap(javaScriptOf))];
	return expressions.length + code.length === 0
		? EMPTY_EXPRESSIONS
		: `${JSON.stringify({ expressions, code })}\n`;
}

/**
 * The run-time input validator on the fixed values of each contract node, so a value that the
 * action rejects (a pattern, a range, an enum, an expression in a plain field) fails the build
 * with its node and field, not the run. Expressions and placeholders wait for the run; the type
 * check reports a missing field.
 */
export function staticInputIssues(workflow: WorkflowJSON): string[] {
	return workflow.nodes.flatMap((node) => {
		const tool = toolActionOfNode(node);
		const action = actionOfNode(node) ?? tool;
		if (!action || !node.name || node.disabled) return [];
		const fields = action.inputSchema.properties ?? {};
		// The model fills a tool field that is one `$fromAI()` call, and the tool checks it.
		const fromModel = (value: unknown) =>
			tool !== undefined && typeof value === 'string' && isFromAIOnlyExpression(value);
		const input = Object.fromEntries(
			Object.entries(nodeInputOf(node, action)).filter(
				([, value]) => !hasPlaceholderDeep(value) && !fromModel(value),
			),
		);
		return validate(input, action.inputSchema, { allowExpressions: true })
			.filter((issue) => !issue.endsWith(': is required'))
			.map((issue) => `Node "${node.name}": ${withRefHint(issue, fields)}`);
	});
}

// A pattern miss of a top-level field, e.g. `input.spreadsheet: "Invoices" is not Spreadsheet ID`.
const FIELD_PATTERN_MISS = /^input\.(\w+): ".*" is not /;

/** A resource ID field (`x-n8n-ref`) that got another value, often the resource name. */
function withRefHint(issue: string, fields: Readonly<Record<string, JsonSchema>>): string {
	const key = FIELD_PATTERN_MISS.exec(issue)?.[1];
	return key !== undefined && fields[key]?.['x-n8n-ref'] !== undefined
		? `${issue}. Write its ID or URL, not its name: ask the user for the URL, or write placeholder('…') so that setup asks for it`
		: issue;
}

/**
 * A note for each `node({ type })` that a typed contract step can replace: the step of the same
 * resource and operation, or the module (e.g. HTTP Request, whose action follows the method).
 * Without a contract step, a flow step such as `set` or `merge` can replace it.
 * It does not block: no action declares a lossless map from the legacy parameters, so the step
 * can lack an option that the node uses. Nodes that the flow SDK makes itself (filter, switch,
 * loops) are not `node()` calls.
 */
export async function legacyNodeIssues(
	source: string,
	workflow: WorkflowJSON,
): Promise<ValidationWarning[]> {
	const { locateNextNodes } = await import('@n8n/workflow-sdk/next');
	const written = new Set(
		locateNextNodes(source).flatMap(({ name, type }) => (type === undefined ? [] : [name])),
	);
	return workflow.nodes.flatMap((node): ValidationWarning[] => {
		if (!node.name || !written.has(node.name) || actionOfNode(node)) return [];
		const replacement = contractReplacementOf(node);
		const flowStep = replacement ? undefined : coreStepRowOf(node.type);
		if (flowStep) {
			return [
				{
					code: 'CONTRACT_NODE_AVAILABLE',
					nodeName: node.name,
					severity: 'informational',
					message: `"${node.name}" is a legacy ${node.type} node. Use the flow step instead of node({ type }), unless it lacks an option that this node needs: ${flowStep}`,
				},
			];
		}
		if (!replacement) return [];
		const { nodeId, actions: own, exact } = replacement;
		const steps = own.map((action) => `${action.node.id}.${factoryPathOf(action)}`).join(', ');
		const from = `import { ${nodeId} } from '@n8n/nodes/${nodeId}'`;
		return [
			{
				code: 'CONTRACT_NODE_AVAILABLE',
				nodeName: node.name,
				severity: 'informational',
				message: exact
					? `"${node.name}" is a legacy ${node.type} node. Use the typed step ${steps} (${from}) instead of node({ type }), unless the step lacks an option that this node needs.`
					: `"${node.name}" is a legacy ${node.type} node. The typed module ${nodeId} (${from}) has ${steps}: use the step that does this job instead of node({ type }).`,
			},
		];
	});
}

const LOOKUP_MISS_TEXT: Readonly<Record<LookupMiss, string>> = {
	failed: 'failed',
	timeout: 'timed out',
	'no-credential': 'had no credential: bind one, or store exactly one that the step accepts',
};

/** A schema that takes any JSON value: tsc reads it as `Json`. */
const isOpenSchema = (schema: JsonSchema) =>
	schema.type === undefined &&
	schema.properties === undefined &&
	schema.anyOf === undefined &&
	schema.oneOf === undefined &&
	schema.enum === undefined &&
	schema.const === undefined;

/**
 * No branch of the output types `key`, and one branch takes it as any JSON value: an open key
 * space (`Json | undefined`), or a key pattern without a value type, e.g. Notion properties
 * before their lookup.
 */
function readsOpenKey(output: JsonSchema, key: string): boolean {
	const branches = output.anyOf ?? output.oneOf ?? [output];
	const patterns = (branch: JsonSchema) =>
		Object.entries(branch.patternProperties ?? {}).flatMap(([pattern, child]) =>
			safeRegex.test(pattern, key) ? [child] : [],
		);
	const types = (branch: JsonSchema) =>
		branch.properties?.[key] !== undefined ||
		patterns(branch).some((child) => !isOpenSchema(child));
	const open = (branch: JsonSchema) =>
		patterns(branch).length > 0 ||
		branch.additionalProperties === true ||
		branch.additionalProperties === undefined;
	return !branches.some(types) && branches.some(open);
}

/** A field that reads as `any` until the workflow declares its `schema`, e.g. a webhook `body`. */
const readsUndeclaredField = (output: JsonSchema, key: string) =>
	output.properties?.[key]?.['x-n8n-declared'] === true;

/** The output of the trigger that a node runs: a trigger of a contract package, or a native trigger. */
function triggerOutputOf(nodeType: string): JsonSchema | undefined {
	const entry = firstPartyCatalog().entries.find(
		({ manifest, nodeType: type }) =>
			manifest.kind === 'trigger' &&
			('native' in manifest ? manifest.native.type : type) === nodeType,
	);
	return entry?.manifest.contract.output;
}

const MAX_LISTED_KEYS = 5;

/**
 * One informational line for each node whose resource fields would type its input, e.g. the
 * `values` keys of a sheet row, where the build has no such types: the field lookup missed, the
 * input field names no resource with a field lookup (an expression, a sheet by ID), or the hatch
 * types nothing for these parameters (another header row).
 */
export function untypedInputIssues(
	workflow: WorkflowJSON,
	lookups: ResourceLookups = { fields: new Map(), misses: new Map() },
): ValidationWarning[] {
	return workflow.nodes.flatMap((node): ValidationWarning[] => {
		const action = actionOfNode(node);
		const pointer = action?.resourceInput;
		const name = node.name;
		if (!action || !pointer || !name || node.disabled) return [];
		const input = nodeInputOf(node, action);
		if (resourceInputOf(action, input, lookups.fields.get(name))) return [];
		const resource = fieldRefOfNode(node, action)?.resource;
		const miss = lookups.misses.get(name);
		const reason =
			resource === undefined
				? `${pointer.input} names no resource with a field lookup, e.g. it is an expression`
				: miss === undefined
					? `the ${resource} field lookup types no input for these parameters`
					: `the ${resource} field lookup ${LOOKUP_MISS_TEXT[miss]}`;
		return [
			{
				code: 'UNTYPED_INPUT',
				nodeName: name,
				severity: 'informational',
				message: `"${name}": the input fields that the ${pointer.input} fields type are open (${reason}), so tsc does not check their key names.`,
			},
		];
	});
}

/**
 * One informational line for each node whose output keys the workflow reads, where `tsc` cannot
 * type them: a `node()` or `trigger()` without `sample` items (its item is `Loose`), a trigger
 * field without a `schema`, and an open output key that a failed resource lookup or the output
 * type leaves undeclared. Each line names the node, the keys and why.
 */
export async function untypedOutputIssues(
	source: string,
	workflow: WorkflowJSON,
	declared: Fixtures = {},
	lookups: ResourceLookups = { fields: new Map(), misses: new Map() },
): Promise<ValidationWarning[]> {
	const { locateNextNodes } = await import('@n8n/workflow-sdk/next');
	const written = new Set(
		locateNextNodes(source).flatMap(({ name, type }) => (type === undefined ? [] : [name])),
	);
	return workflow.nodes.flatMap((node): ValidationWarning[] => {
		const name = node.name;
		if (!name || node.disabled) return [];
		const items = declared[name] ?? [];
		const reads = [...readKeysOf(workflow, name)];
		const unsampled = reads.filter((key) => !items.some((item) => key in item));
		const issue = (
			keys: readonly string[],
			reason: string,
			fix: string,
			unchecked = 'them',
		): ValidationWarning[] => {
			if (keys.length === 0) return [];
			const listed = keys.slice(0, MAX_LISTED_KEYS).join(', ');
			const more = keys.length > MAX_LISTED_KEYS ? ', …' : '';
			return [
				{
					code: 'UNTYPED_OUTPUT',
					nodeName: name,
					severity: 'informational',
					message: `"${name}": reads of ${listed}${more} are untyped (${reason}), so tsc does not check ${unchecked}. ${fix}`,
				},
			];
		};
		const action = actionOfNode(node);
		if (!action) {
			const triggerOutput = triggerOutputOf(node.type);
			if (triggerOutput) {
				// A trigger sample has every field of the example, so only a filled value declares one.
				const filled = (key: string) =>
					items.some((item) => isRecord(item[key]) && Object.keys(item[key]).length > 0);
				return issue(
					reads.filter((key) => readsUndeclaredField(triggerOutput, key) && !filled(key)),
					'no `schema` declares them',
					'Declare their fields in the trigger `schema`.',
				);
			}
			return written.has(name) && items.length === 0
				? issue(reads, 'node() and trigger() have no output type', 'Give it `sample` items.')
				: [];
		}
		if (action.output.json['x-n8n-passed'] === true) return [];
		const output = outputOf(action, nodeInputOf(node, action), lookups.fields.get(name));
		const miss = lookups.misses.get(name);
		const resource = fieldRefOfNode(node, action)?.resource;
		const lookup = resource === undefined ? 'the field lookup' : `the ${resource} field lookup`;
		const declaredInput = Object.entries(action.inputSchema.properties ?? {}).find(
			([, field]) => field['x-n8n-declared'] === true,
		)?.[0];
		return issue(
			unsampled.filter((key) => readsOpenKey(output, key)),
			miss === undefined
				? 'the output type does not declare them'
				: `${lookup} ${LOOKUP_MISS_TEXT[miss]}`,
			declaredInput === undefined
				? 'Give the step `sample` items.'
				: `Give the step \`${declaredInput}\`, the JSON Schema from the API docs, or \`sample\` items.`,
			// An open key is `Json`, so tsc makes a read narrow the value, but it accepts any key name.
			'the key names',
		);
	});
}

/** The connection types of description inputs or outputs. An expression gives the `builderHint` keys, if any. */
const connectionTypesOf = (
	entries: string | ReadonlyArray<string | { readonly type: string }>,
	hint: object | undefined,
): ReadonlySet<string> | undefined =>
	typeof entries === 'string'
		? hint && new Set(Object.keys(hint))
		: new Set(entries.map((entry) => (typeof entry === 'string' ? entry : entry.type)));

const slotOf = (connection: string) =>
	isProviderConnection(connection) ? PROVIDER_FIELDS[connection] : connection;

/** The description of a node at its version, or why the instance has no such node type or version. */
function descriptionAt(
	nodeTypes: INodeTypes,
	node: WorkflowJSON['nodes'][number],
	source: DeriveSource,
): INodeTypeDescription | string {
	const { type, typeVersion } = node;
	const noVersion = (versions: readonly number[]) =>
		`${type} has no version ${typeVersion}. Versions: ${versions.join(', ')}.`;
	try {
		// A node type with one class returns that class for any version, so the version list decides.
		const { description } = nodeTypes.getByNameAndVersion(type, typeVersion);
		const versions = [description.version].flat();
		return versions.includes(typeVersion) ? description : noVersion(versions);
	} catch (error) {
		return error instanceof NodeVersionNotFoundError
			? noVersion(error.availableVersions)
			: missingNodeTypeIssue(type, source);
	}
}

const UNKNOWN_PARAMETER_CODE = 'UNKNOWN_PARAMETER';
const NODE_VERSION_NOT_FOUND_CODE = 'NODE_VERSION_NOT_FOUND';
const PROVIDER_SLOT_MISMATCH_CODE = 'PROVIDER_SLOT_MISMATCH';
const CREDENTIAL_TYPE_NOT_FOUND_CODE = 'CREDENTIAL_TYPE_NOT_FOUND';

type DescribedNode = {
	node: WorkflowJSON['nodes'][number];
	description: INodeTypeDescription;
};

/**
 * The checks of the nodes that `node()`, `provider()` or `trigger()` writes, which `tsc` cannot
 * type. Blocking warnings: a version that the node type does not have, a provider that does not
 * give the connection type of its slot or a root node that has no such slot, and a credential type
 * that the instance does not have. They are warnings, not compile errors, so that an edit build
 * can downgrade them on a saved node that it did not change. Informational warnings: top-level
 * parameters that the node type does not have.
 */
export async function untypedNodeIssues(
	source: string,
	workflow: WorkflowJSON,
	context: Pick<InstanceAiContext, 'nodeTypesProvider' | 'credentialService'>,
): Promise<ValidationWarning[]> {
	const nodeTypes = context.nodeTypesProvider;
	if (!nodeTypes) return [];
	const blocking = (code: string, nodeName: string, message: string): ValidationWarning => ({
		code,
		nodeName,
		severity: 'warning',
		message,
	});
	const { locateNextNodes } = await import('@n8n/workflow-sdk/next');
	const lines = new Map(
		locateNextNodes(source).flatMap(
			({ name, type, line }): Array<[string, number]> => (type === undefined ? [] : [[name, line]]),
		),
	);
	const at = (name: string) => `"${name}" (line ${lines.get(name)})`;
	const written = workflow.nodes.flatMap((node) =>
		node.name && lines.has(node.name) && !isContractNodeType(node.type)
			? [{ node, name: node.name, description: descriptionAt(nodeTypes, node, context) }]
			: [],
	);
	const described = new Map(
		written.flatMap(
			({ node, name, description }): Array<[string, DescribedNode]> =>
				typeof description === 'string' ? [] : [[name, { node, description }]],
		),
	);

	const versionIssues = written.flatMap(({ name, description }) =>
		typeof description === 'string'
			? [blocking(NODE_VERSION_NOT_FOUND_CODE, name, `${at(name)}: ${description}`)]
			: [],
	);

	const providerEdges = Object.entries(toEngineConnections(workflow.connections)).flatMap(
		([from, byType]) =>
			Object.entries(byType).flatMap(([connection, groups]) =>
				connection === NodeConnectionTypes.Main
					? []
					: groups
							.flatMap((group) => group ?? [])
							.map(({ node: to }) => ({ from, to, connection })),
			),
	);
	const slotIssues = providerEdges.flatMap(({ from, to, connection }) => {
		const provider = described.get(from);
		const root = described.get(to);
		const gives =
			provider &&
			connectionTypesOf(provider.description.outputs, provider.description.builderHint?.outputs);
		const takes =
			root && connectionTypesOf(root.description.inputs, root.description.builderHint?.inputs);
		const slots = [...(takes ?? [])].filter((type) => type !== NodeConnectionTypes.Main);
		return [
			...(provider && gives && !gives.has(connection)
				? [
						blocking(
							PROVIDER_SLOT_MISMATCH_CODE,
							from,
							`${at(from)}: ${provider.node.type} gives ${[...gives].join(', ')}, not ${connection}. It cannot be the ${slotOf(connection)} of "${to}".`,
						),
					]
				: []),
			...(root && takes && !takes.has(connection)
				? [
						blocking(
							PROVIDER_SLOT_MISMATCH_CODE,
							to,
							`${at(to)}: ${root.node.type} has no ${slotOf(connection)} slot (${connection}). Its slots: ${slots.map(slotOf).join(', ') || 'none'}.`,
						),
					]
				: []),
		];
	});

	const credentialTypeExists = context.credentialService.credentialTypeExists?.bind(
		context.credentialService,
	);
	const credentialChecks = [...described].flatMap(([name, { node, description }]) =>
		[
			...new Set(
				description.properties
					.filter(({ type }) => type === 'credentialsSelect')
					.map((property) => property.name),
			),
		].flatMap((parameter) => {
			const value = node.parameters?.[parameter];
			return typeof value === 'string' &&
				value !== '' &&
				!value.startsWith('=') &&
				value !== TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE
				? [{ name, parameter, value }]
				: [];
		}),
	);
	const credentialIssues = credentialTypeExists
		? (
				await Promise.all(
					credentialChecks.map(async ({ name, parameter, value }) =>
						// A failed lookup does not block the build.
						(await credentialTypeExists(value).catch(() => true))
							? []
							: [
									blocking(
										CREDENTIAL_TYPE_NOT_FOUND_CODE,
										name,
										`${at(name)}: ${parameter} "${value}" is not a credential type of this instance. Find the type with credentials(action="search-types").`,
									),
								],
					),
				)
			).flat()
		: [];

	const parameterIssues = [...described].flatMap(
		([name, { node, description }]): ValidationWarning[] => {
			const known = new Set(description.properties.map((property) => property.name));
			const unknown = Object.keys(node.parameters ?? {}).filter((key) => !known.has(key));
			if (unknown.length === 0) return [];
			const entries = [...known].map((key) => ({ key }));
			const keys = unknown.map((key) => {
				const [nearest] = sublimeSearch(key, entries, [{ key: 'key', weight: 1 }], 1);
				return nearest ? `"${key}" (did you mean "${nearest.item.key}"?)` : `"${key}"`;
			});
			return [
				{
					code: UNKNOWN_PARAMETER_CODE,
					nodeName: name,
					severity: 'informational',
					message: `${at(name)}: ${node.type} has no parameter ${keys.join(', ')}. Find its parameters with nodes(action="type-definition").`,
				},
			];
		},
	);

	return [...versionIssues, ...slotIssues, ...credentialIssues, ...parameterIssues];
}

const TYPECHECK_TIMEOUT_MS = 60_000;

/** The errors of the type check, and why it did not complete, if it did not. */
export interface WorkflowTypecheck {
	readonly errors: string[];
	readonly incomplete?: string;
}

const typecheckErrors = z.array(z.string());

const parseTypecheckErrors = (stdout: string): string[] | undefined => {
	try {
		const parsed = typecheckErrors.safeParse(JSON.parse(stdout));
		return parsed.success ? parsed.data : undefined;
	} catch {
		return undefined;
	}
};

const STDERR_TAIL = 1_000;

const UNTYPED_HINT =
	'This value has no type. Fix the first error before it first. Else type the node before it: a webhook or HTTP `schema`, `sample` items, or `returns` on a code step.';

/** The macros of `@n8n/workflow-sdk/next`, for the hint on a step method. */
export const FLOW_MACROS = [
	'steps',
	'route',
	'when',
	'switchOn',
	'forEach',
	'loop',
	'paginate',
	'pollUntil',
	'filter',
	'merge',
	'onError',
	'recover',
	'group',
] as const;

/** A message on a type that is a union at the top level, e.g. `on type '{ a: 1; } | Out'`. */
const unionTypeMessage = {
	test: (message: string) => {
		const type = /on type '(.*)'\.?$/.exec(message)?.[1] ?? '';
		// The `>` of an arrow `=>` closes no bracket.
		const closes = (index: number) =>
			'}])>'.includes(type.charAt(index)) && type.charAt(index - 1) !== '=';
		return [...type].reduce<{ depth: number; union: boolean }>(
			({ depth, union }, char, index) => ({
				depth: depth + ('{[(<'.includes(char) ? 1 : 0) - (closes(index) ? 1 : 0),
				union: union || (depth === 0 && type.startsWith(' | ', index)),
			}),
			{ depth: 0, union: false },
		).union;
	},
};

/** A typed module that the source imports from the flow API, e.g. `noOp`. */
function moduleImportHint(error: string): string | undefined {
	const name = /has no exported member '(\w+)'/.exec(error)?.[1];
	if (name === undefined || !nextNodeIds.includes(name)) return undefined;
	const step = contractActions().find((action) => action.node.id === name && !action.inputs);
	const call = step ? ` Call its steps as members, e.g. \`${step.id}({ name })\`.` : '';
	return `\`${name}\` is a typed module, not part of the flow API: \`import { ${name} } from '@n8n/nodes/${name}'\`.${call}`;
}

/** A name of a typed module, alone or joined to a step, e.g. `items_removeDuplicates`. */
function moduleNameHint(error: string): string | undefined {
	const name = /Cannot find name '(\w+)'/.exec(error)?.[1];
	const id = nextNodeIds.find((nodeId) => name === nodeId || name?.startsWith(`${nodeId}_`));
	if (name === undefined || id === undefined) return undefined;
	const path = name.split('_').join('.');
	const step = contractActions().some((action) => action.id === path) ? path : `${id}.<step>`;
	return `\`${id}\` is a typed module: \`import { ${id} } from '@n8n/nodes/${id}'\`. Call its steps as members, e.g. \`${step}({ name, … })\`.`;
}

/** A module or resource object of a typed module, e.g. `'{ pass: <In, Ctx, …'`. */
const MODULE_OBJECT = /[Tt]ype '\{ (?:(\w+): \{ )?(\w+): <In, Ctx\b/;

const moduleStepHint = (lead: string) => (_macros: string, error: string) => {
	const [, resource, step] = MODULE_OBJECT.exec(error) ?? [];
	const path = [resource, step].filter((part) => part !== undefined).join('.');
	return `${lead} Call a step that its type lists, e.g. \`.${path}({ name })\`. \`nodes(action="type-definition")\` shows them all.`;
};

const UNDEFINED_LAMBDA_HINT =
	"The lambda can return undefined, but the field takes no undefined. Give the missing case a value, e.g. `item.f ?? ''`. A field of an item can be missing: a file name of a `binary`, a webhook `schema` field without `required`, an output field of a failed item (`onError: 'continueRegularOutput'`).";

const UNDEFINED_HINT =
	"The value can be undefined. After a step with `onError: 'continueRegularOutput'`, check `item.error === undefined` first: then its output fields are set. A `schema` field is optional until its `required` list names it: add it there if the data always has it. Else give a default, e.g. `item.f ?? ''`.";

const OPEN_OUTPUT_HINT =
	"The output type does not declare this key, so its value is any JSON value or undefined (`Json | undefined`). Read a field that the type lists, type the step with `sample` items or an HTTP `schema`, or narrow the value: `typeof v === 'string' ? v : ''`.";

const NULLISH_HINT =
	"The value can be null or undefined: an optional output field, or a key that the output does not declare (`Json | undefined`). Check it first, e.g. `item.f ?? ''`, or read a field that the type lists.";

const LOOP_STATE_HINT =
	'The loop state has the type of the item before `loop`, and `next` returns it. Put a `set` of only the state fields before `loop`. Then end the body with a `set` of the same fields, or return them from `next`.';

/**
 * A fix in the flow SDK for a frequent `tsc` error of a workflow source, by code and by the first
 * line of the message. `detail` must also match the full error text, when given. `macros` are
 * the macros of the flow SDK. The first rule that matches and gives a hint wins.
 */
const TSC_HINTS: ReadonlyArray<{
	readonly codes: readonly number[];
	readonly message: Pick<RegExp, 'test'>;
	readonly detail?: RegExp;
	readonly hint: (macros: string, error: string) => string | undefined;
}> = [
	{
		codes: [2339, 2551],
		message: /on type '(?:Routed)?Step<|on type 'Trigger<|on type 'Region</,
		hint: (macros) =>
			`A step has no methods. A workflow is a flat list: \`workflow(name, trigger, stepA, stepB)\`. Macros: ${macros}.`,
	},
	{
		codes: [2339],
		message: MODULE_OBJECT,
		hint: moduleStepHint('This typed module or resource has no step of this name.'),
	},
	{
		codes: [2349],
		message: /^This expression is not callable/,
		detail: MODULE_OBJECT,
		hint: moduleStepHint('A typed module is an object of steps, not a function.'),
	},
	{
		codes: [2349],
		message: /^This expression is not callable/,
		hint: () =>
			"This value is not a function. A lambda gets the item first and `$` second: `(item, $) => $('Node').field`, not `($) => …`.",
	},
	{
		codes: [2345],
		// The body gave no output type, e.g. an array instead of one part.
		message: /to parameter of type 'LoopConfig<"[^"]*", unknown, unknown>/,
		hint: () =>
			'The loop body has no type, so `out` is `unknown`. A body takes one part: a step, a macro, or `steps(a, b)` for several, not an array `[a, b]`.',
	},
	{
		codes: [2345],
		message: /to parameter of type 'LoopConfig</,
		detail: /Property 'next' is missing/,
		hint: () => LOOP_STATE_HINT,
	},
	{
		codes: [2322],
		message: /^Type '\(.*' is not assignable to type '\(out: /,
		// `until` also reads `out`, but returns a boolean.
		detail: /^(?![\s\S]*to type 'boolean')/,
		hint: () => LOOP_STATE_HINT,
	},
	{
		codes: [2339],
		message: /^Property 'group' does not exist on type 'Workflow'/,
		hint: () =>
			'A group is a part of the list: `group({ name, description }, steps(stepA, stepB))`. It frames its nodes on the canvas.',
	},
	{
		codes: [2558],
		message: /^Expected \d+(?:-\d+)? type arguments/,
		hint: () =>
			'Remove the type arguments: a step infers its types. Give `node()` or `trigger()` `sample` items to type its output.',
	},
	{
		codes: [2322],
		message: /^Type '"continueErrorOutput"' is not assignable/,
		hint: () =>
			"Do not set `onError: 'continueErrorOutput'`. Put `onError(part)` after the step: it takes the errors of the step and sets its error output.",
	},
	{
		codes: [2339],
		message: /^Property 'settings' does not exist on type 'Workflow'/,
		hint: () =>
			"Workflow settings go in the first argument: `workflow({ name, settings: { errorWorkflow: '<id>' } }, trigger, …)`.",
	},
	{
		codes: [2322, 2559],
		message: /^Type '.*\[\]' has no properties in common with type 'Part</,
		hint: () =>
			'A branch or a body takes one part. Put several parts in `steps(a, b)`, not in an array `[a, b]`.',
	},
	{
		codes: [2322, 2559],
		message: /has no properties in common with type 'Part</,
		hint: () =>
			'A branch or a body takes one part: a step, a macro, or `steps(a, b)` for several. It is not a function.',
	},
	{
		codes: [2322],
		message: /^Type '(?:Routed)?(?:Step|Region)<.*' is not assignable to type 'never'/,
		hint: () =>
			'This key is no output name of the step in `route`, or no value of the `switchOn` field. Use a name that the type lists.',
	},
	{
		codes: [2554],
		message: /^Expected 1 arguments, but got 2\b/,
		hint: () =>
			"A step takes one object with its `name` in it: `node({ name: 'Fetch', type, version, parameters })`, not `node('Fetch', { … })`.",
	},
	{
		codes: [2554],
		message: /^Expected \d+-\d+ arguments/,
		hint: () =>
			'`workflow()` takes 40 parts after the trigger, and `steps()` takes 20. Put the rest in a last `steps(…)`.',
	},
	{
		codes: [2339],
		message: /on type 'never'/,
		hint: () =>
			'This value has no fields. Items are plain JSON: write `item.field`, not `item.json.field`. Give the trigger `sample` items to type its fields.',
	},
	{
		codes: [2339],
		message: /on type '\{\}'/,
		hint: () =>
			"This field has no declared type, so `x ?? []` or a check such as `x ? x.f : …` leaves `{}`, which has no fields. Give the node that outputs it a webhook or HTTP `schema`, `sample` items, or `returns` on a code step. Else narrow each level: `typeof x === 'object' && x !== null && 'f' in x`.",
	},
	{
		// A failed item lists the output fields, so the field is in no shape.
		codes: [2339, 2551],
		message: /on type '.*\bFailedItem\b/,
		hint: () =>
			'The step before has no output field of this name. With `onError: \'continueRegularOutput\'`, an item is its output, or only `{ error }` when it fails on the item. Use a field that the output type lists: `nodes(action="type-definition")` shows them.',
	},
	{
		codes: [2339],
		message: /^Property 'message' does not exist on type 'string'/,
		hint: () =>
			'The `error` of a failed item is the error message as text. Read `item.error`, not `item.error.message`.',
	},
	{
		codes: [2322, 2339, 2345, 2362, 2363, 2365],
		// `Json`, as tsc prints it with or without its name.
		message: /type '(?:Json\b|string \| number \| boolean \| (?:Json\[\]|\(string \| number))/,
		hint: () => OPEN_OUTPUT_HINT,
	},
	{ codes: [18049], message: /is possibly 'null' or 'undefined'/, hint: () => NULLISH_HINT },
	{
		codes: [2339],
		message: unionTypeMessage,
		hint: () =>
			"The value has one of several shapes, e.g. after `recover` or `merge`, and only some have this field. Narrow it first: `'f' in item ? item.f : …`. Or give every branch the field.",
	},
	{
		codes: [2769],
		message: /^No overload matches this call/,
		detail: /does not exist in type 'NodeConfig</,
		hint: () =>
			'`node()` takes one flat object: `node({ name, type, version, parameters, settings })`. Put the node parameters in `parameters`, not in `config`. Write `version`, not `typeVersion`.',
	},
	{
		codes: [2322, 2345],
		message:
			/(?:^|: )(?:Type|Argument of type) 'Expr<.*' is not assignable to (?:parameter of )?type '\(/,
		hint: () =>
			"`expr('{{ … }}')` fits a value field, not `if`, `until`, `next` or a binary field. Write a lambda here: `(item, $) => …`.",
	},
	{ codes: [18046], message: /^'[\w$]+' is of type 'unknown'/, hint: () => UNTYPED_HINT },
	{
		codes: [18046],
		message: /is of type 'unknown'/,
		hint: () =>
			'This field has no declared type. Declare it where the data enters (a webhook or HTTP `schema`, `sample` items, or `returns` on a code step), or narrow it first, e.g. `Array.isArray(item.list)`.',
	},
	{ codes: [2571], message: /is of type 'unknown'/, hint: () => UNTYPED_HINT },
	{
		codes: [7006],
		message: /implicitly has an 'any' type/,
		hint: () =>
			'This lambda gets no parameter types: the field it fills or the value it maps has the type `any`. Give the step that outputs the value a webhook or HTTP `schema`, or `sample` items. For a field, use a typed step, e.g. the flow `set({ name, fields })`. Do not annotate the parameters.',
	},
	{
		codes: [2322],
		message: /^Type '\(.*\) => [^']*\| undefined' is not assignable/,
		// Only `undefined` misses the field type, not another type.
		detail: /\n\s*Type 'undefined' is not assignable/,
		hint: () => UNDEFINED_LAMBDA_HINT,
	},
	{
		codes: [2322, 2345],
		message: /(?:^|: )(?:Type|Argument of type) '.*\| undefined' is not assignable/,
		hint: () => UNDEFINED_HINT,
	},
	{ codes: [18048, 2532], message: /is possibly 'undefined'/, hint: () => UNDEFINED_HINT },
	{
		codes: [2322, 2345],
		message: /(?:^|: )(?:Type|Argument of type) 'unknown' is not assignable/,
		hint: () => UNTYPED_HINT,
	},
	{
		codes: [2345],
		message: /^Argument of type '"[^"]*"' is not assignable to parameter of type 'never'/,
		hint: () =>
			"`$('Node')` reads only a node that runs before this one on the same path, by its exact `name`. If an earlier error breaks the list, fix it first.",
	},
	{
		codes: [2322, 2345, 2739, 2740, 2741],
		message: /^/,
		detail: /missing the following propert|is missing in type/,
		hint: () =>
			'Add the fields that the message names. `nodes(action="type-definition")` shows the full type.',
	},
	{
		codes: [2353],
		message: /does not exist in type 'ValueSchema'/,
		hint: (_macros, error) => {
			const field = /and '([^']+)' does not exist/.exec(error)?.[1] ?? 'field';
			return `A \`schema\` is JSON Schema: type, properties, required, items, enum, description. Name each field in \`properties\`, e.g. \`body: { type: 'object', properties: { ${field}: { type: 'string' } }, required: ['${field}'] }\`.`;
		},
	},
	{
		codes: [2353],
		message: /may only specify known properties/,
		hint: () =>
			'Remove this field, or use a field that the type lists: `nodes(action="type-definition")` shows them. Node settings that the type does not list are not available.',
	},
	{
		codes: [2307],
		message: /^Cannot find module/,
		hint: () =>
			'Import only `@n8n/workflow-sdk/next` and the typed modules `@n8n/nodes/<id>` that `nodes(action="search")` returns. Use `node({ type, version, parameters })` for other nodes.',
	},
	{
		codes: [2305],
		message: /^Module '"@n8n\/nodes\//,
		hint: () =>
			"A typed module exports one object named after its id, e.g. `import { slack } from '@n8n/nodes/slack'`. Its steps are members: `slack.message.send({ … })`.",
	},
	{
		codes: [2305],
		message: /^Module '"@n8n\/workflow-sdk\/next"'/,
		hint: (_macros, error) => moduleImportHint(error),
	},
	{
		codes: [2305],
		message: /^Module '"@n8n\/workflow-sdk\/next"'/,
		hint: () =>
			"Import only the flow API that the skill names. Write an n8n expression as `expr('{{ … }}')`.",
	},
	{
		codes: [2304, 2552, 2581, 2592],
		// Expressions and Code text always have `$`: only a lambda without the parameter lacks it.
		message: /^Cannot find name '\$'/,
		hint: () => "In a lambda, `$` is the second parameter: `(item, $) => $('Node').field`.",
	},
	{
		codes: [2304],
		message: /^Cannot find name '\w+'/,
		hint: (_macros, error) => moduleNameHint(error),
	},
];

const TSC_ERROR = /error TS(\d+): ([^\n]*)/;

const IMPLICIT_ANY_CODE = '7006';

/** The hint for one `tsc` error of a workflow source, if a rule matches. */
export function tscHintOf(
	error: string,
	macros: readonly string[] = FLOW_MACROS,
): string | undefined {
	const [, code, message] = TSC_ERROR.exec(error) ?? [];
	if (code === undefined || message === undefined) return undefined;
	const hints = TSC_HINTS.filter(
		(each) =>
			each.codes.includes(Number(code)) &&
			each.message.test(message) &&
			(each.detail?.test(error) ?? true),
	);
	return hints.map((each) => each.hint(macros.join(', '), error)).find(Boolean);
}

/**
 * Each `tsc` error with a hint line after it. A hint comes once, after the first error it fits:
 * the later errors with the same cause need no copy. Implicit `any` parameters (TS7006) are
 * left out when another `tsc` error is present: most follow from it.
 */
export function withTscHints(errors: readonly string[]): string[] {
	const codes = errors.map((error) => TSC_ERROR.exec(error)?.[1]);
	const cascade = codes.some((code) => code !== undefined && code !== IMPLICIT_ANY_CODE);
	const shown = cascade
		? errors.filter((_error, index) => codes[index] !== IMPLICIT_ANY_CODE)
		: errors;
	const hints = shown.map((error) => tscHintOf(error));
	return shown.map((error, index) => {
		const hint = hints[index];
		return hint === undefined || hints.indexOf(hint) < index ? error : `${error}\nHint: ${hint}`;
	});
}

/**
 * Type-check a workflow source with the node contracts tsconfig in the sandbox, with the n8n
 * expressions of {@link EXPRESSIONS_PATH}. A check that does not complete (no worker, out of
 * memory, the deadline, an expression check that cannot start) is `incomplete`, so the build
 * fails instead of saving a workflow without the check.
 */
export async function typecheckWorkflowSource(
	context: InstanceAiContext,
	filePath: string,
	abortSignal?: AbortSignal,
): Promise<WorkflowTypecheck> {
	const workspace = context.workspace;
	if (!workspace) return { errors: [], incomplete: 'The type check needs the sandbox workspace.' };
	const root = await getWorkspaceRoot(workspace);
	const sourcePath = joinWorkspacePath(root, filePath);
	const result = await runInSandbox(
		workspace,
		`WORKFLOW_DIAGNOSTICS_DEADLINE_MS=${TYPECHECK_TIMEOUT_MS - 1_000} exec node --max-old-space-size=512 --import tsx ${WORKFLOW_DIAGNOSTICS_FILENAME} '${escapeSingleQuotes(sourcePath)}' ${NEXT_TSCONFIG_FILENAME} ${EXPRESSIONS_PATH}`,
		{ cwd: root, abortSignal, timeout: TYPECHECK_TIMEOUT_MS },
	);
	const parsed = parseTypecheckErrors(result.stdout);
	const errors = parsed && withTscHints(parsed);
	if (result.exitCode === 0 && errors) return { errors };
	context.logger.warn('Workflow type check did not complete', {
		exitCode: result.exitCode,
		stderr: result.stderr,
	});
	const detail = result.stderr.trim().slice(-STDERR_TAIL);
	return {
		errors: errors ?? [],
		incomplete: [
			`The type check did not complete (exit code ${result.exitCode}). Call build-workflow again with the same filePath.`,
			...(detail ? [detail] : []),
		].join('\n'),
	};
}
