#!/usr/bin/env node
import { codeToJson } from './code-to-json';
import { jsonToCode } from './json-to-code';

const [command, filePath] = process.argv.slice(2);

if (command === 'json-to-code') {
	jsonToCode(filePath);
} else if (command === 'code-to-json') {
	codeToJson(filePath);
} else {
	console.error('Usage: workflow-sdk <json-to-code|code-to-json> <file-path>');
	console.error('');
	console.error('Commands:');
	console.error('  json-to-code  Convert workflow JSON to SDK TypeScript code');
	console.error('  code-to-json  Convert SDK TypeScript code to workflow JSON');
	console.error('');
	console.error('Examples:');
	console.error('  pnpm json-to-code ./workflow.json');
	console.error('  pnpm code-to-json ./workflow.ts');
	process.exit(1);
}
