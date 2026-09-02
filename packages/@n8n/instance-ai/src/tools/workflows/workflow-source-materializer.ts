import type { WorkflowJSON } from '@n8n/workflow-sdk';

import {
	findWorkflowSourceFileBindingsForWorkflow,
	hashWorkflowSource,
	saveWorkflowSourceFileBinding,
	type WorkflowSourceFileBinding,
} from './workflow-file-bindings';
import type { InstanceAiContext } from '../../types';
import { readWorkspaceFile, writeWorkspaceFile } from '../../workspace/workspace-files';

/**
 * Source at or below this size is also returned inline. Above it the agent reads
 * the file: the whole source would otherwise sit in context twice — once as the
 * tool result and again when the model re-emits it into a file.
 */
export const INLINE_SOURCE_LIMIT_CHARS = 12_000;

export const WORKFLOW_SOURCE_DIR = 'src/workflows';

export type MaterializedSourceStatus =
	/** The file was written for the first time in this thread. */
	| 'written'
	/** The saved workflow changed since the file was written, so it was regenerated. */
	| 'refreshed'
	/** The file already matches the saved workflow; nothing was written. */
	| 'current'
	/** The file has edits that were never built. It was left alone. */
	| 'conflict';

export interface SourceNodeIndexEntry {
	name: string;
	type: string;
	/** 1-based line of the node's declaration in the source file. */
	line: number;
}

export interface MaterializedWorkflowSource {
	filePath: string;
	status: MaterializedSourceStatus;
	sourceHash: string;
}

/** File name derived from the workflow name; falls back to the id for empty names. */
export function workflowSourceFileSlug(name: string, workflowId: string): string {
	const slug = name
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60)
		.replace(/-+$/g, '');
	return slug.length > 0 ? slug : workflowId.toLowerCase();
}

/**
 * Line of each node's declaration, so the agent can jump to a node with a ranged
 * read instead of scanning the whole file. Nodes are located by their emitted id;
 * a node without one falls back to its name.
 */
export function indexSourceNodes(json: WorkflowJSON, code: string): SourceNodeIndexEntry[] {
	const lines = code.split('\n');
	const findLine = (needle: string): number => {
		const index = lines.findIndex((line) => line.includes(needle));
		return index + 1;
	};
	return (json.nodes ?? []).map((node) => {
		const name = node.name ?? '';
		const byId = node.id ? findLine(`id: '${escapeSingleQuotes(node.id)}'`) : 0;
		const line = byId > 0 ? byId : findLine(`name: '${escapeSingleQuotes(name)}'`);
		return { name, type: node.type, line };
	});
}

function escapeSingleQuotes(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function resolveSourceFilePath(
	context: InstanceAiContext,
	workflowId: string,
	name: string,
): Promise<{ filePath: string; binding?: WorkflowSourceFileBinding }> {
	const own = await findWorkflowSourceFileBindingsForWorkflow(context, workflowId);
	if (own.length > 0) return { filePath: own[0].filePath, binding: own[0] };

	const slug = workflowSourceFileSlug(name, workflowId);
	const candidate = `${WORKFLOW_SOURCE_DIR}/${slug}.workflow.ts`;
	const taken = await findWorkflowSourceFileBindingsForWorkflow(context, undefined, candidate);
	if (taken.length === 0) return { filePath: candidate };
	// Another workflow already owns this path; suffix with the id so both stay distinct.
	return {
		filePath: `${WORKFLOW_SOURCE_DIR}/${slug}-${workflowId.toLowerCase().slice(0, 6)}.workflow.ts`,
	};
}

/**
 * Write generated workflow source into the thread's bound workspace file and
 * record the binding, so `build-workflow` can save the file back to the same
 * workflow without an explicit id.
 *
 * The file is the agent's editing surface, so it is never clobbered while it
 * carries unbuilt edits: when the file on disk no longer matches the hash the
 * binding recorded, the call reports `conflict` and writes nothing. When the
 * file still matches and the saved workflow has not changed, nothing is written
 * either — the file is already current.
 */
export async function materializeWorkflowSource(
	context: InstanceAiContext,
	options: {
		workflowId: string;
		name: string;
		code: string;
		saved: { versionId: string; checksum?: string };
		abortSignal?: AbortSignal;
	},
): Promise<MaterializedWorkflowSource> {
	const workspace = context.workspace;
	if (!workspace) {
		throw new Error('Runtime workspace is required to materialize workflow source.');
	}
	const { workflowId, name, code, saved } = options;
	const { filePath, binding } = await resolveSourceFilePath(context, workflowId, name);
	const sourceHash = hashWorkflowSource(code);
	const fileOptions = {
		logger: context.logger,
		resourceLabel: 'Workflow source file',
		abortSignal: options.abortSignal,
	};

	const existing = await readWorkspaceFile(workspace, filePath, fileOptions);
	if (existing !== null && binding?.sourceHash !== undefined) {
		const existingHash = hashWorkflowSource(existing);
		if (existingHash !== binding.sourceHash) {
			return { filePath, status: 'conflict', sourceHash: existingHash };
		}
		const savedUnchanged =
			saved.checksum !== undefined
				? binding.workflowChecksum === saved.checksum
				: binding.workflowVersionId === saved.versionId;
		if (savedUnchanged) {
			return { filePath, status: 'current', sourceHash: existingHash };
		}
	}

	await writeWorkspaceFile(workspace, filePath, code, fileOptions);
	await saveWorkflowSourceFileBinding(context, {
		filePath,
		workflowId,
		workflowVersionId: saved.versionId,
		...(saved.checksum !== undefined ? { workflowChecksum: saved.checksum } : {}),
		sourceHash,
	});

	return {
		filePath,
		status: existing !== null && binding !== undefined ? 'refreshed' : 'written',
		sourceHash,
	};
}
