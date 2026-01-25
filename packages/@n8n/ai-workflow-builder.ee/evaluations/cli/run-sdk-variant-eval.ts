/**
 * SDK Variant Evaluation CLI
 *
 * Runs evaluations for different SDK interface variants to compare
 * which produces the most accurate LLM-generated workflow code.
 *
 * Usage:
 *   pnpm eval:sdk-variant --variant=builder --dataset=complex-patterns.csv
 *   pnpm eval:sdk-variant --variant=graph --dataset=complex-patterns.csv
 *   pnpm eval:sdk-variant --variant=current --dataset=complex-patterns.csv
 */

import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

import { createLogger } from '../harness/logger';
import { runEvaluation, type RunConfig, type GenerationResult } from '../index';
import { createConsoleLifecycle } from '../harness/lifecycle';
import { setupTestEnvironment } from '../support/environment';
import { loadTestCasesFromCsv } from './csv-prompt-loader';
import {
	createVariantPrompt,
	getVariantMockTypes,
	getVariantDescription,
	AVAILABLE_VARIANTS,
	type SdkVariant,
} from '../sdk-variants';
import { createCodeTypecheckEvaluator } from '../evaluators/code-typecheck';
import { createCodeLLMJudgeEvaluator } from '../evaluators/code-llm-judge';
import { createProgrammaticEvaluator } from '../evaluators/programmatic';
import type { SimpleWorkflow } from '../../src/types/workflow';
import type { ModelId } from '../../src/llm-config';

// =============================================================================
// Argument Parsing
// =============================================================================

const argSchema = z.object({
	variant: z.enum(['current', 'builder', 'graph']),
	dataset: z.string().min(1),
	outputDir: z.string().optional(),
	maxExamples: z.number().int().positive().optional(),
	verbose: z.boolean().default(false),
	timeoutMs: z.number().int().positive().default(300000), // 5 minutes default
});

type VariantEvalArgs = z.infer<typeof argSchema>;

function parseArgs(argv: string[]): VariantEvalArgs {
	const values: Partial<VariantEvalArgs> = {};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];

		if (arg === '--help' || arg === '-h') {
			printHelp();
			process.exit(0);
		}

		if (arg.startsWith('--variant=')) {
			values.variant = arg.split('=')[1] as SdkVariant;
		} else if (arg === '--variant') {
			values.variant = argv[++i] as SdkVariant;
		} else if (arg.startsWith('--dataset=')) {
			values.dataset = arg.split('=')[1];
		} else if (arg === '--dataset') {
			values.dataset = argv[++i];
		} else if (arg.startsWith('--output-dir=')) {
			values.outputDir = arg.split('=')[1];
		} else if (arg === '--output-dir') {
			values.outputDir = argv[++i];
		} else if (arg.startsWith('--max-examples=')) {
			values.maxExamples = parseInt(arg.split('=')[1], 10);
		} else if (arg === '--max-examples') {
			values.maxExamples = parseInt(argv[++i], 10);
		} else if (arg.startsWith('--timeout-ms=')) {
			values.timeoutMs = parseInt(arg.split('=')[1], 10);
		} else if (arg === '--timeout-ms') {
			values.timeoutMs = parseInt(argv[++i], 10);
		} else if (arg === '--verbose' || arg === '-v') {
			values.verbose = true;
		}
	}

	return argSchema.parse(values);
}

function printHelp(): void {
	console.log(`
SDK Variant Evaluation CLI

Compares different SDK interface variants to find which produces
the most accurate LLM-generated workflow code.

USAGE:
  pnpm eval:sdk-variant --variant=<variant> --dataset=<csv-file> [options]

REQUIRED:
  --variant <variant>     SDK variant to test (${AVAILABLE_VARIANTS.join(', ')})
  --dataset <csv-file>    CSV file with test prompts (path relative to fixtures/)

OPTIONS:
  --output-dir <dir>      Directory for output artifacts
  --max-examples <n>      Limit number of test cases
  --timeout-ms <ms>       Timeout per evaluation (default: 300000)
  --verbose, -v           Verbose logging
  --help, -h              Show this help

VARIANTS:
  current   - Object-based: ifElse(node, { true: ..., false: ... })
  builder   - Builder pattern: ifElse(node).onTrue(...).onFalse(...)
  graph     - Graph-based: graph.connect(source, outIdx, target, inIdx)

EXAMPLES:
  # Test builder variant with complex patterns
  pnpm eval:sdk-variant --variant=builder --dataset=complex-patterns.csv

  # Test all variants (run separately and compare)
  pnpm eval:sdk-variant --variant=current --dataset=complex-patterns.csv
  pnpm eval:sdk-variant --variant=builder --dataset=complex-patterns.csv
  pnpm eval:sdk-variant --variant=graph --dataset=complex-patterns.csv
`);
}

// =============================================================================
// Variant-Specific Generator
// =============================================================================

/**
 * Create a mock workflow generator that would use the variant-specific prompt.
 *
 * NOTE: This is a placeholder. In a real implementation, you would:
 * 1. Create an LLM chain with the variant-specific system prompt
 * 2. Generate code from the user prompt
 * 3. Parse and validate the generated code
 *
 * For now, this demonstrates the structure. The actual generation would
 * require integrating with the OneShotWorkflowCodeAgent or similar.
 */
