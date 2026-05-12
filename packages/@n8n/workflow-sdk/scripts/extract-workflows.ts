/**
 * Extract Test Workflows from Zips
 *
 * Extracts workflow JSON files from committed zip files for testing:
 *   - test-fixtures/real-workflows/public_published_templates.zip → test-fixtures/real-workflows/
 *   - examples/templates.zip → examples/workflows/ (used by examples-roundtrip test)
 *
 * Runs automatically via `pretest` hook before running tests.
 *
 * Usage:
 *   npx tsx scripts/extract-workflows.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';

const FIXTURES_DIR = path.resolve(__dirname, '../test-fixtures/real-workflows');
const FIXTURES_ZIP = path.join(FIXTURES_DIR, 'public_published_templates.zip');

const EXAMPLES_DIR = path.resolve(__dirname, '../examples');
const EXAMPLES_ZIP = path.join(EXAMPLES_DIR, 'templates.zip');
const EXAMPLES_WORKFLOWS_DIR = path.join(EXAMPLES_DIR, 'workflows');

function extractZip(zipPath: string, outputDir: string, label: string) {
	if (!fs.existsSync(zipPath)) {
		console.log(`No ${label} zip found at ${zipPath}, skipping extraction`);
		return;
	}

	fs.mkdirSync(outputDir, { recursive: true });

	const existingFiles = fs.readdirSync(outputDir).filter((f) => f.endsWith('.json'));
	if (existingFiles.length > 0) {
		console.log(`Found ${existingFiles.length} ${label} files, skipping extraction`);
		return;
	}

	console.log(`Extracting ${label} from zip...`);
	const zip = new AdmZip(zipPath);
	const entries = zip.getEntries();

	let count = 0;
	for (const entry of entries) {
		if (entry.entryName.endsWith('.json')) {
			const outputPath = path.join(outputDir, entry.entryName);
			fs.writeFileSync(outputPath, entry.getData());
			count++;
		}
	}

	console.log(`Extracted ${count} ${label} files`);
}

function main() {
	extractZip(FIXTURES_ZIP, FIXTURES_DIR, 'test-fixtures workflows');
	extractZip(EXAMPLES_ZIP, EXAMPLES_WORKFLOWS_DIR, 'examples workflows');
}

main();
