/**
 * Validate Expected Warnings in Manifest
 *
 * Audits manifest.json for false positives by comparing expectedWarnings
 * against actual warnings produced by validating the original workflow.
 *
 * Usage: npx tsx scripts/validate-expected-warnings.ts
 */

import * as fs from 'fs';
import * as path from 'path';

import type { WorkflowJSON } from '../src/types/base';
import { workflow } from '../src/workflow-builder';

const REAL_WORKFLOWS_DIR = path.resolve(__dirname, '../test-fixtures/real-workflows');
const MANIFEST_PATH = path.join(REAL_WORKFLOWS_DIR, 'manifest.json');

// Workflows that fail codegen entirely (syntax errors, node count issues, param mismatches)
const SKIP_IDS = new Set([
	'5979',
	'7643',
	'11128',
	'5370',
	'5774',
	'5042',
	'5929',
	'4889',
	'5900',
	'8044',
	'3820',
	'9473',
	'2978',
	'4468',
	'13291',
	'10143',
	'4910',
	'2986',
	'9881',
	'10440',
	'11027',
	'11807',
]);

interface ExpectedWarning {
	code: string;
	nodeName?: string;
}

interface ManifestEntry {
	id: number;
	name: string;
	success: boolean;
	skip?: boolean;
	skipReason?: string;
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
	let checked = 0;
	let clean = 0;
	let withFalsePositives = 0;
	let withMissing = 0;
	let skipped = 0;
	let failed = 0;
	let totalFalsePositives = 0;
	let totalMissing = 0;

	for (const entry of manifest.workflows) {
		if (!entry.success) continue;
		if (entry.skip) continue;
		if (SKIP_IDS.has(String(entry.id))) {
			skipped++;
			continue;
		}
		if (!entry.expectedWarnings || entry.expectedWarnings.length === 0) continue;

		const filePath = path.join(REAL_WORKFLOWS_DIR, `${entry.id}.json`);
		if (!fs.existsSync(filePath)) continue;

		checked++;

		try {
			const json = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as WorkflowJSON;

			const builder = workflow.fromJSON(json);
			const result = builder.validate();
			const actualWarnings = extractWarnings(result);
			const actualKeys = new Set(actualWarnings.map(warningKey));

			const expectedKeys = new Set(entry.expectedWarnings.map(warningKey));

			const falsePositives = entry.expectedWarnings.filter((w) => !actualKeys.has(warningKey(w)));
			const missing = actualWarnings.filter((w) => !expectedKeys.has(warningKey(w)));

			if (falsePositives.length === 0 && missing.length === 0) {
				clean++;
				continue;
			}

			if (falsePositives.length > 0) {
				withFalsePositives++;
				totalFalsePositives += falsePositives.length;
				console.log(`\n  Workflow ${entry.id} — ${falsePositives.length} false positive(s):`);
				for (const fp of falsePositives) {
					console.log(`    - ${warningKey(fp)}`);
				}
			}

			if (missing.length > 0) {
				withMissing++;
				totalMissing += missing.length;
				console.log(`\n  Workflow ${entry.id} — ${missing.length} missing warning(s):`);
				for (const m of missing) {
					console.log(`    + ${warningKey(m)}`);
				}
			}
		} catch {
			failed++;
			console.error(`  Failed to validate workflow ${entry.id}: ${entry.name}`);
		}
	}

	console.log('\nSummary:');
	console.log(`  Checked: ${checked} workflows with expectedWarnings`);
	console.log(`  Clean: ${clean}`);
	console.log(`  With false positives: ${withFalsePositives} (${totalFalsePositives} total)`);
	console.log(`  With missing warnings: ${withMissing} (${totalMissing} total)`);
	console.log(`  Skipped: ${skipped}`);
	console.log(`  Failed: ${failed}`);

	if (withFalsePositives > 0) {
		console.log('\nFalse positives found — manifest needs updating.');
		process.exit(1);
	}

	console.log('\nNo false positives found.');
}

main();
