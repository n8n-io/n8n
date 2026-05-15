/**
 * Zip extraction utility for the curated workflow examples.
 *
 * The 106 workflow JSON files are committed as a single `examples/templates.zip`
 * to keep the package small. At runtime the loader calls `ensureExtracted()`
 * which extracts them on first use. The committed `manifest.json` is the
 * source of truth and is NOT in the zip.
 */
import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const EXAMPLES_DIR = path.resolve(__dirname, '..', 'examples');
const ZIP_PATH = path.join(EXAMPLES_DIR, 'templates.zip');
const MANIFEST_PATH = path.join(EXAMPLES_DIR, 'manifest.json');

function sdkVersion(): string {
	try {
		const pkgPath = path.resolve(__dirname, '..', 'package.json');
		// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse -- Own package.json
		return (
			(JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { version?: string }).version ??
			'unversioned'
		);
	} catch {
		return 'unversioned';
	}
}

// Tmp cache for unzipped workflows — keyed by SDK version so upgrades extract
// fresh. We can't unzip back into the package because node_modules is
// read-only inside n8n's Docker image.
export const WORKFLOWS_CACHE_DIR = path.join(
	os.tmpdir(),
	'n8n-workflow-sdk',
	sdkVersion(),
	'workflows',
);

interface ManifestEntry {
	slug: string;
	success: boolean;
	skip?: boolean;
}

interface ManifestFile {
	workflows: ManifestEntry[];
}

export function zipExists(): boolean {
	return fs.existsSync(ZIP_PATH);
}

/**
 * True if the zip exists and at least one workflow file expected by the
 * manifest is missing on disk.
 */
export function needsExtraction(): boolean {
	if (!fs.existsSync(ZIP_PATH)) return false;
	if (!fs.existsSync(MANIFEST_PATH)) return false;

	// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse -- Internal manifest file
	const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')) as ManifestFile;
	for (const entry of manifest.workflows ?? []) {
		if (!entry.success || entry.skip) continue;
		const filePath = path.join(WORKFLOWS_CACHE_DIR, `${entry.slug}.json`);
		if (!fs.existsSync(filePath)) return true;
	}
	return false;
}

/**
 * Extract all workflow JSONs from the zip into `examples/workflows/`.
 * The committed manifest.json is the source of truth and is not in the zip.
 */
export function extractFromZip(): void {
	if (!fs.existsSync(ZIP_PATH)) {
		throw new Error(`Examples zip not found: ${ZIP_PATH}`);
	}
	if (!fs.existsSync(WORKFLOWS_CACHE_DIR)) {
		fs.mkdirSync(WORKFLOWS_CACHE_DIR, { recursive: true });
	}

	const zip = new AdmZip(ZIP_PATH);
	for (const entry of zip.getEntries()) {
		if (entry.isDirectory) continue;
		zip.extractEntryTo(entry, WORKFLOWS_CACHE_DIR, false, true);
	}
}

export function ensureExtracted(): void {
	if (needsExtraction()) {
		extractFromZip();
	}
}
