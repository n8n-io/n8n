import { gitlabProjectPath } from '../gitlab-project-path';

describe('gitlabProjectPath', () => {
	it('strips the host, a base URL subpath, and the .git suffix', () => {
		expect(
			gitlabProjectPath(
				'https://gitlab.example.com/gitlab/platform/sub/api.git',
				'https://gitlab.example.com/gitlab',
			),
		).toBe('platform/sub/api');
		expect(
			gitlabProjectPath(
				'https://gitlab.example.com/platform/api.git',
				'https://gitlab.example.com/',
			),
		).toBe('platform/api');
	});

	it('keeps the full path when the remote does not sit under the base URL subpath', () => {
		expect(
			gitlabProjectPath(
				'https://gitlab.example.com/platform/api.git',
				'https://gitlab.example.com/gitlab',
			),
		).toBe('platform/api');
	});

	it('reads an scp-like SSH remote', () => {
		expect(
			gitlabProjectPath('git@gitlab.example.com:platform/api.git', 'https://gitlab.example.com'),
		).toBe('platform/api');
	});

	it('rejects a remote without a namespace', () => {
		expect(() =>
			gitlabProjectPath('https://gitlab.example.com/api.git', 'https://gitlab.example.com'),
		).toThrow('does not name a GitLab project path');
	});
});
