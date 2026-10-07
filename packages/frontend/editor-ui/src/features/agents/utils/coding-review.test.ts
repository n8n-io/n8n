import { describe, expect, it } from 'vitest';
import { codingDiffLines } from './coding-review';

describe('coding diff line locations', () => {
	it('keeps old and new line locations across hunks and header-like source code', () => {
		const diff = [
			'diff --git a/app.ts b/app.ts',
			'--- a/app.ts',
			'+++ b/app.ts',
			'@@ -2,3 +2,4 @@',
			' unchanged',
			'-old value',
			'+new value',
			'+++source code',
			' trailing',
			'@@ -20,1 +21,0 @@',
			'-removed tail',
			'\\ No newline at end of file',
		].join('\n');
		expect(
			codingDiffLines(diff).filter(
				(line) => line.oldLine !== undefined || line.newLine !== undefined,
			),
		).toEqual([
			{ index: 4, kind: 'context', text: 'unchanged', oldLine: 2, newLine: 2 },
			{ index: 5, kind: 'removed', text: 'old value', oldLine: 3 },
			{ index: 6, kind: 'added', text: 'new value', newLine: 3 },
			{ index: 7, kind: 'added', text: '++source code', newLine: 4 },
			{ index: 8, kind: 'context', text: 'trailing', oldLine: 4, newLine: 5 },
			{ index: 10, kind: 'removed', text: 'removed tail', oldLine: 20 },
		]);
	});
});
