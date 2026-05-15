/**
 * Pure formatter for the curated workflow examples.
 *
 * Takes an in-memory bundle (manifest entries + workflow JSONs keyed by slug),
 * runs each through `emitInstanceAi` with a JSDoc header pulled from the entry,
 * and returns the resulting `.ts` strings plus a flat grep-able `index.txt`.
 *
 * Consumers (the instance-ai sandbox setup) own bundle hydration — typically
 * the `BuilderTemplatesService` fetches manifest + workflows from a CDN, caches
 * them on disk, and passes the result here.
 */
import { emitInstanceAi } from './codegen/emit-instance-ai';
import type { WorkflowJSON } from './types/base';

const NODES_INLINE_LIMIT = 5;
const INDEX_NODE_SEPARATOR = ',';

export interface ExampleFile {
	/** Filename relative to `examples/` (e.g. `slack-daily-summary.ts`). */
	filename: string;
	/** Full file content: optional JSDoc header, single SDK import, workflow body. */
	content: string;
}

export interface ExampleFilesBundle {
	/** One generated `.ts` string per manifest entry, in score-descending order. */
	files: ExampleFile[];
	/** Flat grep-able index, one line per template, sorted by score descending. */
	indexTxt: string;
}

export interface ManifestEntry {
	id: number;
	slug: string;
	name: string;
	description: string;
	nodes: string[];
	tags: string[];
	triggerType: string;
	hasAI: boolean;
	score: number;
	source: string;
	author: string;
	success: boolean;
	skip?: boolean;
}

export interface ManifestFile {
	/** ISO timestamp the manifest was stamped at; written by curation CI. */
	generatedAt?: string;
	/** Short identifier (e.g. git SHA); used by the runtime cache as a fingerprint. */
	version?: string;
	workflows: ManifestEntry[];
}

export interface RawTemplateBundle {
	manifest: ManifestFile;
	/** Workflow JSONs keyed by manifest entry slug. Entries without a workflow are skipped. */
	workflows: Map<string, WorkflowJSON>;
}

/**
 * Format a raw bundle into the per-file output the sandbox writes to disk.
 * Entries are filtered to `success && !skip` and sorted by score descending,
 * mirroring how the runtime should surface them to the builder agent.
 */
export function buildExampleFiles(bundle: RawTemplateBundle): ExampleFilesBundle {
	const entries = (bundle.manifest.workflows ?? [])
		.filter((e) => e.success && !e.skip)
		.sort((a, b) => b.score - a.score);

	const files: ExampleFile[] = [];
	const indexLines: string[] = [];

	for (const entry of entries) {
		const wf = bundle.workflows.get(entry.slug);
		if (!wf) continue;
		const header = buildJsdocHeader(entry);
		const code = emitInstanceAi(wf, { jsdocHeader: header });
		files.push({ filename: `${entry.slug}.ts`, content: code });
		indexLines.push(buildIndexLine(entry));
	}

	const indexTxt = indexLines.join('\n') + (indexLines.length > 0 ? '\n' : '');
	return { files, indexTxt };
}

function buildJsdocHeader(entry: ManifestEntry): string {
	// Description is intentionally omitted: it's untrusted author-supplied prose
	// from the public catalog that the builder agent would read verbatim. Name +
	// nodes + tags + source already disambiguate templates.
	return [
		'/**',
		' * @template',
		` * @name ${entry.name}`,
		` * @nodes ${entry.nodes.join(', ')}`,
		` * @tags ${entry.tags.join(', ')}`,
		` * @source ${entry.source}`,
		` * @author ${entry.author}`,
		' */',
	].join('\n');
}

function buildIndexLine(entry: ManifestEntry): string {
	const truncatedNodes = truncateNodes(entry.nodes);
	return [
		`${entry.slug}.ts`,
		entry.name,
		truncatedNodes,
		entry.tags.join(','),
		`n8n:${entry.id}`,
	].join(' | ');
}

function truncateNodes(nodes: string[]): string {
	if (nodes.length <= NODES_INLINE_LIMIT) return nodes.join(INDEX_NODE_SEPARATOR);
	const head = nodes.slice(0, NODES_INLINE_LIMIT).join(INDEX_NODE_SEPARATOR);
	const remaining = nodes.length - NODES_INLINE_LIMIT;
	return `${head} +${remaining} more`;
}
