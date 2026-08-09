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

	it.each(['first', 'last', 'all', 'itemMatching'] as const)(
		'flags $input.%s() in runOnceForEachItem mode',
		(method) => {
			const issues = lintJsCode(`return $input.${method}();`, { mode: 'runOnceForEachItem' });
			const misuse = issues.filter((i) => i.code === 'CODE_MODE_API_MISUSE');
			expect(misuse).toHaveLength(1);
			expect(misuse[0].message).toContain(`$input.${method}()`);
		},
	);

	it('does not flag $input.item in runOnceForEachItem mode', () => {
		expect(
			lintJsCode('return $input.item.json;', { mode: 'runOnceForEachItem' }).map((i) => i.code),
		).toEqual([]);
	});

	it('does not flag $input.all() in runOnceForAllItems mode', () => {
		expect(
			lintJsCode('return $input.all();', { mode: 'runOnceForAllItems' }).map((i) => i.code),
		).toEqual([]);
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

	it('flags import http.client in pythonCode', () => {
		expect(lintPythonCode('import http.client').map((i) => i.code)).toEqual([
			'CODE_NODE_NETWORK_CALL',
		]);
	});

	it('flags from http import client in pythonCode', () => {
		expect(lintPythonCode('from http import client').map((i) => i.code)).toEqual([
			'CODE_NODE_NETWORK_CALL',
		]);
	});
});
