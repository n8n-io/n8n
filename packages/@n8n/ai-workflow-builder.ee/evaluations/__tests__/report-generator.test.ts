/**
 * Tests for markdown report generation.
 *
 * These utilities generate human-readable markdown reports
 * from evaluation results.
 */

import type { ExampleResult, RunSummary, Feedback } from '../harness/harness-types';
import {
	extractViolationSeverity,
	calculateReportMetrics,
	generateMarkdownReport,
} from '../support/report-generator';

/** Helper to create a feedback item */
function createFeedback(
	evaluator: string,
	metric: string,
	score: number,
	kind: Feedback['kind'] = 'metric',
	comment?: string,
): Feedback {
	return { evaluator, metric, score, kind, ...(comment ? { comment } : {}) };
}

/** Helper to create an example result */
function createExampleResult(overrides: Partial<ExampleResult> = {}): ExampleResult {
	return {
		index: 1,
		prompt: 'Test prompt',
		status: 'pass',
		score: 0,
		feedback: [],
		durationMs: 1000,
		...overrides,
	};
}

/** Helper to create a run summary */
function createRunSummary(overrides: Partial<RunSummary> = {}): RunSummary {
	return {
		totalExamples: 10,
		passed: 8,
		failed: 1,
		errors: 1,
		averageScore: 0.75,
		totalDurationMs: 10000,
		...overrides,
	};
}

