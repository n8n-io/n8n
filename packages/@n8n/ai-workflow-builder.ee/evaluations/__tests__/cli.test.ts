/**
 * Tests for V2 CLI entry point.
 *
 * These tests mock all external dependencies and verify that
 * the CLI correctly orchestrates evaluation runs.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { mock } from 'jest-mock-extended';
import type { Client } from 'langsmith/client';
import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types/workflow';

// Store mocks for dependencies
const mockParseEvaluationArgs = jest.fn();
const mockSetupTestEnvironment = jest.fn();
const mockCreateAgent = jest.fn();
const mockGenerateRunId = jest.fn();
const mockIsWorkflowStateValues = jest.fn();
const mockLoadTestCasesFromCsv = jest.fn();
const mockConsumeGenerator = jest.fn();
const mockGetChatPayload = jest.fn();
const mockRunEvaluation = jest.fn();
const mockCreateConsoleLifecycle = jest.fn();
const mockCreateLLMJudgeEvaluator = jest.fn();
const mockCreateProgrammaticEvaluator = jest.fn();
const mockCreatePairwiseEvaluator = jest.fn();

// Mock all external modules
jest.mock('../cli/argument-parser', () => ({
	parseEvaluationArgs: (): unknown => mockParseEvaluationArgs(),
	getDefaultDatasetName: (suite: unknown): unknown =>
		suite === 'pairwise' ? 'notion-pairwise-workflows' : 'workflow-builder-canvas-prompts',
	getDefaultExperimentName: (suite: unknown): unknown =>
		suite === 'pairwise' ? 'pairwise-evals' : 'workflow-builder-evaluation',
}));

jest.mock('../support/environment', () => ({
	setupTestEnvironment: (): unknown => mockSetupTestEnvironment(),
	createAgent: (...args: unknown[]): unknown => mockCreateAgent(...args),
}));

jest.mock('../langsmith/types', () => ({
	generateRunId: (): unknown => mockGenerateRunId(),
	isWorkflowStateValues: (...args: unknown[]): unknown => mockIsWorkflowStateValues(...args),
}));

jest.mock('../cli/csv-prompt-loader', () => ({
	loadTestCasesFromCsv: (...args: unknown[]): unknown => mockLoadTestCasesFromCsv(...args),
	loadDefaultTestCases: () => [
		{ id: 'test-case-1', prompt: 'Create a workflow that sends a daily email summary' },
	],
	getDefaultTestCaseIds: () => ['test-case-1'],
}));

jest.mock('../harness/evaluation-helpers', () => ({
	consumeGenerator: (...args: unknown[]): unknown => mockConsumeGenerator(...args),
	getChatPayload: (...args: unknown[]): unknown => mockGetChatPayload(...args),
}));

jest.mock('../index', () => ({
	runEvaluation: (...args: unknown[]): unknown => mockRunEvaluation(...args),
	createConsoleLifecycle: (...args: unknown[]): unknown => mockCreateConsoleLifecycle(...args),
	createLLMJudgeEvaluator: (...args: unknown[]): unknown => mockCreateLLMJudgeEvaluator(...args),
	createProgrammaticEvaluator: (...args: unknown[]): unknown =>
		mockCreateProgrammaticEvaluator(...args),
	createPairwiseEvaluator: (...args: unknown[]): unknown => mockCreatePairwiseEvaluator(...args),
}));

/** Helper to create a minimal valid workflow for tests */
function createMockWorkflow(name = 'Test Workflow'): SimpleWorkflow {
	return { name, nodes: [], connections: {} };
}

/** Helper to create default args */
function createMockArgs(overrides: Record<string, unknown> = {}) {
	return {
		suite: 'llm-judge',
		backend: 'local',
		verbose: false,
		timeoutMs: 60_000,
		datasetName: undefined,
		prompt: undefined,
		testCase: undefined,
		promptsCsv: undefined,
		maxExamples: undefined,
		dos: undefined,
		donts: undefined,
		numJudges: 3,
		experimentName: undefined,
		repetitions: 1,
		concurrency: 4,
		featureFlags: undefined,
		...overrides,
	};
}

