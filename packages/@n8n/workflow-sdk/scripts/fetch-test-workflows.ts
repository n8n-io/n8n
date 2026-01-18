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
 *   Response: { data: { attributes: { name, workflow: { nodes, connections, ... } } } }
 */

import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.resolve(__dirname, '../test-fixtures/real-workflows');

// Workflow IDs to fetch - covering various patterns
// Note: Only published/public workflows are accessible via API
const WORKFLOW_IDS = [
	// AI/Chat workflows
	1954, // AI agent chat (5 nodes)

	// Complex integrations
	2043, // Crypto market alert with Binance and Telegram (7 nodes)
	5786, // Scrape public email addresses (10 nodes)
	5779, // Generate natural voices with TTS (17 nodes)
	2286, // lemlist <> Hubspot integration (49 nodes)
	5789, // Multi-account email classifier (28 nodes)
	1864, // Enrich company lists with OpenAI (11 nodes)
	6897, // CV screening with Telegram & Gemini (23 nodes)
];

interface WorkflowResponse {
	data: {
		attributes: {
			name: string;
			workflow: {
				nodes: unknown[];
				connections: Record<string, unknown>;
				settings?: Record<string, unknown>;
				pinData?: Record<string, unknown>;
			};
		};
	};
}

async function fetchWorkflow(id: number): Promise<WorkflowResponse | null> {
	const url = `https://api.n8n.io/api/workflows/${id}`;
	console.log(`Fetching workflow ${id}...`);

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

	console.log('Fetching test workflows from n8n.io...\n');

	const results: { id: number; name: string; success: boolean }[] = [];

	for (const id of WORKFLOW_IDS) {
		const data = await fetchWorkflow(id);

		if (data && data.data && data.data.attributes) {
			const { name, workflow } = data.data.attributes;
			const outputPath = path.join(OUTPUT_DIR, `${id}.json`);

			// Save just the workflow part (nodes, connections, settings)
			fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2));
			console.log(`  Saved: ${outputPath}`);
			console.log(`  Name: ${name}`);
			console.log(`  Nodes: ${workflow.nodes.length}`);
			console.log('');

			results.push({ id, name, success: true });
		} else {
			results.push({ id, name: 'Unknown', success: false });
		}
	}

	// Create manifest file
	const manifest = {
		fetchedAt: new Date().toISOString(),
		workflows: results,
	};
	fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

	console.log('\nSummary:');
	console.log(`  Total: ${results.length}`);
	console.log(`  Success: ${results.filter((r) => r.success).length}`);
	console.log(`  Failed: ${results.filter((r) => !r.success).length}`);
}

main().catch(console.error);
