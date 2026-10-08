/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests reference unbound methods */
import type { OperationContext, TransactionRunner, User } from '@n8n/db';
import { ConflictError, ForbiddenError, NotFoundError, UserError } from '@n8n/errors';
import { hasGlobalScope } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';

import type { AgentUpdateBroadcaster } from '../agent-update-broadcaster';
import type { Agent } from '../entities/agent.entity';
import type { SkillFile } from '../entities/skill-file.entity';
import type { SkillVersion } from '../entities/skill-version.entity';
import type { Skill } from '../entities/skill.entity';
import type { AgentRepository } from '../repositories/agent.repository';
import type { ResolvedSkillRow, SkillRepository } from '../repositories/skill.repository';
import { skillContentHash } from '../skills/skill-content-hash';
import { SkillService, toAgentSkill, toSkillContent } from '../skills/skill.service';

const clearRuntimes = vi.fn();
vi.mock('../agent-runtime-cache.service', () => ({ AgentRuntimeCacheService: class {} }));
vi.mock('@n8n/di', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/di')>();
	return {
		...actual,
		Container: { ...actual.Container, get: vi.fn(() => ({ clearRuntimes })) },
	};
});
vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));
vi.mock('@n8n/permissions', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/permissions')>()),
	hasGlobalScope: vi.fn(),
}));

const PROJECT = 'project-1';

async function expectError(
	promise: Promise<unknown>,
	errorClass: new (...args: never[]) => Error,
	message: string,
) {
	const error: unknown = await promise.then(
		() => undefined,
		(caught: unknown) => caught,
	);
	expect(error).toBeInstanceOf(errorClass);
	expect(error).toHaveProperty('message', message);
}
const TX_CTX = { trx: {} } as OperationContext;

function skillRow(id: string, target: Partial<Pick<Skill, 'userId' | 'projectId'>> = {}): Skill {
	return mock<Skill>({ id, userId: target.userId ?? null, projectId: target.projectId ?? null });
}

function versionRow(
	skill: Skill,
	version: number | null,
	overrides: Partial<SkillVersion> = {},
	files: Array<{ path: string; content: string }> = [],
): ResolvedSkillRow {
	const base = {
		name: 'Brand voice',
		description: 'Write in our voice',
		instructions: 'Use short sentences.',
		frontmatter: null,
		...overrides,
	};
	const contentHash =
		overrides.contentHash ??
		skillContentHash({
			name: base.name,
			description: base.description,
			instructions: base.instructions,
			frontmatter: base.frontmatter,
			files,
		});
	return {
		skill,
		version: mock<SkillVersion>({
			id: `${skill.id}-v${version ?? 'draft'}`,
			skillId: skill.id,
			version,
			...base,
			contentHash,
		}),
		files: files.map((file) => mock<SkillFile>(file)),
	};
}

