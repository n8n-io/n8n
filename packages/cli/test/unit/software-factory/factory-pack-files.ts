import { BUILTIN_NODES_PACKAGES } from '@n8n/constants';
import { isRecord } from '@n8n/utils/is-record';
import {
	jsonParse,
	type IConnections,
	type INodeParameters,
	type INodeTypeDescription,
} from 'n8n-workflow';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { z } from 'zod';

/** Readers for the files of the software factory template pack and the built node types. */

export const FACTORY_DIR = path.resolve(__dirname, '../../../../../docs/future-n8n-poc/factory');

export const WORKFLOW_FILE = 'software-factory.workflow.json';

export const AGENT_FILES = [
	'agents/planner.agent.json',
	'agents/implementer.agent.json',
	'agents/critic.agent.json',
] as const;

export type AgentFile = (typeof AGENT_FILES)[number];

export function readPackText(relativePath: string): string {
	return readFileSync(path.join(FACTORY_DIR, relativePath), 'utf8');
}

export function readPackJson(relativePath: string): unknown {
	return jsonParse(readPackText(relativePath));
}

/** A credential that a person chooses after import: no id, only a name. */
const placeholderCredentialSchema = z
	.object({ id: z.null(), name: z.string().trim().min(1) })
	.strict();

const templateNodeSchema = z
	.object({
		id: z.string().uuid(),
		name: z.string().min(1),
		type: z.string().min(1),
		typeVersion: z.number(),
		position: z.tuple([z.number(), z.number()]),
		parameters: z.custom<INodeParameters>(isRecord),
		credentials: z.record(placeholderCredentialSchema).optional(),
		notes: z.string().optional(),
		notesInFlow: z.boolean().optional(),
		onError: z.enum(['continueRegularOutput', 'continueErrorOutput', 'stopWorkflow']).optional(),
	})
	.strict();

/** The shape the template keeps to: no ids of the source instance, no pinned data. */
export const templateWorkflowSchema = z
	.object({
		name: z.string().min(1),
		nodes: z.array(templateNodeSchema),
		connections: z.custom<IConnections>(isRecord),
		settings: z.record(z.unknown()),
	})
	.strict();

export type TemplateWorkflow = z.infer<typeof templateWorkflowSchema>;
export type TemplateNode = TemplateWorkflow['nodes'][number];

export function readTemplateWorkflow(): TemplateWorkflow {
	return templateWorkflowSchema.parse(readPackJson(WORKFLOW_FILE));
}

export function nodeByName(workflow: TemplateWorkflow, name: string): TemplateNode {
	const node = workflow.nodes.find((candidate) => candidate.name === name);
	if (!node) throw new Error(`The template has no node "${name}"`);
	return node;
}

/**
 * The node types of the built-in node packages, with the package prefix that workflows use.
 * Each version line of a node is its own entry.
 */
export function loadBuiltinNodeTypes(): INodeTypeDescription[] {
	const requireFromHere = createRequire(__filename);
	return BUILTIN_NODES_PACKAGES.flatMap((packageName) => {
		const packageDir = path.dirname(requireFromHere.resolve(`${packageName}/package.json`));
		const nodesFile = path.join(packageDir, 'dist', 'types', 'nodes.json');
		return jsonParse<INodeTypeDescription[]>(readFileSync(nodesFile, 'utf8')).map(
			(description) => ({ ...description, name: `${packageName}.${description.name}` }),
		);
	});
}
