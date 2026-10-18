import type { OperationContext, TransactionRunner } from '@n8n/db';
import { ConflictError, UserError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { SkillGitLink } from '../../../entities/skill-git-link.entity';
import type { SkillGitUpdate } from '../../../entities/skill-git-update.entity';
import type { SkillGitRepository } from '../../../repositories/skill-git.repository';
import type { ResolvedSkillRow, SkillRepository } from '../../../repositories/skill.repository';
import { skillContentHash, type SkillContent } from '../../skill-content-hash';
import type { SkillService } from '../../skill.service';
import { GitHubReadError, type GitHubClient } from '../github-client';
import { SkillGitSyncService } from '../skill-git-sync.service';

const OLD = 'a'.repeat(40);
const NEW = 'b'.repeat(40);
const TX: OperationContext = { trx: mock() };
const SKILL_MD = '---\nname: notes\ndescription: Writes notes.\n---\nWrite notes.';

const link = (fields: Partial<SkillGitLink> = {}) =>
	({
		skillId: 'skill_a',
		owner: 'acme',
		repo: 'skills',
		ref: 'main',
		refType: 'branch',
		path: 'notes',
		syncedCommitSha: OLD,
		seenCommitSha: OLD,
		seenTreeSha: 'tree-old',
		status: 'ok',
		lastError: null,
		lastCheckedAt: null,
		...fields,
	}) as SkillGitLink;

const content = (instructions: string): SkillContent => ({
	name: 'notes',
	description: 'Writes notes.',
	instructions,
	frontmatter: null,
	files: [],
});

describe('SkillGitSyncService', () => {
	const client = mock<GitHubClient>();
	const gitRepository = mock<SkillGitRepository>();
	const skillRepository = mock<SkillRepository>();
	const skillService = mock<SkillService>();
	const txRunner = mock<TransactionRunner>();
	const service = new SkillGitSyncService(
		mock(),
		client,
		gitRepository,
		skillRepository,
		skillService,
		txRunner,
	);

	const givenLatest = (instructions: string) =>
		skillRepository.findLatestSaved.mockResolvedValue(
			new Map([
				[
					'skill_a',
					mock<ResolvedSkillRow>({
						version: { version: 2, contentHash: skillContentHash(content(instructions)) },
					}),
				],
			]),
		);

	const givenBranchAt = (sha: string, folderTree: string | undefined, skillMd = SKILL_MD) => {
		client.commit.mockResolvedValue({
			sha,
			treeSha: 'root',
			message: 'Edit notes',
			author: 'ada',
			date: null,
		});
		client.tree.mockResolvedValue({
			entries: folderTree
				? [
						{ path: 'notes', type: 'tree', sha: folderTree },
						{ path: 'notes/SKILL.md', type: 'blob', sha: 'x', size: 10 },
					]
				: [],
			truncated: false,
		});
		client.file.mockResolvedValue(skillMd);
	};

	beforeEach(() => {
		vi.resetAllMocks();
		txRunner.run.mockImplementation(async (_ctx, fn) => await fn(TX));
	});

	describe('checkSkill', () => {
		it('only records the check when the branch did not move', async () => {
			gitRepository.findLink.mockResolvedValue(link());
			givenBranchAt(OLD, 'tree-old');

			await service.checkSkill('skill_a');

			expect(client.tree).not.toHaveBeenCalled();
			expect(gitRepository.updateLink).toHaveBeenCalledWith('skill_a', {
				status: 'ok',
				lastError: null,
				lastCheckedAt: expect.any(Date),
			});
		});

		it('moves on without reading files when the folder did not change', async () => {
			gitRepository.findLink.mockResolvedValue(link());
			givenBranchAt(NEW, 'tree-old');

			await service.checkSkill('skill_a');

			expect(client.file).not.toHaveBeenCalled();
			expect(gitRepository.updateLink).toHaveBeenCalledWith(
				'skill_a',
				expect.objectContaining({ seenCommitSha: NEW, seenTreeSha: 'tree-old', status: 'ok' }),
			);
			expect(gitRepository.upsertUpdate).not.toHaveBeenCalled();
		});

		it('stores an update when the folder has new content', async () => {
			gitRepository.findLink.mockResolvedValue(link());
			givenBranchAt(NEW, 'tree-new');
			givenLatest('Older notes.');

			await service.checkSkill('skill_a');

			expect(gitRepository.upsertUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					skillId: 'skill_a',
					fromCommitSha: OLD,
					toCommitSha: NEW,
					status: 'pending',
					content: content('Write notes.'),
					checkResult: { result: 'passed', findings: [] },
				}),
				TX,
			);
			expect(gitRepository.updateLink).toHaveBeenCalledWith(
				'skill_a',
				expect.objectContaining({ seenCommitSha: NEW, seenTreeSha: 'tree-new' }),
				TX,
			);
		});

		it('stores a blocked update for content that fails the check', async () => {
			gitRepository.findLink.mockResolvedValue(link());
			givenBranchAt(NEW, 'tree-new', SKILL_MD.replace('Write', 'Wri\u200Bte'));
			givenLatest('Older notes.');

			await service.checkSkill('skill_a');

			expect(gitRepository.upsertUpdate).toHaveBeenCalledWith(
				expect.objectContaining({ status: 'blocked' }),
				TX,
			);
		});

		it('creates no update when the content matches the latest version', async () => {
			gitRepository.findLink.mockResolvedValue(link());
			givenBranchAt(NEW, 'tree-new');
			givenLatest('Write notes.');

			await service.checkSkill('skill_a');

			expect(gitRepository.upsertUpdate).not.toHaveBeenCalled();
			expect(gitRepository.deleteUpdate).toHaveBeenCalledWith('skill_a', TX);
			expect(gitRepository.updateLink).toHaveBeenCalledWith(
				'skill_a',
				expect.objectContaining({ syncedCommitSha: NEW, seenCommitSha: NEW }),
				TX,
			);
		});

		it('marks the source unavailable when the folder is gone', async () => {
			gitRepository.findLink.mockResolvedValue(link());
			givenBranchAt(NEW, undefined);

			await service.checkSkill('skill_a');

			expect(gitRepository.updateLink).toHaveBeenCalledWith(
				'skill_a',
				expect.objectContaining({ status: 'unavailable' }),
			);
		});

		it('records a rate limit', async () => {
			gitRepository.findLink.mockResolvedValue(link());
			client.commit.mockRejectedValue(new GitHubReadError('rate_limited', 'Slow down'));

			await service.checkSkill('skill_a');

			expect(gitRepository.updateLink).toHaveBeenCalledWith(
				'skill_a',
				expect.objectContaining({ status: 'rate_limited', lastError: 'Slow down' }),
			);
		});

		it('does not check a skill imported from a tag', async () => {
			gitRepository.findLink.mockResolvedValue(link({ refType: 'tag', ref: 'v1' }));

			await service.checkSkill('skill_a');

			expect(client.commit).not.toHaveBeenCalled();
		});
	});

	describe('accept', () => {
		const update = (fields: Partial<SkillGitUpdate> = {}) =>
			({
				skillId: 'skill_a',
				toCommitSha: NEW,
				status: 'pending',
				content: { ...content('New.'), frontmatter: { license: 'MIT' } },
				checkResult: { result: 'passed', findings: [] },
				...fields,
			}) as SkillGitUpdate;

		it('saves the update as the next version with its commit, then clears it', async () => {
			gitRepository.findUpdate.mockResolvedValue(update());
			skillService.saveFromGitHub.mockResolvedValue({
				versionId: 'v3',
				version: 3,
				created: true,
				skill: mock(),
				followingAgentIds: ['agent-1'],
			});

			await expect(service.accept('skill_a', NEW, false, 'user-1')).resolves.toEqual({
				version: 3,
				created: true,
			});

			expect(skillService.saveFromGitHub).toHaveBeenCalledWith(
				'skill_a',
				{ name: 'notes', description: 'Writes notes.', instructions: 'New.' },
				{ commitSha: NEW, frontmatter: { license: 'MIT' } },
				'user-1',
				TX,
			);
			expect(gitRepository.updateLink).toHaveBeenCalledWith(
				'skill_a',
				{ syncedCommitSha: NEW },
				TX,
			);
			expect(gitRepository.deleteUpdate).toHaveBeenCalledWith('skill_a', TX);
			expect(skillService.refreshFollowingAgents).toHaveBeenCalledWith(['agent-1']);
		});

		it('refuses an update that is not the one the user reviewed', async () => {
			gitRepository.findUpdate.mockResolvedValue(update({ toCommitSha: 'c'.repeat(40) }));
			await expect(service.accept('skill_a', NEW, false, 'user-1')).rejects.toThrow(ConflictError);
		});

		it('refuses a blocked update', async () => {
			gitRepository.findUpdate.mockResolvedValue(update({ status: 'blocked' }));
			await expect(service.accept('skill_a', NEW, true, 'user-1')).rejects.toThrow(UserError);
		});

		it('needs the warnings confirmed', async () => {
			gitRepository.findUpdate.mockResolvedValue(
				update({ checkResult: { result: 'review', findings: [] } }),
			);
			await expect(service.accept('skill_a', NEW, false, 'user-1')).rejects.toThrow(
				'Confirm that you reviewed the warnings.',
			);
			expect(skillService.saveFromGitHub).not.toHaveBeenCalled();
		});
	});

	describe('skip', () => {
		it('drops the update that waits', async () => {
			gitRepository.findUpdate.mockResolvedValue(mock<SkillGitUpdate>({ toCommitSha: NEW }));
			await service.skip('skill_a', NEW);
			expect(gitRepository.deleteUpdate).toHaveBeenCalledWith('skill_a');
		});
	});
});
