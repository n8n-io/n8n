#!/usr/bin/env node
// ---------------------------------------------------------------------------
// CLI for the simulation-fixture graded eval (INS-668)
//
// Usage:
//   pnpm eval:simulation-fixtures
//   pnpm eval:simulation-fixtures --filter slack --verbose
//   pnpm eval:simulation-fixtures --threshold 0.9
//
// Needs a model API key in the environment (ANTHROPIC_API_KEY / N8N_AI_ANTHROPIC_KEY).
// Exits non-zero when the overall pass fraction is below the threshold.
// ---------------------------------------------------------------------------

import { FIXTURE_CASES } from './cases';
import { gradeCase, type CaseResult } from './runner';

interface CliArgs {
	filter?: string;
	verbose: boolean;
	threshold: number;
}

function parseArgs(argv: string[]): CliArgs {
	// 0.8 cleanly separates the bug (0%) from a healthy run (~100%) while
	// tolerating occasional single-node schema variance from the model.
	const args: CliArgs = { verbose: false, threshold: 0.8 };
	for (let i = 0; i < argv.length; i++) {
		switch (argv[i]) {
			case '--verbose':
			case '-v':
				args.verbose = true;
				break;
			case '--filter':
				args.filter = argv[++i];
				break;
			case '--threshold':
				args.threshold = Number(argv[++i]);
				break;
			default:
				break;
		}
	}
	return args;
}

function printCase(result: CaseResult, verbose: boolean): void {
	const mark = result.pass ? '✓' : '✗';
	console.log(`${mark} ${result.id} — ${result.description}`);
	if (result.error) console.log(`    error: ${result.error}`);
	for (const node of result.nodes) {
		if (node.pass && !verbose) continue;
		const flags = [
			node.nonEmpty ? 'non-empty' : 'EMPTY',
			node.schemaAppropriate ? 'schema-ok' : `missing any of [${node.missingFrom.join(', ')}]`,
		].join(', ');
		console.log(`    ${node.pass ? '·' : '✗'} ${node.nodeName}: ${flags}`);
		if (verbose) console.log(`      keys: ${JSON.stringify(Object.keys(node.item))}`);
	}
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	const cases = args.filter
		? FIXTURE_CASES.filter((c) => c.id.includes(args.filter as string))
		: FIXTURE_CASES;

	if (cases.length === 0) {
		console.error(`No cases match filter "${args.filter ?? ''}"`);
		process.exit(1);
	}

	const results = await Promise.all(cases.map(gradeCase));
	results.forEach((r) => printCase(r, args.verbose));

	const allNodes = results.flatMap((r) => r.nodes);
	const passedNodes = allNodes.filter((n) => n.pass).length;
	const passedCases = results.filter((r) => r.pass).length;
	const score = allNodes.length > 0 ? passedNodes / allNodes.length : 0;

	console.log('');
	console.log(
		`Cases: ${passedCases}/${results.length} passed · Nodes: ${passedNodes}/${allNodes.length} passed · Score: ${(score * 100).toFixed(1)}% (threshold ${(args.threshold * 100).toFixed(0)}%)`,
	);

	if (score < args.threshold) {
		console.log('RED: below threshold');
		process.exit(1);
	}
	console.log('GREEN: at or above threshold');
}

void main();