function createVariantGenerator(
	_variant: SdkVariant,
	_variantPrompt: string,
): (prompt: string) => Promise<GenerationResult> {
	// This is a placeholder - in practice you'd wire this up to an actual LLM
	return async (prompt: string): Promise<GenerationResult> => {
		// In a real implementation:
		// 1. Create ChatPromptTemplate with variantPrompt as system message
		// 2. Invoke LLM with user prompt
		// 3. Parse JSON response to get workflowCode
		// 4. Execute code to get workflow JSON
		// 5. Return both workflow and source code

		// Placeholder workflow for type compatibility
		const placeholderWorkflow: SimpleWorkflow = {
			name: 'Placeholder',
			nodes: [],
			connections: {},
		};

		throw new Error(
			`Variant generator not yet implemented for prompt: ${prompt.substring(0, 50)}... (placeholder: ${placeholderWorkflow.name})`,
		);
	};
}

// =============================================================================
// Main Entry Point
// =============================================================================

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	const logger = createLogger(args.verbose);

	logger.info('SDK Variant Evaluation');
	logger.info(`  Variant: ${args.variant}`);
	logger.info(`  Description: ${getVariantDescription(args.variant)}`);
	logger.info(`  Dataset: ${args.dataset}`);
	logger.info('');

	// Load test cases
	const fixturesDir = path.resolve(__dirname, '../fixtures');
	const csvPath = path.resolve(fixturesDir, args.dataset);

	if (!fs.existsSync(csvPath)) {
		throw new Error(`Dataset not found: ${csvPath}`);
	}

	let testCases = loadTestCasesFromCsv(csvPath);
	if (args.maxExamples) {
		testCases = testCases.slice(0, args.maxExamples);
	}

	logger.info(`Loaded ${testCases.length} test cases`);

	// Get variant-specific content
	const variantPrompt = createVariantPrompt(args.variant);
	const mockTypes = getVariantMockTypes(args.variant);

	logger.info(`Variant prompt length: ${variantPrompt.length} characters`);
	if (mockTypes) {
		logger.info(`Using custom mock types (${mockTypes.length} characters)`);
	} else {
		logger.info('Using real SDK types from @n8n/workflow-sdk');
	}

	// Setup environment
	const stageModels = { default: 'claude-sonnet-4.5' as ModelId };
	const env = await setupTestEnvironment(stageModels, logger);

	// Create evaluators with variant-specific SDK types
	const evaluators = [
		createCodeTypecheckEvaluator({
			customSdkTypes: mockTypes,
			skipNodeTypeValidation: true, // Skip for variant testing
		}),
		createCodeLLMJudgeEvaluator(env.llms.judge, {
			customSdkTypes: mockTypes,
		}),
		createProgrammaticEvaluator(env.parsedNodeTypes),
	];

	// Create output directory for this variant
	const outputDir = args.outputDir ?? path.resolve(process.cwd(), `eval-results-${args.variant}`);
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	// Save the variant prompt for reference
	fs.writeFileSync(path.join(outputDir, 'variant-prompt.txt'), variantPrompt);
	logger.info(`Saved variant prompt to ${outputDir}/variant-prompt.txt`);

	// Create the generator (placeholder for now)
	const generateWorkflow = createVariantGenerator(args.variant, variantPrompt);

	// Configure and run evaluation
	const lifecycle = createConsoleLifecycle({ verbose: args.verbose, logger });

	const config: RunConfig = {
		mode: 'local',
		generateWorkflow,
		evaluators,
		dataset: testCases,
		lifecycle,
		logger,
		outputDir,
		timeoutMs: args.timeoutMs,
	};

	logger.info('');
	logger.info('Starting evaluation...');
	logger.info('NOTE: The variant generator is a placeholder.');
	logger.info('To run actual evaluations, integrate with OneShotWorkflowCodeAgent');
	logger.info('using the variant-specific prompt.');
	logger.info('');

	try {
		await runEvaluation(config);
	} catch (error) {
		if (error instanceof Error && error.message.includes('not yet implemented')) {
			logger.info('');
			logger.info('='.repeat(60));
			logger.info('VARIANT SETUP COMPLETE');
			logger.info('='.repeat(60));
			logger.info('');
			logger.info('The SDK variant infrastructure is ready:');
			logger.info(`  - Variant prompt: ${outputDir}/variant-prompt.txt`);
			logger.info(`  - Mock types: ${mockTypes ? 'Custom' : 'Real SDK'}`);
			logger.info(`  - Evaluators: code-typecheck, code-llm-judge, programmatic`);
			logger.info('');
			logger.info('To complete the evaluation:');
			logger.info('1. Integrate the variant prompt with OneShotWorkflowCodeAgent');
			logger.info('2. Update createVariantGenerator() to use the LLM');
			logger.info('3. Run the evaluation again');
			logger.info('');
			process.exit(0);
		}
		throw error;
	}
}

// Run if called directly
main().catch((error) => {
	console.error('Evaluation failed:', error);
	process.exit(1);
});
