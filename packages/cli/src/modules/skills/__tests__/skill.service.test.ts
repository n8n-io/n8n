/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests reference unbound methods */
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
import { toAgentSkill, type ResolvedSkillRow } from '../utils/skill-content';
import { getSkillHash } from '../utils/skill-hash';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));
vi.mock('@n8n/permissions', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/permissions')>()),
	hasGlobalScope: vi.fn(),
}));

describe('SkillService', () => {
	const {
		skills,
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

	beforeEach(() => resetSkillMocks({ skills, skillUsage, txRunner }));

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

		it.each(['Brand voice', 'brand-voice', '  BRAND_voice '])(
			'refuses "%s" when another skill in the same scope has a name like it',
			async (name) => {
				skills.findLatestNamesInTarget.mockResolvedValue([
					{ skillId: 'skill_x', name: 'Brand voice' },
				]);

				await expect(
					service.createTrusted({
						target: { projectId: PROJECT, agentId: null },
						skill: { name, description: 'd', instructions: 'i' },
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
			},
		);

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
		const target = { projectId: PROJECT, agentId: null };

		beforeEach(() => {
			vi.spyOn(access, 'resolveCreateTarget').mockResolvedValue(target);
		});

		it('keeps a name that the scope does not hold', async () => {
			expect(
				(await service.newName(user, { name: 'New skill', scope: 'project', projectId: PROJECT }))
					.name,
			).toBe('New skill');
			expect(skills.findLatestNamesInTarget).toHaveBeenCalledWith(target, {});
		});

		it('adds the first free number, by the same rule as the name check', async () => {
			skills.findLatestNamesInTarget.mockResolvedValue([
				{ skillId: 'a', name: 'new-skill' },
				{ skillId: 'b', name: 'New skill 2' },
				{ skillId: 'c', name: 'New skill 4' },
			]);

			expect(
				(await service.newName(user, { name: 'New skill', scope: 'project', projectId: PROJECT }))
					.name,
			).toBe('New skill 3');
		});

		it('shortens a long name so the number fits the length limit', async () => {
			const long = 'x'.repeat(128);
			skills.findLatestNamesInTarget.mockResolvedValue([{ skillId: 'a', name: long }]);

			const name = (
				await service.newName(user, { name: long, scope: 'project', projectId: PROJECT })
			).name;

			expect(name).toHaveLength(128);
			expect(name.endsWith(' 2')).toBe(true);
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

		it('creates nothing when the content matches the latest version', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));

			const result = await service.saveTrusted(
				'skill_a',
				{ baseSkillHash, instructions: 'Use short sentences.' },
				user.id,
			);

			expect(result).toMatchObject({ versionId: 'skill_a-v2', version: 2, created: false });
			expect(skills.insertSavedVersion).not.toHaveBeenCalled();
			expect(skillUsage.markFollowersChanged).not.toHaveBeenCalled();
		});

		it('saves changed content as the next version under an edit lock', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));

			const result = await service.saveTrusted(
				'skill_a',
				{
					baseSkillHash,
					instructions: 'new',
					references: [{ path: 'references/a.md', content: 'a' }],
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

		it('refuses a rename to a name that another skill in its scope has', async () => {
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

		it('removes references set to an empty list', async () => {
			const baseSkillHash = givenLatest(
				versionRow(skill, 2, {}, [{ path: 'references/a.md', content: 'a' }]),
			);

			const result = await service.saveTrusted(
				'skill_a',
				{ baseSkillHash, references: [] },
				user.id,
			);

			expect(result.skill).not.toHaveProperty('references');
		});

		it('ignores allowed tools in the update', async () => {
			const baseSkillHash = givenLatest(
				versionRow(skill, 2, { frontmatter: { 'allowed-tools': 'Read' } }),
			);

			const result = await service.saveTrusted(
				'skill_a',
				{ baseSkillHash, instructions: 'new', allowedTools: ['Bash'] },
				user.id,
			);

			expect(result.skill).not.toHaveProperty('allowedTools');
			expect(skills.insertSavedVersion).toHaveBeenCalledWith(
				'skill_a',
				3,
				expect.objectContaining({ frontmatter: { 'allowed-tools': 'Read' } }),
				user.id,
				TX_CTX,
			);
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

		it('accepts the hash of the latest version as the base', async () => {
			const latest = versionRow(skill, 2);
			const baseSkillHash = givenLatest(latest);

			const result = await service.saveTrusted(
				'skill_a',
				{ instructions: 'new', baseSkillHash },
				user.id,
			);

			expect(result.created).toBe(true);
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

		it('refuses blank instructions', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));

			await expect(
				service.saveTrusted('skill_a', { baseSkillHash, instructions: ' ' }, user.id),
			).rejects.toThrow(UserError);
		});

		it('marks the following agents in the same transaction', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));
			skillUsage.markFollowersChanged.mockResolvedValue(['agent-1', 'agent-2']);

			const result = await service.saveTrusted(
				'skill_a',
				{ baseSkillHash, instructions: 'new' },
				user.id,
			);

			expect(skillUsage.markFollowersChanged).toHaveBeenCalledWith('skill_a', TX_CTX);
			expect(result.followingAgentIds).toEqual(['agent-1', 'agent-2']);
		});

		it('refreshes every following agent after the commit', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));
			skillUsage.markFollowersChanged.mockResolvedValue(['agent-1', 'agent-2']);

			await service.saveTrusted('skill_a', { baseSkillHash, instructions: 'new' }, user.id);

			expect(skillUsage.refreshAgents).toHaveBeenCalledWith(['agent-1', 'agent-2'], undefined);
		});

		it('sends no update push to the tab that saved', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));
			skillUsage.markFollowersChanged.mockResolvedValue(['agent-1']);

			await service.saveTrusted(
				'skill_a',
				{ baseSkillHash, instructions: 'new' },
				user.id,
				{},
				'push-ref-1',
			);

			expect(skillUsage.refreshAgents).toHaveBeenCalledWith(['agent-1'], 'push-ref-1');
		});

		it("leaves the refresh to the caller when it runs in the caller's transaction", async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));
			skillUsage.markFollowersChanged.mockResolvedValue(['agent-1']);

			const result = await service.saveTrusted(
				'skill_a',
				{ baseSkillHash, instructions: 'new' },
				user.id,
				TX_CTX,
			);

			expect(result.followingAgentIds).toEqual(['agent-1']);
			expect(skillUsage.refreshAgents).not.toHaveBeenCalled();
		});

		it('checks a rename against the agents that use the skill', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));
			skillUsage.assertRenameKeepsNamesApart.mockRejectedValue(
				new UserError('Cannot rename to "Pricing"'),
			);

			await expect(
				service.saveTrusted('skill_a', { baseSkillHash, name: 'Pricing' }, user.id),
			).rejects.toThrow('Cannot rename to "Pricing"');
			expect(skillUsage.assertRenameKeepsNamesApart).toHaveBeenCalledWith(
				'skill_a',
				'Brand voice',
				'Pricing',
				TX_CTX,
			);
			expect(skills.insertSavedVersion).not.toHaveBeenCalled();
		});

		it('allows a rename that clashes on no agent', async () => {
			const baseSkillHash = givenLatest(versionRow(skill, 2));

			await expect(
				service.saveTrusted('skill_a', { baseSkillHash, name: 'Tone' }, user.id),
			).resolves.toMatchObject({
				created: true,
			});
		});

		it('throws NotFoundError for a missing skill', async () => {
			await expect(
				service.saveTrusted('skill_gone', { name: 'x', baseSkillHash: 'any' }, user.id),
			).rejects.toThrow(NotFoundError);
		});
	});

	describe('moveTrusted', () => {
		it('moves a skill that only the given agent uses, under the edit lock', async () => {
			skillUsage.findUsingAgentIds.mockResolvedValue(['agent-1']);

			await service.moveTrusted('skill_a', { projectId: null, agentId: 'agent-1' }, 'agent-1');

			expect(skills.lockForEdit).toHaveBeenCalledWith(['skill_a'], TX_CTX);
			expect(skills.lockForEdit.mock.invocationCallOrder[0]).toBeLessThan(
				skillUsage.findUsingAgentIds.mock.invocationCallOrder[0],
			);
			expect(skills.updateTarget).toHaveBeenCalledWith(
				'skill_a',
				{ projectId: null, agentId: 'agent-1' },
				TX_CTX,
			);
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

		describe('agents that use the skill', () => {
			const AGENTS = new Map([
				['agent-1', { name: 'Support bot', projectId: 'p1' }],
				['agent-2', { name: 'Sales bot', projectId: 'p1' }],
				['agent-3', { name: 'Ops bot', projectId: 'p2' }],
			]);

			beforeEach(() => {
				skillUsage.findAgents.mockImplementation(
					async (ids) =>
						new Map(
							ids.flatMap((id) => {
								const agent = AGENTS.get(id);
								return agent ? [[id, agent] as const] : [];
							}),
						),
				);
			});

			it('moves a skill to the instance, which every agent can add', async () => {
				skillUsage.findUsingAgentIds.mockResolvedValue(['agent-1', 'agent-3']);

				await service.moveTrusted('skill_a', { projectId: null, agentId: null }, undefined);

				expect(skills.updateTarget).toHaveBeenCalledWith(
					'skill_a',
					{ projectId: null, agentId: null },
					TX_CTX,
				);
			});

			it('moves a skill to the project of every agent that uses it', async () => {
				skillUsage.findUsingAgentIds.mockResolvedValue(['agent-1', 'agent-2']);

				await service.moveTrusted('skill_a', { projectId: 'p1', agentId: null }, undefined);

				expect(skillUsage.findAgents).toHaveBeenCalledWith(['agent-1', 'agent-2'], TX_CTX);
				expect(skills.updateTarget).toHaveBeenCalledWith(
					'skill_a',
					{ projectId: 'p1', agentId: null },
					TX_CTX,
				);
			});

			it('refuses a move that takes the skill away from agents, and names them', async () => {
				skillUsage.findUsingAgentIds.mockResolvedValue(['agent-1', 'agent-2', 'agent-3']);

				await expectError(
					service.moveTrusted('skill_a', { projectId: 'p2', agentId: null }, undefined),
					ConflictError,
					'"Support bot", "Sales bot" would lose access to this skill. Choose a scope that includes those agents, or detach the skill from them first.',
				);
				expect(skills.updateTarget).not.toHaveBeenCalled();
			});

			it('only counts the agents in projects the user may not read', async () => {
				skillUsage.findUsingAgentIds.mockResolvedValue(['agent-1', 'agent-3']);

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

			it('lets the agent that asks for the move narrow the skill to itself', async () => {
				skillUsage.findUsingAgentIds.mockResolvedValue(['agent-1']);

				await service.moveTrusted('skill_a', { projectId: null, agentId: 'agent-1' }, 'agent-1');

				expect(skills.updateTarget).toHaveBeenCalled();
			});

			it('refuses to narrow the skill to one agent while another agent uses it', async () => {
				skillUsage.findUsingAgentIds.mockResolvedValue(['agent-1', 'agent-2']);

				await expectError(
					service.moveTrusted('skill_a', { projectId: null, agentId: 'agent-1' }, 'agent-1'),
					ConflictError,
					'"Sales bot" would lose access to this skill. Choose a scope that includes that agent, or detach the skill from it first.',
				);
				expect(skills.updateTarget).not.toHaveBeenCalled();
			});

			it('does not let the agent that asks for the move block it', async () => {
				skillUsage.findUsingAgentIds.mockResolvedValue(['agent-1', 'agent-3']);

				await service.moveTrusted('skill_a', { projectId: 'p2', agentId: null }, 'agent-1');

				expect(skills.updateTarget).toHaveBeenCalled();
			});
		});

		it('refuses to move a skill into a scope that holds a name like it', async () => {
			skillUsage.findUsingAgentIds.mockResolvedValue([]);
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
			skillUsage.findUsingAgentIds.mockResolvedValue([]);

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

		it('refuses the move when the skill left the scope that the permission check saw', async () => {
			skillUsage.findUsingAgentIds.mockResolvedValue([]);
			// Another move put the skill in a project after `assertCanMove` checked the instance.
			skills.findByIds.mockResolvedValue([mock<Skill>({ projectId: 'p2', agentId: null })]);

			await expect(
				service.moveTrusted(
					'skill_a',
					{ projectId: null, agentId: 'agent-1' },
					'agent-1',
					{},
					{
						checkedSource: { projectId: null, agentId: null },
					},
				),
			).rejects.toThrow('The skill was moved somewhere else.');
			expect(skills.findByIds).toHaveBeenCalledWith(['skill_a'], TX_CTX);
			expect(skills.updateTarget).not.toHaveBeenCalled();
		});

		it('moves the skill when it is still in the scope that the permission check saw', async () => {
			skillUsage.findUsingAgentIds.mockResolvedValue([]);
			skills.findByIds.mockResolvedValue([mock<Skill>({ projectId: null, agentId: null })]);

			await service.moveTrusted(
				'skill_a',
				{ projectId: 'p1', agentId: null },
				undefined,
				{},
				{
					checkedSource: { projectId: null, agentId: null },
				},
			);

			expect(skills.updateTarget).toHaveBeenCalled();
		});

		it('moves an unused skill when no agent is kept', async () => {
			skillUsage.findUsingAgentIds.mockResolvedValue([]);

			await service.moveTrusted('skill_a', { projectId: 'p1', agentId: null }, undefined);

			expect(skills.updateTarget).toHaveBeenCalledWith(
				'skill_a',
				{ projectId: 'p1', agentId: null },
				TX_CTX,
			);
		});
	});

	describe('delete', () => {
		beforeEach(() => {
			vi.spyOn(access, 'requireAccess').mockResolvedValue(skillRow('skill_a'));
			projectScope.getProjectIds.mockResolvedValue(null);
		});

		it('deletes a skill nobody uses, under an edit lock', async () => {
			skills.findByIds.mockResolvedValue([skillRow('skill_a')]);
			skillUsage.findUsage.mockResolvedValue({ drafts: [], pins: [], hiddenAgents: 0 });

			await service.delete(user, 'skill_a');

			expect(skillUsage.findUsage).toHaveBeenCalledWith('skill_a', 'all', TX_CTX);
			expect(skills.lockForEdit).toHaveBeenCalledWith(['skill_a'], TX_CTX);
			expect(skills.deleteSkill).toHaveBeenCalledWith('skill_a', TX_CTX);
		});

		it('refuses while agents use the skill and names them', async () => {
			skills.findByIds.mockResolvedValue([skillRow('skill_a')]);
			skills.findLatestSaved.mockResolvedValue(
				new Map([['skill_a', versionRow(skillRow('skill_a'), 2)]]),
			);
			skillUsage.findUsage.mockResolvedValue({
				drafts: [{ agentId: 'agent-1', agentName: 'Support bot', projectId: PROJECT }],
				pins: [
					{ agentId: 'agent-2', agentName: 'Sales bot', projectId: PROJECT, version: 2 },
					{ agentId: 'agent-3', agentName: 'Old bot', projectId: PROJECT, version: null },
				],
				hiddenAgents: 0,
			});

			await expectError(
				service.delete(user, 'skill_a'),
				ConflictError,
				'Skill "Brand voice" is used by Support bot (draft), Sales bot (published v2), Old bot (older published version) and cannot be deleted.',
			);
			expect(skills.deleteSkill).not.toHaveBeenCalled();
		});

		it('names only the agents of the given projects and counts the others', async () => {
			skills.findByIds.mockResolvedValue([skillRow('skill_a')]);
			skills.findLatestSaved.mockResolvedValue(
				new Map([['skill_a', versionRow(skillRow('skill_a'), 2)]]),
			);
			skillUsage.findUsage.mockResolvedValue({
				drafts: [{ agentId: 'agent-1', agentName: 'Support bot', projectId: PROJECT }],
				pins: [],
				hiddenAgents: 2,
			});

			projectScope.getProjectIds.mockResolvedValue([PROJECT]);

			await expectError(
				service.delete(user, 'skill_a'),
				ConflictError,
				'Skill "Brand voice" is used by Support bot (draft), 2 agents in other projects and cannot be deleted.',
			);
			expect(skillUsage.findUsage).toHaveBeenCalledWith('skill_a', [PROJECT], TX_CTX);
			expect(skills.deleteSkill).not.toHaveBeenCalled();
		});

		it('refuses when only agents the caller cannot read use the skill', async () => {
			skills.findByIds.mockResolvedValue([skillRow('skill_a')]);
			skills.findLatestSaved.mockResolvedValue(
				new Map([['skill_a', versionRow(skillRow('skill_a'), 2)]]),
			);
			skillUsage.findUsage.mockResolvedValue({ drafts: [], pins: [], hiddenAgents: 1 });

			projectScope.getProjectIds.mockResolvedValue([]);

			await expectError(
				service.delete(user, 'skill_a'),
				ConflictError,
				'Skill "Brand voice" is used by 1 agent in other projects and cannot be deleted.',
			);
			expect(skills.deleteSkill).not.toHaveBeenCalled();
		});

		it('names the skill by its id when it has no saved version', async () => {
			skills.findByIds.mockResolvedValue([skillRow('skill_a')]);
			skillUsage.findUsage.mockResolvedValue({ drafts: [], pins: [], hiddenAgents: 1 });

			await expectError(
				service.delete(user, 'skill_a'),
				ConflictError,
				'Skill "skill_a" is used by 1 agent in other projects and cannot be deleted.',
			);
		});

		it('throws NotFoundError for a missing skill', async () => {
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
			skillUsage.findAgents.mockResolvedValue(new Map());
			skillUsage.countUsingAgents.mockResolvedValue(new Map());
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
			skillUsage.findAgents.mockResolvedValue(
				new Map([['agent-1', { name: 'Support bot', projectId: PROJECT }]]),
			);
			skills.findLatestSummaries.mockResolvedValue(
				new Map([
					['skill_project', summary('Project')],
					['skill_lost_project', summary('Lost project')],
					['skill_agent', summary('Agent')],
					['skill_lost_agent', summary('Lost agent')],
				]),
			);
			skillUsage.countUsingAgents.mockResolvedValue(new Map([['skill_project', 2]]));
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
