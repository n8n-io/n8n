import { isValidGitBranchName } from '../git-branch-name';

describe('isValidGitBranchName', () => {
	test.each(['main', 'develop', 'feat/my-thing', 'release/1.2.3', 'user/feature_x'])(
		'accepts valid name %s',
		(name) => {
			expect(isValidGitBranchName(name)).toBe(true);
		},
	);

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
	])('rejects invalid name %j', (name) => {
		expect(isValidGitBranchName(name)).toBe(false);
	});
});
