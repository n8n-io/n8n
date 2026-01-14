import { parseEvaluationArgs } from '../cli/argument-parser';

describe('argument-parser', () => {
	it('parses numeric flags like --max-examples and --concurrency', () => {
		const args = parseEvaluationArgs([
			'--suite',
			'pairwise',
			'--backend',
			'langsmith',
			'--max-examples',
			'5',
			'--concurrency',
			'3',
		]);

		expect(args.maxExamples).toBe(5);
		expect(args.concurrency).toBe(3);
	});

	it('supports inline --max-examples= syntax', () => {
		const args = parseEvaluationArgs(['--max-examples=7']);
		expect(args.maxExamples).toBe(7);
	});

	it('parses filters for pairwise suite', () => {
		const args = parseEvaluationArgs([
			'--suite',
			'pairwise',
			'--backend',
			'langsmith',
			'--filter',
			'do:Slack',
			'--filter',
			'technique:content_generation',
		]);

		expect(args.filters).toEqual({
			doSearch: 'Slack',
			technique: 'content_generation',
		});
	});

	it('accepts prompt values that start with "-"', () => {
		const args = parseEvaluationArgs(['--prompt', '-starts-with-dash']);
		expect(args.prompt).toBe('-starts-with-dash');
	});

	it('rejects conflicting backend/local when --langsmith is set', () => {
		expect(() => parseEvaluationArgs(['--langsmith', '--backend', 'local'])).toThrow(
			'Cannot combine `--langsmith` with `--backend local`',
		);
	});

	it('treats --langsmith as backend=langsmith', () => {
		const args = parseEvaluationArgs(['--langsmith']);
		expect(args.backend).toBe('langsmith');
	});

	it('rejects do/dont filters for non-pairwise suite', () => {
		expect(() => parseEvaluationArgs(['--suite', 'llm-judge', '--filter', 'do:Slack'])).toThrow(
			'only supported for `--suite pairwise`',
		);
	});

	it('rejects malformed filters', () => {
		expect(() =>
			parseEvaluationArgs(['--suite', 'pairwise', '--backend', 'langsmith', '--filter', 'nope']),
		).toThrow('Invalid `--filter` format');
	});
});
