import { isContainedWithin, safeJoinPath } from '../path-util';

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
