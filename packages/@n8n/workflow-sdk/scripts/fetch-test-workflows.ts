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
// Fetched from n8n.io/api/product-api/workflows/search
const WORKFLOW_IDS = [
	// First batch - AI and complex workflows
	6270, 5819, 10000, 7639, 5035, 8500, 6281, 7756, 5148, 5110, 7990, 12345, 5962, 4846, 5271, 5755,
	2519, 9867, 4827, 10358, 5338, 9437, 5170, 12462, 9200, 6287, 4968, 5906, 5678, 11572, 11204,
	6067, 9383, 8428, 7156, 8022, 5010, 4110, 4966, 8549, 4722, 5691, 5948, 7423, 5677, 10566, 10174,
	12645, 12325, 8093,
	// Second batch
	9814, 9576, 6841, 6524, 5626, 5449, 9429, 5683, 8597, 5690, 10427, 4352, 8591, 5796, 10531, 9626,
	7177, 5979, 4600, 10640, 9277, 5523, 3066, 10420, 5398, 5835, 8095, 4484, 9801, 7467, 6765, 5799,
	5817, 4723, 10889, 8237, 7163, 5857, 5856, 5228, 7422, 5832, 5711, 11724, 4557, 5541, 5385, 6480,
	10212, 5938,
	// Third batch
	5881, 4721, 5808, 4912, 12202, 5694, 4849, 5296, 7455, 5828, 6236, 5608, 4506, 11290, 11047, 7946,
	5680, 10139, 7945, 7849,
	// Previously working ones
	1954, 2043, 5786, 5779, 5789, 6897,
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
