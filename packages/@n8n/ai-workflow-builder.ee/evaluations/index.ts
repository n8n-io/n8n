import { CliParser } from '@n8n/backend-common';
import { z } from 'zod';

import { runCliEvaluation } from './cli/runner.js';
import { runLangsmithEvaluation } from './langsmith/runner.js';
import { loadTestCasesFromCsv } from './utils/csv-prompt-loader.js';

// Re-export for external use if needed
export { runCliEvaluation } from './cli/runner.js';
export { runLangsmithEvaluation } from './langsmith/runner.js';
export { runSingleTest } from './core/test-runner.js';
export { setupTestEnvironment, createAgent } from './core/environment.js';

// Define CLI flags schema
const flagsSchema = z.object({
	testCase: z.string().optional(),
	promptsCsv: z.string().optional(),
	repetitions: z.coerce.number().int().positive().default(1),
	useLangsmith: z.boolean().optional().default(false),
	generateTestCases: z.boolean().optional().default(false),
});

/**
 * Main entry point for evaluation
 * Determines which evaluation mode to run based on CLI flags
 */
async function main(): Promise<void> {
	// Simple logger for CLI parser (only used for debug output)
	const logger = { debug: () => {} };
	const cliParser = new CliParser(logger as never);

	const { flags } = cliParser.parse({
		argv: process.argv,
		flagsSchema,
	});

	// Support legacy environment variables as fallback
	const useLangsmith = flags.useLangsmith || process.env.USE_LANGSMITH_EVAL === 'true';
	const promptsCsvPath = flags.promptsCsv ?? process.env.PROMPTS_CSV_FILE;
	const generateTestCases = flags.generateTestCases || process.env.GENERATE_TEST_CASES === 'true';

	if (promptsCsvPath && useLangsmith) {
		console.warn('CSV-driven evaluations are only supported in CLI mode. Ignoring --prompts-csv.');
	}

	if (generateTestCases) {
		// TODO: Implement test case generation
		console.log('Test case generation requested');
	}

	if (useLangsmith) {
		await runLangsmithEvaluation(flags.repetitions);
	} else {
		const csvTestCases = promptsCsvPath ? loadTestCasesFromCsv(promptsCsvPath) : undefined;
		await runCliEvaluation({
			testCases: csvTestCases,
			testCaseFilter: flags.testCase,
			repetitions: flags.repetitions,
		});
	}
}

// Run if called directly
if (require.main === module) {
	main().catch(console.error);
}
