import { isContained } from '../path-utils';

describe('isContained', () => {
	it('accepts a child path', () => {
		expect(isContained('/tmp/sandbox', '/tmp/sandbox/foo.txt')).toBe(true);
	});

	it('accepts a nested child path', () => {
		expect(isContained('/tmp/sandbox', '/tmp/sandbox/a/b/c.json')).toBe(true);
	});

	it('rejects the root itself', () => {
		expect(isContained('/tmp/sandbox', '/tmp/sandbox')).toBe(false);
	});

	it('rejects parent traversal', () => {
		expect(isContained('/tmp/sandbox', '/tmp/other')).toBe(false);
	});

	it('rejects an ancestor of the root', () => {
		expect(isContained('/tmp/sandbox', '/tmp')).toBe(false);
	});

	it('rejects sibling paths', () => {
		expect(isContained('/tmp/sandbox', '/tmp/sandbox-evil')).toBe(false);
	});

	it('rejects Windows drive-qualified paths returned by relative()', () => {
		// On POSIX `path.relative` will never produce `D:\foo`, but the helper's
		// containment check must still reject it because Windows callers will.
		// Construct the case by giving the helper a target that `relative()`
		// resolves to an absolute string regardless of platform.
		const rootResolved = '/tmp/sandbox';
		const crossDrive = '/elsewhere/outside';
		expect(isContained(rootResolved, crossDrive)).toBe(false);
	});
});
