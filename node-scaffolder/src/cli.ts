#!/usr/bin/env node
/**
 * node-scaffolder — scaffold a declarative nodes-base node from a short spec.
 *
 * Usage:
 *   pnpm scaffold --spec examples/etsy.yaml
 *   pnpm scaffold --text "add a node for the Etsy REST API"
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveRepoRoot, WriteBoundary } from './boundary.js';
import { generateNodeFiles } from './generate.js';
import { runLintLoop } from './lint-loop.js';
import { generateNodeCard } from './node-card.js';
import { loadSpecFromYaml, parseSpecFromText, toPascalCase } from './parse-spec.js';
import { generateTests } from './tests.js';
import type { NodeSpec } from './types.js';

function printUsage(): void {
	console.error(`Usage:
  pnpm scaffold --spec <file.yaml>
  pnpm scaffold --text "add a node for the Etsy REST API"
`);
}

function parseArgs(argv: string[]): { specPath?: string; text?: string } {
	const args = argv.filter((a) => a !== '--');
	const specIdx = args.indexOf('--spec');
	const textIdx = args.indexOf('--text');

	if (specIdx !== -1 && args[specIdx + 1]) {
		return { specPath: args[specIdx + 1] };
	}
	if (textIdx !== -1 && args[textIdx + 1]) {
		return { text: args.slice(textIdx + 1).join(' ') };
	}
	return {};
}

function main(): void {
	const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
	const repoRoot = resolveRepoRoot(packageRoot);
	const { specPath, text } = parseArgs(process.argv.slice(2));

	if (!specPath && !text) {
		printUsage();
		process.exit(1);
	}

	const spec: NodeSpec = specPath
		? loadSpecFromYaml(resolve(packageRoot, specPath))
		: parseSpecFromText(text!);

	const folderName = toPascalCase(spec.displayName);
	const boundary = new WriteBoundary(repoRoot, folderName);

	console.log(`\nScaffolding ${spec.displayName} → packages/nodes-base/nodes/${folderName}/`);
	console.log(`Auth: ${spec.auth} | Base URL: ${spec.baseUrl}\n`);

	generateNodeFiles(boundary, spec);
	generateTests(boundary, spec);
	generateNodeCard(boundary, spec, folderName);

	console.log('\nRunning eslint-plugin-n8n-nodes-base loop (via packages/nodes-base)…');
	const lint = runLintLoop(repoRoot, folderName);

	console.log(`\n${boundary.formatReport()}`);

	console.log('\n## Follow-ups outside boundary');
	console.log(
		`- Register dist path in packages/nodes-base/package.json "n8n"."nodes" (e.g. "dist/nodes/${folderName}/${folderName}.node.js")`,
	);
	if (spec.auth !== 'none') {
		console.log(
			`- Move credentials-draft/* → packages/nodes-base/credentials/ and register under "n8n"."credentials"`,
		);
	}
	console.log(
		`- For production custom nodes prefer: npm create @n8n/node (community package). Monorepo new-node PRs are usually auto-closed.`,
	);
	console.log(`\nNode card: packages/nodes-base/nodes/${folderName}/NODE_CARD.md`);
	console.log(
		lint.clean
			? `\nLint: CLEAN after ${lint.iterations} iteration(s).`
			: `\nLint: NOT clean after ${lint.iterations} iteration(s). Review eslint output above.`,
	);

	process.exit(lint.clean ? 0 : 1);
}

main();
