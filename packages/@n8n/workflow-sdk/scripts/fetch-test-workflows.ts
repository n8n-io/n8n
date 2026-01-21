/**
 * Fetch Test Workflows
 *
 * Downloads real workflows from n8n.io template library for testing.
 * These workflows are committed to the repo for reproducible tests.
 *
 * Usage:
 *   npx tsx scripts/fetch-test-workflows.ts
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

const OUTPUT_DIR = path.resolve(__dirname, '../test-fixtures/real-workflows');

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

async function searchWorkflows(page: number, rows: number = 100): Promise<SearchResult[]> {
	const url = `https://n8n.io/api/product-api/workflows/search?rows=${rows}&page=${page}`;
	console.log(`Searching workflows page ${page}...`);

	try {
		const response = await fetch(url);
		if (!response.ok) {
			console.error(`  Failed to search workflows: ${response.status}`);
			return [];
		}
		const data = (await response.json()) as { workflows: SearchResult[]; totalWorkflows: number };
		return data.workflows || [];
	} catch (error) {
		console.error(`  Error searching workflows:`, error);
		return [];
	}
}

async function fetchWorkflow(id: number): Promise<WorkflowResponse | null> {
	const url = `https://api.n8n.io/api/workflows/${id}`;

	try {
		const response = await fetch(url);
		if (!response.ok) {
			console.error(`  Failed to fetch workflow ${id}: ${response.status} ${response.statusText}`);
			return null;
		}
		return (await response.json()) as WorkflowResponse;
	} catch (error) {
		console.error(`  Error fetching workflow ${id}:`, error);
		return null;
	}
}

async function main() {
	// Ensure output directory exists
	if (!fs.existsSync(OUTPUT_DIR)) {
		fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	}

	// Load existing manifest to see what we already have
	const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
	let existingIds = new Set<number>();
	if (fs.existsSync(manifestPath)) {
		const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
		existingIds = new Set(
			manifest.workflows
				.filter((w: { success: boolean }) => w.success)
				.map((w: { id: number }) => w.id),
		);
		console.log(`Found ${existingIds.size} existing workflows\n`);
	}

	// Discover workflow IDs from search API
	console.log('Discovering workflows from n8n.io search API...\n');
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
		console.log(
			`  Page ${page}: ${results.length} workflows, ${allWorkflowIds.length} new candidates`,
		);

		// Stop if we have enough candidates
		if (allWorkflowIds.length >= 200) break;
	}

	console.log(`\nFound ${allWorkflowIds.length} new workflow candidates\n`);
	console.log('Fetching workflows (only published)...\n');

	const results: { id: number; name: string; success: boolean }[] = [];
	let publishedCount = 0;
	const TARGET_COUNT = 100;

	for (const id of allWorkflowIds) {
		if (publishedCount >= TARGET_COUNT) {
			console.log(`\nReached target of ${TARGET_COUNT} published workflows`);
			break;
		}

		console.log(`Fetching workflow ${id}...`);
		const data = await fetchWorkflow(id);

		if (data && data.data && data.data.attributes) {
			const { name, status, workflow } = data.data.attributes;

			// Only include published workflows
			if (status !== 'published') {
				console.log(`  Skipping: status=${status} (not published)`);
				continue;
			}

			const outputPath = path.join(OUTPUT_DIR, `${id}.json`);

			// Save just the workflow part (nodes, connections, settings)
			fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2));
			console.log(`  Saved: ${outputPath}`);
			console.log(`  Name: ${name}`);
			console.log(`  Nodes: ${workflow.nodes.length}`);
			console.log('');

			results.push({ id, name, success: true });
			publishedCount++;
		} else {
			results.push({ id, name: 'Unknown', success: false });
		}
	}

	// Load existing results and merge with new ones
	let allResults: { id: number; name: string; success: boolean }[] = [];
	if (fs.existsSync(manifestPath)) {
		const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
		allResults = manifest.workflows;
	}

	// Add new results (avoid duplicates)
	const resultIds = new Set(allResults.map((r) => r.id));
	for (const result of results) {
		if (!resultIds.has(result.id)) {
			allResults.push(result);
		}
	}

	// Update manifest file
	const manifest = {
		fetchedAt: new Date().toISOString(),
		workflows: allResults,
	};
	fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

	console.log('\nSummary:');
	console.log(`  New published workflows: ${publishedCount}`);
	console.log(`  Failed: ${results.filter((r) => !r.success).length}`);
	console.log(`  Total in manifest: ${allResults.filter((r) => r.success).length}`);
}

main().catch(console.error);
