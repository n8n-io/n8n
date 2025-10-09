import { runCliEvaluation } from './cli/runner.js';
import { runLangsmithEvaluation } from './langsmith/runner.js';

// Re-export for external use if needed
export { runCliEvaluation } from './cli/runner.js';
export { runLangsmithEvaluation } from './langsmith/runner.js';
export { runSingleTest } from './core/test-runner.js';
export { setupTestEnvironment, createAgent } from './core/environment.js';

/**
 * Main entry point for evaluation
 * Determines which evaluation mode to run based on environment variables
 */
async function main(): Promise<void> {
	const useLangsmith = process.env.USE_LANGSMITH_EVAL === 'true';

	// Parse command line arguments for single test case
	const testCaseId = process.argv.includes('--test-case')
		? process.argv[process.argv.indexOf('--test-case') + 1]
		: undefined;

	if (useLangsmith) {
		// Parse command line arguments for a number of repetitions
		const repetitionsArg = process.argv.includes('--repetitions')
			? parseInt(process.argv[process.argv.indexOf('--repetitions') + 1], 10)
			: 1;
		const repetitions = Number.isNaN(repetitionsArg) ? 1 : repetitionsArg;

		await runLangsmithEvaluation(repetitions);
	} else {
		await runCliEvaluation(testCaseId);
	}
}

// Run if called directly
if (require.main === module) {
	main().catch(console.error);
}
