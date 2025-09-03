import { mock } from 'jest-mock-extended';

import { SourceControlService } from '../source-control.service.ee';
import type { SourceControlGitService } from '../source-control-git.service.ee';
import type { SourceControlPreferencesService } from '../source-control-preferences.service.ee';
import type { SourceControlExportService } from '../source-control-export.service.ee';
import type { SourceControlPreferences } from '../types/source-control-preferences';

describe('SourceControlService - disconnect functionality', () => {
	let sourceControlService: SourceControlService;
	let mockGitService: SourceControlGitService;
	let mockPreferencesService: SourceControlPreferencesService;
	let mockExportService: SourceControlExportService;

	beforeEach(() => {
		mockGitService = mock<SourceControlGitService>();
		mockPreferencesService = mock<SourceControlPreferencesService>();
		mockExportService = mock<SourceControlExportService>();

		sourceControlService = new SourceControlService(
			mock(),
			mockGitService,
			mockPreferencesService,
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
		);

		(sourceControlService as any).sourceControlExportService = mockExportService;
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('disconnect', () => {
		it('should clean up HTTPS credentials when connection type is HTTPS', async () => {
			// Arrange
			const httpsPreferences: SourceControlPreferences = {
				connectionType: 'https' as const,
				repositoryUrl: 'https://github.com/user/repo.git',
				connected: true,
				branchName: 'main',
				branchReadOnly: false,
				branchColor: '#5296D6',
				publicKey: '',
				initRepo: false,
				keyGeneratorType: 'ed25519',
			};

			jest.spyOn(mockPreferencesService, 'getPreferences').mockReturnValue(httpsPreferences);
			jest.spyOn(mockPreferencesService, 'setPreferences').mockResolvedValue({} as any);
			mockPreferencesService.deleteHttpsCredentials = jest.fn().mockResolvedValue(undefined);
			jest.spyOn(mockExportService, 'deleteRepositoryFolder').mockResolvedValue(undefined);

			await sourceControlService.disconnect();

			expect(mockPreferencesService.deleteHttpsCredentials).toHaveBeenCalled();
			expect(mockPreferencesService.setPreferences).toHaveBeenCalledWith({
				connected: false,
				branchName: '',
				connectionType: 'ssh',
			});
			expect(mockExportService.deleteRepositoryFolder).toHaveBeenCalled();
			expect(mockGitService.resetService).toHaveBeenCalled();
		});

		it('should clean up SSH key pair when connection type is SSH and keepKeyPair is false', async () => {
			const sshPreferences: SourceControlPreferences = {
				connectionType: 'ssh' as const,
				repositoryUrl: 'git@github.com:user/repo.git',
				connected: true,
				branchName: 'main',
				branchReadOnly: false,
				branchColor: '#5296D6',
				publicKey: '',
				initRepo: false,
				keyGeneratorType: 'ed25519',
			};

			jest.spyOn(mockPreferencesService, 'getPreferences').mockReturnValue(sshPreferences);
			jest.spyOn(mockPreferencesService, 'setPreferences').mockResolvedValue({} as any);
			mockPreferencesService.deleteKeyPair = jest.fn().mockResolvedValue(undefined);
			jest.spyOn(mockExportService, 'deleteRepositoryFolder').mockResolvedValue(undefined);

			await sourceControlService.disconnect({ keepKeyPair: false });

			expect(mockPreferencesService.deleteKeyPair).toHaveBeenCalled();
			expect(mockPreferencesService.setPreferences).toHaveBeenCalledWith({
				connected: false,
				branchName: '',
				connectionType: 'ssh',
			});
			expect(mockExportService.deleteRepositoryFolder).toHaveBeenCalled();
			expect(mockGitService.resetService).toHaveBeenCalled();
		});

		it('should keep SSH key pair when connection type is SSH and keepKeyPair is true', async () => {
			const sshPreferences: SourceControlPreferences = {
				connectionType: 'ssh' as const,
				repositoryUrl: 'git@github.com:user/repo.git',
				connected: true,
				branchName: 'main',
				branchReadOnly: false,
				branchColor: '#5296D6',
				publicKey: '',
				initRepo: false,
				keyGeneratorType: 'ed25519',
			};

			jest.spyOn(mockPreferencesService, 'getPreferences').mockReturnValue(sshPreferences);
			jest.spyOn(mockPreferencesService, 'setPreferences').mockResolvedValue({} as any);
			mockPreferencesService.deleteKeyPair = jest.fn().mockResolvedValue(undefined);
			jest.spyOn(mockExportService, 'deleteRepositoryFolder').mockResolvedValue(undefined);

			await sourceControlService.disconnect({ keepKeyPair: true });

			expect(mockPreferencesService.deleteKeyPair).not.toHaveBeenCalled();
			expect(mockPreferencesService.setPreferences).toHaveBeenCalledWith({
				connected: false,
				branchName: '',
				connectionType: 'ssh',
			});
			expect(mockExportService.deleteRepositoryFolder).toHaveBeenCalled();
			expect(mockGitService.resetService).toHaveBeenCalled();
		});

		it('should not delete SSH keys when connection type is HTTPS', async () => {
			const httpsPreferences: SourceControlPreferences = {
				connectionType: 'https' as const,
				repositoryUrl: 'https://github.com/user/repo.git',
				connected: true,
				branchName: 'main',
				branchReadOnly: false,
				branchColor: '#5296D6',
				publicKey: '',
				initRepo: false,
				keyGeneratorType: 'ed25519',
			};

			jest.spyOn(mockPreferencesService, 'getPreferences').mockReturnValue(httpsPreferences);
			jest.spyOn(mockPreferencesService, 'setPreferences').mockResolvedValue({} as any);
			mockPreferencesService.deleteHttpsCredentials = jest.fn().mockResolvedValue(undefined);
			mockPreferencesService.deleteKeyPair = jest.fn().mockResolvedValue(undefined);
			jest.spyOn(mockExportService, 'deleteRepositoryFolder').mockResolvedValue(undefined);

			await sourceControlService.disconnect({ keepKeyPair: false });

			expect(mockPreferencesService.deleteKeyPair).not.toHaveBeenCalled();
			expect(mockPreferencesService.deleteHttpsCredentials).toHaveBeenCalled();
		});

		it('should handle errors during disconnect gracefully', async () => {
			const httpsPreferences: SourceControlPreferences = {
				connectionType: 'https' as const,
				repositoryUrl: 'https://github.com/user/repo.git',
				connected: true,
				branchName: 'main',
				branchReadOnly: false,
				branchColor: '#5296D6',
				publicKey: '',
				initRepo: false,
				keyGeneratorType: 'ed25519',
			};

			jest.spyOn(mockPreferencesService, 'getPreferences').mockReturnValue(httpsPreferences);
			jest.spyOn(mockPreferencesService, 'setPreferences').mockRejectedValue(new Error('DB error'));

			await expect(sourceControlService.disconnect()).rejects.toThrow(
				'Failed to disconnect from source control',
			);
		});

		it('should reset connection type to SSH by default', async () => {
			const httpsPreferences: SourceControlPreferences = {
				connectionType: 'https' as const,
				repositoryUrl: 'https://github.com/user/repo.git',
				connected: true,
				branchName: 'main',
				branchReadOnly: false,
				branchColor: '#5296D6',
				publicKey: '',
				initRepo: false,
				keyGeneratorType: 'ed25519',
			};

			jest.spyOn(mockPreferencesService, 'getPreferences').mockReturnValue(httpsPreferences);
			jest.spyOn(mockPreferencesService, 'setPreferences').mockResolvedValue({} as any);
			mockPreferencesService.deleteHttpsCredentials = jest.fn().mockResolvedValue(undefined);
			jest.spyOn(mockExportService, 'deleteRepositoryFolder').mockResolvedValue(undefined);

			await sourceControlService.disconnect();

			expect(mockPreferencesService.setPreferences).toHaveBeenCalledWith({
				connected: false,
				branchName: '',
				connectionType: 'ssh',
			});
		});
	});
});
