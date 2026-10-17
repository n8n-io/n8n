import { splitTokenList } from './split-token-list';

describe('splitTokenList', () => {
	it('splits on commas when the text has any', () => {
		expect(splitTokenList('Bash(git:*), Read, Grep, Glob')).toEqual([
			'Bash(git:*)',
			'Read',
			'Grep',
			'Glob',
		]);
	});

	it('splits on whitespace when there is no comma', () => {
		expect(splitTokenList('load_workflow  search_docs\nrun_workflow')).toEqual([
			'load_workflow',
			'search_docs',
			'run_workflow',
		]);
	});

	it('keeps whitespace inside parentheses', () => {
		expect(splitTokenList('Bash(git diff:*) Bash(pnpm nathan:*) Read')).toEqual([
			'Bash(git diff:*)',
			'Bash(pnpm nathan:*)',
			'Read',
		]);
	});

	it('drops empty tokens', () => {
		expect(splitTokenList(' , Read,, Grep , ')).toEqual(['Read', 'Grep']);
		expect(splitTokenList('   ')).toEqual([]);
		expect(splitTokenList('')).toEqual([]);
	});

	it('returns a single token as is', () => {
		expect(splitTokenList('workflow')).toEqual(['workflow']);
	});
});
