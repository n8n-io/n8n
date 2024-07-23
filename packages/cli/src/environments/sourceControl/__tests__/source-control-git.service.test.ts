import { mock } from 'jest-mock-extended';
import { SourceControlGitService } from '../sourceControlGit.service.ee';
import { simpleGit } from 'simple-git';

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
	const sourceControlGitService = new SourceControlGitService(mock(), mock(), mock());

	beforeAll(() => {
		sourceControlGitService.git = simpleGit();
	});

	describe('getBranches', () => {
		it('should support branch names containing slashes', async () => {
			const branches = await sourceControlGitService.getBranches();
			expect(branches.branches).toEqual(['master', 'feature/branch']);
		});
	});
});
