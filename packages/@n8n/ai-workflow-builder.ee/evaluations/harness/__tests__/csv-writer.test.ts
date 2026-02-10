import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { writeResultsCsv } from '../csv-writer';
import type { ExampleResult } from '../harness-types';

describe('writeResultsCsv', () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'csv-writer-test-'));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it('writes sorted results with correct columns', () => {
		const results: ExampleResult[] = [
			{
				index: 2,
				prompt: 'Zebra workflow',
				status: 'pass',
				score: 0.9,
				feedback: [
					{
						evaluator: 'llm-judge',
						metric: 'functionality',
						score: 0.95,
						kind: 'metric',
						comment: '',
					},
					{
						evaluator: 'llm-judge',
						metric: 'connections',
						score: 0.85,
						kind: 'metric',
						comment: 'Minor issue',
					},
				],
				durationMs: 5000,
				generationDurationMs: 3000,
				generationInputTokens: 1000,
				generationOutputTokens: 500,
			},
			{
				index: 1,
				prompt: 'Alpha workflow',
				status: 'fail',
				score: 0.6,
				feedback: [
					{
						evaluator: 'llm-judge',
						metric: 'functionality',
						score: 0.5,
						kind: 'metric',
						comment: '[CRITICAL] Missing trigger',
					},
				],
				durationMs: 4000,
				generationDurationMs: 2500,
				generationInputTokens: 800,
				generationOutputTokens: 400,
			},
		];

		const outputPath = join(tempDir, 'results.csv');
		writeResultsCsv(results, outputPath);

		const content = readFileSync(outputPath, 'utf-8');
		const lines = content.trim().split('\n');

		// Check header
		expect(lines[0]).toContain('prompt,overall_score,status,gen_latency_ms');
		expect(lines[0]).toContain('functionality,functionality_detail');

		// Check sorting (Alpha before Zebra)
		expect(lines[1]).toContain('Alpha workflow');
		expect(lines[2]).toContain('Zebra workflow');

		// Check violation text is included
		expect(lines[1]).toContain('[CRITICAL] Missing trigger');
	});

	it.each([
		{
			description: 'commas and quotes',
			prompt: 'Workflow with "quotes" and, commas',
			expected: '"Workflow with ""quotes"" and, commas"',
		},
		{
			description: 'newlines',
			prompt: 'Workflow with\nnewline',
			expected: '"Workflow with\nnewline"',
		},
	])('escapes $description in values', ({ prompt, expected }) => {
		const results: ExampleResult[] = [
			{
				index: 1,
				prompt,
				status: 'pass',
				score: 0.8,
				feedback: [],
				durationMs: 1000,
			},
		];

		const outputPath = join(tempDir, 'results.csv');
		writeResultsCsv(results, outputPath);

		const content = readFileSync(outputPath, 'utf-8');
		expect(content).toContain(expected);
	});

	it('writes pairwise evaluation results with correct columns', () => {
		const results: ExampleResult[] = [
			{
				index: 1,
				prompt: 'Test pairwise workflow',
				status: 'fail',
				score: 0.5,
				feedback: [
					{
						evaluator: 'pairwise',
						metric: 'pairwise_primary',
						score: 0,
						kind: 'score',
						comment: '0/3 judges passed',
					},
					{
						evaluator: 'pairwise',
						metric: 'pairwise_diagnostic',
						score: 0.67,
						kind: 'metric',
					},
					{
						evaluator: 'pairwise',
						metric: 'pairwise_judges_passed',
						score: 0,
						kind: 'detail',
					},
					{
						evaluator: 'pairwise',
						metric: 'pairwise_total_passes',
						score: 6,
						kind: 'detail',
					},
					{
						evaluator: 'pairwise',
						metric: 'pairwise_total_violations',
						score: 3,
						kind: 'detail',
					},
					{
						evaluator: 'pairwise',
						metric: 'judge1',
						score: 0,
						kind: 'detail',
						comment: '[Spec violation] Missing required field',
					},
					{
						evaluator: 'pairwise',
						metric: 'judge2',
						score: 1,
						kind: 'detail',
						comment: '',
					},
					{
						evaluator: 'pairwise',
						metric: 'judge3',
						score: 0,
						kind: 'detail',
						comment: '[Spec violation] Wrong parameter value',
					},
				],
				durationMs: 5000,
				generationDurationMs: 3000,
				generationInputTokens: 1000,
				generationOutputTokens: 500,
			},
		];

		const outputPath = join(tempDir, 'pairwise-results.csv');
		writeResultsCsv(results, outputPath);

		const content = readFileSync(outputPath, 'utf-8');
		const lines = content.trim().split('\n');

		// Check header has pairwise columns
		expect(lines[0]).toContain('prompt,overall_score,status,gen_latency_ms');
		expect(lines[0]).toContain('pairwise_primary');
		expect(lines[0]).toContain('pairwise_diagnostic');
		expect(lines[0]).toContain('pairwise_judges_passed');
		expect(lines[0]).toContain('pairwise_total_passes');
		expect(lines[0]).toContain('pairwise_total_violations');
		expect(lines[0]).toContain('judge1,judge1_detail');
		expect(lines[0]).toContain('judge2,judge2_detail');
		expect(lines[0]).toContain('judge3,judge3_detail');

		// Check data row contains judge violation details
		expect(lines[1]).toContain('[Spec violation] Missing required field');
		expect(lines[1]).toContain('[Spec violation] Wrong parameter value');
	});

	it('handles empty results array', () => {
		const results: ExampleResult[] = [];

		const outputPath = join(tempDir, 'empty-results.csv');
		writeResultsCsv(results, outputPath);

		const content = readFileSync(outputPath, 'utf-8');
		expect(content).toBe('');
	});

	it('includes subgraph metrics columns (node_count, discovery_latency_ms, builder_latency_ms)', () => {
		const results: ExampleResult[] = [
			{
				index: 1,
				prompt: 'Test workflow with subgraph metrics',
				status: 'pass',
				score: 0.9,
				feedback: [
					{
						evaluator: 'llm-judge',
						metric: 'functionality',
						score: 0.95,
						kind: 'metric',
						comment: '',
					},
				],
				durationMs: 5000,
				generationDurationMs: 3000,
				generationInputTokens: 1000,
				generationOutputTokens: 500,
				subgraphMetrics: {
					nodeCount: 8,
					discoveryDurationMs: 450,
					builderDurationMs: 1200,
				},
			},
			{
				index: 2,
				prompt: 'Test workflow without subgraph metrics',
				status: 'pass',
				score: 0.8,
				feedback: [
					{
						evaluator: 'llm-judge',
						metric: 'functionality',
						score: 0.8,
						kind: 'metric',
						comment: '',
					},
				],
				durationMs: 4000,
				generationDurationMs: 2500,
				generationInputTokens: 900,
				generationOutputTokens: 450,
				// No subgraphMetrics
			},
		];

		const outputPath = join(tempDir, 'subgraph-metrics.csv');
		writeResultsCsv(results, outputPath);

		const content = readFileSync(outputPath, 'utf-8');
		const lines = content.trim().split('\n');

		// Check header includes subgraph metrics columns
		expect(lines[0]).toContain('node_count');
		expect(lines[0]).toContain('discovery_latency_ms');
		expect(lines[0]).toContain('builder_latency_ms');

		// Check data rows (sorted by prompt alphabetically: "with" < "without")
		// First row: with metrics (should contain the values)
		expect(lines[1]).toContain('Test workflow with subgraph metrics');
		expect(lines[1]).toContain('8'); // nodeCount
		expect(lines[1]).toContain('450'); // discoveryDurationMs
		expect(lines[1]).toContain('1200'); // builderDurationMs

		// Second row: without metrics (empty values)
		expect(lines[2]).toContain('Test workflow without subgraph metrics');
	});

	it('includes subgraph metrics in pairwise format', () => {
		const results: ExampleResult[] = [
			{
				index: 1,
				prompt: 'Pairwise with metrics',
				status: 'pass',
				score: 0.9,
				feedback: [
					{
						evaluator: 'pairwise',
						metric: 'pairwise_primary',
						score: 1,
						kind: 'score',
					},
					{
						evaluator: 'pairwise',
						metric: 'judge1',
						score: 1,
						kind: 'detail',
					},
				],
				durationMs: 5000,
				generationDurationMs: 3000,
				generationInputTokens: 1000,
				generationOutputTokens: 500,
				subgraphMetrics: {
					nodeCount: 5,
					discoveryDurationMs: 300,
					builderDurationMs: 800,
				},
			},
		];

		const outputPath = join(tempDir, 'pairwise-with-metrics.csv');
		writeResultsCsv(results, outputPath);

		const content = readFileSync(outputPath, 'utf-8');
		const lines = content.trim().split('\n');

		// Check header includes subgraph metrics columns for pairwise format too
		expect(lines[0]).toContain('node_count');
		expect(lines[0]).toContain('discovery_latency_ms');
		expect(lines[0]).toContain('builder_latency_ms');

		// Check data row contains the metrics
		expect(lines[1]).toContain('5'); // nodeCount
		expect(lines[1]).toContain('300'); // discoveryDurationMs
		expect(lines[1]).toContain('800'); // builderDurationMs
	});

	it('uses explicit suite option to override auto-detection', () => {
		// Results with runner errors (no pairwise feedback) should still use pairwise format
		// when suite is explicitly specified
		const results: ExampleResult[] = [
			{
				index: 1,
				prompt: 'Failed during generation',
				status: 'error',
				score: 0,
				feedback: [
					{
						evaluator: 'runner', // This would normally trigger unknown/llm-judge format
						metric: 'error',
						score: 0,
						kind: 'score',
						comment: 'Generation failed',
					},
				],
				durationMs: 1000,
				generationDurationMs: 500,
				error: 'Generation failed',
			},
		];

		const outputPath = join(tempDir, 'explicit-pairwise-suite.csv');
		writeResultsCsv(results, outputPath, { suite: 'pairwise' });

		const content = readFileSync(outputPath, 'utf-8');
		const lines = content.trim().split('\n');

		// Should use pairwise format headers despite having runner feedback
		expect(lines[0]).toContain('pairwise_primary');
		expect(lines[0]).toContain('pairwise_diagnostic');
		// Should NOT have llm-judge format headers
		expect(lines[0]).not.toContain('functionality_detail');
	});

	it('falls back to auto-detection when suite option is not provided', () => {
		// Results with runner errors should fall back to llm-judge format when no suite specified
		const results: ExampleResult[] = [
			{
				index: 1,
				prompt: 'Failed during generation',
				status: 'error',
				score: 0,
				feedback: [
					{
						evaluator: 'runner',
						metric: 'error',
						score: 0,
						kind: 'score',
					},
				],
				durationMs: 1000,
				generationDurationMs: 500,
			},
		];

		const outputPath = join(tempDir, 'auto-detect-suite.csv');
		writeResultsCsv(results, outputPath); // No suite option

		const content = readFileSync(outputPath, 'utf-8');
		const lines = content.trim().split('\n');

		// Should fall back to llm-judge format when no suite detected
		expect(lines[0]).toContain('functionality');
		expect(lines[0]).toContain('functionality_detail');
	});
});
