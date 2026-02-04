/**
 * Tests for artifact saving functionality.
 */

import * as fs from 'fs';
import { jsonParse } from 'n8n-workflow';
import * as os from 'os';
import * as path from 'path';

import type { SimpleWorkflow } from '@/types/workflow';

import type { ExampleResult, RunSummary } from '../harness/harness-types';
import { createLogger } from '../harness/logger';
import { createArtifactSaver } from '../harness/output';

const silentLogger = createLogger(false);

function findExampleDir(baseDir: string, paddedIndex: string): string {
	const entries = fs.readdirSync(baseDir, { withFileTypes: true });
	const prefix = `example-${paddedIndex}-`;
	const match = entries.find((e) => e.isDirectory() && e.name.startsWith(prefix));
	if (!match) throw new Error(`Expected example dir starting with "${prefix}" in ${baseDir}`);
	return path.join(baseDir, match.name);
}

/** Type for parsed workflow JSON */
interface ParsedWorkflow {
	name: string;
	nodes: unknown[];
	connections: Record<string, unknown>;
}

/** Type for parsed feedback JSON */
interface ParsedFeedback {
	index: number;
	status: string;
	score: number;
	evaluators: Array<{
		name: string;
		averageScore: number;
		feedback: Array<{ key: string; score: number }>;
	}>;
}

/** Type for parsed summary JSON */
interface ParsedSummary {
	totalExamples: number;
	passed: number;
	failed: number;
	passRate: number;
	timestamp: string;
	evaluatorAverages: Record<string, number>;
	results: Array<{
		prompt: string;
	}>;
}

/** Helper to create a minimal valid workflow for tests */
function createMockWorkflow(name = 'Test Workflow'): SimpleWorkflow {
	return {
		name,
		nodes: [
			{
				id: '1',
				type: 'n8n-nodes-base.start',
				name: 'Start',
				position: [0, 0],
				typeVersion: 1,
				parameters: {},
			},
		],
		connections: {},
	};
}

/** Helper to create a mock example result */
function createMockResult(overrides: Partial<ExampleResult> = {}): ExampleResult {
	return {
		index: 1,
		prompt: 'Create a test workflow',
		status: 'pass',
		score: 0.9,
		feedback: [
			{ evaluator: 'llm-judge', metric: 'functionality', score: 0.9, kind: 'metric' },
			{ evaluator: 'llm-judge', metric: 'connections', score: 0.8, kind: 'metric' },
			{ evaluator: 'programmatic', metric: 'overall', score: 1.0, kind: 'score' },
		],
		durationMs: 1500,
		workflow: createMockWorkflow(),
		...overrides,
	};
}

/** Helper to create a mock summary */
function createMockSummary(): RunSummary {
	return {
		totalExamples: 3,
		passed: 2,
		failed: 1,
		errors: 0,
		averageScore: 0.85,
		totalDurationMs: 5000,
	};
}

