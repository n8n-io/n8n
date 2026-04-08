/**
 * Extract Test Workflows from Zip
 *
 * Extracts workflow JSON files from the committed zip file for testing.
 * This runs automatically via `pretest` hook before running tests.
 *
 * Usage:
 *   npx tsx scripts/extract-workflows.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';

const FIXTURES_DIR = path.resolve(__dirname, '../test-fixtures/real-workflows');
const ZIP_FILE = path.join(FIXTURES_DIR, 'public_published_templates.zip');

function main() {
	if (!fs.existsSync(ZIP_FILE)) {
		console.log('No zip file found, skipping extraction');
		return;
	}

	// Check if extraction is needed by looking for any .json file
	const existingFiles = fs.readdirSync(FIXTURES_DIR).filter((f) => f.endsWith('.json'));
	if (existingFiles.length > 0) {
		console.log(`Found ${existingFiles.length} workflow files, skipping extraction`);
		return;
	}

	console.log('Extracting workflows from zip...');
	const zip = new AdmZip(ZIP_FILE);
	const entries = zip.getEntries();

	let count = 0;
	for (const entry of entries) {
		if (entry.entryName.endsWith('.json')) {
			const outputPath = path.join(FIXTURES_DIR, entry.entryName);
			fs.writeFileSync(outputPath, entry.getData());
			count++;
		}
	}

	console.log(`Extracted ${count} workflow files`);
}

main();
