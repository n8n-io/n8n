import { normalizeBasePath, isContainedWithin, safeJoinPath } from '../utils/path-util';

describe('path-util', () => {
	describe('normalizeBasePath', () => {
		it('should return "/" for empty inputs', () => {
			expect(normalizeBasePath('', '')).toBe('/');
			expect(normalizeBasePath('', '/')).toBe('/');
			expect(normalizeBasePath('/', '')).toBe('/');
			expect(normalizeBasePath('/', '/')).toBe('/');
		});

		it('should normalize a single path segment', () => {
			expect(normalizeBasePath('', '/app')).toBe('/app');
			expect(normalizeBasePath('', 'app')).toBe('/app');
			expect(normalizeBasePath('', 'app/')).toBe('/app');
			expect(normalizeBasePath('', '/app/')).toBe('/app');
		});

		it('should normalize basePath only', () => {
			expect(normalizeBasePath('/prefix', '/')).toBe('/prefix');
			expect(normalizeBasePath('/prefix', '')).toBe('/prefix');
			expect(normalizeBasePath('prefix', '/')).toBe('/prefix');
			expect(normalizeBasePath('prefix/', '/')).toBe('/prefix');
		});

		it('should combine basePath and urlPath', () => {
			expect(normalizeBasePath('/prefix', '/app')).toBe('/prefix/app');
			expect(normalizeBasePath('prefix', 'app')).toBe('/prefix/app');
			expect(normalizeBasePath('prefix/', 'app/')).toBe('/prefix/app');
			expect(normalizeBasePath('/prefix/', '/app/')).toBe('/prefix/app');
		});

		it('should handle multiple path segments', () => {
			expect(normalizeBasePath('/a/b', '/c/d')).toBe('/a/b/c/d');
			expect(normalizeBasePath('a/b/', 'c/d/')).toBe('/a/b/c/d');
		});

		it('should not end with a trailing slash', () => {
			const result1 = normalizeBasePath('/test', '/');
			const result2 = normalizeBasePath('/test', '/app');
			const result3 = normalizeBasePath('/', '/app');

			expect(result1.endsWith('/')).toBe(false);
			expect(result2.endsWith('/')).toBe(false);
			expect(result3.endsWith('/')).toBe(false);
		});

		it('should always start with a slash (except for root)', () => {
			expect(normalizeBasePath('test', 'app')).toBe('/test/app');
			expect(normalizeBasePath('test', '')).toBe('/test');
			expect(normalizeBasePath('', 'app')).toBe('/app');
		});

		it('should handle real-world n8n path configurations', () => {
			// Default configuration
			expect(normalizeBasePath('', '/')).toBe('/');

			// Custom base path only
			expect(normalizeBasePath('/n8n', '/')).toBe('/n8n');

			// Custom path only
			expect(normalizeBasePath('', '/test')).toBe('/test');

			// Both custom
			expect(normalizeBasePath('/n8n', '/test')).toBe('/n8n/test');
		});
	});

	describe('isContainedWithin', () => {
		it('should return true when paths are equal', () => {
			expect(isContainedWithin('/parent', '/parent')).toBe(true);
		});

		it('should return true when child is inside parent', () => {
			expect(isContainedWithin('/parent', '/parent/child')).toBe(true);
			expect(isContainedWithin('/parent', '/parent/child/grandchild')).toBe(true);
		});

		it('should return false when child is outside parent', () => {
			expect(isContainedWithin('/parent', '/other')).toBe(false);
			expect(isContainedWithin('/parent', '/parent-sibling')).toBe(false);
		});

		it('should return false for path traversal attempts', () => {
			expect(isContainedWithin('/parent', '/parent/../other')).toBe(false);
		});
	});

	describe('safeJoinPath', () => {
		it('should join paths safely', () => {
			expect(safeJoinPath('/parent', 'child')).toBe('/parent/child');
			expect(safeJoinPath('/parent', 'child', 'grandchild')).toBe('/parent/child/grandchild');
		});

		it('should throw on path traversal attempts', () => {
			expect(() => safeJoinPath('/parent', '../other')).toThrow();
			expect(() => safeJoinPath('/parent', 'child/../../other')).toThrow();
		});
	});
});