describe('Report Generator', () => {
	describe('extractViolationSeverity()', () => {
		it('should extract critical severity', () => {
			expect(extractViolationSeverity('[CRITICAL] Missing trigger')).toBe('critical');
		});

		it('should extract major severity', () => {
			expect(extractViolationSeverity('[MAJOR] Bad configuration')).toBe('major');
		});

		it('should extract minor severity', () => {
			expect(extractViolationSeverity('[MINOR] Style issue')).toBe('minor');
		});

		it('should return null for no violation marker', () => {
			expect(extractViolationSeverity('Just a comment')).toBeNull();
		});

		it('should return null for undefined comment', () => {
			expect(extractViolationSeverity(undefined)).toBeNull();
		});

		it('should be case-insensitive', () => {
			expect(extractViolationSeverity('[critical] lowercase')).toBe('critical');
			expect(extractViolationSeverity('[Critical] mixed')).toBe('critical');
		});
	});

	describe('calculateReportMetrics()', () => {
		it('should calculate evaluator averages from feedback keys', () => {
			const results: ExampleResult[] = [
				createExampleResult({
					feedback: [
						createFeedback('llm-judge', 'functionality', 0.8),
						createFeedback('llm-judge', 'connections', 0.6),
						createFeedback('programmatic', 'trigger', 1.0),
					],
				}),
			];

			const metrics = calculateReportMetrics(results);

			expect(metrics.evaluatorAverages['llm-judge']).toBeCloseTo(0.7);
			expect(metrics.evaluatorAverages['programmatic']).toBeCloseTo(1.0);
		});

		it('should ignore non-finite scores when computing evaluator averages', () => {
			const results: ExampleResult[] = [
				createExampleResult({
					feedback: [
						createFeedback('programmatic', 'connections', 1),
						createFeedback('programmatic', 'trigger', Number.NaN),
					],
				}),
			];

			const metrics = calculateReportMetrics(results);

			expect(metrics.evaluatorAverages['programmatic']).toBe(1);
		});

		it('should count violations by severity from comments', () => {
			const results: ExampleResult[] = [
				createExampleResult({
					feedback: [
						createFeedback('a', 'b', 0, 'detail', '[CRITICAL] Missing node'),
						createFeedback('a', 'c', 0, 'detail', '[MAJOR] Bad config'),
						createFeedback('a', 'd', 0, 'detail', '[MINOR] Style issue'),
						createFeedback('a', 'e', 0, 'detail', '[CRITICAL] Another critical'),
					],
				}),
			];

			const metrics = calculateReportMetrics(results);

			expect(metrics.violationCounts.critical).toBe(2);
			expect(metrics.violationCounts.major).toBe(1);
			expect(metrics.violationCounts.minor).toBe(1);
		});

		it('should handle empty results', () => {
			const metrics = calculateReportMetrics([]);

			expect(metrics.evaluatorAverages).toEqual({});
			expect(metrics.violationCounts).toEqual({ critical: 0, major: 0, minor: 0 });
		});

		it('should aggregate across multiple results', () => {
			const results: ExampleResult[] = [
				createExampleResult({
					feedback: [createFeedback('llm-judge', 'a', 0.8)],
				}),
				createExampleResult({
					feedback: [createFeedback('llm-judge', 'a', 0.6)],
				}),
			];

			const metrics = calculateReportMetrics(results);

			expect(metrics.evaluatorAverages['llm-judge']).toBeCloseTo(0.7);
		});

		it('should handle results with errors', () => {
			const results: ExampleResult[] = [
				createExampleResult({
					status: 'error',
					feedback: [],
					error: 'Something went wrong',
				}),
				createExampleResult({
					feedback: [createFeedback('llm-judge', 'a', 0.8)],
				}),
			];

			const metrics = calculateReportMetrics(results);

			// Should still calculate from successful results
			expect(metrics.evaluatorAverages['llm-judge']).toBeCloseTo(0.8);
		});
	});

	describe('generateMarkdownReport()', () => {
		it('should include summary section', () => {
			const results: ExampleResult[] = [];
			const summary = createRunSummary({
				totalExamples: 10,
				passed: 8,
				failed: 1,
				errors: 1,
				averageScore: 0.75,
			});

			const report = generateMarkdownReport(results, summary);

			expect(report).toContain('# AI Workflow Builder Evaluation Report');
			expect(report).toContain('## Summary');
			expect(report).toContain('Total Tests: 10');
			expect(report).toContain('Passed: 8');
			expect(report).toContain('Failed: 1');
			expect(report).toContain('Errors: 1');
			expect(report).toContain('75.0%');
		});

		it('should include evaluator averages', () => {
			const results: ExampleResult[] = [
				createExampleResult({
					feedback: [
						createFeedback('llm-judge', 'a', 0.8),
						createFeedback('programmatic', 'b', 0.6),
					],
				}),
			];
			const summary = createRunSummary();

			const report = generateMarkdownReport(results, summary);

			expect(report).toContain('## Evaluator Averages');
			expect(report).toContain('llm-judge');
			expect(report).toContain('programmatic');
		});

		it('should include violation summary', () => {
			const results: ExampleResult[] = [
				createExampleResult({
					feedback: [
						createFeedback('a', 'b', 0, 'detail', '[CRITICAL] Issue 1'),
						createFeedback('a', 'c', 0, 'detail', '[MAJOR] Issue 2'),
					],
				}),
			];
			const summary = createRunSummary();

			const report = generateMarkdownReport(results, summary);

			expect(report).toContain('## Violations Summary');
			expect(report).toContain('Critical: 1');
			expect(report).toContain('Major: 1');
		});

		it('should include detailed results when option enabled', () => {
			const results: ExampleResult[] = [
				createExampleResult({
					index: 1,
					prompt: 'Create a workflow that sends emails',
					status: 'pass',
					durationMs: 1500,
					feedback: [createFeedback('llm-judge', 'a', 0.9, 'metric', 'Good job')],
				}),
			];
			const summary = createRunSummary();

			const report = generateMarkdownReport(results, summary, { includeDetails: true });

			expect(report).toContain('## Detailed Results');
			expect(report).toContain('### Test 1');
			expect(report).toContain('Create a workflow');
			expect(report).toContain('pass');
			expect(report).toContain('1500ms');
		});

		it('should not include details when option disabled', () => {
			const results: ExampleResult[] = [createExampleResult({ prompt: 'Test prompt here' })];
			const summary = createRunSummary();

			const report = generateMarkdownReport(results, summary, { includeDetails: false });

			expect(report).not.toContain('## Detailed Results');
			expect(report).not.toContain('Test prompt here');
		});

		it('should truncate long prompts in details', () => {
			const longPrompt = 'A'.repeat(200);
			const results: ExampleResult[] = [createExampleResult({ prompt: longPrompt })];
			const summary = createRunSummary();

			const report = generateMarkdownReport(results, summary, { includeDetails: true });

			expect(report).toContain('...');
			expect(report).not.toContain(longPrompt);
		});

		it('should handle empty results gracefully', () => {
			const summary = createRunSummary({ totalExamples: 0, passed: 0, failed: 0, errors: 0 });

			const report = generateMarkdownReport([], summary);

			expect(report).toContain('# AI Workflow Builder Evaluation Report');
			expect(report).toContain('Total Tests: 0');
		});

		it('should include feedback details in test results', () => {
			const results: ExampleResult[] = [
				createExampleResult({
					feedback: [
						createFeedback('llm-judge', 'functionality', 0.9, 'metric', 'Great functionality'),
						createFeedback('programmatic', 'trigger', 1.0),
					],
				}),
			];
			const summary = createRunSummary();

			const report = generateMarkdownReport(results, summary, { includeDetails: true });

			expect(report).toContain('llm-judge.functionality');
			expect(report).toContain('90.0%');
			expect(report).toContain('Great functionality');
		});

		it('should format pass rate as percentage', () => {
			const summary = createRunSummary({ totalExamples: 10, passed: 8 });

			const report = generateMarkdownReport([], summary);

			expect(report).toContain('80.0%'); // Pass rate
		});
	});
});
