import { isContainedWithin } from '../path-util';

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
