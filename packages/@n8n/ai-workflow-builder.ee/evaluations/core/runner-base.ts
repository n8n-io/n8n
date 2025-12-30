import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { EvaluationResult as LangsmithEvaluationResult } from 'langsmith/evaluation';
import { evaluate } from 'langsmith/evaluation';
import type { Run, Example } from 'langsmith/schemas';
import type { INodeTypeDescription } from 'n8n-workflow';

import type { BuilderFeatureFlags } from '../../src/workflow-builder-agent.js';
import { EVAL_TYPES, EVAL_USERS } from '../constants.js';
import type { EvaluationArgs, EvaluationMode } from './argument-parser.js';
import { getDefaultDatasetName, getDefaultExperimentName } from './argument-parser.js';
import { setupTestEnvironment, createAgent } from './environment.js';
import { createProgressReporter, type OrderedProgressReporter } from './progress-reporter.js';
import type { TraceFilters } from './trace-filters.js';
import type { SimpleWorkflow } from '../../src/types/workflow.js';
import { generateRunId, isWorkflowStateValues } from '../types/langsmith.js';
import { consumeGenerator, getChatPayload, formatHeader } from '../utils/evaluation-helpers.js';
import { createLogger, type EvalLogger } from '../utils/logger.js';

/**
 * Result of workflow generation.
 */
export interface WorkflowGenerationResult {
	workflow: SimpleWorkflow;
	prompt: string;
	durationMs: number;
}

/**
 * Base target output that all runners must return.
 * Contains the workflow, prompt, and pre-computed feedback for LangSmith.
 */
export interface BaseTargetOutput {
	workflow: SimpleWorkflow;
	prompt: string;
	feedback: LangsmithEvaluationResult[];
}

/**
 * Dataset input format - each runner type defines its own.
 */
export type DatasetInput = Record<string, unknown>;

/**
 * Options for running LangSmith evaluation.
 */
export interface LangsmithRunOptions {
	args: EvaluationArgs;
}

/**
 * Options for running local evaluation.
 */
export interface LocalRunOptions {
	args: EvaluationArgs;
	testCases?: Array<{ prompt: string; id?: string }>;
}

/**
 * Base class for evaluation runners.
 *
 * Each runner type (LLM-as-judge, pairwise, etc.) extends this class
 * and implements the abstract methods for type-specific logic.
 *
 * Key design principles:
 * 1. Target function does ALL work (generation + evaluation)
 * 2. Evaluator only extracts pre-computed feedback
 * 3. Progress reporter shows real-time ordered updates
 */
export abstract class EvaluationRunnerBase<
	TInput extends DatasetInput,
	TOutput extends BaseTargetOutput,
