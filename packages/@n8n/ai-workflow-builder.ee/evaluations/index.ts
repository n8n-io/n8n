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
		await runLangsmithEvaluation();
	} else {
		await runCliEvaluation(testCaseId);
	}
}

// Run if called directly
if (require.main === module) {
	main().catch(console.error);
}
