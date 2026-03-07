/**
 * Execute compiled fixtures with pin data.
 *
 * Compiles each fixture's input.js → SDK → WorkflowJSON → executes with pin data.
 * Reports which nodes fail (missing pin data) so you can iteratively fix them.
 *
 * Usage:
 *   npx tsx src/simplified-compiler/run-fixtures.ts          # all fixtures
 *   npx tsx src/simplified-compiler/run-fixtures.ts w01      # single fixture
 */

import * as fs from 'fs';
import * as path from 'path';
import type { IConnections, INode } from 'n8n-workflow';
import { transpileWorkflowJS } from './compiler';
import { parseWorkflowCode } from '../codegen/parse-workflow-code';
import { executeWorkflow, extractPinData } from './execution-utils';

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const fixturesDir = path.join(__dirname, '__fixtures__');
const filter = process.argv[2];

async function run() {
	const dirs = fs
		.readdirSync(fixturesDir)
		.filter((d) => d.startsWith('w') && fs.statSync(path.join(fixturesDir, d)).isDirectory())
		.filter((d) => !filter || d.includes(filter))
		.sort();

	let passed = 0;
	let failed = 0;

	for (const dir of dirs) {
		const inputPath = path.join(fixturesDir, dir, 'input.js');
		if (!fs.existsSync(inputPath)) continue;

		const input = fs.readFileSync(inputPath, 'utf-8');

		// Step 1: Compile simplified JS → SDK
		const sdk = transpileWorkflowJS(input);
		if (sdk.errors.length > 0) {
			console.log(`✕ ${dir} — compile errors: ${sdk.errors.map((e) => e.message).join(', ')}`);
			failed++;
			continue;
		}

		// Step 2: Parse SDK → WorkflowJSON
		let workflowJson;
		try {
			workflowJson = parseWorkflowCode(sdk.code);
		} catch (e) {
			console.log(`✕ ${dir} — parse error: ${(e as Error).message}`);
			failed++;
			continue;
		}

		// Step 3: Extract pin data from workflow JSON and wrap in { json: ... }
		const pinData = extractPinData(workflowJson);

		// Step 4: Execute with pin data
		const result = await executeWorkflow(
			{
				name: dir,
				nodes: workflowJson.nodes as unknown as INode[],
				connections: workflowJson.connections as unknown as IConnections,
			},
			pinData,
		);

		if (result.success) {
			console.log(`✓ ${dir} — ${result.executedNodes.length} nodes (${result.durationMs}ms)`);
			passed++;
		} else {
			console.log(`✕ ${dir} — ${result.error}`);
			if (result.errorNode) console.log(`  Failed at: ${result.errorNode}`);
			console.log(`  Executed: [${result.executedNodes.join(', ')}]`);

			const nodeNames = workflowJson.nodes.map((n) => n.name).filter((n): n is string => !!n);
			const pinned = Object.keys(pinData);
			const unpinned = nodeNames.filter((n) => !pinned.includes(n));
			if (unpinned.length > 0) {
				console.log(`  Missing pin data: [${unpinned.join(', ')}]`);
			}
			failed++;
		}
	}

	console.log(`\n${passed} passed, ${failed} failed out of ${passed + failed} fixtures`);
}

run().catch(console.error);
