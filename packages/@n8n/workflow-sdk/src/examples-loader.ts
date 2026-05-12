/**
 * Runtime loader for the curated workflow examples.
 *
 * Reads `examples/manifest.json` + `examples/workflows/*.json`, runs each
 * through `emitInstanceAi` with a JSDoc header pulled from the manifest entry,
 * and returns the resulting `.ts` strings plus a flat grep-able `index.txt`.
 *
 * Used by the instance-ai sandbox-setup to populate `${workspaceRoot}/examples/`
 * so the builder agent can grep the index and `cat` matching `.ts` files.
 *
 * Results are memoised — the manifest is committed and immutable per package
 * version, so loading once per process is enough.
 */
import * as fs from 'fs';
import * as path from 'path';

import { emitInstanceAi } from './codegen/emit-instance-ai';
import { ensureExtracted } from './examples-zip';
import type { WorkflowJSON } from './types/base';

// Resolve relative to this file. At runtime this lives at <package>/dist/examples-loader.js,
// so `../examples` reaches <package>/examples/.
const EXAMPLES_DIR = path.resolve(__dirname, '..', 'examples');
const MANIFEST_PATH = path.join(EXAMPLES_DIR, 'manifest.json');
const WORKFLOWS_DIR = path.join(EXAMPLES_DIR, 'workflows');

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

interface ManifestEntry {
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

interface ManifestFile {
	workflows: ManifestEntry[];
}

let cached: ExampleFilesBundle | null = null;

/**
 * Load and prepare the curated examples for sandbox use. Memoised per process.
 *
 * Returns an empty bundle if the manifest does not exist (e.g. the consumer is
 * running against an unfetched workspace). Sandbox-setup checks for an empty
 * bundle and skips the write.
 */
export function getExampleFiles(): ExampleFilesBundle {
	if (cached !== null) return cached;
	cached = loadFromDisk();
	return cached;
}

/** Reset the memoisation cache. Tests use this; production callers should not. */
export function resetExampleFilesCache(): void {
	cached = null;
}

function loadFromDisk(): ExampleFilesBundle {
	if (!fs.existsSync(MANIFEST_PATH)) return { files: [], indexTxt: '' };
	ensureExtracted();

	// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse -- Internal manifest file
	const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')) as ManifestFile;
	const entries = (manifest.workflows ?? [])
		.filter((e) => e.success && !e.skip)
		.sort((a, b) => b.score - a.score);

	const files: ExampleFile[] = [];
	const indexLines: string[] = [];

	for (const entry of entries) {
		const wfPath = path.join(WORKFLOWS_DIR, `${entry.slug}.json`);
		if (!fs.existsSync(wfPath)) continue;
		// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse -- Internal workflow fixture
		const wf = JSON.parse(fs.readFileSync(wfPath, 'utf-8')) as WorkflowJSON;
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
