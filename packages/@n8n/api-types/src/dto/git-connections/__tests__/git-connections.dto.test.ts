import { CreateGitConnectionDto, UpdateGitConnectionDto } from '../git-connections.dto';

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

	it('allows partial updates and rejects null branches', () => {
		expect(UpdateGitConnectionDto.safeParse({ name: 'Renamed' }).success).toBe(true);
		expect(UpdateGitConnectionDto.safeParse({ branchName: null }).success).toBe(false);
	});
});
