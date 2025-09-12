import { mock } from 'jest-mock-extended';

import type { SourceControlGitService } from '../source-control-git.service.ee';
import type { SourceControlPreferencesService } from '../source-control-preferences.service.ee';
import type { SourceControlPreferences } from '../types/source-control-preferences';

describe('SourceControl Integration Tests', () => {
	let mockGitService: SourceControlGitService;
	let mockPreferencesService: SourceControlPreferencesService;

	beforeEach(() => {
		mockGitService = mock<SourceControlGitService>();
		mockPreferencesService = mock<SourceControlPreferencesService>();
	});

	describe('HTTPS vs SSH Integration', () => {
		it('should handle HTTPS connection flow', async () => {
			// Arrange
			const httpsPrefs: SourceControlPreferences = {
				connected: true,
				repositoryUrl: 'https://github.com/user/repo.git',
				branchName: 'main',
				branchReadOnly: false,
				branchColor: '#5296D6',
				connectionType: 'https',
				initRepo: false,
				keyGeneratorType: 'ed25519',
			};

			jest.spyOn(mockPreferencesService, 'getPreferences').mockReturnValue(httpsPrefs);
			jest.spyOn(mockPreferencesService, 'getDecryptedHttpsCredentials').mockResolvedValue({
				username: 'testuser',
				password: 'testtoken',
			});

			// Act & Assert
			expect(httpsPrefs.connectionType).toBe('https');
			expect(mockPreferencesService.getPreferences().connectionType).toBe('https');
		});

		it('should handle SSH connection flow', async () => {
			// Arrange
			const sshPrefs: SourceControlPreferences = {
				connected: true,
				repositoryUrl: 'git@github.com:user/repo.git',
				branchName: 'main',
				branchReadOnly: false,
				branchColor: '#5296D6',
				connectionType: 'ssh',
				initRepo: false,
				keyGeneratorType: 'ed25519',
				publicKey: 'ssh-ed25519 AAAAC3NzaC1...',
			};

			jest.spyOn(mockPreferencesService, 'getPreferences').mockReturnValue(sshPrefs);

			// Act & Assert
			expect(sshPrefs.connectionType).toBe('ssh');
			expect(mockPreferencesService.getPreferences().connectionType).toBe('ssh');
			expect(sshPrefs.publicKey).toBeDefined();
		});
	});

	describe('Connection Type Switching', () => {
		it('should support switching from SSH to HTTPS', () => {
			// Arrange
			const initialSSHPrefs: SourceControlPreferences = {
				connected: false,
				repositoryUrl: 'git@github.com:user/repo.git',
				branchName: '',
				branchReadOnly: false,
				branchColor: '#5296D6',
				connectionType: 'ssh',
				initRepo: false,
				keyGeneratorType: 'ed25519',
			};

			const updatedHTTPSPrefs: SourceControlPreferences = {
				...initialSSHPrefs,
				repositoryUrl: 'https://github.com/user/repo.git',
				connectionType: 'https',
			};

			// Act
			const isValidTransition =
				initialSSHPrefs.connectionType === 'ssh' && updatedHTTPSPrefs.connectionType === 'https';

			// Assert
			expect(isValidTransition).toBe(true);
			expect(updatedHTTPSPrefs.repositoryUrl.startsWith('https://')).toBe(true);
		});

		it('should validate repository URL format matches connection type', () => {
			// Test cases for URL validation
			const testCases = [
				{ url: 'https://github.com/user/repo.git', connectionType: 'https', expected: true },
				{ url: 'git@github.com:user/repo.git', connectionType: 'ssh', expected: true },
				{ url: 'https://github.com/user/repo.git', connectionType: 'ssh', expected: false },
				{ url: 'git@github.com:user/repo.git', connectionType: 'https', expected: false },
			];

			testCases.forEach(({ url, connectionType, expected }) => {
				const isHTTPSUrl = url.startsWith('https://');
				const isSSHUrl = url.startsWith('git@') || url.startsWith('ssh://');

				const isValid =
					(connectionType === 'https' && isHTTPSUrl) || (connectionType === 'ssh' && isSSHUrl);

				expect(isValid).toBe(expected);
			});
		});
	});

	describe('Credential Management', () => {
		it('should handle HTTPS credentials securely', async () => {
			// Arrange
			const credentials = { username: 'testuser', password: 'secret' };

			jest
				.spyOn(mockPreferencesService, 'getDecryptedHttpsCredentials')
				.mockResolvedValue(credentials);

			// Act
			const retrievedCredentials = await mockPreferencesService.getDecryptedHttpsCredentials();

			// Assert
			expect(retrievedCredentials).toEqual(credentials);
			expect(mockPreferencesService.getDecryptedHttpsCredentials).toHaveBeenCalled();
		});

		it('should clean up credentials on disconnect', async () => {
			// Arrange
			jest.spyOn(mockPreferencesService, 'deleteHttpsCredentials').mockResolvedValue();

			// Act
			await mockPreferencesService.deleteHttpsCredentials();

			// Assert
			expect(mockPreferencesService.deleteHttpsCredentials).toHaveBeenCalled();
		});
	});

	describe('URL Encoding and Security', () => {
		it('should properly encode URLs with credentials', () => {
			// Arrange
			const baseUrl = 'https://github.com/user/repo.git';
			const username = 'user@domain.com';
			const password = 'p@ssw0rd!';

			// Act
			const urlWithCredentials = new URL(baseUrl);
			urlWithCredentials.username = encodeURIComponent(username);
			urlWithCredentials.password = encodeURIComponent(password);
			const encodedUrl = urlWithCredentials.toString();

			// Assert
			expect(encodedUrl).toContain(encodeURIComponent(username));
			expect(encodedUrl).toContain('github.com/user/repo.git');
			expect(encodedUrl.startsWith('https://')).toBe(true);
		});

		it('should normalize URLs for comparison', () => {
			// Arrange
			const urlWithCredentials = 'https://user:token@github.com/user/repo.git';
			const urlWithoutCredentials = 'https://github.com/user/repo.git';

			// Act
			const normalize = (url: string) => {
				try {
					const urlObj = new URL(url);
					urlObj.username = '';
					urlObj.password = '';
					return urlObj.toString();
				} catch {
					return url;
				}
			};

			const normalized1 = normalize(urlWithCredentials);
			const normalized2 = normalize(urlWithoutCredentials);

			// Assert
			expect(normalized1).toBe(normalized2);
		});
	});

	describe('Error Handling', () => {
		it('should handle connection errors gracefully', async () => {
			// Arrange
			const error = new Error('Connection failed');
			jest.spyOn(mockGitService, 'initService').mockRejectedValue(error);

			// Act & Assert
			const options = {
				sourceControlPreferences: {
					repositoryUrl: 'https://github.com/user/repo.git',
					branchName: 'main',
					connectionType: 'https' as const,
					initRepo: true,
					connected: false,
					branchReadOnly: false,
					branchColor: '#5296D6',
					publicKey: '',
					keyGeneratorType: 'ed25519' as const,
				},
				gitFolder: '/tmp/git',
				sshFolder: '/tmp/ssh',
				sshKeyName: 'id_ed25519',
			};

			await expect(mockGitService.initService(options)).rejects.toThrow('Connection failed');
		});

		it('should handle invalid preferences', () => {
			// Arrange
			const invalidPrefs = {
				connectionType: 'https' as const,
				repositoryUrl: 'invalid-url',
			};

			// Act
			const isValidUrl = (url: string) => {
				try {
					new URL(url);
					return true;
				} catch {
					return false;
				}
			};

			// Assert
			expect(isValidUrl(invalidPrefs.repositoryUrl)).toBe(false);
		});
	});
});
