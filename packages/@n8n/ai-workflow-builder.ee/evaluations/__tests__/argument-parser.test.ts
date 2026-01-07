import { parseEvaluationArgs } from '../core/argument-parser';

describe('parseEvaluationArgs', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it('parses --flag=value forms', () => {
		const args = parseEvaluationArgs([
			'--suite=pairwise',
			'--backend=local',
			'--prompt=Hello',
			'--judges=5',
			'--generations=2',
		]);

		expect(args).toEqual(
			expect.objectContaining({
				suite: 'pairwise',
				backend: 'local',
				prompt: 'Hello',
				numJudges: 5,
				numGenerations: 2,
			}),
		);
	});

	it('accepts --prompt values that start with "-"', () => {
		const args = parseEvaluationArgs(['--prompt', '-starts-with-dash']);
		expect(args.prompt).toBe('-starts-with-dash');
	});

	it('supports --langsmith as alias for --backend langsmith', () => {
		const args = parseEvaluationArgs(['--langsmith', '--dataset', 'my-dataset']);
		expect(args.backend).toBe('langsmith');
		expect(args.datasetName).toBe('my-dataset');
	});

	it('throws on unknown flags', () => {
		expect(() => parseEvaluationArgs(['--nope'])).toThrow('Unknown flag');
	});

	it('coerces numeric flags', () => {
		const args = parseEvaluationArgs(['--repetitions', '3', '--concurrency', '2']);
		expect(args.repetitions).toBe(3);
		expect(args.concurrency).toBe(2);
	});

	it('parses repeated --filter flags and aliases', () => {
		const args = parseEvaluationArgs([
			'--suite',
			'pairwise',
			'--backend',
			'langsmith',
			'--filter',
			'do:Slack',
			'--filter',
			'technique:data_transformation',
			'--notion-id',
			'n123',
		]);

		expect(args.filters).toEqual({
			doSearch: 'Slack',
			technique: 'data_transformation',
			notionId: 'n123',
		});
	});

	it('throws on unknown --filter keys', () => {
		expect(() =>
			parseEvaluationArgs(['--suite', 'pairwise', '--backend', 'langsmith', '--filter', 'nope:x']),
		).toThrow('Unknown filter key');
	});

	it('throws on malformed --filter syntax', () => {
		expect(() =>
			parseEvaluationArgs(['--suite', 'pairwise', '--backend', 'langsmith', '--filter', 'nope']),
		).toThrow('Invalid `--filter` format');
	});

	it('rejects do/dont filters for non-pairwise suites', () => {
		expect(() => parseEvaluationArgs(['--suite', 'llm-judge', '--filter', 'do:Slack'])).toThrow(
			'only supported for `--suite pairwise`',
		);
	});
});
