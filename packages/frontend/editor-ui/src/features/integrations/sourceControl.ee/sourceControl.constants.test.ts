import {
	SOURCE_CONTROL_HTTPS_REPO_URL_REGEX,
	SOURCE_CONTROL_SSH_REPO_URL_REGEX,
} from './sourceControl.constants';

describe('sourceControl.constants', () => {
	describe('SOURCE_CONTROL_SSH_REPO_URL_REGEX', () => {
		test.each([
			['git@github.com:user/repository.git', true],
			['git@github.enterprise.com:org-name/repo-name.git', true],
			['git@192.168.1.101:2222:user/repo.git', true],
			['git@github.com:user/repo.git/path/to/subdir', true],
			['git@[2001:db8:100:f101:210:a4ff:fee3:9566]:user/repo.git', true],
			['git@github.com:org/suborg/repo.git', true],
			['git@github.com:user-name/repo-name.git', true],
			['git@github.com:user_name/repo_name.git', true],
			['git@github.com:user/repository', true],
			['git@github.enterprise.com:org-name/repo-name', true],
			['git@192.168.1.101:2222:user/repo', true],
			['git@ssh.dev.azure.com:v3/User/repo/directory', true],
			['ssh://git@mydomain.example:2224/gitolite-admin', true],
			['gituser@192.168.1.1:ABC/Repo4.git', true],
			['root@192.168.1.1/repo.git', true],
			['http://github.com/user/repository', false],
			['https://github.com/user/repository', false],
			['git@gitlab.com:something.net/n8n.git', true],
			['user.name@github.com:user/repository.git', true],
		])('%s -> %s', (url, isValid) => {
			expect(SOURCE_CONTROL_SSH_REPO_URL_REGEX.test(url)).toBe(isValid);
		});
	});

	describe('SOURCE_CONTROL_HTTPS_REPO_URL_REGEX', () => {
		test.each([
			['git@github.com:user/repository.git', false],
			['git@github.enterprise.com:org-name/repo-name.git', false],
			['http://github.com/user/repository', false],
			['https://github.com/user/repository.git', true],
		])('%s -> %s', (url, isValid) => {
			expect(SOURCE_CONTROL_HTTPS_REPO_URL_REGEX.test(url)).toBe(isValid);
		});
	});
});
