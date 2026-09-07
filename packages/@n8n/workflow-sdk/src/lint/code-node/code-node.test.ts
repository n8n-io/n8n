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

describe('lintPythonCode — native runner constraints', () => {
	it('flags a stdlib import', () => {
		const issues = lintPythonCode('import re\nreturn []');
		expect(issues.map((i) => i.code)).toEqual(['CODE_NODE_PYTHON_IMPORT']);
		expect(issues[0].message).toContain('re');
	});

	it('flags a from-import', () => {
		const issues = lintPythonCode('from datetime import datetime\nreturn []');
		expect(issues.map((i) => i.code)).toEqual(['CODE_NODE_PYTHON_IMPORT']);
		expect(issues[0].message).toContain('datetime');
	});

	it('flags every module in a multi-module import', () => {
		const issues = lintPythonCode('import re, math\nreturn []');
		expect(issues.map((i) => i.code)).toEqual(['CODE_NODE_PYTHON_IMPORT']);
		expect(issues[0].message).toContain('re');
		expect(issues[0].message).toContain('math');
	});

	it('reports a network import only once, as a network call', () => {
		expect(lintPythonCode('import requests').map((i) => i.code)).toEqual([
			'CODE_NODE_NETWORK_CALL',
		]);
	});

	it('reports both when network and non-network modules are imported together', () => {
		expect(lintPythonCode('import re\nimport requests').map((i) => i.code)).toEqual([
			'CODE_NODE_NETWORK_CALL',
			'CODE_NODE_PYTHON_IMPORT',
		]);
	});

	it('does not flag the word import inside a comment', () => {
		expect(lintPythonCode('# import re is not allowed here\nreturn []').map((i) => i.code)).toEqual(
			[],
		);
	});

	it('does not flag import-free code using the real globals', () => {
		expect(lintPythonCode('return [{"json": {"n": len(_items)}}]').map((i) => i.code)).toEqual([]);
	});

	it('flags the cross-node helper _("Some Node")', () => {
		const issues = lintPythonCode('rows = _("Some Node").all()\nreturn rows');
		expect(issues.map((i) => i.code)).toEqual(['CODE_NODE_PYTHON_UNSUPPORTED_GLOBAL']);
		expect(issues[0].message).toContain('_items');
	});

	it('flags _input, which does not exist in the native runner', () => {
		expect(lintPythonCode('return _input.all()').map((i) => i.code)).toEqual([
			'CODE_NODE_PYTHON_UNSUPPORTED_GLOBAL',
		]);
	});

	it.each(['_json', '_today', '_jmespath', '_node', '_workflow'])(
		'flags the Pyodide-era global %s',
		(global) => {
			expect(lintPythonCode(`return ${global}`).map((i) => i.code)).toEqual([
				'CODE_NODE_PYTHON_UNSUPPORTED_GLOBAL',
			]);
		},
	);

	it('flags JavaScript-style $ helpers', () => {
		expect(lintPythonCode('return $input.all()').map((i) => i.code)).toEqual([
			'CODE_NODE_PYTHON_UNSUPPORTED_GLOBAL',
		]);
	});

	it('does not flag _items or _item when the mode is unknown', () => {
		expect(lintPythonCode('return _items').map((i) => i.code)).toEqual([]);
		expect(lintPythonCode('return _item').map((i) => i.code)).toEqual([]);
	});

	it('flags _item in runOnceForAllItems mode', () => {
		const issues = lintPythonCode('return [_item]', { mode: 'runOnceForAllItems' });
		expect(issues.map((i) => i.code)).toEqual(['CODE_MODE_API_MISUSE']);
		expect(issues[0].message).toContain('_items');
	});

	it('flags _items in runOnceForEachItem mode', () => {
		const issues = lintPythonCode('return _items[0]', { mode: 'runOnceForEachItem' });
		expect(issues.map((i) => i.code)).toEqual(['CODE_MODE_API_MISUSE']);
		expect(issues[0].message).toContain('_item');
	});

	it('does not flag the accessor that matches the mode', () => {
		expect(
			lintPythonCode('return _items', { mode: 'runOnceForAllItems' }).map((i) => i.code),
		).toEqual([]);
		expect(
			lintPythonCode('return _item', { mode: 'runOnceForEachItem' }).map((i) => i.code),
		).toEqual([]);
	});

	it('flags a relative import, which the runner rejects outright', () => {
		const issues = lintPythonCode('from .helpers import parse\nreturn []');
		expect(issues.map((i) => i.code)).toEqual(['CODE_NODE_PYTHON_IMPORT']);
		expect(issues[0].message).toContain('.helpers');
	});

	it('flags a bare relative import', () => {
		expect(lintPythonCode('from . import helpers\nreturn []').map((i) => i.code)).toEqual([
			'CODE_NODE_PYTHON_IMPORT',
		]);
	});

	// The agent reads these and may repeat them to the user, who on a managed
	// deployment has no way to change the allowlist.
	it('never names an environment variable', () => {
		for (const issue of lintPythonCode('import math\nreturn []')) {
			expect(issue.message).not.toMatch(/N8N_RUNNERS_/);
		}
	});

	it('does not flag an unsupported global named only in a comment', () => {
		expect(
			lintPythonCode('# _json and $input are not available\nreturn _items').map((i) => i.code),
		).toEqual([]);
	});

	it('does not flag a leading underscore in an ordinary identifier', () => {
		expect(
			lintPythonCode('_total = 0\nreturn [{"json": {"t": _total}}]').map((i) => i.code),
		).toEqual([]);
	});
});
