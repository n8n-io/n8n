/**
 * Extract Test Workflows from the test-fixtures zip.
 *
 * test-fixtures/real-workflows/public_published_templates.zip → test-fixtures/real-workflows/
 *
 * Runs automatically via Vitest's globalSetup (see scripts/vitest-global-setup.ts).
 *
 * Usage:
 *   npx tsx scripts/extract-workflows.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';

const FIXTURES_DIR = path.resolve(__dirname, '../test-fixtures/real-workflows');
const FIXTURES_ZIP = path.join(FIXTURES_DIR, 'public_published_templates.zip');

function extractZip(zipPath: string, outputDir: string, label: string) {
	if (!fs.existsSync(zipPath)) {
		console.log(`No ${label} zip found at ${zipPath}, skipping extraction`);
		return;
	}

	fs.mkdirSync(outputDir, { recursive: true });

	// Workflow files are named `${id}.json` (numeric). `manifest.json` is the
	// committed source-of-truth metadata file and must NOT count as an extracted
	// workflow — otherwise we skip extraction on every fresh checkout and the
	// per-suite `beforeAll` hook ends up doing the bulk work under the 10s
	// hookTimeout.
	const existingFiles = fs.readdirSync(outputDir).filter((f) => /^\d+\.json$/.test(f));
	if (existingFiles.length > 0) {
		console.log(`Found ${existingFiles.length} ${label} files, skipping extraction`);
		return;
	}

	console.log(`Extracting ${label} from zip...`);
	const zip = new AdmZip(zipPath);
	const entries = zip.getEntries();
	const resolvedOutputDir = path.resolve(outputDir);

	let count = 0;
	for (const entry of entries) {
		if (!entry.entryName.endsWith('.json')) continue;
		// Preserve the committed manifest.json — it carries hand-edited
		// expectedWarnings/skip flags that the zip's bundled copy may lack.
		if (entry.entryName === 'manifest.json') continue;
		const outputPath = path.resolve(outputDir, entry.entryName);
		if (outputPath !== resolvedOutputDir && !outputPath.startsWith(resolvedOutputDir + path.sep)) {
			console.warn(`Skipping out-of-bounds entry: ${entry.entryName}`);
			continue;
		}
		fs.writeFileSync(outputPath, entry.getData());
		count++;
	}

	console.log(`Extracted ${count} ${label} files`);
}

export function extractAllWorkflows() {
	extractZip(FIXTURES_ZIP, FIXTURES_DIR, 'test-fixtures workflows');
}

if (require.main === module) {
	extractAllWorkflows();
}
