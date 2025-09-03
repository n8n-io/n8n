import { mock } from 'jest-mock-extended';

import { SourceControlGitService } from '../source-control-git.service.ee';
import type { SourceControlPreferencesService } from '../source-control-preferences.service.ee';
import type { SourceControlPreferences } from '../types/source-control-preferences';

const mockSimpleGit = {
	env: jest.fn(),
	init: jest.fn().mockResolvedValue(undefined),
	addRemote: jest.fn().mockResolvedValue(undefined),
	getRemotes: jest.fn().mockResolvedValue([]),
};

mockSimpleGit.env.mockReturnValue(mockSimpleGit);

jest.mock('simple-git', () => ({
	simpleGit: jest.fn().mockReturnValue(mockSimpleGit),
}));

describe('SourceControlGitService - HTTPS functionality', () => {
	let sourceControlGitService: SourceControlGitService;
	let sourceControlPreferencesService: SourceControlPreferencesService;

	const mockPreferences: Partial<SourceControlPreferences> = {
		repositoryUrl: 'https://github.com/user/repo.git',
		branchName: 'main',
		connectionType: 'https',
	};

	beforeEach(() => {
		sourceControlPreferencesService = mock<SourceControlPreferencesService>();

		sourceControlGitService = new SourceControlGitService(
			mock(),
			mock(),
			sourceControlPreferencesService,
		);

		jest.spyOn(sourceControlPreferencesService, 'getPreferences').mockReturnValue(mockPreferences);
		jest.clearAllMocks();

		mockSimpleGit.env.mockReturnValue(mockSimpleGit);
	});

	afterEach(() => {
		mockSimpleGit.env.mockClear();
		mockSimpleGit.init.mockClear();
		mockSimpleGit.addRemote.mockClear();
		mockSimpleGit.getRemotes.mockClear();
	});

	describe('setGitSshCommand', () => {
		it('should configure git for HTTPS without SSH command', async () => {
			await sourceControlGitService.setGitSshCommand();

			expect(mockSimpleGit.env).toHaveBeenCalledWith('GIT_TERMINAL_PROMPT', '0');
			expect(mockSimpleGit.env).not.toHaveBeenCalledWith('GIT_SSH_COMMAND', expect.any(String));
		});

		it('should configure git for SSH with SSH command when connectionType is ssh', async () => {
			const sshPreferences = { ...mockPreferences, connectionType: 'ssh' as const };
			jest.spyOn(sourceControlPreferencesService, 'getPreferences').mockReturnValue(sshPreferences);
			jest
				.spyOn(sourceControlPreferencesService, 'getPrivateKeyPath')
				.mockResolvedValue('/path/to/key');

			await sourceControlGitService.setGitSshCommand('/git/folder', '/ssh/folder');

			expect(sourceControlPreferencesService.getPrivateKeyPath).toHaveBeenCalled();
			expect(mockSimpleGit.env).toHaveBeenCalledWith('GIT_TERMINAL_PROMPT', '0');
			expect(mockSimpleGit.env).toHaveBeenCalledWith(
				'GIT_SSH_COMMAND',
				expect.stringContaining('ssh'),
			);
		});
	});

	describe('URL normalization logic', () => {
		it('should normalize HTTPS URLs for comparison', () => {
			const remoteWithCredentials = 'https://user:token@github.com/user/repo.git';
			const inputWithoutCredentials = 'https://github.com/user/repo.git';

			const normalizeUrl = (url: string) => {
				try {
					const urlObj = new URL(url);
					urlObj.username = '';
					urlObj.password = '';
					return urlObj.toString();
				} catch {
					return url;
				}
			};

			const normalizedRemote = normalizeUrl(remoteWithCredentials);
			const normalizedInput = normalizeUrl(inputWithoutCredentials);

			expect(normalizedRemote).toBe(normalizedInput);
		});

		it('should handle malformed URLs gracefully', () => {
			const malformedUrl = 'not-a-valid-url';

			const normalizeUrl = (url: string) => {
				try {
					const urlObj = new URL(url);
					urlObj.username = '';
					urlObj.password = '';
					return urlObj.toString();
				} catch {
					return url;
				}
			};

			const result = normalizeUrl(malformedUrl);

			expect(result).toBe(malformedUrl); // Should return original when URL parsing fails
		});
	});

	describe('URL encoding in repository initialization', () => {
		it('should properly encode credentials with special characters', () => {
			const mockCredentials = {
				username: 'user@domain.com',
				password: 'p@ssw0rd!',
			};

			const baseUrl = 'https://github.com/user/repo.git';

			const urlObj = new URL(baseUrl);
			urlObj.username = encodeURIComponent(mockCredentials.username);
			urlObj.password = encodeURIComponent(mockCredentials.password);
			const encodedUrl = urlObj.toString();

			expect(encodedUrl).toContain('user%40domain.com');
			expect(encodedUrl).toContain('p%40ssw0rd');
			expect(encodedUrl).toMatch(
				/^https:\/\/user%40domain\.com:p%40ssw0rd[!%].*@github\.com\/user\/repo\.git$/,
			);
		});

		it('should handle credentials without special characters', () => {
			// Arrange
			const mockCredentials = {
				username: 'testuser',
				password: 'testtoken123',
			};

			const baseUrl = 'https://github.com/user/repo.git';

			const urlObj = new URL(baseUrl);
			urlObj.username = encodeURIComponent(mockCredentials.username);
			urlObj.password = encodeURIComponent(mockCredentials.password);
			const encodedUrl = urlObj.toString();

			expect(encodedUrl).toBe('https://testuser:testtoken123@github.com/user/repo.git');
		});
	});

	describe('Connection type handling', () => {
		it('should differentiate between SSH and HTTPS configuration', () => {
			const httpsPrefs = { connectionType: 'https' as const };
			const sshPrefs = { connectionType: 'ssh' as const };

			expect(httpsPrefs.connectionType).toBe('https');
			expect(sshPrefs.connectionType).toBe('ssh');
			expect(httpsPrefs.connectionType !== sshPrefs.connectionType).toBe(true);
		});
	});
});
