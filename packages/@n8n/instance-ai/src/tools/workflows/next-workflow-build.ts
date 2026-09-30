import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import {
	exampleOf,
	generateNodeModule,
	toContract,
	toTs,
	type JsonSchema,
	type ResourceField,
} from '@n8n/node-sdk';
import { actions, nodeTypeOf, versionsOf } from '@n8n/nodes-base-next';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { z } from 'zod';

import type { ExploreResourcesParams, InstanceAiContext } from '../../types';
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

const NODE_IMPORT = /from\s+['"]@n8n\/nodes\/([\w-]+)['"]/g;

export const usedNodeIds = (source: string) => [
	...new Set([...source.matchAll(NODE_IMPORT)].flatMap(([, id]) => (id ? [id] : []))),
];

const nodeIds = () => [...new Set(actions.map((action) => action.node.id))];

function nodeModule(nodeId: string): string | undefined {
	const nodeActions = actions.filter((action) => action.node.id === nodeId);
	if (nodeActions.length === 0) return undefined;
	const text = generateNodeModule(
		nodeId,
		nodeActions.map((action) => ({ contract: toContract(action), nodeType: nodeTypeOf(action) })),
	);
	// tsc reads the per-node output types through this reference; tsx ignores it.
	return `/// <reference path="../node-outputs.d.ts" />\n${text}`;
}

export const EMPTY_OUTPUTS = 'export {};\n';

/** Files to write before the build: the tsconfig, the imported node modules, empty outputs. */
export function nextWorkspaceFiles(
	source: string,
): { ok: true; files: Map<string, string> } | { ok: false; errors: string[] } {
	const modules = usedNodeIds(source).map((id) => [id, nodeModule(id)] as const);
	const unknown = modules.filter(([, text]) => text === undefined).map(([id]) => id);
	if (unknown.length > 0) {
		return {
			ok: false,
			errors: unknown.map(
				(id) =>
					`No typed node module "@n8n/nodes/${id}". Typed modules: ${nodeIds().join(', ')}. Use node({ type, version, parameters }) from '@n8n/workflow-sdk/next' for other nodes.`,
			),
		};
	}
	return {
		ok: true,
		files: new Map([
			[NEXT_TSCONFIG_FILENAME, NEXT_TSCONFIG],
			[NODE_OUTPUTS_PATH, EMPTY_OUTPUTS],
			...modules.flatMap(([id, text]) => (text ? [[`.n8n/nodes/${id}.ts`, text] as const] : [])),
		]),
	};
}

const byNodeType = () => new Map(actions.map((action) => [nodeTypeOf(action), action]));

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
	const types = byNodeType();
	const targets = workflow.nodes.flatMap((node) => {
		const action = types.get(node.type);
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
	const types = byNodeType();
	const synthesized = workflow.nodes.flatMap((node): Array<[string, Fixtures[string]]> => {
		const action = types.get(node.type);
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
	const types = byNodeType();
	const members = workflow.nodes.flatMap((node) => {
		const action = types.get(node.type);
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

const TYPECHECK_TIMEOUT_MS = 60_000;

/**
 * Type-check a workflow source with the node contracts tsconfig in the sandbox. Returns the
 * errors, or `undefined` when the check could not run.
 */
export async function typecheckWorkflowSource(
	context: InstanceAiContext,
	filePath: string,
	abortSignal?: AbortSignal,
): Promise<string[] | undefined> {
	const workspace = context.workspace;
	if (!workspace) return undefined;
	const root = await getWorkspaceRoot(workspace);
	const sourcePath = joinWorkspacePath(root, filePath);
	const result = await runInSandbox(
		workspace,
		`exec node --max-old-space-size=512 --import tsx ${WORKFLOW_DIAGNOSTICS_FILENAME} '${escapeSingleQuotes(sourcePath)}' ${NEXT_TSCONFIG_FILENAME}`,
		{ cwd: root, abortSignal, timeout: TYPECHECK_TIMEOUT_MS },
	);
	if (result.exitCode !== 0) {
		context.logger.debug('Workflow type check unavailable', { stderr: result.stderr });
		return undefined;
	}
	const parsed: unknown = JSON.parse(result.stdout);
	return z.array(z.string()).parse(parsed);
}

/**
 * Pins each contract node to the frozen bundle of its version. A later release can then
 * tell which exact code the workflow was built and verified with.
 */
export function lockNodeContracts(workflow: WorkflowJSON): WorkflowJSON {
	const actionsByType = byNodeType();
	const nodeContracts = Object.fromEntries(
		workflow.nodes.flatMap((node) => {
			const action = actionsByType.get(node.type);
			const manifest = action
				? versionsOf(action.id).find(({ manifest }) => manifest.version === node.typeVersion)
						?.manifest
				: undefined;
			return manifest
				? [
						[
							`${node.type}@${manifest.version}`,
							{ bundleHash: manifest.bundleHash, contractHash: manifest.contractHash },
						],
					]
				: [];
		}),
	);
	if (Object.keys(nodeContracts).length === 0) return workflow;
	const meta = { ...workflow.meta, nodeContracts };
	return { ...workflow, meta };
}