/** Helper to create mock environment */
function createMockEnvironment() {
	return {
		parsedNodeTypes: [] as INodeTypeDescription[],
		llm: mock<BaseChatModel>(),
		lsClient: mock<Client>(),
	};
}

/** Helper to create mock agent */
function createMockAgentInstance(workflowJSON: SimpleWorkflow = createMockWorkflow()) {
	return {
		chat: jest.fn().mockReturnValue((async function* () {})()),
		getState: jest.fn().mockResolvedValue({
			values: {
				workflowJSON,
				messages: [],
			},
		}),
	};
}

/** Helper to create mock run summary */
function createMockSummary(overrides: Record<string, unknown> = {}) {
	return {
		totalExamples: 10,
		passed: 8,
		failed: 2,
		errors: 0,
		averageScore: 0.85,
		totalDurationMs: 5000,
		...overrides,
	};
}

describe('CLI', () => {
	// Mock process.exit to prevent test termination
	let mockExit: jest.SpyInstance;
	const originalEnv = process.env;

	beforeEach(() => {
		jest.clearAllMocks();
		mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => {
			throw new Error(`process.exit(${code})`);
		});

		// Reset environment
		process.env = { ...originalEnv };

		// Setup default mocks
		mockParseEvaluationArgs.mockReturnValue(createMockArgs());
		mockSetupTestEnvironment.mockResolvedValue(createMockEnvironment());
		mockCreateAgent.mockReturnValue(createMockAgentInstance());
		mockGenerateRunId.mockReturnValue('test-run-id');
		mockIsWorkflowStateValues.mockReturnValue(true);
		mockConsumeGenerator.mockResolvedValue(undefined);
		mockGetChatPayload.mockReturnValue({});
		mockRunEvaluation.mockResolvedValue(createMockSummary());
		mockCreateConsoleLifecycle.mockReturnValue({});
		mockCreateLLMJudgeEvaluator.mockReturnValue({ name: 'llm-judge', evaluate: jest.fn() });
		mockCreateProgrammaticEvaluator.mockReturnValue({ name: 'programmatic', evaluate: jest.fn() });
		mockCreatePairwiseEvaluator.mockReturnValue({ name: 'pairwise', evaluate: jest.fn() });
	});

	afterEach(() => {
		mockExit.mockRestore();
		process.env = originalEnv;
	});

	describe('runV2Evaluation()', () => {
		describe('loadTestCases', () => {
			it('should load test cases from CSV when promptsCsv is set', async () => {
				mockParseEvaluationArgs.mockReturnValue(
					createMockArgs({ promptsCsv: '/path/to/prompts.csv' }),
				);
				mockLoadTestCasesFromCsv.mockReturnValue([
					{ prompt: 'CSV prompt 1', id: '1' },
					{ prompt: 'CSV prompt 2', id: '2' },
				]);

				const { runV2Evaluation } = await import('../cli');

				await expect(runV2Evaluation()).rejects.toThrow('process.exit');

				expect(mockLoadTestCasesFromCsv).toHaveBeenCalledWith('/path/to/prompts.csv');
				expect(mockRunEvaluation).toHaveBeenCalledWith(
					expect.objectContaining({
						dataset: [
							{ prompt: 'CSV prompt 1', id: '1' },
							{ prompt: 'CSV prompt 2', id: '2' },
						],
					}),
				);
			});

			it('should create single test case when prompt is set', async () => {
				mockParseEvaluationArgs.mockReturnValue(
					createMockArgs({
						prompt: 'Create a workflow',
						dos: 'Use Slack',
						donts: 'No HTTP',
					}),
				);

				const { runV2Evaluation } = await import('../cli');

				await expect(runV2Evaluation()).rejects.toThrow('process.exit');

				expect(mockRunEvaluation).toHaveBeenCalledWith(
					expect.objectContaining({
						dataset: [
							{
								prompt: 'Create a workflow',
								context: { dos: 'Use Slack', donts: 'No HTTP' },
							},
						],
					}),
				);
			});

			it('should use default test case when no prompt source specified', async () => {
				mockParseEvaluationArgs.mockReturnValue(createMockArgs());

				const { runV2Evaluation } = await import('../cli');

				await expect(runV2Evaluation()).rejects.toThrow('process.exit');

				expect(mockRunEvaluation).toHaveBeenCalledWith(
					expect.objectContaining({
						dataset: [
							{ id: 'test-case-1', prompt: 'Create a workflow that sends a daily email summary' },
						],
					}),
				);
			});
		});

		describe('mode selection', () => {
			it('should create LLM-judge + programmatic evaluators for llm-judge suite (local)', async () => {
				mockParseEvaluationArgs.mockReturnValue(
					createMockArgs({ suite: 'llm-judge', backend: 'local' }),
				);

				const { runV2Evaluation } = await import('../cli');

				await expect(runV2Evaluation()).rejects.toThrow('process.exit');

				expect(mockCreateLLMJudgeEvaluator).toHaveBeenCalled();
				expect(mockCreateProgrammaticEvaluator).toHaveBeenCalled();
				expect(mockCreatePairwiseEvaluator).not.toHaveBeenCalled();
			});

			it('should create LLM-judge + programmatic evaluators for llm-judge suite (langsmith)', async () => {
				mockParseEvaluationArgs.mockReturnValue(
					createMockArgs({ suite: 'llm-judge', backend: 'langsmith' }),
				);

				const { runV2Evaluation } = await import('../cli');

				await expect(runV2Evaluation()).rejects.toThrow('process.exit');

				expect(mockCreateLLMJudgeEvaluator).toHaveBeenCalled();
				expect(mockCreateProgrammaticEvaluator).toHaveBeenCalled();
				expect(mockCreatePairwiseEvaluator).not.toHaveBeenCalled();
			});

			it('should create pairwise + programmatic evaluators for pairwise suite (local)', async () => {
				mockParseEvaluationArgs.mockReturnValue(
					createMockArgs({ suite: 'pairwise', backend: 'local', numJudges: 5 }),
				);

				const { runV2Evaluation } = await import('../cli');

				await expect(runV2Evaluation()).rejects.toThrow('process.exit');

				expect(mockCreatePairwiseEvaluator).toHaveBeenCalled();
				// Verify numJudges was passed correctly
				const callArgs = mockCreatePairwiseEvaluator.mock.calls[0] as [
					unknown,
					{ numJudges: number },
				];
				expect(callArgs[1]).toEqual({ numJudges: 5 });
				expect(mockCreateProgrammaticEvaluator).toHaveBeenCalled();
				expect(mockCreateLLMJudgeEvaluator).not.toHaveBeenCalled();
			});

			it('should create pairwise + programmatic evaluators for pairwise suite (langsmith)', async () => {
				mockParseEvaluationArgs.mockReturnValue(
					createMockArgs({ suite: 'pairwise', backend: 'langsmith' }),
				);

				const { runV2Evaluation } = await import('../cli');

				await expect(runV2Evaluation()).rejects.toThrow('process.exit');

				expect(mockCreatePairwiseEvaluator).toHaveBeenCalled();
				expect(mockCreateProgrammaticEvaluator).toHaveBeenCalled();
				expect(mockCreateLLMJudgeEvaluator).not.toHaveBeenCalled();
			});
		});

		describe('config building', () => {
			it('should use local mode for backend=local', async () => {
				mockParseEvaluationArgs.mockReturnValue(createMockArgs({ backend: 'local' }));

				const { runV2Evaluation } = await import('../cli');

				await expect(runV2Evaluation()).rejects.toThrow('process.exit');

				expect(mockRunEvaluation).toHaveBeenCalledWith(
					expect.objectContaining({
						mode: 'local',
					}),
				);
			});

			it('should use langsmith mode for backend=langsmith', async () => {
				mockParseEvaluationArgs.mockReturnValue(createMockArgs({ backend: 'langsmith' }));

				const { runV2Evaluation } = await import('../cli');

				await expect(runV2Evaluation()).rejects.toThrow('process.exit');

				expect(mockRunEvaluation).toHaveBeenCalledWith(
					expect.objectContaining({
						mode: 'langsmith',
						langsmithOptions: expect.objectContaining({
							experimentName: 'workflow-builder-evaluation',
						}),
					}),
				);
			});

			it('should use datasetName from args for langsmith mode', async () => {
				mockParseEvaluationArgs.mockReturnValue(
					createMockArgs({ backend: 'langsmith', datasetName: 'custom-dataset' }),
				);

				const { runV2Evaluation } = await import('../cli');

				await expect(runV2Evaluation()).rejects.toThrow('process.exit');

				expect(mockRunEvaluation).toHaveBeenCalledWith(
					expect.objectContaining({
						dataset: 'custom-dataset',
					}),
				);
			});

			it('should fall back to default dataset name when env var not set', async () => {
				delete process.env.LANGSMITH_DATASET_NAME;
				mockParseEvaluationArgs.mockReturnValue(createMockArgs({ backend: 'langsmith' }));

				const { runV2Evaluation } = await import('../cli');

				await expect(runV2Evaluation()).rejects.toThrow('process.exit');

				expect(mockRunEvaluation).toHaveBeenCalledWith(
					expect.objectContaining({
						dataset: 'workflow-builder-canvas-prompts',
					}),
				);
			});

			it('should include langsmithOptions with custom experiment name', async () => {
				mockParseEvaluationArgs.mockReturnValue(
					createMockArgs({
						backend: 'langsmith',
						experimentName: 'my-experiment',
						repetitions: 3,
						concurrency: 8,
					}),
				);

				const { runV2Evaluation } = await import('../cli');

				await expect(runV2Evaluation()).rejects.toThrow('process.exit');

				expect(mockRunEvaluation).toHaveBeenCalledWith(
					expect.objectContaining({
						langsmithOptions: expect.objectContaining({
							experimentName: 'my-experiment',
							repetitions: 3,
							concurrency: 8,
						}),
					}),
				);
			});
		});

		describe('exit codes', () => {
			it('should always exit with 0 on successful completion (pass/fail is informational)', async () => {
				mockRunEvaluation.mockResolvedValue(createMockSummary({ totalExamples: 10, passed: 7 }));

				const { runV2Evaluation } = await import('../cli');

				await expect(runV2Evaluation()).rejects.toThrow('process.exit(0)');
			});

			it('should exit with 0 even when pass rate is low', async () => {
				mockRunEvaluation.mockResolvedValue(createMockSummary({ totalExamples: 10, passed: 5 }));

				const { runV2Evaluation } = await import('../cli');

				await expect(runV2Evaluation()).rejects.toThrow('process.exit(0)');
			});

			it('should exit with 0 even when no examples', async () => {
				mockRunEvaluation.mockResolvedValue(createMockSummary({ totalExamples: 0, passed: 0 }));

				const { runV2Evaluation } = await import('../cli');

				await expect(runV2Evaluation()).rejects.toThrow('process.exit(0)');
			});
		});

		describe('workflow generator', () => {
			it('should create agent with correct config', async () => {
				const env = createMockEnvironment();
				mockSetupTestEnvironment.mockResolvedValue(env);
				mockParseEvaluationArgs.mockReturnValue(
					createMockArgs({ featureFlags: { testFlag: true } }),
				);

				const { runV2Evaluation } = await import('../cli');

				await expect(runV2Evaluation()).rejects.toThrow('process.exit');

				// Verify generateWorkflow was passed to config
				expect(mockRunEvaluation).toHaveBeenCalledWith(
					expect.objectContaining({
						generateWorkflow: expect.any(Function),
					}),
				);
			});

			it('should setup test environment', async () => {
				const { runV2Evaluation } = await import('../cli');

				await expect(runV2Evaluation()).rejects.toThrow('process.exit');

				expect(mockSetupTestEnvironment).toHaveBeenCalled();
			});

			it('should create console lifecycle with verbose option', async () => {
				mockParseEvaluationArgs.mockReturnValue(createMockArgs({ verbose: true }));

				const { runV2Evaluation } = await import('../cli');

				await expect(runV2Evaluation()).rejects.toThrow('process.exit');

				expect(mockCreateConsoleLifecycle).toHaveBeenCalledWith(
					expect.objectContaining({ verbose: true }),
				);
			});
		});
	});
});
