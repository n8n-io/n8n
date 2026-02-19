/**
 * Update Expected Warnings in Manifest
 *
 * For each workflow, validates warnings from the codegen roundtrip against
 * the original workflow JSON. Only warnings that also appear when validating
 * the original workflow are considered real. Codegen-only artifacts are logged.
 *
 * Usage: npx tsx scripts/update-expected-warnings.ts
 */

import * as fs from 'fs';
import * as path from 'path';

import { generateWorkflowCode } from '../src/codegen';
import { parseWorkflowCodeToBuilder } from '../src/codegen/parse-workflow-code';
import type { WorkflowJSON } from '../src/types/base';
import { workflow } from '../src/workflow-builder';

const REAL_WORKFLOWS_DIR = path.resolve(__dirname, '../test-fixtures/real-workflows');
const MANIFEST_PATH = path.join(REAL_WORKFLOWS_DIR, 'manifest.json');

// Workflows that fail codegen entirely (syntax errors, node count issues)
const SKIP_IDS = new Set([
	'5979', // existing skip
	'7643',
	'11128',
	'10104',
	'5370',
	'10168',
	'10144', // SyntaxError in codegen
	'5774',
	'5042',
	'5929',
	'4889',
	'5900',
	'8044',
	'3820', // node count mismatch
]);

interface ExpectedWarning {
	code: string;
	nodeName?: string;
}

interface ManifestEntry {
	id: number;
	name: string;
	success: boolean;
	expectedWarnings?: ExpectedWarning[];
}

interface Manifest {
	fetchedAt: string;
	workflows: ManifestEntry[];
}

function warningKey(w: ExpectedWarning): string {
	return `${w.code}:${w.nodeName ?? ''}`;
}

function extractWarnings(validationResult: {
	warnings: Array<{ code: string; nodeName?: string }>;
}): ExpectedWarning[] {
	return validationResult.warnings
		.map((w) => ({
			code: w.code,
			...(w.nodeName ? { nodeName: w.nodeName } : {}),
		}))
		.sort((a, b) => warningKey(a).localeCompare(warningKey(b)));
}

function main() {
	if (!fs.existsSync(MANIFEST_PATH)) {
		console.error('manifest.json not found');
		process.exit(1);
	}

	const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')) as Manifest;
	let updated = 0;
	let skipped = 0;
	let failed = 0;
	let artifactCount = 0;

	for (const entry of manifest.workflows) {
		if (!entry.success) continue;
		if (SKIP_IDS.has(String(entry.id))) {
			skipped++;
			continue;
		}

		const filePath = path.join(REAL_WORKFLOWS_DIR, `${entry.id}.json`);
		if (!fs.existsSync(filePath)) continue;

		try {
			const json = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as WorkflowJSON;

			// Step 1: Validate the ORIGINAL workflow
			const originalBuilder = workflow.fromJSON(json);
			const originalResult = originalBuilder.validate();
			const originalWarnings = extractWarnings(originalResult);
			const originalWarningKeys = new Set(originalWarnings.map(warningKey));

			// Step 2: Validate the CODEGEN ROUNDTRIP
			const code = generateWorkflowCode(json);
			const roundtripBuilder = parseWorkflowCodeToBuilder(code);
			const roundtripResult = roundtripBuilder.validate();
			const roundtripWarnings = extractWarnings(roundtripResult);

			// Step 3: Only keep warnings that exist in the original (validated as real)
			const validatedWarnings = roundtripWarnings.filter((w) =>
				originalWarningKeys.has(warningKey(w)),
			);

			// Log codegen artifacts (warnings only in roundtrip, not in original)
			const artifacts = roundtripWarnings.filter((w) => !originalWarningKeys.has(warningKey(w)));
			if (artifacts.length > 0) {
				artifactCount += artifacts.length;
				console.log(
					`  Workflow ${entry.id}: ${artifacts.length} codegen artifact(s): ${artifacts.map(warningKey).join(', ')}`,
				);
			}

			if (validatedWarnings.length > 0) {
				entry.expectedWarnings = validatedWarnings;
				updated++;
			} else {
				delete entry.expectedWarnings;
			}
		} catch {
			failed++;
			console.error(`  Failed to process workflow ${entry.id}: ${entry.name}`);
		}
	}

	fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

	console.log('\nSummary:');
	console.log(`  Updated: ${updated} workflows with validated expectedWarnings`);
	console.log(`  Skipped: ${skipped} (in skip list)`);
	console.log(`  Failed: ${failed}`);
	console.log(`  Codegen artifacts found: ${artifactCount} (not added to manifest)`);
}

main();
