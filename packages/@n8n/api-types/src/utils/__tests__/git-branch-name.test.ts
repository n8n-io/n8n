import { isValidGitBranchName } from '../git-branch-name';

describe('isValidGitBranchName', () => {
	test.each([
		'main',
		'develop',
		'feat/my-thing',
		'release/1.2.3',
		'user/feature_x',
		'foo./bar', // a dot at the end of a non-last component is fine
	])('accepts valid name %s', (name) => {
		expect(isValidGitBranchName(name)).toBe(true);
	});

	test.each([
		'',
		' ',
		'has space',
		'-leading-dash',
		'/leading-slash',
		'trailing-slash/',
		'double//slash',
		'dot..dot',
		'branch.lock',
		'has~tilde',
		'has^caret',
		'has:colon',
		'has?question',
		'has*star',
		'has[bracket',
		'has\\backslash',
		'has@{seq',
		'ends.',
		'foo/.bar', // component starting with a dot, nested
		'.foo/bar', // component starting with a dot, first segment
		'foo.lock/bar', // component ending in .lock, not the last segment
		'foo/bar.lock/baz', // component ending in .lock, mid-path
	])('rejects invalid name %j', (name) => {
		expect(isValidGitBranchName(name)).toBe(false);
	});
});
