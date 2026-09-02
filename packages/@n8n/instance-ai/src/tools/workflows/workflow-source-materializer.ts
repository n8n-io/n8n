import type { WorkflowJSON } from '@n8n/workflow-sdk';

import {
	findWorkflowSourceFileBindingsForWorkflow,
	hashWorkflowSource,
	normalizeWorkflowSourceFilePath,
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
	/** The file has edits that were never built, or is not one this thread wrote. It was left alone. */
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
	/** The source now on disk at filePath — what a node index must describe. */
	content: string;
}

function slugify(value: string, maxLength: number): string {
	return value
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, maxLength)
		.replace(/-+$/g, '');
}

/** File name derived from the workflow name; falls back to the id for empty names. */
export function workflowSourceFileSlug(name: string, workflowId: string): string {
	const slug = slugify(name, 60);
	if (slug.length > 0) return slug;
	const idSlug = slugify(workflowId, 60);
	return idSlug.length > 0 ? idSlug : 'workflow';
}

/**
 * Line of each node's declaration, so the agent can jump to a node with a ranged
 * read instead of scanning the whole file. Declarations come from parsing the
 * source, so the same text inside a sticky note or a parameter value cannot match.
 * A node is found by its id when that id is unique, else by its name; a node the
 * source does not declare, or source that does not parse, reports line 0.
 */
export async function indexSourceNodes(
	json: WorkflowJSON,
	code: string,
): Promise<SourceNodeIndexEntry[]> {
	const { locateNodeDeclarations } = await import('@n8n/workflow-sdk');
	const byId = new Map<string, number>();
	const byName = new Map<string, number>();
	for (const { id, name, line } of locateNodeDeclarations(code)) {
		if (id !== undefined && !byId.has(id)) byId.set(id, line);
		if (name !== undefined && !byName.has(name)) byName.set(name, line);
	}

	const nodes = json.nodes ?? [];
	const idCounts = new Map<string, number>();
	for (const node of nodes) idCounts.set(node.id, (idCounts.get(node.id) ?? 0) + 1);

	return nodes.map((node) => {
		const name = node.name ?? '';
		// Codegen emits a duplicated id for its first claimant only, so it locates that node alone.
		const byUniqueId = idCounts.get(node.id) === 1 ? byId.get(node.id) : undefined;
		return { name, type: node.type, line: byUniqueId ?? byName.get(name) ?? 0 };
	});
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
	// Another workflow already owns this path; suffix with the id so both stay distinct.
	const filePath =
		taken.length === 0
			? candidate
			: `${WORKFLOW_SOURCE_DIR}/${slug}-${slugify(workflowId, 8) || 'x'}.workflow.ts`;
	return { filePath: normalizeWorkflowSourceFilePath(filePath) };
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
	if (existing !== null) {
		const existingHash = hashWorkflowSource(existing);
		// A file this thread never recorded a hash for is someone else's work in
		// progress — an agent-written source, or a binding whose metadata was lost.
		if (binding?.sourceHash === undefined || existingHash !== binding.sourceHash) {
			return { filePath, status: 'conflict', sourceHash: existingHash, content: existing };
		}
		// The file is exactly what this thread last wrote. It is current only if the
		// regenerated source is byte-identical; a codegen change also warrants a rewrite.
		if (existingHash === sourceHash) {
			return { filePath, status: 'current', sourceHash, content: existing };
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
		status: existing !== null ? 'refreshed' : 'written',
		sourceHash,
		content: code,
	};
}
