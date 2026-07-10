import fs from 'fs';

import { generateOutputPath } from './utils';
import { parseWorkflowCodeToBuilder } from '../codegen/parse-workflow-code';

/**
 * Convert SDK code to workflow JSON.
 *
 * 1. Read code file
 * 2. Parse code to builder
 * 3. Validate the workflow
 * 4. Convert to JSON and write output file with timestamp
 *
 * @param filePath - Path to the SDK code file (.ts)
 */
export function codeToJson(filePath: string): void {
	if (!filePath) {
		console.error('Error: No file path provided');
		console.error('Usage: pnpm code-to-json <path-to-workflow.ts>');
		process.exit(1);
	}

	// 1. Read code file
	let code: string;
	try {
		code = fs.readFileSync(filePath, 'utf-8');
	} catch (error) {
		console.error('Failed to read file:', error instanceof Error ? error.message : error);
		process.exit(1);
	}

	// 2. Parse code to builder
	let builder;
	try {
		builder = parseWorkflowCodeToBuilder(code);
	} catch (error) {
		console.error('Failed to parse code:', error instanceof Error ? error.message : error);
		process.exit(1);
	}

	// 3. Validate the workflow
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

	// 4. Convert to JSON and write to output file with timestamp
	const json = builder.toJSON();
	const outputPath = generateOutputPath(filePath, '.json');
	fs.writeFileSync(outputPath, JSON.stringify(json, null, 2));
	console.log(`Generated: ${outputPath}`);
}
