/**
 * Zip Extraction Utility for Real Workflow Fixtures
 *
 * Handles extraction of workflow JSON files from the committed zip file
 * and validates that all manifest workflows are present.
 */

import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as path from 'path';

const REAL_WORKFLOWS_DIR = path.resolve(__dirname, '../../test-fixtures/real-workflows');
const ZIP_PATH = path.join(REAL_WORKFLOWS_DIR, 'public_published_templates.zip');
const MANIFEST_PATH = path.join(REAL_WORKFLOWS_DIR, 'manifest.json');

interface ManifestEntry {
	id: number;
	name: string;
	success: boolean;
}

interface Manifest {
	fetchedAt: string;
	workflows: ManifestEntry[];
}

/**
 * Check if the zip file exists
 */
export function zipExists(): boolean {
	return fs.existsSync(ZIP_PATH);
}

/**
 * Check if the zip file exists and workflows need extraction
 */
export function needsExtraction(): boolean {
	if (!fs.existsSync(ZIP_PATH)) {
		return false; // No zip to extract from
	}

	if (!fs.existsSync(MANIFEST_PATH)) {
		return true; // Zip exists but no manifest - need extraction
	}

	// Check if any workflow files are missing
	// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse -- Manifest is controlled fixture file
	const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')) as Manifest;
	for (const entry of manifest.workflows) {
		if (!entry.success) continue;
		const filePath = path.join(REAL_WORKFLOWS_DIR, `${entry.id}.json`);
		if (!fs.existsSync(filePath)) {
			return true;
		}
	}

	return false;
}

/**
 * Extract workflows from zip file
 */
export function extractWorkflowsFromZip(): void {
	if (!fs.existsSync(ZIP_PATH)) {
		throw new Error(`Zip file not found: ${ZIP_PATH}`);
	}

	// Ensure output directory exists
	if (!fs.existsSync(REAL_WORKFLOWS_DIR)) {
		fs.mkdirSync(REAL_WORKFLOWS_DIR, { recursive: true });
	}

	const zip = new AdmZip(ZIP_PATH);
	zip.extractAllTo(REAL_WORKFLOWS_DIR, true); // overwrite existing
}

/**
 * Ensure workflows are extracted from zip if needed.
 * Throws if zip doesn't exist or extraction fails.
 */
export function ensureWorkflowsExtracted(): void {
	if (needsExtraction()) {
		extractWorkflowsFromZip();
	}
}

/**
 * Validate that all workflows in manifest.json exist as files.
 * Throws if any workflow file is missing.
 */
export function validateAllWorkflowsExist(): void {
	if (!fs.existsSync(MANIFEST_PATH)) {
		throw new Error(`Manifest not found: ${MANIFEST_PATH}. Run extraction first.`);
	}

	// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse -- Manifest is controlled fixture file
	const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')) as Manifest;
	const missing: string[] = [];

	for (const entry of manifest.workflows) {
		if (!entry.success) continue;
		const filePath = path.join(REAL_WORKFLOWS_DIR, `${entry.id}.json`);
		if (!fs.existsSync(filePath)) {
			missing.push(`${entry.id}.json (${entry.name})`);
		}
	}

	if (missing.length > 0) {
		throw new Error(
			`Missing workflow files from manifest:\n${missing.join('\n')}\n` +
				'Ensure public_published_templates.zip is committed and extracted.',
		);
	}
}
