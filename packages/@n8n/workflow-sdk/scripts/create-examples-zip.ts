/**
 * Packages all workflow JSON files from `examples/workflows/` into a single
 * `examples/templates.zip` for committing. The manifest stays as a separate
 * committed file — it is the source of truth and not zipped.
 *
 * Usage: pnpm create-examples-zip
 */
import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as path from 'path';

const EXAMPLES_DIR = path.resolve(__dirname, '..', 'examples');
const WORKFLOWS_DIR = path.join(EXAMPLES_DIR, 'workflows');
const ZIP_PATH = path.join(EXAMPLES_DIR, 'templates.zip');

function createExamplesZip(): void {
	if (!fs.existsSync(WORKFLOWS_DIR)) {
		console.error(`Error: workflows dir not found at ${WORKFLOWS_DIR}`);
		console.error('Run `pnpm regenerate-examples` first.');
		process.exit(1);
	}

	const zip = new AdmZip();
	const files = fs.readdirSync(WORKFLOWS_DIR).filter((f) => f.endsWith('.json'));

	if (files.length === 0) {
		console.error(`Error: no workflow JSON files found in ${WORKFLOWS_DIR}`);
		process.exit(1);
	}

	for (const file of files) {
		zip.addLocalFile(path.join(WORKFLOWS_DIR, file));
	}

	zip.writeZip(ZIP_PATH);
	console.log(`Created: ${ZIP_PATH}`);
	console.log(`Contents: ${files.length} workflows`);
}

createExamplesZip();
