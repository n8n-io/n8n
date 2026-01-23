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

	describe('--webhook-url', () => {
		it('parses valid HTTPS webhook URL', () => {
			const args = parseEvaluationArgs(['--webhook-url', 'https://example.com/webhook']);
			expect(args.webhookUrl).toBe('https://example.com/webhook');
		});

		it('parses webhook URL with inline = syntax', () => {
			const args = parseEvaluationArgs(['--webhook-url=https://api.example.com/hook']);
			expect(args.webhookUrl).toBe('https://api.example.com/hook');
		});

		it('rejects invalid URL format', () => {
			expect(() => parseEvaluationArgs(['--webhook-url', 'not-a-url'])).toThrow();
		});

		it('rejects non-URL strings', () => {
			expect(() => parseEvaluationArgs(['--webhook-url', 'just-some-text'])).toThrow();
		});

		it('allows webhook URL to be undefined when not provided', () => {
			const args = parseEvaluationArgs([]);
			expect(args.webhookUrl).toBeUndefined();
		});

		it('parses webhook URL with path and query params', () => {
			const args = parseEvaluationArgs([
				'--webhook-url',
				'https://hooks.example.com/api/v1/notify?token=abc123',
			]);
			expect(args.webhookUrl).toBe('https://hooks.example.com/api/v1/notify?token=abc123');
		});
	});
});
