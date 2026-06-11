import { parseCliArgs } from '../cli/args';

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
