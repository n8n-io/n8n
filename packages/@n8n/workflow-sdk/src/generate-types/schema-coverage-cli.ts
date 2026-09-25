/**
 * CLI for the output-schema coverage report.
 *
 * Usage:
 *   pnpm schema-coverage           # markdown table to stdout
 *   pnpm schema-coverage --json    # machine-readable JSON to stdout
 */

import * as fs from 'fs';
import { jsonParse } from 'n8n-workflow';

import { NODES_BASE_TYPES, type NodeTypeDescription } from './generate-types';
import { computeSchemaCoverage, formatCoverageMarkdown } from './schema-coverage';

function main(): void {
	if (!fs.existsSync(NODES_BASE_TYPES)) {
		console.error(`nodes.json not found at ${NODES_BASE_TYPES}. Build n8n-nodes-base first.`);
		process.exit(1);
	}

	const content = fs.readFileSync(NODES_BASE_TYPES, 'utf-8');
	const nodes = jsonParse<NodeTypeDescription[]>(content);
	const report = computeSchemaCoverage(nodes);

	if (process.argv.includes('--json')) {
		console.log(JSON.stringify(report, null, 2));
	} else {
		console.log(formatCoverageMarkdown(report));
	}
}

if (require.main === module) {
	main();
}
