import { parseCliArgs, partialIsolationWarning } from '../cli/args';

describe('parseCliArgs --base-url', () => {
	it('defaults to a single localhost URL when --base-url is not provided', () => {
		const args = parseCliArgs([]);
		expect(args.baseUrls).toEqual(['http://localhost:5678']);
	});

	it('accepts a single URL', () => {
		const args = parseCliArgs(['--base-url', 'http://localhost:5678']);
		expect(args.baseUrls).toEqual(['http://localhost:5678']);
	});

	it('splits comma-separated URLs into a list of lanes', () => {
		const args = parseCliArgs([
			'--base-url',
			'http://localhost:5678,http://localhost:5679,http://localhost:5680',
		]);
		expect(args.baseUrls).toEqual([
			'http://localhost:5678',
			'http://localhost:5679',
			'http://localhost:5680',
		]);
	});

	it('trims surrounding whitespace from each URL', () => {
		const args = parseCliArgs(['--base-url', ' http://localhost:5678 , http://localhost:5679 ']);
		expect(args.baseUrls).toEqual(['http://localhost:5678', 'http://localhost:5679']);
	});

	it('drops empty entries from a stray comma', () => {
		const args = parseCliArgs(['--base-url', 'http://localhost:5678,,http://localhost:5679']);
		expect(args.baseUrls).toEqual(['http://localhost:5678', 'http://localhost:5679']);
	});

	it('rejects a non-URL entry', () => {
		expect(() => parseCliArgs(['--base-url', 'http://localhost:5678,not-a-url'])).toThrow();
	});
});

describe('parseCliArgs --prebuilt-workflows', () => {
	it('is undefined by default', () => {
		expect(parseCliArgs([]).prebuiltWorkflows).toBeUndefined();
		expect(parseCliArgs([]).deletePrebuiltWorkflows).toBe(false);
	});

	it('accepts a path argument', () => {
		const args = parseCliArgs(['--prebuilt-workflows', './mcp-manifest.json']);
		expect(args.prebuiltWorkflows).toBe('./mcp-manifest.json');
	});

	it('throws when no value is provided', () => {
		expect(() => parseCliArgs(['--prebuilt-workflows'])).toThrow(/Missing value/);
	});

	it('accepts deleting prebuilt workflows when a manifest is provided', () => {
		const args = parseCliArgs([
			'--prebuilt-workflows',
			'./mcp-manifest.json',
			'--delete-prebuilt-workflows',
		]);
		expect(args.deletePrebuiltWorkflows).toBe(true);
	});

	it('rejects deleting prebuilt workflows without a manifest', () => {
		expect(() => parseCliArgs(['--delete-prebuilt-workflows'])).toThrow(
			/--delete-prebuilt-workflows requires --prebuilt-workflows/,
		);
	});

	it('rejects deleting and keeping workflows at the same time', () => {
		expect(() =>
			parseCliArgs([
				'--prebuilt-workflows',
				'./mcp-manifest.json',
				'--delete-prebuilt-workflows',
				'--keep-workflows',
			]),
		).toThrow(/--delete-prebuilt-workflows cannot be used with --keep-workflows/);
	});
});

describe('parseCliArgs --exclude', () => {
	it('is undefined by default', () => {
		expect(parseCliArgs([]).exclude).toBeUndefined();
	});

	it('accepts a single substring', () => {
		expect(parseCliArgs(['--exclude', 'cross-team']).exclude).toBe('cross-team');
	});

	it('accepts a comma-separated list as a single value', () => {
		const args = parseCliArgs(['--exclude', 'cross-team,deduplication']);
		expect(args.exclude).toBe('cross-team,deduplication');
	});
});

describe('parseCliArgs --baseline-prefix', () => {
	it('defaults to the instance-ai baseline prefix', () => {
		expect(parseCliArgs([]).baselinePrefix).toBe('instance-ai-baseline-');
	});

	it('appends the required trailing hyphen when missing', () => {
		// Anchors the prefix match to LangSmith's `-<suffix>` separator so it can't
		// catch unrelated experiment names (e.g. `mcp-baseline` vs `mcp-baseline2-`).
		expect(parseCliArgs(['--baseline-prefix', 'mcp-baseline']).baselinePrefix).toBe(
			'mcp-baseline-',
		);
	});

	it('leaves an existing trailing hyphen intact', () => {
		expect(parseCliArgs(['--baseline-prefix', 'mcp-baseline-']).baselinePrefix).toBe(
			'mcp-baseline-',
		);
	});
});

describe('partialIsolationWarning', () => {
	it('returns undefined when both are at their defaults (Instance AI run)', () => {
		expect(
			partialIsolationWarning('instance-ai-workflow-evals', 'instance-ai-baseline-'),
		).toBeUndefined();
	});

	it('returns undefined when both are overridden (isolated cohort)', () => {
		expect(
			partialIsolationWarning('instance-ai-mcp-workflow-evals', 'mcp-baseline-'),
		).toBeUndefined();
	});

	it('warns when only the dataset is overridden', () => {
		expect(
			partialIsolationWarning('instance-ai-mcp-workflow-evals', 'instance-ai-baseline-'),
		).toMatch(/Partial LangSmith isolation/);
	});

	it('warns when only the baseline prefix is overridden', () => {
		expect(partialIsolationWarning('instance-ai-workflow-evals', 'mcp-baseline-')).toMatch(
			/Partial LangSmith isolation/,
		);
	});
});

describe('parseCliArgs --source langtracer dataset isolation', () => {
	it('derives a suite-scoped dataset + baseline prefix by default', () => {
		const args = parseCliArgs(['--source', 'langtracer', '--suite', 'n8n-workflows']);
		expect(args.dataset).toBe('instance-ai-langtracer-n8n-workflows');
		expect(args.baselinePrefix).toBe('instance-ai-langtracer-n8n-workflows-baseline-');
	});

	it('does not derive in disk mode (defaults stay the shared cohort)', () => {
		const args = parseCliArgs([]);
		expect(args.dataset).toBe('instance-ai-workflow-evals');
		expect(args.baselinePrefix).toBe('instance-ai-baseline-');
	});

	it('lets explicit --dataset / --baseline-prefix win', () => {
		const args = parseCliArgs([
			'--source',
			'langtracer',
			'--suite',
			'n8n-workflows',
			'--dataset',
			'custom-ds',
			'--baseline-prefix',
			'custom-base-',
		]);
		expect(args.dataset).toBe('custom-ds');
		expect(args.baselinePrefix).toBe('custom-base-');
	});

	it('sanitizes the suite into the dataset name', () => {
		const args = parseCliArgs(['--source', 'langtracer', '--suite', 'My Suite!']);
		expect(args.dataset).toBe('instance-ai-langtracer-my-suite');
	});
});
