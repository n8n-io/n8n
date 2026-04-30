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
