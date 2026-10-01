#!/usr/bin/env node
import { codeToJson } from './code-to-json';
import { jsonToCode } from './json-to-code';
import { validateCommand } from './validate';

const [command, ...rest] = process.argv.slice(2);

async function main(): Promise<void> {
	if (command === 'json-to-code') {
		jsonToCode(rest[0]);
		return;
	}
	if (command === 'code-to-json') {
		codeToJson(rest[0]);
		return;
	}
	if (command === 'validate') {
		await validateCommand(rest);
		return;
	}

	console.error('Usage: workflow-sdk <json-to-code|code-to-json|validate> <file-path> [--json]');
	console.error('');
	console.error('Commands:');
	console.error('  json-to-code  Convert workflow JSON to SDK TypeScript code');
	console.error('  code-to-json  Convert SDK TypeScript code to workflow JSON');
	console.error('  validate      Run graph + schema validation on an SDK TypeScript file');
	console.error('');
	console.error('Examples:');
	console.error('  pnpm json-to-code ./workflow.json');
	console.error('  pnpm code-to-json ./workflow.ts');
	console.error(
		'  node --import tsx node_modules/@n8n/workflow-sdk/dist/cli/index.js validate src/workflow.ts',
	);
	process.exit(1);
}

void main();
