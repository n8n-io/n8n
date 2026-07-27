import { hasNestedTemplateLiterals, lintJsCode } from './js';
import { lintPythonCode } from './python';

describe('lintJsCode', () => {
	it('flags fetch in jsCode', () => {
		expect(lintJsCode('await fetch("https://example.com");').map((i) => i.code)).toEqual([
			'CODE_NODE_NETWORK_CALL',
		]);
	});

	it('does not flag fetch mentioned only in a comment', () => {
		expect(
			lintJsCode('// await fetch("https://example.com");\nreturn [];').map((i) => i.code),
		).toEqual([]);
	});

	it('flags nested template literals via AST', () => {
		expect(hasNestedTemplateLiterals('const x = `outer ${`inner`} `;')).toBe(true);
		expect(hasNestedTemplateLiterals('const x = `plain`;')).toBe(false);
	});
});

describe('lintPythonCode', () => {
	it('flags requests imports in pythonCode', () => {
		expect(lintPythonCode('import requests').map((i) => i.code)).toEqual([
			'CODE_NODE_NETWORK_CALL',
		]);
	});

	it('does not flag a variable merely named requests', () => {
		expect(lintPythonCode('requests = []\nreturn requests').map((i) => i.code)).toEqual([]);
	});
});