> {
	protected parsedNodeTypes: INodeTypeDescription[] = [];
	protected llm!: BaseChatModel;
	protected logger!: EvalLogger;
	protected progressReporter!: OrderedProgressReporter;
	protected traceFilters?: TraceFilters;
	protected args!: EvaluationArgs;

	/**
	 * Get the evaluation mode this runner supports.
	 */
	abstract getMode(): EvaluationMode;

	/**
	 * Get the display name for this evaluation type.
	 */
	abstract getDisplayName(): string;

	/**
	 * Get the dataset name for this runner.
	 */
	getDatasetName(): string {
		return process.env.LANGSMITH_DATASET_NAME ?? getDefaultDatasetName(this.getMode());
	}

	/**
	 * Get the experiment name for this runner.
	 */
	getExperimentName(): string {
		return this.args.experimentName ?? getDefaultExperimentName(this.getMode());
	}

	/**
	 * Create the target function that does all work.
	 * This should be wrapped with traceable() and do:
	 * 1. Generate workflow
	 * 2. Run evaluation
	 * 3. Return pre-computed feedback
	 */
	abstract createTarget(): (inputs: TInput) => Promise<TOutput>;

	/**
	 * Create the LangSmith evaluator that extracts pre-computed feedback.
	 * This should NOT do any LLM calls - just return outputs.feedback.
	 */
	createEvaluator(): (rootRun: Run, example?: Example) => Promise<LangsmithEvaluationResult[]> {
		return async (rootRun: Run, _example?: Example): Promise<LangsmithEvaluationResult[]> => {
			const outputs = rootRun.outputs as TOutput | undefined;

			if (!outputs?.feedback) {
				return [
					{
						key: 'evaluationError',
						score: 0,
						comment: 'No feedback found in target output',
					},
				];
			}

			return outputs.feedback;
		};
	}

	/**
	 * Generate a workflow from a prompt.
	 * This is shared logic that all runners can use.
	 */
	protected async generateWorkflow(
		prompt: string,
		featureFlags?: BuilderFeatureFlags,
	): Promise<SimpleWorkflow> {
		const runId = generateRunId();

		const agent = createAgent({
			parsedNodeTypes: this.parsedNodeTypes,
			llm: this.llm,
			featureFlags,
		});

		await consumeGenerator(
			agent.chat(
				getChatPayload({
					evalType: EVAL_TYPES.LANGSMITH,
					message: prompt,
					workflowId: runId,
					featureFlags,
				}),
				EVAL_USERS.LANGSMITH,
			),
		);

		const state = await agent.getState(runId, EVAL_USERS.LANGSMITH);

		if (!state.values || !isWorkflowStateValues(state.values)) {
			throw new Error('Invalid workflow state: workflow or messages missing');
		}

		return state.values.workflowJSON;
	}

	/**
	 * Initialize the runner with environment setup.
	 */
	protected async initialize(args: EvaluationArgs): Promise<void> {
		this.args = args;
		this.logger = createLogger(args.verbose);
		this.progressReporter = createProgressReporter({ verbose: args.verbose });

		const env = await setupTestEnvironment(this.logger);
		this.parsedNodeTypes = env.parsedNodeTypes;
		this.llm = env.llm;
		this.traceFilters = env.traceFilters;
	}

	/**
	 * Log the evaluation header.
	 */
	protected logHeader(): void {
		console.log(formatHeader(`AI Workflow Builder ${this.getDisplayName()}`, 70));
	}

	/**
	 * Log enabled feature flags.
	 */
	protected logFeatureFlags(): void {
		const featureFlags = this.args.featureFlags;
		if (!featureFlags) return;

		const enabledFlags = Object.entries(featureFlags)
			.filter(([, v]) => v === true)
			.map(([k]) => k);

		if (enabledFlags.length > 0) {
			this.logger.success(`➔ Feature flags enabled: ${enabledFlags.join(', ')}`);
		}
	}

	/**
	 * Run evaluation in LangSmith mode.
	 */
	async runLangsmith(options: LangsmithRunOptions): Promise<void> {
		const { args } = options;
		await this.initialize(args);

		this.logHeader();
		this.logger.info(`➔ Experiment: ${this.getExperimentName()}`);
		this.logFeatureFlags();

		// Check for LangSmith API key
		if (!process.env.LANGSMITH_API_KEY) {
			throw new Error('LANGSMITH_API_KEY environment variable not set');
		}

		// Enable tracing (required in langsmith 0.4.x)
		process.env.LANGSMITH_TRACING = 'true';

		const env = await setupTestEnvironment(this.logger);
		const lsClient = env.lsClient;

		if (!lsClient) {
			throw new Error('LangSmith client not initialized');
		}

		// Reset filtering stats
		this.traceFilters?.resetStats();

		const datasetName = this.getDatasetName();
		this.logger.info(`➔ Dataset: ${datasetName}`);

		// Verify dataset exists and count examples
		let exampleCount = 0;
		try {
			const dataset = await lsClient.readDataset({ datasetName });
			if (args.verbose) {
				for await (const _ of lsClient.listExamples({ datasetId: dataset.id })) {
					exampleCount++;
				}
			}
		} catch {
			throw new Error(`Dataset "${datasetName}" not found`);
		}

		// Log config
		if (args.verbose && exampleCount > 0) {
			this.progressReporter.displayConfig({
				experimentName: this.getExperimentName(),
				datasetName,
				exampleCount,
				repetitions: args.repetitions,
				concurrency: args.concurrency,
				modelName: process.env.LLM_MODEL,
			});
		}

		console.log();
		const startTime = Date.now();

		// Create target and evaluator
		const target = this.createTarget();
		const evaluator = this.createEvaluator();

		// Run LangSmith evaluation
		await evaluate(target, {
			data: datasetName,
			evaluators: [evaluator],
			maxConcurrency: args.concurrency,
			experimentPrefix: this.getExperimentName(),
			numRepetitions: args.repetitions,
			client: lsClient,
			metadata: {
				evaluationType: this.getMode(),
				modelName: process.env.LLM_MODEL ?? 'default',
			},
		});

		const totalTime = Date.now() - startTime;
		this.logger.success(`✓ Evaluation completed in ${(totalTime / 1000).toFixed(1)}s`);

		// Log filtering statistics
		this.traceFilters?.logStats();

		// Display results info
		this.logger.info('\nView detailed results in LangSmith dashboard');
		this.logger.info(
			`Experiment name: ${this.getExperimentName()}-${new Date().toISOString().split('T')[0]}`,
		);
	}

	/**
	 * Run evaluation in local mode.
	 * Subclasses can override this for type-specific behavior.
	 */
	async runLocal(options: LocalRunOptions): Promise<void> {
		const { args, testCases } = options;
		await this.initialize(args);

		this.logHeader();
		this.logFeatureFlags();

		if (!testCases || testCases.length === 0) {
			throw new Error('No test cases provided for local evaluation');
		}

		this.progressReporter.setTotal(testCases.length);
		console.log();

		const startTime = Date.now();

		// Run test cases sequentially for local mode (could be parallelized)
		for (let i = 0; i < testCases.length; i++) {
			const testCase = testCases[i];
			const index = i + 1;

			this.progressReporter.reportStart(index, testCase.prompt);

			try {
				// Generate and evaluate
				const result = await this.runSingleLocalTest(testCase.prompt);

				// Report completion
				const overallScore = this.extractOverallScore(result.feedback);
				const passed = overallScore >= 0.7;

				this.progressReporter.reportComplete(index, {
					prompt: testCase.prompt,
					status: passed ? 'pass' : 'fail',
					scores: { overall: overallScore },
					violations: this.extractViolations(result.feedback),
				});
			} catch (error) {
				this.progressReporter.reportError(
					index,
					testCase.prompt,
					error instanceof Error ? error.message : String(error),
				);
			}
		}

		const totalTime = Date.now() - startTime;
		this.progressReporter.displaySummary();

		this.logger.success(`✓ Local evaluation completed in ${(totalTime / 1000).toFixed(1)}s`);
	}

	/**
	 * Run a single local test. Subclasses implement this.
	 */
	protected abstract runSingleLocalTest(prompt: string): Promise<TOutput>;

	/**
	 * Extract overall score from feedback.
	 */
	protected extractOverallScore(feedback: LangsmithEvaluationResult[]): number {
		const overall = feedback.find((f) => f.key === 'overallScore' || f.key === 'pairwise_primary');
		return typeof overall?.score === 'number' ? overall.score : 0;
	}

	/**
	 * Extract violations from feedback for display.
	 */
	protected extractViolations(
		feedback: LangsmithEvaluationResult[],
	): Array<{ category: string; message: string }> {
		const violations: Array<{ category: string; message: string }> = [];

		for (const result of feedback) {
			const score = result.score;
			const hasLowScore = typeof score === 'number' && score < 0.7;
			if (result.comment && hasLowScore) {
				violations.push({
					category: result.key,
					message: result.comment,
				});
			}
		}

		return violations;
	}
}
