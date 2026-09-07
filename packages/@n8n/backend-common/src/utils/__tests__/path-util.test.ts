import { mkdtemp, mkdir, symlink, rm, realpath, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
	isContainedWithin,
	safeJoinPath,
	pathComponents,
	pathSegmentsBetween,
	containsSymlinkedComponent,
} from '../path-util';

describe('isContainedWithin', () => {
	it('should return true when parent and child paths are the same', () => {
		expect(isContainedWithin('/some/parent/folder', '/some/parent/folder')).toBe(true);
	});

	test.each([
		['/some/parent/folder', '/some/parent/folder/subfolder/file.txt'],
		['/some/parent/folder', '/some/parent/folder/../folder/subfolder/file.txt'],
		['/some/parent/folder/', '/some/parent/folder/subfolder/file.txt'],
		['/some/parent/folder', '/some/parent/folder/subfolder/'],
	])('should return true for parent %s and child %s', (parent, child) => {
		expect(isContainedWithin(parent, child)).toBe(true);
	});

	test.each([
		['/some/parent/folder', '/some/other/folder/file.txt'],
		['/some/parent/folder', '/some/parent/folder_but_not_really'],
		['/one/path', '/another/path'],
	])('should return false for parent %s and child %s', (parent, child) => {
		expect(isContainedWithin(parent, child)).toBe(false);
	});
});

describe('safeJoinPath', () => {
	it('should join valid paths successfully', () => {
		expect(safeJoinPath('path', '')).toBe('path');
		expect(safeJoinPath('path', '.')).toBe('path');
		expect(safeJoinPath('path', '../path')).toBe('path');
		expect(safeJoinPath('path', 'foo')).toBe('path/foo');
		expect(safeJoinPath('path', 'foo/file.json')).toBe('path/foo/file.json');
		expect(safeJoinPath('path', './foo/file.json')).toBe('path/foo/file.json');
		expect(safeJoinPath('path', './foo/../file.json')).toBe('path/file.json');
		expect(safeJoinPath('/foo/bar', 'baz')).toBe('/foo/bar/baz');
		expect(safeJoinPath('/foo/bar/', 'baz')).toBe('/foo/bar/baz');
		expect(safeJoinPath('/foo', '')).toBe('/foo');
		expect(safeJoinPath('/foo', '.')).toBe('/foo');
		expect(safeJoinPath('/foo', 'bar//baz')).toBe('/foo/bar/baz');
		expect(safeJoinPath('/foo', 'bar/../baz')).toBe('/foo/baz');
		expect(safeJoinPath('/foo', '/bar/baz')).toBe('/foo/bar/baz');
		expect(safeJoinPath('/foo', '.././foo/bar')).toBe('/foo/bar');
	});

	it('should throw an error for invalid paths', () => {
		expect(() => safeJoinPath('path', '../outside/file.json')).toThrow('Path traversal detected');
		expect(() => safeJoinPath('path', './foo/../../file.json')).toThrow('Path traversal detected');
		expect(() => safeJoinPath('/foo/bar', '../../baz')).toThrow('Path traversal detected');
		expect(() => safeJoinPath('/foo/bar', '../baz')).toThrow('Path traversal detected');
		expect(() => safeJoinPath('path', '..')).toThrow('Path traversal detected');
		expect(() => safeJoinPath('/foo/bar', '..')).toThrow('Path traversal detected');
	});
});

describe('pathComponents', () => {
	it('returns each component of an absolute path from the root down', () => {
		expect(pathComponents('/a/b/c')).toEqual(['/a', '/a/b', '/a/b/c']);
	});

	it('ignores empty segments and trailing slashes', () => {
		expect(pathComponents('/a//b/')).toEqual(['/a', '/a/b']);
	});

	it('returns an empty list for the root path', () => {
		expect(pathComponents('/')).toEqual([]);
	});

	it('builds each component of a relative path', () => {
		expect(pathComponents('a/b')).toEqual(['a', 'a/b']);
	});
});

describe('pathSegmentsBetween', () => {
	it('returns the segments of a descendant below an ancestor', () => {
		expect(pathSegmentsBetween('/a', '/a/b/c')).toEqual(['b', 'c']);
	});

	it('returns an empty list when the paths are equal', () => {
		expect(pathSegmentsBetween('/a/b', '/a/b')).toEqual([]);
	});

	it('returns null when the descendant is not contained within the ancestor', () => {
		expect(pathSegmentsBetween('/a/b', '/a/c')).toBeNull();
		expect(pathSegmentsBetween('/a/b', '/a/b_but_not_really')).toBeNull();
	});

	it('normalises traversal and trailing separators', () => {
		expect(pathSegmentsBetween('/a', '/a/b/../b/c/')).toEqual(['b', 'c']);
	});
});

describe('containsSymlinkedComponent', () => {
	let base: string;

	beforeEach(async () => {
		// realpath so the temp dir is canonical (e.g. macOS /var -> /private/var is a symlink).
		base = await realpath(await mkdtemp(join(tmpdir(), 'pathutil-')));
	});

	afterEach(async () => {
		await rm(base, { recursive: true, force: true });
	});

	it('returns false when no component is a symlink', async () => {
		const dir = join(base, 'a', 'b');
		await mkdir(dir, { recursive: true });
		expect(await containsSymlinkedComponent(dir)).toBe(false);
	});

	it('returns true when an ancestor component is a symlink', async () => {
		const real = join(base, 'real');
		await mkdir(real, { recursive: true });
		const link = join(base, 'link');
		await symlink(real, link);
		expect(await containsSymlinkedComponent(join(link, 'child'))).toBe(true);
	});

	it('ignores missing components', async () => {
		expect(await containsSymlinkedComponent(join(base, 'does', 'not', 'exist'))).toBe(false);
	});

	it('propagates errors other than a missing component', async () => {
		// Running as root bypasses permission checks, so the error path can't be exercised there.
		if (process.getuid?.() === 0) return;
		const unreadable = join(base, 'unreadable');
		await mkdir(unreadable);
		await chmod(unreadable, 0o000);
		try {
			await expect(containsSymlinkedComponent(join(unreadable, 'child'))).rejects.toThrow();
		} finally {
			await chmod(unreadable, 0o755);
		}
	});
});