describe('Artifact Saver', () => {
	let tempDir: string;

	beforeEach(() => {
		// Create a unique temp directory for each test
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'v2-eval-test-'));
	});

	afterEach(() => {
		// Clean up temp directory
		if (tempDir && fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});

	describe('createArtifactSaver()', () => {
		it('should create output directory if it does not exist', () => {
			const outputDir = path.join(tempDir, 'nested', 'output');
			createArtifactSaver({ outputDir, logger: silentLogger });

			expect(fs.existsSync(outputDir)).toBe(true);
		});

		it('should return an artifact saver with saveExample and saveSummary methods', () => {
			const saver = createArtifactSaver({ outputDir: tempDir, logger: silentLogger });

			expect(saver.saveExample).toBeDefined();
			expect(saver.saveSummary).toBeDefined();
		});
	});

	describe('saveExample()', () => {
		it('should save prompt to prompt.txt', () => {
			const saver = createArtifactSaver({ outputDir: tempDir, logger: silentLogger });
			const result = createMockResult({ index: 1 });

			saver.saveExample(result);

			const exampleDir = findExampleDir(tempDir, '001');
			const promptPath = path.join(exampleDir, 'prompt.txt');
			expect(fs.existsSync(promptPath)).toBe(true);
			expect(fs.readFileSync(promptPath, 'utf-8')).toBe('Create a test workflow');
		});

		it('should save workflow to workflow.json in n8n-importable format', () => {
			const saver = createArtifactSaver({ outputDir: tempDir, logger: silentLogger });
			const result = createMockResult();

			saver.saveExample(result);

			const exampleDir = findExampleDir(tempDir, '001');
			const workflowPath = path.join(exampleDir, 'workflow.json');
			expect(fs.existsSync(workflowPath)).toBe(true);

			const workflow = jsonParse<ParsedWorkflow>(fs.readFileSync(workflowPath, 'utf-8'));
			expect(workflow.name).toBe('Test Workflow');
			expect(workflow.nodes).toHaveLength(1);
			expect(workflow.connections).toEqual({});
		});

		it('should save feedback to feedback.json', () => {
			const saver = createArtifactSaver({ outputDir: tempDir, logger: silentLogger });
			const result = createMockResult();

			saver.saveExample(result);

			const exampleDir = findExampleDir(tempDir, '001');
			const feedbackPath = path.join(exampleDir, 'feedback.json');
			expect(fs.existsSync(feedbackPath)).toBe(true);

			const feedback = jsonParse<ParsedFeedback>(fs.readFileSync(feedbackPath, 'utf-8'));
			expect(feedback.index).toBe(1);
			expect(feedback.status).toBe('pass');
			expect(feedback.evaluators).toHaveLength(2); // llm-judge and programmatic
		});

		it('should group feedback by evaluator', () => {
			const saver = createArtifactSaver({ outputDir: tempDir, logger: silentLogger });
			const result = createMockResult();

			saver.saveExample(result);

			const exampleDir = findExampleDir(tempDir, '001');
			const feedbackPath = path.join(exampleDir, 'feedback.json');
			const feedback = jsonParse<ParsedFeedback>(fs.readFileSync(feedbackPath, 'utf-8'));

			const llmJudge = feedback.evaluators.find((e) => e.name === 'llm-judge');
			expect(llmJudge?.feedback).toHaveLength(2);

			const programmatic = feedback.evaluators.find((e) => e.name === 'programmatic');
			expect(programmatic?.feedback).toHaveLength(1);
		});

		it('should ignore non-finite scores when computing evaluator averages', () => {
			const saver = createArtifactSaver({ outputDir: tempDir, logger: silentLogger });
			const result = createMockResult({
				feedback: [
					{ evaluator: 'programmatic', metric: 'connections', score: 1, kind: 'metric' },
					{ evaluator: 'programmatic', metric: 'trigger', score: Number.NaN, kind: 'metric' },
				],
			});

			saver.saveExample(result);

			const exampleDir = findExampleDir(tempDir, '001');
			const feedbackPath = path.join(exampleDir, 'feedback.json');
			const feedback = jsonParse<ParsedFeedback>(fs.readFileSync(feedbackPath, 'utf-8'));

			const programmatic = feedback.evaluators.find((e) => e.name === 'programmatic');
			expect(programmatic).toBeDefined();
			expect(programmatic?.averageScore).toBe(1);
		});

		it('should save error to error.txt when present', () => {
			const saver = createArtifactSaver({ outputDir: tempDir, logger: silentLogger });
			const result = createMockResult({
				status: 'error',
				score: 0,
				error: 'Generation failed: timeout',
			});

			saver.saveExample(result);

			const exampleDir = findExampleDir(tempDir, '001');
			const errorPath = path.join(exampleDir, 'error.txt');
			expect(fs.existsSync(errorPath)).toBe(true);
			expect(fs.readFileSync(errorPath, 'utf-8')).toBe('Generation failed: timeout');
		});

		it('should not save workflow.json when workflow is undefined', () => {
			const saver = createArtifactSaver({ outputDir: tempDir, logger: silentLogger });
			const result = createMockResult({ workflow: undefined });

			saver.saveExample(result);

			const exampleDir = findExampleDir(tempDir, '001');
			const workflowPath = path.join(exampleDir, 'workflow.json');
			expect(fs.existsSync(workflowPath)).toBe(false);
		});

		it('should pad example index in directory name', () => {
			const saver = createArtifactSaver({ outputDir: tempDir, logger: silentLogger });

			saver.saveExample(createMockResult({ index: 1 }));
			saver.saveExample(createMockResult({ index: 10 }));
			saver.saveExample(createMockResult({ index: 100 }));

			expect(() => findExampleDir(tempDir, '001')).not.toThrow();
			expect(() => findExampleDir(tempDir, '010')).not.toThrow();
			expect(() => findExampleDir(tempDir, '100')).not.toThrow();
		});
	});

	describe('saveSummary()', () => {
		it('should save summary.json with correct structure', () => {
			const saver = createArtifactSaver({ outputDir: tempDir, logger: silentLogger });
			const summary = createMockSummary();
			const results = [
				createMockResult({ index: 1, status: 'pass' }),
				createMockResult({ index: 2, status: 'pass' }),
				createMockResult({ index: 3, status: 'fail' }),
			];

			saver.saveSummary(summary, results);

			const summaryPath = path.join(tempDir, 'summary.json');
			expect(fs.existsSync(summaryPath)).toBe(true);

			const savedSummary = jsonParse<ParsedSummary>(fs.readFileSync(summaryPath, 'utf-8'));
			expect(savedSummary.totalExamples).toBe(3);
			expect(savedSummary.passed).toBe(2);
			expect(savedSummary.failed).toBe(1);
			expect(savedSummary.passRate).toBeCloseTo(2 / 3);
		});

		it('should include timestamp', () => {
			const saver = createArtifactSaver({ outputDir: tempDir, logger: silentLogger });
			saver.saveSummary(createMockSummary(), [createMockResult()]);

			const summaryPath = path.join(tempDir, 'summary.json');
			const savedSummary = jsonParse<ParsedSummary>(fs.readFileSync(summaryPath, 'utf-8'));

			expect(savedSummary.timestamp).toBeDefined();
			expect(new Date(savedSummary.timestamp).getTime()).not.toBeNaN();
		});

		it('should calculate per-evaluator averages', () => {
			const saver = createArtifactSaver({ outputDir: tempDir, logger: silentLogger });
			const results = [createMockResult(), createMockResult()];

			saver.saveSummary(createMockSummary(), results);

			const summaryPath = path.join(tempDir, 'summary.json');
			const savedSummary = jsonParse<ParsedSummary>(fs.readFileSync(summaryPath, 'utf-8'));

			expect(savedSummary.evaluatorAverages).toBeDefined();
			expect(savedSummary.evaluatorAverages['llm-judge']).toBeCloseTo(0.85);
			expect(savedSummary.evaluatorAverages['programmatic']).toBe(1.0);
		});

		it('should include truncated prompts in results', () => {
			const saver = createArtifactSaver({ outputDir: tempDir, logger: silentLogger });
			const longPrompt = 'A'.repeat(200);
			const results = [createMockResult({ prompt: longPrompt })];

			saver.saveSummary(createMockSummary(), results);

			const summaryPath = path.join(tempDir, 'summary.json');
			const savedSummary = jsonParse<ParsedSummary>(fs.readFileSync(summaryPath, 'utf-8'));

			expect(savedSummary.results[0].prompt.length).toBeLessThan(longPrompt.length);
			expect(savedSummary.results[0].prompt).toContain('...');
		});
	});
});
