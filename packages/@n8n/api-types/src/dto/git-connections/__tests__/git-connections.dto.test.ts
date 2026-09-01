import {
	CreateGitConnectionDto,
	GitConnectionPushResultDto,
	PushGitConnectionDto,
	UpdateGitConnectionDto,
} from '../git-connections.dto';

describe('Git connection DTOs', () => {
	it('accepts SSH and HTTPS create payloads', () => {
		expect(
			CreateGitConnectionDto.safeParse({
				name: 'Deployments',
				repositoryUrl: 'git@example.com:org/repo.git',
				connectionType: 'ssh',
				keyGeneratorType: 'ed25519',
			}),
		).toMatchObject({ success: true });
		expect(
			CreateGitConnectionDto.safeParse({
				name: 'Deployments',
				repositoryUrl: 'https://example.com/org/repo.git',
				connectionType: 'https',
				username: 'git-user',
				password: 'secret',
			}),
		).toMatchObject({ success: true });
	});

	it('rejects empty names, branch names, and credentials', () => {
		const base = {
			name: 'Deployments',
			repositoryUrl: 'https://example.com/org/repo.git',
			connectionType: 'https' as const,
			username: 'git-user',
			password: 'secret',
		};
		expect(CreateGitConnectionDto.safeParse({ ...base, name: ' ' }).success).toBe(false);
		expect(CreateGitConnectionDto.safeParse({ ...base, branchName: '' }).success).toBe(false);
		expect(CreateGitConnectionDto.safeParse({ ...base, password: '' }).success).toBe(false);
	});

	it('caps branchName at the 255-char column width', () => {
		const base = {
			name: 'Deployments',
			repositoryUrl: 'https://example.com/org/repo.git',
			connectionType: 'https' as const,
			username: 'git-user',
			password: 'secret',
		};
		expect(CreateGitConnectionDto.safeParse({ ...base, branchName: 'a'.repeat(255) }).success).toBe(
			true,
		);
		expect(CreateGitConnectionDto.safeParse({ ...base, branchName: 'a'.repeat(256) }).success).toBe(
			false,
		);
	});

	it('allows partial updates and rejects null branches', () => {
		expect(UpdateGitConnectionDto.safeParse({ name: 'Renamed' }).success).toBe(true);
		expect(UpdateGitConnectionDto.safeParse({ branchName: null }).success).toBe(false);
	});

	it('accepts an optional createBranchOnPromotion flag on create and update', () => {
		expect(
			CreateGitConnectionDto.safeParse({
				name: 'Deployments',
				repositoryUrl: 'git@example.com:org/repo.git',
				connectionType: 'ssh',
				createBranchOnPromotion: true,
			}).success,
		).toBe(true);
		expect(UpdateGitConnectionDto.safeParse({ createBranchOnPromotion: false }).success).toBe(true);
		expect(UpdateGitConnectionDto.safeParse({ createBranchOnPromotion: 'yes' }).success).toBe(
			false,
		);
	});

	describe('PushGitConnectionDto', () => {
		it('requires a non-empty commit message', () => {
			expect(PushGitConnectionDto.safeParse({ commitMessage: 'Update projects' }).success).toBe(
				true,
			);
			expect(PushGitConnectionDto.safeParse({}).success).toBe(false);
			expect(PushGitConnectionDto.safeParse({ commitMessage: '' }).success).toBe(false);
			expect(PushGitConnectionDto.safeParse({ commitMessage: '   ' }).success).toBe(false);
		});

		it('accepts an optional force flag', () => {
			expect(PushGitConnectionDto.safeParse({ commitMessage: 'Update', force: true }).success).toBe(
				true,
			);
			expect(
				PushGitConnectionDto.safeParse({ commitMessage: 'Update', force: 'yes' }).success,
			).toBe(false);
		});

		it('rejects unknown fields', () => {
			expect(
				PushGitConnectionDto.safeParse({ commitMessage: 'Update', dryRun: true }).success,
			).toBe(false);
		});
	});

	describe('GitConnectionPushResultDto', () => {
		it('requires the branch name the push landed on', () => {
			const base = {
				connectionId: '1',
				counts: { workflows: 0, folders: 0, credentials: 0, dataTables: 0, variables: 0, tags: 0 },
				commitSha: 'abc123',
			};
			expect(GitConnectionPushResultDto.safeParse({ ...base, branchName: 'main' }).success).toBe(
				true,
			);
			expect(GitConnectionPushResultDto.safeParse(base).success).toBe(false);
		});
	});
});
