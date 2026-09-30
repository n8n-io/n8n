import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import { generateNodeModule, toContract, toTs } from '@n8n/node-sdk';
import { actions, nodeTypeOf } from '@n8n/nodes-base-next';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';
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

const EMPTY_OUTPUTS = 'export {};\n';

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

/**
 * Output types for the nodes of a built workflow, from each action's `deriveOutput` pure
 * hatch. Keyed by node name, they narrow `$('Node')` and the next node's item in `tsc`.
 */
export function nodeOutputsDeclaration(workflow: WorkflowJSON): string {
	const byType = new Map(actions.map((action) => [nodeTypeOf(action), action]));
	const members = workflow.nodes.flatMap((node) => {
		const action = byType.get(node.type);
		if (!action?.deriveOutput || !node.name) return [];
		// Parameters are not validated yet; a shape the hatch cannot read keeps the default output.
		const schema = (() => {
			try {
				return action.deriveOutput?.(node.parameters ?? {});
			} catch {
				return undefined;
			}
		})();
		if (!schema) return [];
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
