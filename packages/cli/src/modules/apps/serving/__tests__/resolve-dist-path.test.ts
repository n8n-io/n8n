import path from 'node:path';

import { resolveDistPath } from '../resolve-dist-path';

const distDir = path.resolve('/cache/apps/v1');

describe('resolveDistPath', () => {
	test('resolves the dist root for no segments', () => {
		expect(resolveDistPath(distDir, [])).toBe(distDir);
	});

	test('joins segments under the dist root', () => {
		expect(resolveDistPath(distDir, ['assets', 'app.js'])).toBe(
			path.join(distDir, 'assets', 'app.js'),
		);
	});

	test('rejects segments that climb out of the dist root', () => {
		expect(resolveDistPath(distDir, ['..', '..', 'etc', 'passwd'])).toBeUndefined();
		expect(resolveDistPath(distDir, ['assets', '..', '..', 'v2', 'index.html'])).toBeUndefined();
	});

	test('rejects an absolute segment', () => {
		expect(resolveDistPath(distDir, ['/etc/passwd'])).toBeUndefined();
	});

	test('rejects a sibling directory sharing the root as a prefix', () => {
		expect(resolveDistPath(distDir, ['..', 'v1-other', 'index.html'])).toBeUndefined();
	});

	test('keeps a slash inside one segment under the root', () => {
		expect(resolveDistPath(distDir, ['a/b'])).toBe(path.join(distDir, 'a', 'b'));
	});
});