describe('SkillService', () => {
	const skills = mock<SkillRepository>();
	const agents = mock<AgentRepository>();
	const txRunner = mock<TransactionRunner>();
	const broadcaster = mock<AgentUpdateBroadcaster>();
	const service = new SkillService(mock(), skills, agents, txRunner, broadcaster);
	const user = mock<User>({ id: 'user-1' });

	beforeEach(() => {
		vi.resetAllMocks();
		txRunner.run.mockImplementation(async (_ctx, fn) => await fn(TX_CTX));
		skills.findLatestSaved.mockResolvedValue(new Map());
		skills.findVersionsByIds.mockResolvedValue(new Map());
		skills.findDrafts.mockResolvedValue(new Map());
		skills.findByIds.mockResolvedValue([]);
		skills.findFollowingAgents.mockResolvedValue([]);
		skills.findFollowingAgentIds.mockResolvedValue([]);
		agents.markDraftChangedIfInSync.mockResolvedValue([]);
		agents.findProjectIdsByIds.mockResolvedValue([]);
	});

	describe('conversions', () => {
		it('writes allowed tools as the standard frontmatter key', () => {
			expect(
				toSkillContent({
					name: 'n',
					description: 'd',
					instructions: 'i',
					allowedTools: ['Read', 'Grep'],
					references: [{ path: 'references/a.md', content: 'a' }],
				}),
			).toEqual({
				name: 'n',
				description: 'd',
				instructions: 'i',
				frontmatter: { 'allowed-tools': 'Read Grep' },
				files: [{ path: 'references/a.md', content: 'a' }],
			});
		});

		it('reads allowed tools back from the frontmatter', () => {
			const row = versionRow(skillRow('skill_a'), 1, {
				frontmatter: { 'allowed-tools': 'Read Grep', license: 'MIT' },
			});

			expect(toAgentSkill(row)).toEqual({
				name: 'Brand voice',
				description: 'Write in our voice',
				instructions: 'Use short sentences.',
				allowedTools: ['Read', 'Grep'],
			});
		});

		it('ignores an allowed-tools value that is not a string', () => {
			const row = versionRow(skillRow('skill_a'), 1, { frontmatter: { 'allowed-tools': 3 } });

			expect(toAgentSkill(row).allowedTools).toBeUndefined();
		});
	});

	describe('resolveForAgentDraft', () => {
		it('runs the latest saved version for a following ref', async () => {
			const skill = skillRow('skill_a');
			skills.findLatestSaved.mockResolvedValue(
				new Map([['skill_a', versionRow(skill, 2, { instructions: 'v2' })]]),
			);

			const resolved = await service.resolveForAgentDraft([{ id: 'skill_a' }]);

			expect(resolved.skill_a.instructions).toBe('v2');
		});

		it('runs the pinned version for a ref with versionId', async () => {
			const skill = skillRow('skill_a');
			const v1 = versionRow(skill, 1, { instructions: 'v1' });
			skills.findLatestSaved.mockResolvedValue(
				new Map([['skill_a', versionRow(skill, 2, { instructions: 'v2' })]]),
			);
			skills.findVersionsByIds.mockResolvedValue(new Map([[v1.version.id, v1]]));

			const resolved = await service.resolveForAgentDraft([
				{ id: 'skill_a', versionId: v1.version.id },
			]);

			expect(resolved.skill_a.instructions).toBe('v1');
		});

		it('falls back to the latest version when the pin belongs to another skill', async () => {
			const foreign = versionRow(skillRow('skill_b'), 1, { instructions: 'other skill' });
			skills.findLatestSaved.mockResolvedValue(
				new Map([['skill_a', versionRow(skillRow('skill_a'), 2, { instructions: 'v2' })]]),
			);
			skills.findVersionsByIds.mockResolvedValue(new Map([[foreign.version.id, foreign]]));

			const resolved = await service.resolveForAgentDraft([
				{ id: 'skill_a', versionId: foreign.version.id },
			]);

			expect(resolved.skill_a.instructions).toBe('v2');
		});

		it('never reads the draft row', async () => {
			await service.resolveForAgentDraft([{ id: 'skill_a' }]);

			expect(skills.findDrafts).not.toHaveBeenCalled();
		});

		it('leaves out a ref to a missing skill', async () => {
			expect(await service.resolveForAgentDraft([{ id: 'skill_gone' }])).toEqual({});
		});
	});

	describe('resolveForEditor', () => {
		it('returns the draft row of each skill', async () => {
			skills.findDrafts.mockResolvedValue(
				new Map([['skill_a', versionRow(skillRow('skill_a'), null, { instructions: 'typing' })]]),
			);

			const resolved = await service.resolveForEditor([{ id: 'skill_a' }]);

			expect(resolved.skill_a.instructions).toBe('typing');
		});
	});

	describe('resolvePinned', () => {
		it('returns the pinned versions keyed by ref id', async () => {
			skills.findPinned.mockResolvedValue(
				new Map([['ref_a', versionRow(skillRow('skill_a'), 1, { instructions: 'v1' })]]),
			);

			const resolved = await service.resolvePinned('agent-version-1');

			expect(resolved).toEqual({ ref_a: expect.objectContaining({ instructions: 'v1' }) });
		});
	});

	describe('create', () => {
		it('creates the skill with an id in the agent skill format', async () => {
			const id = await service.create({
				target: { userId: null, projectId: PROJECT },
				skill: { name: 'n', description: 'd', instructions: 'i' },
				source: 'ui',
				createdById: user.id,
			});

			expect(id).toMatch(/^skill_[A-Za-z0-9]{16}$/);
			expect(skills.createSkill).toHaveBeenCalledWith(
				{ id, target: { userId: null, projectId: PROJECT }, source: 'ui', createdById: user.id },
				expect.objectContaining({ name: 'n', frontmatter: null }),
				expect.anything(),
			);
		});
	});

	describe('writeDraft', () => {
		it('locks the skill and overwrites the draft in one transaction', async () => {
			skills.findDrafts.mockResolvedValue(
				new Map([['skill_a', versionRow(skillRow('skill_a'), null)]]),
			);

			await service.writeDraft('skill_a', { name: 'n', description: 'd', instructions: 'new' });

			expect(skills.lockForEdit).toHaveBeenCalledWith(['skill_a'], TX_CTX);
			expect(skills.writeDraft).toHaveBeenCalledWith(
				'skill_a',
				expect.objectContaining({ instructions: 'new' }),
				TX_CTX,
			);
		});

		it('keeps frontmatter keys the editor does not know', async () => {
			skills.findDrafts.mockResolvedValue(
				new Map([
					[
						'skill_a',
						versionRow(skillRow('skill_a'), null, {
							frontmatter: { license: 'MIT', 'allowed-tools': 'Read' },
						}),
					],
				]),
			);

			await service.writeDraft('skill_a', { name: 'n', description: 'd', instructions: 'i' });

			expect(skills.writeDraft).toHaveBeenCalledWith(
				'skill_a',
				expect.objectContaining({ frontmatter: { license: 'MIT' } }),
				TX_CTX,
			);
		});

		it('marks no agent', async () => {
			skills.findDrafts.mockResolvedValue(
				new Map([['skill_a', versionRow(skillRow('skill_a'), null)]]),
			);

			await service.writeDraft('skill_a', { name: 'n', description: 'd', instructions: 'i' });

			expect(agents.markDraftChangedIfInSync).not.toHaveBeenCalled();
		});

		it('throws NotFoundError for a missing skill', async () => {
			await expect(
				service.writeDraft('skill_gone', { name: 'n', description: 'd', instructions: 'i' }),
			).rejects.toThrow(NotFoundError);
		});
	});

	describe('save', () => {
		const skill = skillRow('skill_a', { projectId: PROJECT });

		function givenSkill(draft: ResolvedSkillRow, latest: ResolvedSkillRow) {
			skills.findDrafts.mockResolvedValue(new Map([['skill_a', draft]]));
			skills.findLatestSaved.mockImplementation(async (ids) => {
				const rows = new Map<string, ResolvedSkillRow>();
				if (ids.includes('skill_a')) rows.set('skill_a', latest);
				return rows;
			});
			skills.nextVersionNumber.mockResolvedValue(3);
			skills.insertSavedVersion.mockResolvedValue('new-version-id');
		}

		it('creates nothing when the draft matches the latest version', async () => {
			givenSkill(versionRow(skill, null), versionRow(skill, 2));

			const result = await service.save('skill_a', user.id);

			expect(result).toEqual({ versionId: 'skill_a-v2', version: 2, created: false });
			expect(skills.insertSavedVersion).not.toHaveBeenCalled();
			expect(agents.markDraftChangedIfInSync).not.toHaveBeenCalled();
		});

		it('copies the draft into the next version under an edit lock', async () => {
			givenSkill(
				versionRow(skill, null, { instructions: 'new' }, [
					{ path: 'references/a.md', content: 'a' },
				]),
				versionRow(skill, 2),
			);

			const result = await service.save('skill_a', user.id);

			expect(result).toEqual({ versionId: 'new-version-id', version: 3, created: true });
			expect(skills.lockForEdit).toHaveBeenCalledWith(['skill_a'], TX_CTX);
			expect(skills.insertSavedVersion).toHaveBeenCalledWith(
				'skill_a',
				3,
				expect.objectContaining({
					instructions: 'new',
					files: [{ path: 'references/a.md', content: 'a' }],
				}),
				user.id,
				TX_CTX,
			);
		});

		it('marks the following agents in the same transaction', async () => {
			givenSkill(versionRow(skill, null, { instructions: 'new' }), versionRow(skill, 2));
			skills.findFollowingAgentIds.mockResolvedValue(['agent-1', 'agent-2']);

			await service.save('skill_a', user.id);

			expect(skills.findFollowingAgentIds).toHaveBeenCalledWith(['skill_a'], TX_CTX);
			expect(agents.markDraftChangedIfInSync).toHaveBeenCalledWith(['agent-1', 'agent-2'], TX_CTX);
		});

		it('clears the runtime and pushes an update for every following agent after the commit', async () => {
			givenSkill(versionRow(skill, null, { instructions: 'new' }), versionRow(skill, 2));
			skills.findFollowingAgentIds.mockResolvedValue(['agent-1', 'agent-2']);
			// agent-2 already had unpublished changes, so only agent-1 is marked.
			agents.markDraftChangedIfInSync.mockResolvedValue(['agent-1']);
			agents.findProjectIdsByIds.mockResolvedValue([
				{ id: 'agent-1', projectId: PROJECT },
				{ id: 'agent-2', projectId: PROJECT },
			]);

			await service.save('skill_a', user.id);

			expect(clearRuntimes.mock.calls).toEqual([['agent-1'], ['agent-2']]);
			expect(broadcaster.notify).toHaveBeenCalledTimes(2);
			expect(broadcaster.notify).toHaveBeenCalledWith({
				projectId: PROJECT,
				agentId: 'agent-2',
				source: 'user',
			});
		});

		it('rejects a rename that clashes on a following agent', async () => {
			givenSkill(versionRow(skill, null, { name: 'pricing' }), versionRow(skill, 2));
			skills.findFollowingAgents.mockResolvedValue([
				mock<Agent>({
					id: 'agent-1',
					name: 'Sales bot',
					schema: {
						skills: [
							{ type: 'skill', id: 'skill_a' },
							{ type: 'skill', id: 'skill_b' },
						],
					},
				}),
			]);
			skills.findLatestSaved.mockImplementation(
				async (ids) =>
					new Map(
						ids.map((id) => [
							id,
							versionRow(skillRow(id), 2, { name: id === 'skill_b' ? 'Pricing' : 'Brand voice' }),
						]),
					),
			);

			await expectError(
				service.save('skill_a', user.id),
				UserError,
				'Cannot rename to "pricing": Sales bot already uses a skill with a name like that.',
			);
			expect(skills.insertSavedVersion).not.toHaveBeenCalled();
		});

		it('allows a rename that clashes on no agent', async () => {
			givenSkill(versionRow(skill, null, { name: 'Tone' }), versionRow(skill, 2));

			await expect(service.save('skill_a', user.id)).resolves.toMatchObject({ created: true });
		});

		it('throws NotFoundError for a missing skill', async () => {
			await expect(service.save('skill_gone', user.id)).rejects.toThrow(NotFoundError);
		});
	});

	describe('publish', () => {
		it('locks the skills and pins the version each ref resolves to', async () => {
			const a = skillRow('skill_a');
			const b = skillRow('skill_b');
			const pinnedB = versionRow(b, 1);
			skills.findLatestSaved.mockResolvedValue(
				new Map([
					['skill_a', versionRow(a, 3)],
					['skill_b', versionRow(b, 2)],
				]),
			);
			skills.findVersionsByIds.mockResolvedValue(new Map([[pinnedB.version.id, pinnedB]]));

			const snapshot = await service.snapshotForPublish(
				[
					{ id: 'skill_a', enabled: false },
					{ id: 'skill_b', versionId: pinnedB.version.id },
				],
				TX_CTX,
			);
			await service.pinForPublish('agent-version-1', snapshot.versionByRef, TX_CTX);

			expect(skills.lockForPublish).toHaveBeenCalledWith(['skill_a', 'skill_b'], TX_CTX);
			expect(Object.keys(snapshot.skills)).toEqual(['skill_a', 'skill_b']);
			expect(skills.insertPins).toHaveBeenCalledWith(
				[
					{
						agentVersionId: 'agent-version-1',
						skillRefId: 'skill_a',
						skillVersionId: 'skill_a-v3',
					},
					{
						agentVersionId: 'agent-version-1',
						skillRefId: 'skill_b',
						skillVersionId: 'skill_b-v1',
					},
				],
				TX_CTX,
			);
			expect(skills.insertSavedVersion).not.toHaveBeenCalled();
		});
	});

	describe('restoreFromVersion', () => {
		it('pins each ref to the version that agent version used and writes no skill', async () => {
			const v1 = versionRow(skillRow('skill_a'), 1);
			skills.findPinned.mockResolvedValue(new Map([['skill_a', v1]]));

			const refs = await service.restoreFromVersion('agent-version-1', [
				{ id: 'skill_a', enabled: true },
				{ id: 'skill_unpinned', versionId: 'stale' },
			]);

			expect(refs).toEqual([
				{ id: 'skill_a', enabled: true, versionId: 'skill_a-v1' },
				{ id: 'skill_unpinned' },
			]);
			expect(skills.writeDraft).not.toHaveBeenCalled();
			expect(skills.insertSavedVersion).not.toHaveBeenCalled();
		});
	});

	describe('isAttachable', () => {
		it.each([
			['an instance skill', {}, true],
			['a skill of the agent project', { projectId: PROJECT }, true],
			['a skill of another project', { projectId: 'project-2' }, false],
			['a "Just you" skill', { userId: 'user-1' }, false],
		])('is %s attachable: %s', (_label, target, expected) => {
			expect(service.isAttachable(skillRow('skill_a', target), PROJECT)).toBe(expected);
		});
	});

	describe('checkRefs', () => {
		const agent = { projectId: PROJECT, skills: [{ id: 'skill_old' }] };

		function givenSkills(rows: Array<{ skill: Skill; name: string }>) {
			skills.findByIds.mockResolvedValue(rows.map((row) => row.skill));
			skills.findLatestSaved.mockImplementation(
				async (ids) =>
					new Map(
						rows
							.filter((row) => ids.includes(row.skill.id))
							.map((row) => [row.skill.id, versionRow(row.skill, 1, { name: row.name })]),
					),
			);
		}

		it('keeps a new ref to an attachable skill', async () => {
			givenSkills([
				{ skill: skillRow('skill_old', { projectId: PROJECT }), name: 'Pricing' },
				{ skill: skillRow('skill_new'), name: 'Tone' },
			]);

			const refs = await service.checkRefs(agent, [{ id: 'skill_old' }, { id: 'skill_new' }]);

			expect(refs).toEqual([{ id: 'skill_old' }, { id: 'skill_new' }]);
		});

		it('drops a new ref to a missing skill unless it is disabled', async () => {
			givenSkills([{ skill: skillRow('skill_old', { projectId: PROJECT }), name: 'Pricing' }]);

			const refs = await service.checkRefs(agent, [
				{ id: 'skill_old' },
				{ id: 'skill_gone' },
				{ id: 'skill_off', enabled: false },
			]);

			expect(refs).toEqual([{ id: 'skill_old' }, { id: 'skill_off', enabled: false }]);
		});

		it('keeps a ref the agent already had even when its skill is gone', async () => {
			const refs = await service.checkRefs(agent, [{ id: 'skill_old' }]);

			expect(refs).toEqual([{ id: 'skill_old' }]);
		});

		it.each([
			['a "Just you" skill', { userId: 'user-1' }],
			['a skill of another project', { projectId: 'project-2' }],
		])('rejects a new ref to %s', async (_label, target) => {
			givenSkills([{ skill: skillRow('skill_new', target), name: 'Tone' }]);

			await expectError(
				service.checkRefs(agent, [{ id: 'skill_new' }]),
				UserError,
				'Skill "Tone" (skill_new) is not available to this agent. An agent can use the skills of its own project and instance skills.',
			);
		});

		it('rejects a new ref whose name clashes with a skill of the agent', async () => {
			givenSkills([
				{ skill: skillRow('skill_old', { projectId: PROJECT }), name: 'Brand voice' },
				{ skill: skillRow('skill_new'), name: 'brand-voice' },
			]);

			await expectError(
				service.checkRefs(agent, [{ id: 'skill_old' }, { id: 'skill_new' }]),
				UserError,
				'This agent already has a skill with a name like "brand-voice". Rename one of them, or detach the other skill first.',
			);
		});

		it('keeps a clash the agent already had', async () => {
			const existing = { projectId: PROJECT, skills: [{ id: 'skill_a' }, { id: 'skill_b' }] };
			givenSkills([
				{ skill: skillRow('skill_a', { projectId: PROJECT }), name: 'Pricing' },
				{ skill: skillRow('skill_b', { projectId: PROJECT }), name: 'pricing' },
			]);

			const refs = await service.checkRefs(existing, [{ id: 'skill_a' }, { id: 'skill_b' }]);

			expect(refs).toHaveLength(2);
		});

		it('keeps a pin the agent already had and drops a pin it did not have', async () => {
			const pinned = {
				projectId: PROJECT,
				skills: [{ id: 'skill_a', versionId: 'v1' }, { id: 'skill_b' }],
			};
			givenSkills([
				{ skill: skillRow('skill_a', { projectId: PROJECT }), name: 'Pricing' },
				{ skill: skillRow('skill_b', { projectId: PROJECT }), name: 'Tone' },
			]);

			const refs = await service.checkRefs(pinned, [
				{ id: 'skill_a', versionId: 'v1' },
				{ id: 'skill_b', versionId: 'v9' },
			]);

			expect(refs).toEqual([{ id: 'skill_a', versionId: 'v1' }, { id: 'skill_b' }]);
		});

		it('lets a save clear a pin', async () => {
			const pinned = { projectId: PROJECT, skills: [{ id: 'skill_a', versionId: 'v1' }] };
			givenSkills([{ skill: skillRow('skill_a', { projectId: PROJECT }), name: 'Pricing' }]);

			expect(await service.checkRefs(pinned, [{ id: 'skill_a' }])).toEqual([{ id: 'skill_a' }]);
		});
	});

	describe('canEdit', () => {
		it('checks projectSkill:update on the project of a project skill', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(true);

			expect(await service.canEdit(user, skillRow('skill_a', { projectId: PROJECT }))).toBe(true);
			expect(userHasScopes).toHaveBeenCalledWith(user, ['projectSkill:update'], false, {
				projectId: PROJECT,
			});
		});

		it('lets the owner edit their "Just you" skill without a scope', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(false);

			expect(await service.canEdit(user, skillRow('skill_a', { userId: user.id }))).toBe(true);
			expect(await service.canEdit(user, skillRow('skill_a', { userId: 'other' }))).toBe(false);
		});

		it("needs skill:update for another user's skill or an instance skill", async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(true);

			expect(await service.canEdit(user, skillRow('skill_a', { userId: 'other' }))).toBe(true);
			expect(await service.canEdit(user, skillRow('skill_a'))).toBe(true);
			expect(hasGlobalScope).toHaveBeenCalledWith(user, 'skill:update');
		});

		it('refuses an instance skill without skill:update', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(false);

			expect(await service.canEdit(user, skillRow('skill_a'))).toBe(false);
		});
	});

	describe('assertCanEdit', () => {
		it('names the skills the user cannot edit', async () => {
			vi.mocked(hasGlobalScope).mockReturnValue(false);
			skills.findByIds.mockResolvedValue([skillRow('skill_a')]);
			skills.findLatestSaved.mockResolvedValue(
				new Map([['skill_a', versionRow(skillRow('skill_a'), 1, { name: 'Tone' })]]),
			);

			await expectError(
				service.assertCanEdit(user, ['skill_a']),
				ForbiddenError,
				'You can use but not edit "Tone" (skill_a). Ask someone who can edit this skill, or detach it from this agent.',
			);
		});
	});

	describe('deleteSkill', () => {
		it('deletes a skill nobody uses, under an edit lock', async () => {
			skills.findByIds.mockResolvedValue([skillRow('skill_a')]);
			skills.findUsage.mockResolvedValue({ drafts: [], pins: [] });

			await service.deleteSkill('skill_a');

			expect(skills.lockForEdit).toHaveBeenCalledWith(['skill_a'], TX_CTX);
			expect(skills.deleteSkill).toHaveBeenCalledWith('skill_a', TX_CTX);
		});

		it('refuses while agents use the skill and names them', async () => {
			skills.findByIds.mockResolvedValue([skillRow('skill_a')]);
			skills.findLatestSaved.mockResolvedValue(
				new Map([['skill_a', versionRow(skillRow('skill_a'), 2)]]),
			);
			skills.findUsage.mockResolvedValue({
				drafts: [{ agentId: 'agent-1', agentName: 'Support bot', projectId: PROJECT }],
				pins: [
					{
						agentId: 'agent-2',
						agentName: 'Sales bot',
						agentVersionId: 'v-a',
						version: 2,
						isActive: true,
					},
					{
						agentId: 'agent-2',
						agentName: 'Sales bot',
						agentVersionId: 'v-b',
						version: 1,
						isActive: false,
					},
				],
			});

			await expectError(
				service.deleteSkill('skill_a'),
				ConflictError,
				'Skill "Brand voice" is used by Support bot (draft), Sales bot (published v2, current), Sales bot (published v1) and cannot be deleted.',
			);
			expect(skills.deleteSkill).not.toHaveBeenCalled();
		});

		it('throws NotFoundError for a missing skill', async () => {
			await expect(service.deleteSkill('skill_gone')).rejects.toThrow(NotFoundError);
		});
	});
});
