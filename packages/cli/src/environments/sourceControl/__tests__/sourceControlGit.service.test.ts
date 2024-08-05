import { SourceControlGitService } from '@/environments/sourceControl/sourceControlGit.service.ee';
import { mock } from 'jest-mock-extended';
import type { SourceControlPreferences } from '@/environments/sourceControl/types/sourceControlPreferences';
import type { User } from '@/databases/entities/User';
import type { SimpleGit } from 'simple-git';

describe('GitService', () => {
	describe('initRepository', () => {
		describe('when local repo is set up after remote is ready', () => {
			it('should track remote', async () => {
				/**
				 * Arrange
				 */
				const gitService = new SourceControlGitService(mock(), mock(), mock());
				const prefs = mock<SourceControlPreferences>({ branchName: 'main' });
				const user = mock<User>();
				const git = mock<SimpleGit>();
				const checkoutSpy = jest.spyOn(git, 'checkout');
				const branchSpy = jest.spyOn(git, 'branch');
				gitService.git = git;
				jest.spyOn(gitService, 'setGitSshCommand').mockResolvedValue();
				jest
					.spyOn(gitService, 'getBranches')
					.mockResolvedValue({ currentBranch: '', branches: ['main'] });

				/**
				 * Act
				 */
				await gitService.initRepository(prefs, user);

				/**
				 * Assert
				 */
				expect(checkoutSpy).toHaveBeenCalledWith('main');
				expect(branchSpy).toHaveBeenCalledWith(['--set-upstream-to=origin/main', 'main']);
			});
		});
	});
});
