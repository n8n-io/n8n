/**
 * Create Workflows Zip Script
 *
 * Packages all workflow JSON files and manifest.json from test-fixtures/real-workflows/
 * into a single zip file (public_published_templates.zip) for committing to the repo.
 *
 * Usage: pnpm create-workflows-zip
 */

import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as path from 'path';

const REAL_WORKFLOWS_DIR = path.resolve(__dirname, '../test-fixtures/real-workflows');
const ZIP_PATH = path.join(REAL_WORKFLOWS_DIR, 'public_published_templates.zip');
const MANIFEST_PATH = path.join(REAL_WORKFLOWS_DIR, 'manifest.json');

function createWorkflowsZip(): void {
	// Verify manifest exists
	if (!fs.existsSync(MANIFEST_PATH)) {
		console.error('Error: manifest.json not found at', MANIFEST_PATH);
		console.error('Run `pnpm fetch-workflows` first to download workflows from the API.');
		process.exit(1);
	}

	const zip = new AdmZip();

	// Add manifest.json first
	zip.addLocalFile(MANIFEST_PATH);

	// Add all workflow JSON files
	const files = fs.readdirSync(REAL_WORKFLOWS_DIR);
	let count = 0;

	for (const file of files) {
		if (file.endsWith('.json') && file !== 'manifest.json') {
			const filePath = path.join(REAL_WORKFLOWS_DIR, file);
			zip.addLocalFile(filePath);
			count++;
		}
	}

	if (count === 0) {
		console.error('Error: No workflow JSON files found in', REAL_WORKFLOWS_DIR);
		console.error('Run `pnpm fetch-workflows` first to download workflows from the API.');
		process.exit(1);
	}

	// Write the zip file
	zip.writeZip(ZIP_PATH);
	console.log(`Created: ${ZIP_PATH}`);
	console.log(`Contents: ${count} workflows + manifest.json`);
}

createWorkflowsZip();
