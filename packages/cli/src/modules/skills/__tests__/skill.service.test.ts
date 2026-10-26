import type { ListSkillsQueryDto } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { ConflictError, NotFoundError, UserError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';

import {
	createSkillServices,
	PROJECT,
	TX_CTX,
	expectError,
	skillRow,
	versionRow,
	resetSkillMocks,
} from './test-utils/skill-services';
import type { Skill } from '../database/entities/skill.entity';
import { SkillSyncedError } from '../errors/skill-synced.error';
import { toAgentSkill, type ResolvedSkillRow } from '../utils/skill-content';
import { getSkillHash } from '../utils/skill-hash';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));
vi.mock('@n8n/permissions', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/permissions')>()),
	hasGlobalScope: vi.fn(),
}));

// The rules (names, moves, the delete guard) have decision tables in skill.policy.test.ts.
// These tests cover how the service wires them: what it reads, under which lock and
// transaction, and what it writes or refuses. The agents come from `FakeSkillUsage`.
describe('SkillService', () => {
	const {
		skills,
		usage,
		skillUsage,
		txRunner,
		projectScope,
		access,
		telemetry,
		users,
		assistantGate,
		service,
	} = createSkillServices();
	const user = mock<User>({ id: 'user-1' });

	beforeEach(async () => await resetSkillMocks({ skills, usage, txRunner }));

	describe('createTrusted', () => {
		it('creates the skill with an id in the agent skill format', async () => {
			const id = await service.createTrusted({
				target: { projectId: PROJECT, agentId: null },
				skill: { name: 'n', description: 'd', instructions: 'i' },
				source: 'ui',
				createdById: user.id,
			});

			expect(id).toMatch(/^skill_[A-Za-z0-9]{16}$/);
			expect(skills.createSkill).toHaveBeenCalledWith(
				{ id, target: { projectId: PROJECT, agentId: null }, source: 'ui', createdById: user.id },
				expect.objectContaining({ name: 'n', frontmatter: null }),
				expect.anything(),
			);
		});

		it('stores every frontmatter key of v1', async () => {
			const frontmatter = { 'allowed-tools': ['Read'], license: 'MIT', metadata: { team: 'a' } };

			await service.createTrusted({
				target: { projectId: PROJECT, agentId: null },
				skill: { name: 'n', description: 'd', instructions: 'i' },
				frontmatter,
				source: 'github',
				createdById: user.id,
			});

			expect(skills.createSkill).toHaveBeenCalledWith(
				expect.objectContaining({ source: 'github' }),
				expect.objectContaining({ frontmatter }),
				expect.anything(),
			);
		});

		it('refuses blank instructions', async () => {
			await expect(
				service.createTrusted({
					target: { projectId: PROJECT, agentId: null },
					skill: { name: 'n', description: 'd', instructions: '  ' },
					source: 'ui',
					createdById: user.id,
				}),
			).rejects.toThrow(UserError);
			expect(skills.createSkill).not.toHaveBeenCalled();
		});

		it('refuses a name that the names of the target scope hold', async () => {
			skills.findLatestNamesInTarget.mockResolvedValue([
				{ skillId: 'skill_x', name: 'Brand voice' },
			]);

			await expect(
				service.createTrusted({
					target: { projectId: PROJECT, agentId: null },
					skill: { name: 'brand-voice', description: 'd', instructions: 'i' },
					source: 'ui',
					createdById: user.id,
					checkNameTaken: true,
				}),
			).rejects.toThrow('That name is taken, choose another');
			expect(skills.findLatestNamesInTarget).toHaveBeenCalledWith(
				{ projectId: PROJECT, agentId: null },
				expect.anything(),
			);
			expect(skills.createSkill).not.toHaveBeenCalled();
		});

		it('lets a copy keep the name of the skill it copies', async () => {
			skills.findLatestNamesInTarget.mockResolvedValue([
				{ skillId: 'skill_x', name: 'Brand voice' },
			]);

			await service.createTrusted({
				target: { projectId: null, agentId: 'agent-2' },
				skill: { name: 'Brand voice', description: 'd', instructions: 'i' },
				source: 'agent',
				createdById: user.id,
			});

			expect(skills.findLatestNamesInTarget).not.toHaveBeenCalled();
			expect(skills.createSkill).toHaveBeenCalled();
		});
	});

	describe('newName', () => {
		it('answers the next free name among the names of the target scope', async () => {
			const target = { projectId: PROJECT, agentId: null };
			vi.spyOn(access, 'resolveCreateTarget').mockResolvedValue(target);
			skills.findLatestNamesInTarget.mockResolvedValue([
				{ skillId: 'a', name: 'new-skill' },
				{ skillId: 'b', name: 'New skill 2' },
			]);

			const { name } = await service.newName(user, {
				name: 'New skill',
				scope: 'project',
				projectId: PROJECT,
			});

			expect(name).toBe('New skill 3');
			expect(skills.findLatestNamesInTarget).toHaveBeenCalledWith(target, {});
		});
	});

	describe('saveTrusted', () => {
		const skill = skillRow('skill_a', { projectId: PROJECT });

		/** Mocks the latest version and returns its hash, the base an editor sends back. */
		function givenLatest(latest: ResolvedSkillRow): string {
			skills.findLatestSaved.mockImplementation(async (ids) => {
				const rows = new Map<string, ResolvedSkillRow>();
				if (ids.includes('skill_a')) rows.set('skill_a', latest);
				return rows;
			});
			skills.nextVersionNumber.mockResolvedValue(3);
			skills.insertSavedVersion.mockResolvedValue('new-version-id');
			return getSkillHash(toAgentSkill(latest));
		}

		/** Two agents follow skill_a. Support bot also runs a skill named "Pricing". */
		async function givenFollowers() {
			await usage.seed({
				agents: [
					{ key: 'agent-1', name: 'Support bot', project: PROJECT },
					{ key: 'agent-2', name: 'Sales bot', project: PROJECT },
				],
				skills: [
					{ key: 'skill_a', versions: ['Brand voice'] },
					{ key: 'skill_b', versions: ['Pricing'] },
				],
				drafts: [
					{ agent: 'agent-1', skill: 'skill_a' },
					{ agent: 'agent-1', skill: 'skill_b' },
					{ agent: 'agent-2', skill: 'skill_a' },
				],
			});
		}

		it('creates nothing when the content matches the latest version', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));
			await givenFollowers();

			const result = await service.saveTrusted(
				'skill_a',
				{ baseSkillHash, instructions: 'Use short sentences.' },
				user.id,
			);

			expect(result).toMatchObject({ versionId: 'skill_a-v2', version: 2, created: false });
			expect(result.followingAgentIds).toEqual([]);
			expect(skills.insertSavedVersion).not.toHaveBeenCalled();
			expect(usage.refreshed).toEqual([]);
		});

		it('saves changed content as the next version under an edit lock', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));

			const result = await service.saveTrusted(
				'skill_a',
				{
					baseSkillHash,
					instructions: 'new',
					files: [{ path: 'references/a.md', content: 'a' }],
				},
				user.id,
			);

			expect(result).toMatchObject({ versionId: 'new-version-id', version: 3, created: true });
			expect(result.skill).toMatchObject({ name: 'Brand voice', instructions: 'new' });
			expect(skills.lockForEdit).toHaveBeenCalledWith(['skill_a'], TX_CTX);
			expect(skills.insertSavedVersion).toHaveBeenCalledWith(
				'skill_a',
				3,
				expect.objectContaining({
					name: 'Brand voice',
					instructions: 'new',
					files: [{ path: 'references/a.md', content: 'a' }],
				}),
				user.id,
				TX_CTX,
			);
		});

		it('checks a new name against the names of its own scope', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));
			skills.findLatestNamesInTarget.mockResolvedValue([
				{ skillId: 'skill_a', name: 'Brand voice' },
				{ skillId: 'skill_x', name: 'Code review' },
			]);

			await expect(
				service.saveTrusted('skill_a', { baseSkillHash, name: 'code-review' }, user.id),
			).rejects.toThrow('That name is taken, choose another');
			expect(skills.findLatestNamesInTarget).toHaveBeenCalledWith(
				{ projectId: PROJECT, agentId: null },
				TX_CTX,
			);
			expect(skills.insertSavedVersion).not.toHaveBeenCalled();
		});

		it('trims a new name before it checks and stores it', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));

			const result = await service.saveTrusted(
				'skill_a',
				{ baseSkillHash, name: '  Renamed  ' },
				user.id,
			);

			expect(result.skill.name).toBe('Renamed');
			expect(skills.insertSavedVersion).toHaveBeenCalledWith(
				'skill_a',
				3,
				expect.objectContaining({ name: 'Renamed' }),
				user.id,
				expect.anything(),
			);
		});

		it('refuses a new name of only spaces', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));

			await expect(
				service.saveTrusted('skill_a', { baseSkillHash, name: '   ' }, user.id),
			).rejects.toThrow('Skill name is required.');
			expect(skills.insertSavedVersion).not.toHaveBeenCalled();
		});

		it('does not check the name when the save keeps it', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));

			await service.saveTrusted('skill_a', { baseSkillHash, instructions: 'new' }, user.id);

			expect(skills.findLatestNamesInTarget).not.toHaveBeenCalled();
		});

		it('removes files set to an empty list', async () => {
			const baseSkillHash = givenLatest(
				versionRow(skill, 2, {}, [{ path: 'references/a.md', content: 'a' }]),
			);

			const result = await service.saveTrusted('skill_a', { baseSkillHash, files: [] }, user.id);

			expect(result.skill).not.toHaveProperty('references');
		});

		it('keeps frontmatter keys the editor does not know', async () => {
			const baseSkillHash = givenLatest(
				versionRow(skill, 2, { frontmatter: { license: 'MIT', 'allowed-tools': 'Read' } }),
			);

			await service.saveTrusted('skill_a', { baseSkillHash, instructions: 'new' }, user.id);

			expect(skills.insertSavedVersion).toHaveBeenCalledWith(
				'skill_a',
				3,
				expect.objectContaining({ frontmatter: { license: 'MIT', 'allowed-tools': 'Read' } }),
				user.id,
				TX_CTX,
			);
		});

		// The check runs under the edit lock, so two saves from the same base cannot both pass.
		it('refuses a stale base hash after taking the edit lock', async () => {
			givenLatest(versionRow(skill, 2));

			await expect(
				service.saveTrusted('skill_a', { instructions: 'new', baseSkillHash: 'stale' }, user.id),
			).rejects.toThrow(ConflictError);
			expect(skills.lockForEdit.mock.invocationCallOrder[0]).toBeLessThan(
				skills.findLatestSaved.mock.invocationCallOrder[0],
			);
			expect(skills.insertSavedVersion).not.toHaveBeenCalled();
		});

		describe('a synced skill', () => {
			const synced = mock<Skill>({
				id: 'skill_a',
				projectId: PROJECT,
				agentId: null,
				source: 'github',
			});

			it.each([
				{ case: 'new instructions', update: { instructions: 'new' } },
				{ case: 'a rename', update: { name: 'Tone' } },
				{
					case: 'a new reference',
					update: { files: [{ path: 'references/a.md', content: 'a' }] },
				},
				{ case: 'new frontmatter', update: { frontmatter: { license: 'MIT' } } },
			])('refuses $case from every caller but Skill Sync', async ({ update }) => {
				const baseSkillHash = givenLatest(versionRow(synced, 2));

				await expectError(
					service.saveTrusted('skill_a', { baseSkillHash, ...update }, user.id),
					SkillSyncedError,
					'"Brand voice" is synced from GitHub, so it is read-only in n8n. Change it in GitHub.',
				);
				expect(skills.insertSavedVersion).not.toHaveBeenCalled();
			});

			it('lets a save with unchanged content pass', async () => {
				const baseSkillHash = givenLatest(versionRow(synced, 2));

				const result = await service.saveTrusted(
					'skill_a',
					{ baseSkillHash, instructions: 'Use short sentences.' },
					user.id,
				);

				expect(result).toMatchObject({ version: 2, created: false });
			});

			it('stores the full content from Skill Sync, frontmatter included, as the next version', async () => {
				const latest = versionRow(synced, 2, { frontmatter: { 'allowed-tools': 'Read' } });
				givenLatest(latest);
				const fetched = {
					name: 'Brand voice',
					description: 'Write in our voice',
					instructions: 'Use short sentences.',
					frontmatter: { 'allowed-tools': 'Read Bash' },
					files: [],
				};

				const result = await service.saveTrusted(
					'skill_a',
					{ ...fetched, baseContentHash: latest.version.contentHash },
					user.id,
					{},
					{ allowSynced: true },
				);

				expect(result).toMatchObject({ version: 3, created: true });
				expect(skills.insertSavedVersion).toHaveBeenCalledWith(
					'skill_a',
					3,
					fetched,
					user.id,
					TX_CTX,
				);
			});

			it('refuses content from Skill Sync that starts from an older version', async () => {
				givenLatest(versionRow(synced, 2));

				await expect(
					service.saveTrusted(
						'skill_a',
						{ instructions: 'new', baseContentHash: 'hash-of-v1' },
						user.id,
						{},
						{ allowSynced: true },
					),
				).rejects.toThrow(ConflictError);
				expect(skills.insertSavedVersion).not.toHaveBeenCalled();
			});
		});

		it('keeps the stored frontmatter when the update leaves it out', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2, { frontmatter: { license: 'MIT' } }));

			await service.saveTrusted('skill_a', { baseSkillHash, instructions: 'new' }, user.id);

			expect(skills.insertSavedVersion).toHaveBeenCalledWith(
				'skill_a',
				3,
				expect.objectContaining({ instructions: 'new', frontmatter: { license: 'MIT' } }),
				user.id,
				TX_CTX,
			);
		});

		it('refuses blank instructions', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));

			await expect(
				service.saveTrusted('skill_a', { baseSkillHash, instructions: ' ' }, user.id),
			).rejects.toThrow(UserError);
		});

		it('marks the following agents in the transaction and refreshes them after the commit', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));
			await givenFollowers();
			const markFollowersChanged = vi.spyOn(skillUsage, 'markFollowersChanged');

			const result = await service.saveTrusted(
				'skill_a',
				{ baseSkillHash, instructions: 'new' },
				user.id,
				{},
				{ pushRef: 'push-ref-1' },
			);

			expect(markFollowersChanged).toHaveBeenCalledWith('skill_a', TX_CTX);
			expect(result.followingAgentIds).toEqual(['agent-1', 'agent-2']);
			expect(usage.refreshed).toEqual([
				{ agentIds: ['agent-1', 'agent-2'], excludePushRef: 'push-ref-1' },
			]);
		});

		it("leaves the refresh to the caller when it runs in the caller's transaction", async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));
			await givenFollowers();

			const result = await service.saveTrusted(
				'skill_a',
				{ baseSkillHash, instructions: 'new' },
				user.id,
				TX_CTX,
			);

			expect(result.followingAgentIds).toEqual(['agent-1', 'agent-2']);
			expect(usage.refreshed).toEqual([]);
		});

		it('refuses a rename that clashes on an agent that follows the skill', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));
			await givenFollowers();

			await expectError(
				service.saveTrusted('skill_a', { baseSkillHash, name: 'pricing' }, user.id),
				UserError,
				'Cannot rename to "pricing": Support bot already uses a skill with a name like that.',
			);
			expect(skills.insertSavedVersion).not.toHaveBeenCalled();
		});

		it('saves a rename that clashes on no agent', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));
			await givenFollowers();

			await expect(
				service.saveTrusted('skill_a', { baseSkillHash, name: 'Tone' }, user.id),
			).resolves.toMatchObject({ created: true });
		});

		it('throws NotFoundError for a missing skill', async () => {
			await expect(
				service.saveTrusted('skill_gone', { name: 'x', baseSkillHash: 'any' }, user.id),
			).rejects.toThrow(NotFoundError);
		});
	});

	describe('moveTrusted', () => {
		/** skill_a is used by Support bot and Sales bot in p1, and by Ops bot in p2. */
		async function givenUsers(...agentKeys: string[]) {
			await usage.seed({
				agents: [
					{ key: 'agent-1', name: 'Support bot', project: 'p1' },
					{ key: 'agent-2', name: 'Sales bot', project: 'p1' },
					{ key: 'agent-3', name: 'Ops bot', project: 'p2' },
				],
				skills: [{ key: 'skill_a', versions: ['Brand voice'] }],
				drafts: agentKeys.map((agent) => ({ agent, skill: 'skill_a' })),
			});
		}

		it('reads the agents that use the skill under the edit lock, then moves it', async () => {
			await givenUsers('agent-1', 'agent-2');
			const findUsingAgentIds = vi.spyOn(skillUsage, 'findUsingAgentIds');

			await service.moveTrusted('skill_a', { projectId: 'p1', agentId: null }, undefined);

			expect(skills.lockForEdit).toHaveBeenCalledWith(['skill_a'], TX_CTX);
			expect(findUsingAgentIds).toHaveBeenCalledWith('skill_a', TX_CTX);
			expect(skills.lockForEdit.mock.invocationCallOrder[0]).toBeLessThan(
				findUsingAgentIds.mock.invocationCallOrder[0],
			);
			expect(skills.updateTarget).toHaveBeenCalledWith(
				'skill_a',
				{ projectId: 'p1', agentId: null },
				TX_CTX,
			);
		});

		it('refuses a move that takes the skill away from agents, and names them', async () => {
			await givenUsers('agent-1', 'agent-2', 'agent-3');

			await expectError(
				service.moveTrusted('skill_a', { projectId: 'p2', agentId: null }, undefined),
				ConflictError,
				'"Support bot", "Sales bot" would lose access to this skill. Choose a scope that includes those agents, or detach the skill from them first.',
			);
			expect(skills.updateTarget).not.toHaveBeenCalled();
		});

		it('names only the agents in the projects that the caller passes', async () => {
			await givenUsers('agent-1', 'agent-3');

			await expectError(
				service.moveTrusted(
					'skill_a',
					{ projectId: 'p9', agentId: null },
					undefined,
					{},
					{ agentProjectIds: ['p2'] },
				),
				ConflictError,
				'"Ops bot", 1 agent in other projects would lose access to this skill. Choose a scope that includes those agents, or detach the skill from them first.',
			);
		});

		it('does not let the agent that asks for the move block it', async () => {
			await givenUsers('agent-1', 'agent-3');

			await service.moveTrusted('skill_a', { projectId: 'p2', agentId: null }, 'agent-1');

			expect(skills.updateTarget).toHaveBeenCalled();
		});

		it('refuses to move a skill into a scope that holds a name like it', async () => {
			skills.findLatestSummaries.mockResolvedValue(
				new Map([['skill_a', { name: 'Brand voice', description: 'd', version: 1 }]]),
			);
			skills.findLatestNamesInTarget.mockResolvedValue([
				{ skillId: 'skill_x', name: 'brand_voice' },
			]);

			await expect(
				service.moveTrusted('skill_a', { projectId: null, agentId: null }, undefined),
			).rejects.toThrow('That name is taken, choose another');
			expect(skills.findLatestNamesInTarget).toHaveBeenCalledWith(
				{ projectId: null, agentId: null },
				TX_CTX,
			);
			expect(skills.updateTarget).not.toHaveBeenCalled();
		});

		it('checks the name that a rename in the same request gives the skill', async () => {
			await service.moveTrusted(
				'skill_a',
				{ projectId: null, agentId: null },
				undefined,
				{},
				{ nameAfterMove: 'Fresh name' },
			);

			expect(skills.findLatestSummaries).not.toHaveBeenCalled();
			expect(skills.findLatestNamesInTarget).toHaveBeenCalledWith(
				{ projectId: null, agentId: null },
				TX_CTX,
			);
			expect(skills.updateTarget).toHaveBeenCalled();
		});

		it('throws NotFoundError when the checked skill is gone under the lock', async () => {
			await expect(
				service.moveTrusted(
					'skill_gone',
					{ projectId: null, agentId: null },
					undefined,
					{},
					{ checkedSource: { projectId: PROJECT, agentId: null } },
				),
			).rejects.toThrow(NotFoundError);
			expect(skills.updateTarget).not.toHaveBeenCalled();
		});

		it('refuses the move when the skill left the scope that the permission check saw', async () => {
			// Another move put the skill in a project after `assertCanMove` checked the instance.
			skills.findByIds.mockResolvedValue([mock<Skill>({ projectId: 'p2', agentId: null })]);

			await expect(
				service.moveTrusted(
					'skill_a',
					{ projectId: null, agentId: 'agent-1' },
					'agent-1',
					{},
					{ checkedSource: { projectId: null, agentId: null } },
				),
			).rejects.toThrow('The skill was moved somewhere else.');
			expect(skills.findByIds).toHaveBeenCalledWith(['skill_a'], TX_CTX);
			expect(skills.updateTarget).not.toHaveBeenCalled();
		});

		it('moves the skill when it is still in the scope that the permission check saw', async () => {
			skills.findByIds.mockResolvedValue([mock<Skill>({ projectId: null, agentId: null })]);

			await service.moveTrusted(
				'skill_a',
				{ projectId: 'p1', agentId: null },
				undefined,
				{},
				{ checkedSource: { projectId: null, agentId: null } },
			);

			expect(skills.updateTarget).toHaveBeenCalled();
		});
	});

	describe('delete', () => {
		/** Support bot in PROJECT drafts skill_a. An agent in another project publishes it. */
		async function givenUsers() {
			await usage.seed({
				agents: [
					{ key: 'agent-1', name: 'Support bot', project: PROJECT },
					{ key: 'agent-9', name: 'Hidden bot', project: 'project-9' },
				],
				skills: [{ key: 'skill_a', versions: ['Brand voice'] }],
				drafts: [{ agent: 'agent-1', skill: 'skill_a' }],
				publishes: [{ agent: 'agent-9', pins: [{ skill: 'skill_a', version: 1 }] }],
			});
		}

		beforeEach(() => {
			vi.spyOn(access, 'requireAccess').mockResolvedValue(skillRow('skill_a'));
			skills.findByIds.mockResolvedValue([skillRow('skill_a')]);
		});

		it('reads the usage under the edit lock and deletes a skill nobody uses', async () => {
			projectScope.getProjectIds.mockResolvedValue(null);
			const findUsage = vi.spyOn(skillUsage, 'findUsage');

			await service.delete(user, 'skill_a');

			expect(skills.lockForEdit).toHaveBeenCalledWith(['skill_a'], TX_CTX);
			expect(findUsage).toHaveBeenCalledWith('skill_a', 'all', TX_CTX);
			expect(skills.lockForEdit.mock.invocationCallOrder[0]).toBeLessThan(
				findUsage.mock.invocationCallOrder[0],
			);
			expect(skills.deleteSkill).toHaveBeenCalledWith('skill_a', TX_CTX);
		});

		it('refuses while agents use the skill, and names only the agents the user may read', async () => {
			await givenUsers();
			projectScope.getProjectIds.mockResolvedValue([PROJECT]);
			skills.findLatestSaved.mockResolvedValue(
				new Map([['skill_a', versionRow(skillRow('skill_a'), 2)]]),
			);

			await expectError(
				service.delete(user, 'skill_a'),
				ConflictError,
				'Skill "Brand voice" is used by Support bot (draft), 1 agent in other projects and cannot be deleted.',
			);
			expect(projectScope.getProjectIds).toHaveBeenCalledWith(user, ['agent:read']);
			expect(skills.deleteSkill).not.toHaveBeenCalled();
		});

		it('names the skill by its id when it has no saved version', async () => {
			await givenUsers();
			projectScope.getProjectIds.mockResolvedValue(null);

			await expectError(
				service.delete(user, 'skill_a'),
				ConflictError,
				'Skill "skill_a" is used by Support bot (draft), Hidden bot (published v1) and cannot be deleted.',
			);
		});

		it('throws NotFoundError for a skill that is gone under the lock', async () => {
			skills.findByIds.mockResolvedValue([]);

			await expect(service.delete(user, 'skill_gone')).rejects.toThrow(NotFoundError);
		});
	});

	describe('read models', () => {
		const date = new Date('2026-01-01T00:00:00.000Z');
		const listed = (
			id: string,
			target: Partial<Pick<Skill, 'projectId' | 'agentId'>>,
			createdById: string | null = null,
		) =>
			Object.assign(skillRow(id, target), {
				createdById,
				source: 'ui',
				availableToAssistant: false,
				createdAt: date,
				updatedAt: date,
			});
		const summary = (name: string) => ({ name, description: `${name} description`, version: 1 });

		beforeEach(() => {
			projectScope.getProjectIds.mockResolvedValue(null);
			skills.findProjects.mockResolvedValue(new Map());
		});

		it('lists each skill with its project, agent and creator, and leaves out one without a version', async () => {
			skills.findVisiblePage.mockResolvedValue({
				count: 5,
				skills: [
					listed('skill_project', { projectId: PROJECT }, 'user-1'),
					listed('skill_lost_project', { projectId: 'project-gone' }),
					listed('skill_agent', { agentId: 'agent-1' }),
					listed('skill_lost_agent', { agentId: 'agent-gone' }),
					listed('skill_unsaved', {}),
				],
			});
			await usage.seed({
				agents: [
					{ key: 'agent-1', name: 'Support bot', project: PROJECT },
					{ key: 'agent-2', name: 'Sales bot', project: PROJECT },
				],
				skills: [],
				drafts: [
					{ agent: 'agent-1', skill: 'skill_project' },
					{ agent: 'agent-2', skill: 'skill_project' },
				],
			});
			skills.findLatestSummaries.mockResolvedValue(
				new Map([
					['skill_project', summary('Project')],
					['skill_lost_project', summary('Lost project')],
					['skill_agent', summary('Agent')],
					['skill_lost_agent', summary('Lost agent')],
				]),
			);
			skills.findProjects.mockResolvedValue(
				new Map([[PROJECT, { name: 'Marketing', type: 'team' as const }]]),
			);
			users.findManyByIds.mockResolvedValue([
				{ id: 'user-1', email: null, firstName: null, lastName: null } as unknown as User,
			]);

			const { count, data } = await service.list(user, {} as ListSkillsQueryDto);

			expect(count).toBe(5);
			expect(users.findManyByIds).toHaveBeenCalledWith(['user-1']);
			expect(skills.findProjects).toHaveBeenCalledWith([PROJECT, 'project-gone', PROJECT]);
			expect(
				data.map(
					({
						id,
						scope,
						projectId,
						projectName,
						projectType,
						agentName,
						createdBy,
						usedByAgents,
					}) => ({
						id,
						scope,
						projectId,
						projectName,
						projectType,
						agentName,
						createdBy,
						usedByAgents,
					}),
				),
			).toEqual([
				{
					id: 'skill_project',
					scope: 'project',
					projectId: PROJECT,
					projectName: 'Marketing',
					projectType: 'team',
					agentName: null,
					createdBy: { id: 'user-1', email: null, firstName: null, lastName: null },
					usedByAgents: 2,
				},
				{
					id: 'skill_lost_project',
					scope: 'project',
					projectId: 'project-gone',
					projectName: null,
					projectType: null,
					agentName: null,
					createdBy: null,
					usedByAgents: 0,
				},
				{
					id: 'skill_agent',
					scope: 'agent',
					projectId: PROJECT,
					projectName: 'Marketing',
					projectType: 'team',
					agentName: 'Support bot',
					createdBy: null,
					usedByAgents: 0,
				},
				{
					id: 'skill_lost_agent',
					scope: 'agent',
					projectId: null,
					projectName: null,
					projectType: null,
					agentName: null,
					createdBy: null,
					usedByAgents: 0,
				},
			]);
		});

		it('get throws NotFoundError for a skill without a saved version', async () => {
			vi.spyOn(access, 'requireAccess').mockResolvedValue(listed('skill_a', {}));
			skills.findLatestSummaries.mockResolvedValue(new Map([['skill_a', summary('A')]]));

			await expect(service.get(user, 'skill_a')).rejects.toThrow(NotFoundError);
		});

		it('create throws NotFoundError when the new skill is gone before the read', async () => {
			vi.spyOn(access, 'resolveCreateTarget').mockResolvedValue({
				projectId: PROJECT,
				agentId: null,
			});

			await expect(
				service.create(user, {
					scope: 'project',
					projectId: PROJECT,
					skill: { name: 'Brand voice', description: 'Write in our voice', instructions: 'Hi.' },
				}),
			).rejects.toThrow(NotFoundError);
			expect(telemetry.created).toHaveBeenCalled();
		});
	});

	describe('update', () => {
		it('reports a new version under the skill it read when only the availability changes', async () => {
			const skill = skillRow('skill_a', { projectId: PROJECT });
			assistantGate.isEnabled.mockResolvedValue(true);
			vi.spyOn(access, 'requireAccess').mockResolvedValue(skill);
			projectScope.getProjectIds.mockResolvedValue(null);
			const setAvailability = vi
				.spyOn(service, 'setAssistantAvailability')
				.mockResolvedValue(undefined);
			const content = toAgentSkill(versionRow(skill, 2));
			vi.spyOn(service, 'saveTrusted').mockResolvedValue({
				created: true,
				versionId: 'skill_a-v2',
				version: 2,
				skill: content,
				followingAgentIds: [],
			});

			await service.update(user, 'skill_a', {
				availableToAssistant: true,
				instructions: 'New.',
				baseSkillHash: getSkillHash(content),
			});

			expect(setAvailability).toHaveBeenCalledWith('skill_a', true, skill, TX_CTX);
			expect(telemetry.updated).toHaveBeenCalledWith('user-1', skill, 'ui', 2, false);
		});
	});

	describe('setAssistantAvailability', () => {
		it('throws NotFoundError for a skill that is gone under the lock', async () => {
			await expect(
				service.setAssistantAvailability('skill_gone', true, { projectId: PROJECT, agentId: null }),
			).rejects.toThrow(NotFoundError);
			expect(skills.setAssistantAvailability).not.toHaveBeenCalled();
		});

		it('refuses when the scope changed after the check', async () => {
			skills.findByIds.mockResolvedValue([skillRow('skill_a', { projectId: 'project-2' })]);

			await expect(
				service.setAssistantAvailability('skill_a', true, { projectId: PROJECT, agentId: null }),
			).rejects.toThrow(ConflictError);
			expect(skills.setAssistantAvailability).not.toHaveBeenCalled();
		});
	});

	describe('MCP reads', () => {
		const instanceSkill = versionRow(skillRow('skill-1'), 2, {}, [
			{ path: 'references/style.md', content: 'Be brief.' },
		]);
		const projectSkill = versionRow(skillRow('skill-2', { projectId: 'project-1' }), 1);
		const agentSkill = versionRow(skillRow('skill-3', { agentId: 'agent-1' }), 1);
		const rows = [instanceSkill, projectSkill, agentSkill];

		beforeEach(() => {
			skills.findLatestSaved.mockImplementation(
				async (ids) =>
					new Map(
						rows.filter((row) => ids.includes(row.skill.id)).map((row) => [row.skill.id, row]),
					),
			);
			vi.mocked(userHasScopes).mockResolvedValue(true);
		});

		it('lists one page of the project and instance skills the user can list, without agent skills', async () => {
			projectScope.getProjectIds.mockResolvedValue(['project-1']);
			skills.findVisiblePage.mockResolvedValue({
				skills: [instanceSkill.skill, projectSkill.skill],
				count: 7,
			});

			const result = await service.listForMcp(user, 100, 50);

			expect(skills.findVisiblePage).toHaveBeenCalledWith(
				{ projectIds: ['project-1'], agentIds: [] },
				{ skip: 100, take: 50 },
			);
			expect(result).toEqual({
				count: 7,
				skills: [
					{ id: 'skill-1', projectId: null, skill: toAgentSkill(instanceSkill) },
					{ id: 'skill-2', projectId: 'project-1', skill: toAgentSkill(projectSkill) },
				],
			});
		});

		it('lists the skills of every project for a user with a global scope', async () => {
			projectScope.getProjectIds.mockResolvedValue(null);
			skills.findVisiblePage.mockResolvedValue({ skills: [], count: 0 });

			await service.listForMcp(user, 0, 100);

			expect(skills.findVisiblePage).toHaveBeenCalledWith(
				{ projectIds: 'all', agentIds: [] },
				{ skip: 0, take: 100 },
			);
		});

		it('reads the latest version of a readable skill', async () => {
			expect(await service.readForMcp(user, 'skill-2')).toEqual({
				id: 'skill-2',
				projectId: 'project-1',
				skill: toAgentSkill(projectSkill),
			});
		});

		it('does not read an agent skill', async () => {
			expect(await service.readForMcp(user, 'skill-3')).toBeNull();
		});

		it('does not read a skill the user cannot read', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(false);

			expect(await service.readForMcp(user, 'skill-2')).toBeNull();
		});

		it('does not read a missing skill', async () => {
			expect(await service.readForMcp(user, 'missing')).toBeNull();
		});
	});

	describe('telemetry', () => {
		it('trackCreated passes its arguments to SkillsTelemetry.created in order', async () => {
			const refs = [{ id: 'skill_a', projectId: PROJECT, agentId: null }, 'skill_b'];

			await service.trackCreated('user-1', refs, 'agent', 'upload');

			expect(telemetry.created).toHaveBeenCalledWith('user-1', refs, 'agent', 'upload');
		});

		it('trackUpdated passes its arguments to SkillsTelemetry.updated in order', async () => {
			const ref = { id: 'skill_a', projectId: PROJECT, agentId: null };

			await service.trackUpdated('user-1', ref, 'agent', 4, true);

			expect(telemetry.updated).toHaveBeenCalledWith('user-1', ref, 'agent', 4, true);
		});
	});
});
