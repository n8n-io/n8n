/**
 * Fixtures Download Utility
 *
 * Downloads real workflows from n8n.io template library for testing.
 * Used by tests to ensure fixtures are available before running.
 *
 * API:
 *   GET https://api.n8n.io/api/workflows/{id}
 *   Response: { data: { attributes: { name, status, workflow: { nodes, connections, ... } } } }
 *
 *   GET https://n8n.io/api/product-api/workflows/search?rows=100&page=1
 *   Returns workflow metadata for discovering IDs
 */

import * as fs from 'fs';
import * as path from 'path';

export const DOWNLOADED_FIXTURES_DIR = path.resolve(
	__dirname,
	'../../test-fixtures/real-workflows',
);
export const COMMITTED_FIXTURES_DIR = path.resolve(
	__dirname,
	'../../test-fixtures/committed-workflows',
);

const FIXTURES_DIR = DOWNLOADED_FIXTURES_DIR;
const MANIFEST_PATH = path.join(FIXTURES_DIR, 'manifest.json');

interface WorkflowResponse {
	data: {
		attributes: {
			name: string;
			status: string;
			workflow: {
				nodes: unknown[];
				connections: Record<string, unknown>;
				settings?: Record<string, unknown>;
				pinData?: Record<string, unknown>;
			};
		};
	};
}

interface SearchResult {
	id: number;
	name: string;
}

interface ManifestEntry {
	id: number;
	name: string;
	success: boolean;
}

interface Manifest {
	fetchedAt: string;
	workflows: ManifestEntry[];
}

export class FixtureDownloadError extends Error {
	constructor(
		message: string,
		public readonly cause?: Error,
	) {
		super(message);
		this.name = 'FixtureDownloadError';
	}
}

async function searchWorkflows(page: number, rows: number = 100): Promise<SearchResult[]> {
	const url = `https://n8n.io/api/product-api/workflows/search?rows=${rows}&page=${page}`;

	const response = await fetch(url);
	if (!response.ok) {
		throw new FixtureDownloadError(
			`Failed to search workflows: ${response.status} ${response.statusText}`,
		);
	}
	const data = (await response.json()) as { workflows: SearchResult[]; totalWorkflows: number };
	return data.workflows || [];
}

async function fetchWorkflow(id: number): Promise<WorkflowResponse> {
	const url = `https://api.n8n.io/api/workflows/${id}`;

	const response = await fetch(url);
	if (!response.ok) {
		throw new FixtureDownloadError(
			`Failed to fetch workflow ${id}: ${response.status} ${response.statusText}`,
		);
	}
	return (await response.json()) as WorkflowResponse;
}

/**
 * Get list of workflow IDs from manifest that are missing their JSON files
 */
function getMissingWorkflowIds(): number[] {
	if (!fs.existsSync(MANIFEST_PATH)) {
		return [];
	}

	const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')) as Manifest;
	const missing: number[] = [];

	for (const entry of manifest.workflows) {
		if (!entry.success) continue;

		const filePath = path.join(FIXTURES_DIR, `${entry.id}.json`);
		if (!fs.existsSync(filePath)) {
			missing.push(entry.id);
		}
	}

	return missing;
}

/**
 * Check if fixtures are already downloaded and available
 */
export function fixturesExist(): boolean {
	if (!fs.existsSync(MANIFEST_PATH)) {
		return false;
	}

	const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')) as Manifest;
	const successfulWorkflows = manifest.workflows.filter((w) => w.success);

	if (successfulWorkflows.length === 0) {
		return false;
	}

	// Check if ALL workflow files exist (not just a sample)
	const missing = getMissingWorkflowIds();
	return missing.length === 0;
}

/**
 * Download missing workflow files that are listed in the manifest
 * @throws FixtureDownloadError if API is unreachable or returns errors
 */
async function downloadMissingFromManifest(): Promise<void> {
	const missingIds = getMissingWorkflowIds();
	if (missingIds.length === 0) {
		return;
	}

	for (const id of missingIds) {
		const data = await fetchWorkflow(id);

		if (data?.data?.attributes) {
			const { workflow } = data.data.attributes;
			const outputPath = path.join(FIXTURES_DIR, `${id}.json`);
			fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2));
		}
	}
}

/**
 * Download test fixtures from n8n.io API
 * @param targetCount - Target number of workflows to download (default: 100)
 * @throws FixtureDownloadError if API is unreachable or returns errors
 */
export async function downloadFixtures(targetCount: number = 100): Promise<void> {
	// Ensure output directory exists
	if (!fs.existsSync(FIXTURES_DIR)) {
		fs.mkdirSync(FIXTURES_DIR, { recursive: true });
	}

	// Load existing manifest to see what we already have
	let existingIds = new Set<number>();
	let allResults: ManifestEntry[] = [];

	if (fs.existsSync(MANIFEST_PATH)) {
		const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')) as Manifest;
		existingIds = new Set(manifest.workflows.filter((w) => w.success).map((w) => w.id));
		allResults = manifest.workflows;
	}

	// If we already have enough, don't download more
	if (existingIds.size >= targetCount) {
		return;
	}

	// Discover workflow IDs from search API
	const allWorkflowIds: number[] = [];

	// Fetch multiple pages to get enough workflow IDs
	for (let page = 1; page <= 10; page++) {
		const results = await searchWorkflows(page, 100);
		if (results.length === 0) break;

		for (const item of results) {
			if (!existingIds.has(item.id)) {
				allWorkflowIds.push(item.id);
			}
		}

		// Stop if we have enough candidates
		if (allWorkflowIds.length >= 200) break;
	}

	// Fetch workflows
	const results: ManifestEntry[] = [];
	let publishedCount = existingIds.size;

	for (const id of allWorkflowIds) {
		if (publishedCount >= targetCount) {
			break;
		}

		const data = await fetchWorkflow(id);

		if (data?.data?.attributes) {
			const { name, status, workflow } = data.data.attributes;

			// Only include published workflows
			if (status !== 'published') {
				continue;
			}

			const outputPath = path.join(FIXTURES_DIR, `${id}.json`);

			// Save just the workflow part (nodes, connections, settings)
			fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2));

			results.push({ id, name, success: true });
			publishedCount++;
		} else {
			results.push({ id, name: 'Unknown', success: false });
		}
	}

	// Add new results (avoid duplicates)
	const resultIds = new Set(allResults.map((r) => r.id));
	for (const result of results) {
		if (!resultIds.has(result.id)) {
			allResults.push(result);
		}
	}

	// Update manifest file
	const manifest: Manifest = {
		fetchedAt: new Date().toISOString(),
		workflows: allResults,
	};
	fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

/**
 * Ensure fixtures are available, downloading if necessary
 * @throws FixtureDownloadError if download fails
 */
export async function ensureFixtures(): Promise<void> {
	// First, download any missing files from the existing manifest
	await downloadMissingFromManifest();

	if (fixturesExist()) {
		return;
	}

	// If still missing fixtures (no manifest or need more), download fresh
	await downloadFixtures();

	if (!fixturesExist()) {
		throw new FixtureDownloadError(
			'Failed to download test fixtures. Check your network connection and try again.',
		);
	}
}
