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
 * read instead of scanning the whole file. Nodes are located by their emitted id;
 * a node without one (a duplicate id is emitted only for its first claimant) falls
 * back to its unique name, matched only where a node head declares it.
 */
export function indexSourceNodes(json: WorkflowJSON, code: string): SourceNodeIndexEntry[] {
	const lines = code.split('\n');
	const findLine = (needle: string): number => lines.findIndex((line) => line.includes(needle)) + 1;
	return (json.nodes ?? []).map((node) => {
		const name = node.name ?? '';
		const byId = node.id ? findLine(`id: '${escapeSingleQuotes(node.id)}'`) : 0;
		const line = byId > 0 ? byId : findNodeHeadLine(lines, `name: '${escapeSingleQuotes(name)}'`);
		return { name, type: node.type, line };
	});
}

function escapeSingleQuotes(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

const CONFIG_OPEN = 'config: {';
/** A sticky note carries its name in the options object after its node list: `sticky(content, [...], { ... })`. */
const STICKY_OPTIONS_OPEN = '], {';
const ID_LINE = /^\s*id: '(?:[^'\\]|\\.)*',?$/;

/**
 * A node's own `name:` is a direct key of its `config: {` object: on the same
 * line when the config is single-line, or on the first line after it (past an
 * optional `id:` line) when it spans lines. A sticky note's `name:` is a direct
 * key of its trailing options object instead. A `name:` inside `parameters`
 * sits deeper, so it never qualifies — even on a one-line config that also holds
 * the parameters — and cannot shadow a node declared further down.
 */
function findNodeHeadLine(lines: string[], needle: string): number {
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		// The name text can also appear inside a value on the same line (a template
		// literal's last content line ends with the sticky options), so every
		// occurrence is checked, not only the first.
		for (let at = line.indexOf(needle); at >= 0; at = line.indexOf(needle, at + 1)) {
			if (isDirectKeyOf(line, CONFIG_OPEN, at) || isDirectKeyOf(line, STICKY_OPTIONS_OPEN, at)) {
				return i + 1;
			}
		}
		if (!line.includes(needle) || line.includes(CONFIG_OPEN)) continue;
		const previous = lines[i - 1]?.trim() ?? '';
		if (previous.endsWith(CONFIG_OPEN)) return i + 1;
		if (ID_LINE.test(lines[i - 1] ?? '') && (lines[i - 2]?.trim() ?? '').endsWith(CONFIG_OPEN)) {
			return i + 1;
		}
	}
	return 0;
}

/** True when the text at `at` is a direct key of the nearest `opener` object before it on the line. */
function isDirectKeyOf(line: string, opener: string, at: number): boolean {
	const openerAt = line.lastIndexOf(opener, at);
	return openerAt >= 0 && braceDepthBetween(line, openerAt + opener.length, at) === 0;
}

/** Net `{`/`[` nesting between two offsets of one line, ignoring string contents. */
function braceDepthBetween(line: string, from: number, to: number): number {
	let depth = 0;
	let quote: string | undefined;
	for (let i = from; i < to; i++) {
		const ch = line[i];
		if (quote) {
			if (ch === '\\') i++;
			else if (ch === quote) quote = undefined;
			continue;
		}
		if (ch === "'" || ch === '"' || ch === '`') quote = ch;
		else if (ch === '{' || ch === '[') depth++;
		else if (ch === '}' || ch === ']') depth--;
	}
	return depth;
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
