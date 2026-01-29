#!/usr/bin/env npx tsx
/**
 * Script to validate a workflow code file and optionally output the workflow JSON.
 *
 * Usage:
 *   npx tsx scripts/validate-workflow.ts <file-path> [--output <output-path>]
 *
 * Examples:
 *   npx tsx scripts/validate-workflow.ts ./example-workflow.ts
 *   npx tsx scripts/validate-workflow.ts ./example-workflow.ts --output workflow.json
 *   npx tsx scripts/validate-workflow.ts ./example-workflow.ts -o workflow.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseWorkflowCodeToBuilder } from '../src/parse-workflow-code';

function main() {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		console.error(
			'Usage: npx tsx scripts/validate-workflow.ts <file-path> [--output <output-path>]',
		);
		process.exit(1);
	}

	// Parse arguments
	let filePath: string | undefined;
	let outputPath: string | undefined;

	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--output' || args[i] === '-o') {
			outputPath = args[i + 1];
			i++; // Skip next arg
		} else if (!filePath) {
			filePath = args[i];
		}
	}

	if (!filePath) {
		console.error('Error: No input file specified');
		process.exit(1);
	}

	const resolvedFilePath = path.resolve(filePath);

	if (!fs.existsSync(resolvedFilePath)) {
		console.error(`Error: File not found: ${resolvedFilePath}`);
		process.exit(1);
	}

	const code = fs.readFileSync(resolvedFilePath, 'utf-8');

	try {
		const builder = parseWorkflowCodeToBuilder(code);
		const result = builder.validate();

		if (result.errors.length > 0) {
			console.error('\n❌ Validation Errors:');
			for (const error of result.errors) {
				console.error(`  [${error.code}] ${error.message}`);
				if (error.nodeName) {
					console.error(`    Node: ${error.nodeName}`);
				}
			}
		}

		if (result.warnings.length > 0) {
			console.warn('\n⚠️  Validation Warnings:');
			for (const warning of result.warnings) {
				console.warn(`  [${warning.code}] ${warning.message}`);
				if (warning.nodeName) {
					console.warn(`    Node: ${warning.nodeName}`);
				}
			}
		}

		if (result.errors.length === 0 && result.warnings.length === 0) {
			console.log('\n✅ Workflow is valid with no errors or warnings.');
		}

		// Output workflow JSON to file if requested
		if (outputPath) {
			const workflowJson = builder.toJSON();
			const resolvedOutputPath = path.resolve(outputPath);
			fs.writeFileSync(resolvedOutputPath, JSON.stringify(workflowJson, null, 2));
			console.log(`\n📄 Workflow JSON written to: ${resolvedOutputPath}`);
		}

		// Exit with error code if there are errors
		if (result.errors.length > 0) {
			process.exit(1);
		}
	} catch (error) {
		if (error instanceof SyntaxError) {
			console.error(`\n❌ Syntax Error: ${error.message}`);
		} else if (error instanceof Error) {
			console.error(`\n❌ Error: ${error.message}`);
		} else {
			console.error(`\n❌ Unknown error:`, error);
		}
		process.exit(1);
	}
}

main();
