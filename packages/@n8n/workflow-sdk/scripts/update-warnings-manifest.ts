/**
 * Regenerate `expectedWarnings` in the fixture manifests.
 *
 * The codegen roundtrip suite compares `builder.validate()` warnings for every
 * fixture workflow against the committed manifest, so adding or changing a
 * validator makes the baseline stale. Run this after such a change and review
 * the diff — it is the corpus-wide report of what the new rule fires on.
 *
 * Usage:
 *   pnpm update-warnings-manifest          # rewrite manifests
 *   pnpm update-warnings-manifest --dry-run  # report counts only
 */

import * as fs from 'fs';
import * as path from 'path';

import { generateWorkflowCode } from '../src/codegen/index';
import { parseWorkflowCodeToBuilder } from '../src/codegen/parse-workflow-code';
import type { WorkflowJSON } from '../src/types/base';

interface ExpectedWarning {
	code: string;
	nodeName?: string;
}

interface ManifestEntry {
	id: string | number;
	name: string;
	success: boolean;
	skip?: boolean;
	expectedWarnings?: ExpectedWarning[];
	[key: string]: unknown;
}

interface Manifest {
	[key: string]: unknown;
	workflows: ManifestEntry[];
}

const FIXTURE_DIRS = [
	path.resolve(__dirname, '../test-fixtures/committed-workflows'),
	path.resolve(__dirname, '../test-fixtures/real-workflows'),
];

const dryRun = process.argv.includes('--dry-run');

/** Same ordering the roundtrip test applies before comparing. */
function sortWarnings(warnings: ExpectedWarning[]): ExpectedWarning[] {
	const key = (w: ExpectedWarning) => `${w.code}:${w.nodeName ?? ''}`;
	return [...warnings].sort((a, b) => key(a).localeCompare(key(b)));
}

function computeWarnings(json: WorkflowJSON): ExpectedWarning[] | undefined {
	const builder = parseWorkflowCodeToBuilder(generateWorkflowCode(json));
	// The roundtrip test serializes before validating, which merges
	// instance-declared connections into the graph. Mirror that ordering.
	builder.toJSON();
	const result = builder.validate();
	return sortWarnings(
		result.warnings.map((w) => ({
			code: w.code,
			...(w.nodeName !== undefined ? { nodeName: w.nodeName } : {}),
		})),
	);
}

/** Keep `expectedWarnings` in its usual slot rather than appending it last. */
function withExpectedWarnings(
	entry: ManifestEntry,
	warnings: ExpectedWarning[] | undefined,
): ManifestEntry {
	const rebuilt: ManifestEntry = {} as ManifestEntry;
	for (const [key, value] of Object.entries(entry)) {
		if (key === 'expectedWarnings') continue;
		rebuilt[key] = value;
		if (key === 'success' && warnings && warnings.length > 0) {
			rebuilt.expectedWarnings = warnings;
		}
	}
	return rebuilt;
}

const addedByCode = new Map<string, number>();
const removedByCode = new Map<string, number>();

function tally(target: Map<string, number>, warnings: ExpectedWarning[]): void {
	for (const warning of warnings) {
		target.set(warning.code, (target.get(warning.code) ?? 0) + 1);
	}
}

for (const dir of FIXTURE_DIRS) {
	const manifestPath = path.join(dir, 'manifest.json');
	if (!fs.existsSync(manifestPath)) {
		console.log(`skip ${manifestPath} (not found)`);
		continue;
	}

	const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Manifest;
	let changed = 0;
	let failed = 0;

	manifest.workflows = manifest.workflows.map((entry) => {
		if (!entry.success || entry.skip) return entry;

		const filePath = path.join(dir, `${entry.id}.json`);
		if (!fs.existsSync(filePath)) return entry;

		let warnings: ExpectedWarning[] | undefined;
		try {
			const json = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as WorkflowJSON;
			warnings = computeWarnings(json);
		} catch (error) {
			failed++;
			console.warn(`  ! ${entry.id}: ${(error as Error).message}`);
			return entry;
		}

		const before = entry.expectedWarnings ?? [];
		const after = warnings ?? [];
		if (JSON.stringify(sortWarnings(before)) === JSON.stringify(after)) return entry;

		const beforeKeys = new Set(sortWarnings(before).map((w) => `${w.code}:${w.nodeName ?? ''}`));
		const afterKeys = new Set(after.map((w) => `${w.code}:${w.nodeName ?? ''}`));
		tally(
			addedByCode,
			after.filter((w) => !beforeKeys.has(`${w.code}:${w.nodeName ?? ''}`)),
		);
		tally(
			removedByCode,
			sortWarnings(before).filter((w) => !afterKeys.has(`${w.code}:${w.nodeName ?? ''}`)),
		);

		changed++;
		return withExpectedWarnings(entry, warnings);
	});

	console.log(`${path.basename(dir)}: ${changed} entries updated, ${failed} failed`);

	if (!dryRun && changed > 0) {
		fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, '\t')}\n`, 'utf-8');
	}
}

const report = (label: string, counts: Map<string, number>) => {
	if (counts.size === 0) return;
	console.log(`\n${label}:`);
	for (const [code, count] of [...counts].sort((a, b) => b[1] - a[1])) {
		console.log(`  ${count}\t${code}`);
	}
};

report('warnings added', addedByCode);
report('warnings removed', removedByCode);
