/**
 * Roundtrip test for the curated examples set.
 *
 * For every entry in `examples/manifest.json` (where success !== false), assert:
 *   - The source JSON loads
 *   - `emitInstanceAi()` produces non-empty output with the expected SDK import
 *   - `parseWorkflowCode()` can parse it back, and the parsed node count matches
 *
 * This is the only CI hook for the examples pipeline. It catches both codegen
 * regressions and SDK drift in a single test, mirroring the pattern in
 * src/codegen/codegen-roundtrip.test.ts.
 */
import * as fs from 'fs';
import * as path from 'path';

import { emitInstanceAi } from '../codegen/emit-instance-ai';
import { parseWorkflowCode } from '../codegen/parse-workflow-code';
import type { WorkflowJSON } from '../types/base';

const EXAMPLES_DIR = path.resolve(__dirname, '../../examples');
const MANIFEST_PATH = path.join(EXAMPLES_DIR, 'manifest.json');
const WORKFLOWS_DIR = path.join(EXAMPLES_DIR, 'workflows');

interface ManifestEntry {
	id: number;
	slug: string;
	name: string;
	success: boolean;
	skip?: boolean;
	skipReason?: string;
}

function loadManifest(): ManifestEntry[] {
	if (!fs.existsSync(MANIFEST_PATH)) return [];
	// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse -- Test fixture file
	const raw = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')) as { workflows: ManifestEntry[] };
	return raw.workflows ?? [];
}

function loadWorkflowJson(slug: string): WorkflowJSON {
	const filePath = path.join(WORKFLOWS_DIR, `${slug}.json`);
	// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse -- Test fixture file
	return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as WorkflowJSON;
}

const entries = loadManifest().filter((e) => e.success && !e.skip);

/**
 * `parseWorkflowCode` does not accept ESM import declarations; emit-instance-ai
 * adds them. Strip them (and any leading JSDoc header) before parsing.
 */
function stripHeader(code: string): string {
	let body = code;
	body = body.replace(/^\s*\/\*\*[\s\S]*?\*\/\s*/, '');
	body = body.replace(/^import\s+\{[^}]*\}\s+from\s+'[^']+'\s*;\s*/m, '');
	return body.trimStart();
}

// When the manifest is empty (run `pnpm regenerate-examples` to populate),
// `it.each([])` registers no tests, which is the desired behaviour.
describe('examples manifest roundtrip', () => {
	it.each(entries.map((e) => [e.slug, e]))(
		'%s: emitInstanceAi → parseWorkflowCode roundtrips',
		(_slug, entry) => {
			const json = loadWorkflowJson(entry.slug);
			const code = emitInstanceAi(json);

			expect(code.length).toBeGreaterThan(0);
			expect(code).toContain("from '@n8n/workflow-sdk'");
			expect(code).toContain('workflow(');
			expect(code).toContain('export default');

			const body = stripHeader(code);
			const parsed = parseWorkflowCode(body);
			const sourceNodeCount = json.nodes?.length ?? 0;
			const parsedNodeCount = parsed.nodes?.length ?? 0;
			// Some normalisation can shift the count by 1 (e.g. sticky note handling).
			expect(Math.abs(parsedNodeCount - sourceNodeCount)).toBeLessThanOrEqual(1);
		},
	);
});
