import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import { validate, type JsonSchema, type ResourceField } from '@n8n/node-sdk';
import { modelCatalogDeclaration, toTs } from '@n8n/node-sdk/codegen';
import { credentialHostsOf, egressIssuesOf, exampleOf } from '@n8n/node-sdk/host';
import type { NodeContractLock } from '@n8n/node-sdk/registry';
import {
	actionOfNode,
	actions,
	migratedSlotOf,
	toolActionOfNode,
	versionsOf,
} from '@n8n/nodes-base-next';
import { isRecord } from '@n8n/utils/is-record';
import { hasPlaceholderDeep } from '@n8n/utils/placeholder';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { isFromAIOnlyExpression } from 'n8n-workflow';
import { z } from 'zod';

import type { ValidationWarning } from './workflow-validation-warnings';
import type { ExploreResourcesParams, InstanceAiContext } from '../../types';
import {
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
		.map(({ at, nodeType }) => `${at}: ${missingNodeTypeIssue(nodeType)}`);
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
		actions
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

/**
 * The action's output for this node's parameters and its resource fields. A hatch that cannot
 * read them keeps the default.
 */
function outputOf(
	action: (typeof actions)[number],
	parameters: Record<string, unknown>,
	fields?: readonly ResourceField[],
): JsonSchema {
	try {
		if (fields?.length && action.resourceOutput) {
			return action.resourceOutput.toOutput(fields, parameters);
		}
		return action.deriveOutput?.(parameters) ?? action.output.json;
	} catch {
		return action.output.json;
	}
}

/** Resource fields by node name, from `fetchResourceFields`. */
export type ResourceFields = ReadonlyMap<string, readonly ResourceField[]>;

type LookupCall = Pick<ExploreResourcesParams, 'nodeType' | 'version' | 'methodName'> & {
	currentNodeParameters: Record<string, unknown>;
};

// Same ID pattern as the Notion action; the legacy locator accepts an ID only.
const NOTION_ID = /[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}/i;

const idLocator = (value: string) => ({ __rl: true, mode: 'id', value });

/**
 * The lookups `resourceOutput.method` names, as load-options calls on legacy nodes. The host
 * tries the calls in order and keeps the first that lists fields.
 */
const RESOURCE_LOOKUPS: Record<string, (parameters: Record<string, unknown>) => LookupCall[]> = {
	// v3 reads a data source ID and v2 a database ID; the action accepts both.
	'notion.dataSourceProperties': ({ database }) => {
		const id =
			typeof database === 'string' && !database.startsWith('=')
				? NOTION_ID.exec(database)?.[0]
				: undefined;
		if (!id) return [];
		const base = { nodeType: 'n8n-nodes-base.notion', methodName: 'getFilterProperties' };
		const databasePage = { resource: 'databasePage', operation: 'getAll' };
		return [
			{
				...base,
				version: 3,
				currentNodeParameters: { ...databasePage, dataSourceId: idLocator(id) },
			},
			{
				...base,
				version: 2.2,
				currentNodeParameters: { ...databasePage, databaseId: idLocator(id) },
			},
		];
	},
};

const RESOURCE_LOOKUP_TIMEOUT_MS = 5_000;

async function withTimeout<T>(work: Promise<T>, fallback: T): Promise<T> {
	return await new Promise((resolve) => {
		const timer = setTimeout(() => resolve(fallback), RESOURCE_LOOKUP_TIMEOUT_MS);
		work.then(resolve, () => resolve(fallback)).finally(() => clearTimeout(timer));
	});
}

async function firstFields(
	explore: NonNullable<InstanceAiContext['nodeService']['exploreResources']>,
	[call, ...rest]: LookupCall[],
	credential: { credentialType: string; credentialId: string },
): Promise<ResourceField[]> {
	if (!call) return [];
	const result = await explore({ ...call, ...credential, methodType: 'loadOptions' }).catch(
		() => undefined,
	);
	return result?.results.length
		? result.results.map(({ name, value }) => ({ name, value }))
		: await firstFields(explore, rest, credential);
}

/**
 * The fields of the resource each node reads, for actions with `resourceOutput`. The source
 * binds no credential, so the lookup uses the node's credential or else the sole stored
 * credential the action accepts. Best effort: a failed or slow lookup leaves the node out.
 */
export async function fetchResourceFields(
	context: InstanceAiContext,
	workflow: WorkflowJSON,
): Promise<ResourceFields> {
	const explore = context.nodeService.exploreResources?.bind(context.nodeService);
	if (!explore) return new Map();
	const targets = workflow.nodes.flatMap((node) => {
		const action = actionOfNode(node);
		const calls = action?.resourceOutput
			? (RESOURCE_LOOKUPS[action.resourceOutput.method]?.(node.parameters ?? {}) ?? [])
			: [];
		return action && node.name && calls.length > 0
			? [{ name: node.name, node, action, calls }]
			: [];
	});
	if (targets.length === 0) return new Map();
	const stored = await context.credentialService.list().catch(() => []);
	const fetched = await Promise.all(
		targets.map(async ({ name, node, action, calls }) => {
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
			if (!credential) return [];
			const fields = await withTimeout(firstFields(explore, calls, credential), []);
			return fields.length > 0 ? [[name, fields] as const] : [];
		}),
	);
	return new Map(fetched.flat());
}

type Fixtures = NonNullable<WorkflowJSON['pinData']>;

/**
 * One example item for each contract node without declared output. Verification then
 * simulates read nodes instead of calling the service, and needs no LLM to invent the output
 * of simulated write nodes.
 */
export function synthesizedFixtures(
	workflow: WorkflowJSON,
	declared: Fixtures = {},
	resourceFields: ResourceFields = new Map(),
): Fixtures {
	const synthesized = workflow.nodes.flatMap((node): Array<[string, Fixtures[string]]> => {
		const action = actionOfNode(node);
		if (!action || !node.name || declared[node.name]) return [];
		const example = exampleOf(
			outputOf(action, node.parameters ?? {}, resourceFields.get(node.name)),
		);
		return typeof example === 'object' && example !== null && !Array.isArray(example)
			? [[node.name, [Object.fromEntries(Object.entries(example))]]]
			: [];
	});
	return { ...declared, ...Object.fromEntries(synthesized) };
}

/**
 * Output types for the nodes of a built workflow, from each action's `deriveOutput` or
 * `resourceOutput` pure hatch. Keyed by node name, they narrow `$('Node')` and the next node's
 * item in `tsc`.
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
		const schema = outputOf(action, node.parameters ?? {}, fields);
		return [`\t\t${JSON.stringify(node.name)}: ${toTs(schema, { input: false, indent: '\t\t' })};`];
	});
	if (members.length === 0) return EMPTY_OUTPUTS;
	return [
		'export {};',
		"declare module '@n8n/workflow-sdk/next' {",
		'\tinterface NodeOutputs {',
		...members,
		'\t}',
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
			const parameters = node.parameters ?? {};
			const { authentication } = parameters;
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
				const { errors, warnings } = egressIssuesOf(action.egress, parameters, { name, hosts });
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
	['@n8n/nodes-base-next.codeJavaScript', 'code'],
]);

const expressionStrings = (value: unknown): string[] => {
	if (typeof value === 'string') return value.startsWith('=') ? [value] : [];
	if (Array.isArray(value)) return value.flatMap(expressionStrings);
	return isRecord(value) ? Object.values(value).flatMap(expressionStrings) : [];
};

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
	const code = [
		...new Set(
			workflow.nodes.flatMap(({ type, parameters = {} }) => {
				const field = JAVASCRIPT_CODE_FIELDS.get(type);
				const text = field === undefined ? undefined : parameters[field];
				const { language = 'javaScript' } = parameters;
				return language === 'javaScript' && typeof text === 'string' && !text.startsWith('=')
					? [text]
					: [];
			}),
		),
	];
	return expressions.length + code.length === 0
		? EMPTY_EXPRESSIONS
		: `${JSON.stringify({ expressions, code })}\n`;
}

const SCALAR_TYPES: ReadonlySet<unknown> = new Set(['string', 'number', 'integer', 'boolean']);

/**
 * A `json` field holds JSON text that the run parses before it validates: as node-sdk
 * `toProperty` and `parameterValue` (properties.ts), every field that is not a binary, an enum,
 * or a scalar.
 */
function asRun(value: unknown, schema: JsonSchema | undefined): unknown {
	if (typeof value !== 'string' || !/^\s*[[{]/.test(value)) return value;
	if (!schema || schema['x-n8n-binary'] || schema.enum || SCALAR_TYPES.has(schema.type)) {
		return value;
	}
	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
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
		const parameters = node.parameters ?? {};
		const fields = action.inputSchema.properties ?? {};
		// The model fills a tool field that is one `$fromAI()` call, and the tool checks it.
		const fromModel = (value: unknown) =>
			tool !== undefined && typeof value === 'string' && isFromAIOnlyExpression(value);
		const input = Object.fromEntries(
			Object.keys(fields).flatMap((key) => {
				const value = parameters[key];
				return value === undefined || value === '' || hasPlaceholderDeep(value) || fromModel(value)
					? []
					: [[key, asRun(value, fields[key])]];
			}),
		);
		return validate(input, action.inputSchema, { allowExpressions: true })
			.filter((issue) => !issue.endsWith(': is required'))
			.map((issue) => `Node "${node.name}": ${issue}`);
	});
}

/**
 * A note for each `node({ type })` that a typed contract step can replace: the step of the same
 * resource and operation, or the module (e.g. HTTP Request, whose action follows the method).
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
	'This value has no type. Fix the first error before it first. Else type the node before it: `sample` items, a webhook `schema`, or `returns` on a code step.';

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
] as const;

/**
 * A fix in the flow SDK for a frequent `tsc` error of a workflow source, by code and by the first
 * line of the message. `macros` are the macros of the flow SDK. The first rule that matches wins.
 */
const TSC_HINTS: ReadonlyArray<{
	readonly codes: readonly number[];
	readonly message: RegExp;
	readonly hint: (macros: string) => string;
}> = [
	{
		codes: [2339, 2551],
		message: /on type '(?:Routed)?Step<|on type 'Trigger<|on type 'Region</,
		hint: (macros) =>
			`A step has no methods. A workflow is a flat list: \`workflow(name, trigger, stepA, stepB)\`. Macros: ${macros}.`,
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
	{ codes: [18046], message: /^'[\w$]+' is of type 'unknown'/, hint: () => UNTYPED_HINT },
	{
		codes: [18046],
		message: /is of type 'unknown'/,
		hint: () =>
			'This field has no declared type. Declare it where the data enters (a webhook `schema`, `sample` items, or `returns` on a code step), or narrow it first, e.g. `Array.isArray(item.list)`.',
	},
	{ codes: [2571], message: /is of type 'unknown'/, hint: () => UNTYPED_HINT },
	{
		codes: [7006],
		message: /implicitly has an 'any' type/,
		hint: () =>
			"This lambda gets no parameter types. Fix the first error before it first (a method or field that does not exist). Do not annotate the parameters. If no error comes before it, write the value as `expr('{{ … }}')`.",
	},
	{
		codes: [2322, 2345],
		message: /(?:^|: )(?:Type|Argument of type) '.*\| undefined' is not assignable/,
		hint: () =>
			'The value can be undefined. A `schema` field is optional until its `required` list names it: add it there, or read a field that is always set.',
	},
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
		codes: [2739, 2740, 2741],
		message: /missing the following propert|is missing in type/,
		hint: () =>
			'Add the fields that the message names. `nodes(action="type-definition")` shows the full type.',
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
		hint: () =>
			"Import only the flow API that the skill names. Write an n8n expression as `expr('{{ … }}')`.",
	},
	{
		codes: [2304, 2552, 2581, 2592],
		// Expressions and Code text always have `$`: only a lambda without the parameter lacks it.
		message: /^Cannot find name '\$'/,
		hint: () => "In a lambda, `$` is the second parameter: `(item, $) => $('Node').field`.",
	},
];

const TSC_ERROR = /error TS(\d+): ([^\n]*)/;

/** The hint for one `tsc` error line of a workflow source, if a rule matches. */
export function tscHintOf(
	error: string,
	macros: readonly string[] = FLOW_MACROS,
): string | undefined {
	const [, code, message] = TSC_ERROR.exec(error) ?? [];
	if (code === undefined || message === undefined) return undefined;
	const rule = TSC_HINTS.find(
		(each) => each.codes.includes(Number(code)) && each.message.test(message),
	);
	return rule?.hint(macros.join(', '));
}

/**
 * Each `tsc` error with a hint line after it. A hint comes once, after the first error it fits:
 * the later errors with the same cause need no copy.
 */
export function withTscHints(errors: readonly string[]): string[] {
	const hints = errors.map((error) => tscHintOf(error));
	return errors.map((error, index) => {
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

/**
 * Locks each contract node, by node name, to the bundled version it was built and verified
 * with. The instance update policy decides later if a newer patch may run instead.
 */
export function lockNodeContracts(workflow: WorkflowJSON): WorkflowJSON {
	const nodeContracts = Object.fromEntries(
		workflow.nodes.flatMap((node): Array<[string, NodeContractLock]> => {
			const action = actionOfNode(node) ?? toolActionOfNode(node);
			// A composed node version runs a fixed action major; a contract node type runs its own.
			const major = migratedSlotOf(node)?.major ?? node.typeVersion;
			const manifest = action
				? versionsOf(action.id).find(({ manifest }) => manifest.contract.version === major)
						?.manifest
				: undefined;
			if (!manifest || !node.name) return [];
			const { id, semver, bundleHash, contractHash } = manifest;
			return [[node.name, { action: id, version: semver, bundleHash, contractHash }]];
		}),
	);
	if (Object.keys(nodeContracts).length === 0) return workflow;
	const meta = { ...workflow.meta, nodeContracts };
	return { ...workflow, meta };
}
