import fs from 'fs';

import { generateWorkflowCode } from '../codegen';
import { generateOutputPath } from './utils';
import { parseWorkflowCodeToBuilder } from '../codegen/parse-workflow-code';

/**
 * Convert workflow JSON to SDK code.
 *
 * 1. Read and parse JSON file
 * 2. Generate SDK code using codegen
 * 3. Validate by parsing the generated code back to builder
 * 4. Write output file with timestamp
 *
 * @param filePath - Path to the workflow JSON file
 */
export function jsonToCode(filePath: string): void {
	if (!filePath) {
		console.error('Error: No file path provided');
		console.error('Usage: pnpm json-to-code <path-to-workflow.json>');
		process.exit(1);
	}

	// 1. Read and parse JSON file
	let json: unknown;
	try {
		const content = fs.readFileSync(filePath, 'utf-8');
		json = JSON.parse(content);
	} catch (error) {
		console.error(
			'Failed to read or parse JSON file:',
			error instanceof Error ? error.message : error,
		);
		process.exit(1);
	}

	// 2. Generate SDK code
	let code: string;
	try {
		code = generateWorkflowCode(json as Parameters<typeof generateWorkflowCode>[0]);
	} catch (error) {
		console.error('Failed to generate code:', error instanceof Error ? error.message : error);
		process.exit(1);
	}

	// 3. Validate by parsing the generated code back to builder
	let builder;
	try {
		builder = parseWorkflowCodeToBuilder(code);
	} catch (error) {
		console.error(
			'Failed to parse generated code:',
			error instanceof Error ? error.message : error,
		);
		process.exit(1);
	}

	const validation = builder.validate();
	if (validation.errors.length > 0) {
		console.error('Validation errors:');
		for (const error of validation.errors) {
			console.error(`  - ${error.message}`);
		}
		process.exit(1);
	}
	if (validation.warnings.length > 0) {
		console.warn('Validation warnings:');
		for (const warning of validation.warnings) {
			console.warn(`  - ${warning.message}`);
		}
	}

	// 4. Write to output file with timestamp
	const outputPath = generateOutputPath(filePath, '.ts');
	fs.writeFileSync(outputPath, code);
	console.log(`Generated: ${outputPath}`);
}
