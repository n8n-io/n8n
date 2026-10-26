import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';

import type { SkillFile } from '../database/entities/skill-file.entity';
import {
	createSkillServices,
	PROJECT,
	TX_CTX,
	skillRow,
	versionRow,
	resetSkillMocks,
} from './test-utils/skill-services';
import type {
	AssistantSkillContext,
	AssistantSkillSummary,
	ResolvedSkillRow,
} from '../utils/skill-content';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));
vi.mock('@n8n/permissions', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/permissions')>()),
	hasGlobalScope: vi.fn(),
}));

describe('SkillRuntimeService', () => {
	const { skills, usage, txRunner, projectScope, runtime } = createSkillServices();
	const user = mock<User>({ id: 'user-1' });

	beforeEach(async () => await resetSkillMocks({ skills, usage, txRunner }));

	describe('Assistant reads', () => {
		const context: AssistantSkillContext = { user, projectId: 'project-1' };
		const summary: AssistantSkillSummary = {
			id: 'skill-1',
			projectId: null,
			name: 'Tone',
			description: 'Writing style',
			versionId: 'version-1',
			version: 1,
		};
		let row: ResolvedSkillRow;

		beforeEach(() => {
			projectScope.getProjectIds.mockResolvedValue(['project-1', 'project-2']);
			skills.findAssistantSkillSummaries.mockResolvedValue([]);
			row = versionRow(skillRow('skill-1'), 1, {
				id: 'version-1',
				name: 'Tone',
				description: 'Writing style',
				instructions: 'Be brief.',
			});
			row.skill.availableToAssistant = true;
			skills.findAssistantSkill.mockImplementation(async (id) =>
				id === row.skill.id ? row : null,
			);
			vi.mocked(userHasScopes).mockResolvedValue(true);
		});

		it.each([
			['project-1', ['project-1', 'project-2'], 'project-1'],
			['project-1', null, 'project-1'],
			['project-1', [], null],
			[undefined, null, null],
		] as const)(
			'limits catalog reads to the authorized session project (%s, %s)',
			async (projectId, allowed, expected) => {
				projectScope.getProjectIds.mockResolvedValue(allowed === null ? null : [...allowed]);
				const summaries = [{ ...summary, projectId: expected }];
				skills.findAssistantSkillSummaries.mockResolvedValue(summaries);
				expect(await runtime.listForAssistant({ ...context, projectId })).toEqual(summaries);
				expect(skills.findAssistantSkillSummaries).toHaveBeenCalledWith(expected);
			},
		);

		it('requires both list and read permissions for project skills', async () => {
			await runtime.listForAssistant(context);
			await runtime.readForAssistant(context, 'skill-1');
			expect(projectScope.getProjectIds).toHaveBeenCalledTimes(2);
			expect(projectScope.getProjectIds).toHaveBeenNthCalledWith(1, context.user, [
				'projectSkill:list',
				'projectSkill:read',
			]);
			expect(projectScope.getProjectIds).toHaveBeenNthCalledWith(2, context.user, [
				'projectSkill:list',
				'projectSkill:read',
			]);
		});

		it('refuses disabled content even when its ID is supplied', async () => {
			row.skill.availableToAssistant = false;
			expect(await runtime.readForAssistant(context, 'skill-1')).toBeNull();
		});

		it('uses the existing skill permission check for content reads', async () => {
			row.skill.projectId = 'project-1';
			vi.mocked(userHasScopes).mockResolvedValue(false);
			expect(await runtime.readForAssistant(context, 'skill-1')).toBeNull();
			expect(userHasScopes).toHaveBeenCalledWith(context.user, ['projectSkill:read'], false, {
				projectId: 'project-1',
			});
		});

		it.each([
			['project-1', ['project-1'], true, 'project-1'],
			['project-2', ['project-1', 'project-2'], false, 'project-1'],
			['project-1', [], false, null],
			['project-1', null, true, 'project-1'],
		] as const)(
			'limits content reads to the authorized session project (%s, %s)',
			async (projectId, allowed, eligible, authorizedProjectId) => {
				row.skill.projectId = projectId;
				projectScope.getProjectIds.mockResolvedValue(allowed === null ? null : [...allowed]);
				const result = await runtime.readForAssistant(context, 'skill-1');
				expect(skills.findAssistantSkill).toHaveBeenCalledWith(
					'skill-1',
					authorizedProjectId,
					undefined,
				);
				expect(skills.findLatestSaved).not.toHaveBeenCalled();
				if (eligible) expect(result).toMatchObject({ id: 'skill-1', projectId });
				else expect(result).toBeNull();
			},
		);

		it('returns no project content without a session project, including for global roles', async () => {
			row.skill.projectId = 'project-1';
			projectScope.getProjectIds.mockResolvedValue(null);
			expect(await runtime.readForAssistant({ user: context.user }, 'skill-1')).toBeNull();
			expect(skills.findAssistantSkill).toHaveBeenCalledWith('skill-1', null, undefined);
		});

		it('reads enabled content with its saved version', async () => {
			expect(await runtime.readForAssistant(context, 'skill-1')).toEqual({
				id: 'skill-1',
				projectId: null,
				versionId: 'version-1',
				version: 1,
				name: 'Tone',
				description: 'Writing style',
				instructions: 'Be brief.',
				frontmatter: null,
				files: [],
			});
		});

		it('returns the path of each saved file without its content', async () => {
			row = versionRow(row.skill, 1, { id: 'version-1' }, [
				{ path: 'ref.md', content: 'Reference' },
			]);
			expect((await runtime.readForAssistant(context, 'skill-1'))?.files).toEqual([
				{ path: 'ref.md' },
			]);
		});

		it.each(['disabled', 'agent', 'other-project', 'permission', 'missing'])(
			'refuses a reference that is %s',
			async (reason) => {
				row.skill.projectId = 'project-1';
				if (reason === 'disabled') row.skill.availableToAssistant = false;
				if (reason === 'agent') row.skill.agentId = 'agent-1';
				if (reason === 'other-project') row.skill.projectId = 'project-2';
				if (reason === 'permission') vi.mocked(userHasScopes).mockResolvedValue(false);
				skills.findAssistantSkillFile.mockResolvedValue(
					reason === 'missing'
						? null
						: {
								skill: row.skill,
								file: mock<SkillFile>({ path: 'references/guide.md', content: 'Guide.' }),
							},
				);
				expect(
					await runtime.readFileForAssistant(
						context,
						'skill-1',
						'version-1',
						'references/guide.md',
					),
				).toBeNull();
			},
		);

		it('reads the content of a reference of an enabled skill', async () => {
			skills.findAssistantSkillFile.mockResolvedValue({
				skill: row.skill,
				file: mock<SkillFile>({ path: 'references/guide.md', content: 'Guide.' }),
			});
			expect(
				await runtime.readFileForAssistant(context, 'skill-1', 'version-1', 'references/guide.md'),
			).toEqual({
				skillId: 'skill-1',
				versionId: 'version-1',
				path: 'references/guide.md',
				content: 'Guide.',
			});
		});

		it('allows instance skills without project access', async () => {
			projectScope.getProjectIds.mockResolvedValue([]);
			expect(await runtime.readForAssistant(context, 'skill-1')).not.toBeNull();
		});

		it('returns null for a missing skill', async () => {
			expect(await runtime.readForAssistant(context, 'missing')).toBeNull();
		});
	});

	describe('resolveForAgentDraft', () => {
		it('runs the latest saved version for a following ref', async () => {
			const skill = skillRow('skill_a');
			skills.findLatestSaved.mockResolvedValue(
				new Map([['skill_a', versionRow(skill, 2, { instructions: 'v2' })]]),
			);

			const resolved = await runtime.resolveForAgentDraft([{ id: 'skill_a' }]);

			expect(resolved.skill_a.instructions).toBe('v2');
		});

		it('runs the pinned version for a ref with versionId', async () => {
			const skill = skillRow('skill_a');
			const v1 = versionRow(skill, 1, { instructions: 'v1' });
			skills.findLatestSaved.mockResolvedValue(
				new Map([['skill_a', versionRow(skill, 2, { instructions: 'v2' })]]),
			);
			skills.findVersionsByIds.mockResolvedValue(new Map([[v1.version.id, v1]]));

			const resolved = await runtime.resolveForAgentDraft([
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

			const resolved = await runtime.resolveForAgentDraft([
				{ id: 'skill_a', versionId: foreign.version.id },
			]);

			expect(resolved.skill_a.instructions).toBe('v2');
		});

		it('leaves out a ref to a missing skill', async () => {
			expect(await runtime.resolveForAgentDraft([{ id: 'skill_gone' }])).toEqual({});
		});
	});

	describe('snapshotForPublish', () => {
		it('locks the skills and resolves the version each ref runs', async () => {
			skills.findLatestVersionIds.mockResolvedValue(
				new Map([
					['skill_a', 'skill_a-v3'],
					['skill_b', 'skill_b-v2'],
					['skill_c', 'skill_c-v2'],
				]),
			);
			// A pin of another skill falls back to the latest version, as at runtime.
			skills.findSkillIdsOfVersions.mockResolvedValue(
				new Map([
					['skill_b-v1', 'skill_b'],
					['skill_a-v1', 'skill_a'],
				]),
			);

			const versionByRef = await runtime.snapshotForPublish(
				[
					{ id: 'skill_a' },
					{ id: 'skill_b', versionId: 'skill_b-v1' },
					{ id: 'skill_c', versionId: 'skill_a-v1' },
				],
				TX_CTX,
			);

			expect(skills.lockForPublish).toHaveBeenCalledWith(['skill_a', 'skill_b', 'skill_c'], TX_CTX);
			expect([...versionByRef]).toEqual([
				['skill_a', 'skill_a-v3'],
				['skill_b', 'skill_b-v1'],
				['skill_c', 'skill_c-v2'],
			]);
			expect(skills.findLatestSaved).not.toHaveBeenCalled();
			expect(skills.insertSavedVersion).not.toHaveBeenCalled();
		});

		it('leaves out a ref to a missing skill', async () => {
			skills.findLatestVersionIds.mockResolvedValue(new Map([['skill_a', 'skill_a-v1']]));
			skills.findSkillIdsOfVersions.mockResolvedValue(new Map());

			const versionByRef = await runtime.snapshotForPublish(
				[{ id: 'skill_a' }, { id: 'skill_gone' }],
				TX_CTX,
			);

			expect([...versionByRef]).toEqual([['skill_a', 'skill_a-v1']]);
		});
	});

	describe('runtimeNames', () => {
		const a = skillRow('skill_a');
		const b = skillRow('skill_b');

		beforeEach(() => {
			skills.findLatestSaved.mockResolvedValue(
				new Map([
					['skill_a', versionRow(a, 3, { name: 'A latest' })],
					['skill_b', versionRow(b, 2, { name: 'B latest' })],
				]),
			);
			skills.findVersionsByIds.mockResolvedValue(
				new Map([
					['skill_a-v1', versionRow(a, 1, { name: 'A pinned' })],
					['skill_b-v1', versionRow(b, 1, { name: 'B pinned' })],
				]),
			);
		});

		it('gives a following ref the latest name', async () => {
			const nameOf = await runtime.runtimeNames([{ id: 'skill_a' }], TX_CTX);

			expect(nameOf({ id: 'skill_a' })).toBe('A latest');
			expect(nameOf({ id: 'skill_a', versionId: null })).toBe('A latest');
		});

		it('gives a ref pinned to its own version the pinned name', async () => {
			const ref = { id: 'skill_a', versionId: 'skill_a-v1' };
			const nameOf = await runtime.runtimeNames([ref], TX_CTX);

			expect(skills.findVersionsByIds).toHaveBeenCalledWith(['skill_a-v1'], TX_CTX);
			expect(nameOf(ref)).toBe('A pinned');
		});

		it("gives a ref pinned to another skill's version the latest name", async () => {
			const ref = { id: 'skill_a', versionId: 'skill_b-v1' };
			const nameOf = await runtime.runtimeNames([ref], TX_CTX);

			expect(nameOf(ref)).toBe('A latest');
		});

		it('gives undefined for a missing skill', async () => {
			const nameOf = await runtime.runtimeNames([{ id: 'skill_gone' }], TX_CTX);

			expect(nameOf({ id: 'skill_gone' })).toBeUndefined();
			expect(nameOf({ id: 'skill_gone', versionId: 'skill_gone-v1' })).toBeUndefined();
		});

		it('names two refs to one skill apart when one is pinned and one follows', async () => {
			const pinned = { id: 'skill_a', versionId: 'skill_a-v1' };
			const following = { id: 'skill_a' };
			const nameOf = await runtime.runtimeNames([pinned, following], TX_CTX);

			expect(nameOf(pinned)).toBe('A pinned');
			expect(nameOf(following)).toBe('A latest');
		});
	});

	describe('agent reads', () => {
		it('findTargets maps each found skill to its project and agent', async () => {
			skills.findByIds.mockResolvedValue([
				skillRow('skill_a', { projectId: PROJECT }),
				skillRow('skill_b', { agentId: 'agent-1' }),
			]);

			const targets = await runtime.findTargets(['skill_a', 'skill_b', 'skill_gone'], TX_CTX);

			expect(skills.findByIds).toHaveBeenCalledWith(['skill_a', 'skill_b', 'skill_gone'], TX_CTX);
			expect([...targets]).toEqual([
				['skill_a', { projectId: PROJECT, agentId: null }],
				['skill_b', { projectId: null, agentId: 'agent-1' }],
			]);
		});

		it('resolveVersions maps each version to its skill and runtime content', async () => {
			const a = skillRow('skill_a');
			skills.findVersionsByIds.mockResolvedValue(
				new Map([
					[
						'skill_a-v2',
						versionRow(a, 2, { name: 'A' }, [{ path: 'ref.md', content: 'Reference' }]),
					],
				]),
			);

			const versions = await runtime.resolveVersions(['skill_a-v2', 'skill_gone-v1'], TX_CTX);

			expect(skills.findVersionsByIds).toHaveBeenCalledWith(
				['skill_a-v2', 'skill_gone-v1'],
				TX_CTX,
			);
			expect([...versions]).toEqual([
				[
					'skill_a-v2',
					{
						skillId: 'skill_a',
						skill: {
							name: 'A',
							description: 'Write in our voice',
							instructions: 'Use short sentences.',
							references: [{ path: 'ref.md', content: 'Reference' }],
						},
					},
				],
			]);
		});
	});
});
