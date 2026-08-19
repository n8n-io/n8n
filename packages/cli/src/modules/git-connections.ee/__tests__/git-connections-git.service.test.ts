import { mockLogger } from '@n8n/backend-test-utils';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { GitConnectionsGitService } from '../git-connections-git.service';

describe('GitConnectionsGitService', () => {
	const service = new GitConnectionsGitService(mockLogger());

	describe('validateRepositoryUrl (https)', () => {
		it('accepts an https URL without embedded credentials', () => {
			expect(() =>
				service.validateRepositoryUrl('https://github.com/org/repo.git', 'https'),
			).not.toThrow();
		});

		it('accepts http URLs (internal Git / Gitea on a trusted network)', () => {
			expect(() =>
				service.validateRepositoryUrl('http://gitea.internal/org/repo.git', 'https'),
			).not.toThrow();
		});

		it('rejects a URL that embeds credentials', () => {
			expect(() =>
				service.validateRepositoryUrl('https://user:pass@github.com/org/repo.git', 'https'),
			).toThrow(BadRequestError);
		});

		it('rejects a non-URL string', () => {
			expect(() => service.validateRepositoryUrl('not a url', 'https')).toThrow(BadRequestError);
		});
	});

	describe('control characters', () => {
		it.each([
			['tab', 'https://github.com/org/re\tpo.git'],
			['carriage return', 'https://github.com/org/re\rpo.git'],
			['newline', 'https://github.com/org/re\npo.git'],
		])('rejects an https URL containing a %s', (_label, url) => {
			expect(() => service.validateRepositoryUrl(url, 'https')).toThrow(BadRequestError);
		});

		it.each([
			['tab', 'git@github.com:org/re\tpo.git'],
			['carriage return', 'git@github.com:org/re\rpo.git'],
			['newline', 'git@github.com:org/re\npo.git'],
		])('rejects an ssh URL containing a %s', (_label, url) => {
			expect(() => service.validateRepositoryUrl(url, 'ssh')).toThrow(BadRequestError);
		});
	});

	describe('validateRepositoryUrl (ssh)', () => {
		it.each([
			'ssh://git@github.com/org/repo.git',
			'ssh://git@github.com:22/org/repo.git',
			'git@github.com:org/repo.git',
			'github.com:org/repo.git',
		])('accepts %s', (url) => {
			expect(() => service.validateRepositoryUrl(url, 'ssh')).not.toThrow();
		});

		it.each([
			['ext:: transport (command execution)', 'ext::sh -c "id"'],
			['file:// scheme (local repo disclosure)', 'file:///srv/private-repo'],
			['http:// scheme', 'http://github.com/org/repo.git'],
			['git:// scheme', 'git://github.com/org/repo.git'],
			['leading dash (option injection)', '--upload-pack=/tmp/x'],
			['host starting with a dash', 'user@-oProxyCommand=evil:path'],
			['bare ssh:// with no path', 'ssh://github.com'],
			['ssh:// with a password in the userinfo', 'ssh://git:secret@github.com/org/repo.git'],
		])('rejects %s', (_label, url) => {
			expect(() => service.validateRepositoryUrl(url, 'ssh')).toThrow(BadRequestError);
		});

		describe('drive-letter prefixes', () => {
			const originalPlatform = process.platform;

			const setPlatform = (platform: NodeJS.Platform) => {
				Object.defineProperty(process, 'platform', { value: platform, configurable: true });
			};

			afterEach(() => {
				setPlatform(originalPlatform);
			});

			// git reads `C:\path` / `C:/path` as a local filesystem path only on
			// Windows, where allowing it would clone off the host's disk.
			it.each(['C:/Users/n8n/repo', 'C:\\Users\\n8n\\repo', 'c:repo'])(
				'rejects %s on Windows',
				(url) => {
					setPlatform('win32');
					expect(() => service.validateRepositoryUrl(url, 'ssh')).toThrow(BadRequestError);
				},
			);

			// On other platforms git treats `c:path` as a scp-like remote to a
			// one-character host, which is a legitimate SSH alias.
			it.each(['C:/Users/n8n/repo', 'c:repo'])('accepts %s on non-Windows', (url) => {
				setPlatform('linux');
				expect(() => service.validateRepositoryUrl(url, 'ssh')).not.toThrow();
			});
		});
	});
});
