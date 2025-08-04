'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const simple_git_1 = require('simple-git');
const source_control_git_service_ee_1 = require('../source-control-git.service.ee');
const MOCK_BRANCHES = {
	all: ['origin/master', 'origin/feature/branch'],
	branches: {
		'origin/master': {},
		'origin/feature/branch': {},
	},
	current: 'master',
};
jest.mock('simple-git', () => {
	return {
		simpleGit: jest.fn().mockImplementation(() => ({
			branch: jest.fn().mockResolvedValue(MOCK_BRANCHES),
		})),
	};
});
describe('SourceControlGitService', () => {
	const sourceControlGitService = new source_control_git_service_ee_1.SourceControlGitService(
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
	);
	beforeAll(() => {
		sourceControlGitService.git = (0, simple_git_1.simpleGit)();
	});
	describe('getBranches', () => {
		it('should support branch names containing slashes', async () => {
			const branches = await sourceControlGitService.getBranches();
			expect(branches.branches).toEqual(['master', 'feature/branch']);
		});
	});
	describe('initRepository', () => {
		describe('when local repo is set up after remote is ready', () => {
			it('should track remote', async () => {
				const gitService = new source_control_git_service_ee_1.SourceControlGitService(
					(0, jest_mock_extended_1.mock)(),
					(0, jest_mock_extended_1.mock)(),
					(0, jest_mock_extended_1.mock)(),
				);
				const prefs = (0, jest_mock_extended_1.mock)({ branchName: 'main' });
				const user = (0, jest_mock_extended_1.mock)();
				const git = (0, jest_mock_extended_1.mock)();
				const checkoutSpy = jest.spyOn(git, 'checkout');
				const branchSpy = jest.spyOn(git, 'branch');
				gitService.git = git;
				jest.spyOn(gitService, 'setGitSshCommand').mockResolvedValue();
				jest
					.spyOn(gitService, 'getBranches')
					.mockResolvedValue({ currentBranch: '', branches: ['main'] });
				await gitService.initRepository(prefs, user);
				expect(checkoutSpy).toHaveBeenCalledWith('main');
				expect(branchSpy).toHaveBeenCalledWith(['--set-upstream-to=origin/main', 'main']);
			});
		});
	});
	describe('getFileContent', () => {
		it('should return file content at HEAD version', async () => {
			const filePath = 'workflows/12345.json';
			const expectedContent = '{"id":"12345","name":"Test Workflow"}';
			const git = (0, jest_mock_extended_1.mock)();
			const showSpy = jest.spyOn(git, 'show');
			showSpy.mockResolvedValue(expectedContent);
			sourceControlGitService.git = git;
			const content = await sourceControlGitService.getFileContent(filePath);
			expect(showSpy).toHaveBeenCalledWith([`HEAD:${filePath}`]);
			expect(content).toBe(expectedContent);
		});
		it('should return file content at specific commit', async () => {
			const filePath = 'workflows/12345.json';
			const commitHash = 'abc123';
			const expectedContent = '{"id":"12345","name":"Test Workflow"}';
			const git = (0, jest_mock_extended_1.mock)();
			const showSpy = jest.spyOn(git, 'show');
			showSpy.mockResolvedValue(expectedContent);
			sourceControlGitService.git = git;
			const content = await sourceControlGitService.getFileContent(filePath, commitHash);
			expect(showSpy).toHaveBeenCalledWith([`${commitHash}:${filePath}`]);
			expect(content).toBe(expectedContent);
		});
	});
});
//# sourceMappingURL=source-control-git.service.test.js.map
