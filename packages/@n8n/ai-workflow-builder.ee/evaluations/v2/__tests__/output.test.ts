/**
 * Tests for artifact saving functionality.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import type { SimpleWorkflow } from '@/types/workflow';

import type { ExampleResult, RunSummary } from '../types';
import { createArtifactSaver } from '../output';

/** Helper to create a minimal valid workflow for tests */
function createMockWorkflow(name = 'Test Workflow'): SimpleWorkflow {
	return {
		name,
		nodes: [{ id: '1', type: 'n8n-nodes-base.start', name: 'Start', position: [0, 0] }],
		connections: {},
	};
}

/** Helper to create a mock example result */
function createMockResult(overrides: Partial<ExampleResult> = {}): ExampleResult {
	return {
		index: 1,
		prompt: 'Create a test workflow',
		status: 'pass',
		feedback: [
			{ key: 'llm-judge.functionality', score: 0.9 },
			{ key: 'llm-judge.connections', score: 0.8 },
			{ key: 'programmatic.overall', score: 1.0 },
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
			createArtifactSaver({ outputDir });

			expect(fs.existsSync(outputDir)).toBe(true);
		});

		it('should return an artifact saver with saveExample and saveSummary methods', () => {
			const saver = createArtifactSaver({ outputDir: tempDir });

			expect(saver.saveExample).toBeDefined();
			expect(saver.saveSummary).toBeDefined();
		});
	});

	describe('saveExample()', () => {
		it('should save prompt to prompt.txt', () => {
			const saver = createArtifactSaver({ outputDir: tempDir });
			const result = createMockResult({ index: 1 });

			saver.saveExample(result);

			const promptPath = path.join(tempDir, 'example-001', 'prompt.txt');
			expect(fs.existsSync(promptPath)).toBe(true);
			expect(fs.readFileSync(promptPath, 'utf-8')).toBe('Create a test workflow');
		});

		it('should save workflow to workflow.json in n8n-importable format', () => {
			const saver = createArtifactSaver({ outputDir: tempDir });
			const result = createMockResult();

			saver.saveExample(result);

			const workflowPath = path.join(tempDir, 'example-001', 'workflow.json');
			expect(fs.existsSync(workflowPath)).toBe(true);

			const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));
			expect(workflow.name).toBe('Test Workflow');
			expect(workflow.nodes).toHaveLength(1);
			expect(workflow.connections).toEqual({});
		});

		it('should save feedback to feedback.json', () => {
			const saver = createArtifactSaver({ outputDir: tempDir });
			const result = createMockResult();

			saver.saveExample(result);

			const feedbackPath = path.join(tempDir, 'example-001', 'feedback.json');
			expect(fs.existsSync(feedbackPath)).toBe(true);

			const feedback = JSON.parse(fs.readFileSync(feedbackPath, 'utf-8'));
			expect(feedback.index).toBe(1);
			expect(feedback.status).toBe('pass');
			expect(feedback.evaluators).toHaveLength(2); // llm-judge and programmatic
		});

		it('should group feedback by evaluator', () => {
			const saver = createArtifactSaver({ outputDir: tempDir });
			const result = createMockResult();

			saver.saveExample(result);

			const feedbackPath = path.join(tempDir, 'example-001', 'feedback.json');
			const feedback = JSON.parse(fs.readFileSync(feedbackPath, 'utf-8'));

			const llmJudge = feedback.evaluators.find((e: { name: string }) => e.name === 'llm-judge');
			expect(llmJudge.feedback).toHaveLength(2);

			const programmatic = feedback.evaluators.find(
				(e: { name: string }) => e.name === 'programmatic',
			);
			expect(programmatic.feedback).toHaveLength(1);
		});

		it('should save error to error.txt when present', () => {
			const saver = createArtifactSaver({ outputDir: tempDir });
			const result = createMockResult({
				status: 'error',
				error: 'Generation failed: timeout',
			});

			saver.saveExample(result);

			const errorPath = path.join(tempDir, 'example-001', 'error.txt');
			expect(fs.existsSync(errorPath)).toBe(true);
			expect(fs.readFileSync(errorPath, 'utf-8')).toBe('Generation failed: timeout');
		});

		it('should not save workflow.json when workflow is undefined', () => {
			const saver = createArtifactSaver({ outputDir: tempDir });
			const result = createMockResult({ workflow: undefined });

			saver.saveExample(result);

			const workflowPath = path.join(tempDir, 'example-001', 'workflow.json');
			expect(fs.existsSync(workflowPath)).toBe(false);
		});

		it('should pad example index in directory name', () => {
			const saver = createArtifactSaver({ outputDir: tempDir });

			saver.saveExample(createMockResult({ index: 1 }));
			saver.saveExample(createMockResult({ index: 10 }));
			saver.saveExample(createMockResult({ index: 100 }));

			expect(fs.existsSync(path.join(tempDir, 'example-001'))).toBe(true);
			expect(fs.existsSync(path.join(tempDir, 'example-010'))).toBe(true);
			expect(fs.existsSync(path.join(tempDir, 'example-100'))).toBe(true);
		});
	});

	describe('saveSummary()', () => {
		it('should save summary.json with correct structure', () => {
			const saver = createArtifactSaver({ outputDir: tempDir });
			const summary = createMockSummary();
			const results = [
				createMockResult({ index: 1, status: 'pass' }),
				createMockResult({ index: 2, status: 'pass' }),
				createMockResult({ index: 3, status: 'fail' }),
			];

			saver.saveSummary(summary, results);

			const summaryPath = path.join(tempDir, 'summary.json');
			expect(fs.existsSync(summaryPath)).toBe(true);

			const savedSummary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
			expect(savedSummary.totalExamples).toBe(3);
			expect(savedSummary.passed).toBe(2);
			expect(savedSummary.failed).toBe(1);
			expect(savedSummary.passRate).toBeCloseTo(2 / 3);
		});

		it('should include timestamp', () => {
			const saver = createArtifactSaver({ outputDir: tempDir });
			saver.saveSummary(createMockSummary(), [createMockResult()]);

			const summaryPath = path.join(tempDir, 'summary.json');
			const savedSummary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));

			expect(savedSummary.timestamp).toBeDefined();
			expect(new Date(savedSummary.timestamp).getTime()).not.toBeNaN();
		});

		it('should calculate per-evaluator averages', () => {
			const saver = createArtifactSaver({ outputDir: tempDir });
			const results = [createMockResult(), createMockResult()];

			saver.saveSummary(createMockSummary(), results);

			const summaryPath = path.join(tempDir, 'summary.json');
			const savedSummary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));

			expect(savedSummary.evaluatorAverages).toBeDefined();
			expect(savedSummary.evaluatorAverages['llm-judge']).toBeCloseTo(0.85);
			expect(savedSummary.evaluatorAverages['programmatic']).toBe(1.0);
		});

		it('should include truncated prompts in results', () => {
			const saver = createArtifactSaver({ outputDir: tempDir });
			const longPrompt = 'A'.repeat(200);
			const results = [createMockResult({ prompt: longPrompt })];

			saver.saveSummary(createMockSummary(), results);

			const summaryPath = path.join(tempDir, 'summary.json');
			const savedSummary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));

			expect(savedSummary.results[0].prompt.length).toBeLessThan(longPrompt.length);
			expect(savedSummary.results[0].prompt).toContain('...');
		});
	});
});
