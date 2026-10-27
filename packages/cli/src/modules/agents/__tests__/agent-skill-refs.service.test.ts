/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests reference unbound methods */
import type { AgentJsonSkillConfig } from '@n8n/api-types';
import type { OperationContext, User } from '@n8n/db';
import { ConflictError, ForbiddenError } from '@n8n/errors';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { SkillFile } from '@/modules/skills/skill-file.entity';
import type { SkillVersion } from '@/modules/skills/skill-version.entity';
import type { Skill } from '@/modules/skills/skill.entity';
import type { ResolvedSkillRow, SkillRepository } from '@/modules/skills/skill.repository';
import type { SkillService } from '@/modules/skills/skill.service';
import { userHasScopes } from '@/permissions.ee/check-access';

import type { AgentSkillUsageService } from '../agent-skill-usage.service';
import { AgentSkillRefsService } from '../agent-skill-refs.service';
import type { Agent } from '../entities/agent.entity';
import type { AgentSkillRepository } from '../repositories/agent-skill.repository';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

const ctx: OperationContext = {};
const pinId = '0b2c6f1e-7d3a-4c1b-9f2e-5a6b7c8d9e0f';
const baseConfig = { name: 'Agent', model: 'anthropic/claude-sonnet-4-5', instructions: 'Help.' };
const agent = { id: 'agent-1', projectId: 'project-1', schema: baseConfig } as unknown as Agent;

function row(skillId: string, versionId: string, name: string): ResolvedSkillRow {
	return {
		skill: mock<Skill>({ id: skillId }),
		version: mock<SkillVersion>({
			id: versionId,
			skillId,
			name,
			description: `${name} description`,
			instructions: `${name} instructions`,
		}),
		files: [] as SkillFile[],
	};
}

describe('AgentSkillRefsService', () => {
	let skillRepository: Mocked<SkillRepository>;
	let agentSkillRepository: Mocked<AgentSkillRepository>;
	let skillService: Mocked<SkillService>;
	let agentSkillUsage: Mocked<AgentSkillUsageService>;
	let service: AgentSkillRefsService;

	beforeEach(() => {
		// The module mock outlives each test, so clear the calls of earlier ones.
		vi.mocked(userHasScopes).mockClear();
		skillRepository = mock<SkillRepository>();
		agentSkillRepository = mock<AgentSkillRepository>();
		skillService = mock<SkillService>();
		agentSkillUsage = mock<AgentSkillUsageService>();
		service = new AgentSkillRefsService(
			skillRepository,
			agentSkillRepository,
			skillService,
			agentSkillUsage,
		);
		agentSkillRepository.findDependencies.mockResolvedValue(new Map());
		agentSkillRepository.findPinned.mockResolvedValue(new Map());
	});

	describe('refsForDraft', () => {
		it('returns the dependency rows in attach order, with the pins', async () => {
			agentSkillRepository.findDependencies.mockResolvedValue(
				new Map([
					[
						'agent-1',
						[
							{ skillId: 'zeta', versionId: null },
							{ skillId: 'alpha', versionId: pinId },
						],
					],
				]),
			);

			await expect(service.refsForDraft(agent, ctx)).resolves.toEqual([
				{ type: 'skill', id: 'zeta' },
				{ type: 'skill', id: 'alpha', versionId: pinId },
			]);
			expect(agentSkillRepository.findDependencies).toHaveBeenCalledWith(['agent-1'], ctx);
		});

		it('returns an empty list when the draft has no skills', async () => {
			await expect(service.refsForDraft(agent, ctx)).resolves.toEqual([]);
		});
	});

	describe('refsForVersion', () => {
		it('reads the pinned skill ids in order, without the skill bodies', async () => {
			agentSkillRepository.findPinnedSkillIds.mockResolvedValue(['zeta', 'alpha']);

			const refs = await service.refsForVersion({ versionId: 'version-1' }, ctx);

			expect(refs).toEqual([
				{ type: 'skill', id: 'zeta' },
				{ type: 'skill', id: 'alpha' },
			]);
			expect(agentSkillRepository.findPinned).not.toHaveBeenCalled();
		});
	});

	describe('readVersion', () => {
		it('returns the pins of the version in order and the pinned bodies', async () => {
			agentSkillRepository.findPinned.mockResolvedValue(
				new Map([
					['zeta', row('zeta', 'zeta-v1', 'Zeta')],
					['alpha', row('alpha', 'alpha-v3', 'Alpha')],
				]),
			);

			const result = await service.readVersion({ versionId: 'version-1' }, ctx);

			expect(result.skillRefs).toEqual([
				{ type: 'skill', id: 'zeta' },
				{ type: 'skill', id: 'alpha' },
			]);
			expect(Object.keys(result.skills)).toEqual(['zeta', 'alpha']);
			expect(result.skills.alpha).toEqual({
				name: 'Alpha',
				description: 'Alpha description',
				instructions: 'Alpha instructions',
			});
			expect(agentSkillRepository.findPinned).toHaveBeenCalledWith('version-1', ctx);
		});
	});

	describe('skillsForRefs', () => {
		it('resolves the latest or the pinned version of each ref', async () => {
			const refs: AgentJsonSkillConfig[] = [
				{ type: 'skill', id: 'zeta' },
				{ type: 'skill', id: 'alpha', versionId: pinId },
			];
			skillService.resolveForAgentDraft.mockResolvedValue({});

			await service.skillsForRefs(refs, ctx);

			expect(skillService.resolveForAgentDraft).toHaveBeenCalledWith(
				[{ id: 'zeta' }, { id: 'alpha', versionId: pinId }],
				ctx,
			);
		});

		it('reads nothing for a draft without skills', async () => {
			await expect(service.skillsForRefs(undefined, ctx)).resolves.toEqual({});
			expect(skillService.resolveForAgentDraft).not.toHaveBeenCalled();
		});
	});

	describe('effectiveDraftRefs', () => {
		it('returns the refs the attach check keeps and writes nothing', async () => {
			agentSkillUsage.checkRefs.mockResolvedValue([{ id: 'zeta' }]);

			const refs = await service.effectiveDraftRefs(
				agent,
				[
					{ type: 'skill', id: 'zeta' },
					{ type: 'skill', id: 'stale' },
				],
				ctx,
			);

			expect(refs).toEqual([{ type: 'skill', id: 'zeta' }]);
			expect(agentSkillRepository.replaceDependencies).not.toHaveBeenCalled();
		});
	});

	describe('replaceDraftRefs', () => {
		it('checks the refs and writes the dependency rows', async () => {
			agentSkillUsage.checkRefs.mockResolvedValue([
				{ id: 'zeta' },
				{ id: 'alpha', versionId: pinId },
			]);

			await service.replaceDraftRefs(
				agent,
				[
					{ type: 'skill', id: 'zeta' },
					{ type: 'skill', id: 'alpha', versionId: pinId },
				],
				ctx,
			);

			expect(agentSkillUsage.checkRefs).toHaveBeenCalledWith(
				{ id: 'agent-1', projectId: 'project-1' },
				[{ id: 'zeta' }, { id: 'alpha', versionId: pinId }],
				ctx,
			);
			expect(agentSkillRepository.replaceDependencies).toHaveBeenCalledWith(
				'agent-1',
				[
					{ skillId: 'zeta', versionId: null },
					{ skillId: 'alpha', versionId: pinId },
				],
				ctx,
			);
		});

		it('removes every row when the refs are undefined', async () => {
			agentSkillUsage.checkRefs.mockResolvedValue([]);

			await service.replaceDraftRefs(agent, undefined, ctx);

			expect(agentSkillRepository.replaceDependencies).toHaveBeenCalledWith('agent-1', [], ctx);
		});

		it('rejects refs for an agent without a config', async () => {
			await expect(
				service.replaceDraftRefs(
					{ ...agent, schema: null } as Agent,
					[{ type: 'skill', id: 'zeta' }],
					ctx,
				),
			).rejects.toThrow('Cannot set skill refs on an agent without a config');
			expect(agentSkillRepository.replaceDependencies).not.toHaveBeenCalled();
		});
	});

	it('restores the pins of a published version without the attach check', async () => {
		agentSkillUsage.restoreFromVersion.mockResolvedValue([{ id: 'zeta', versionId: pinId }]);

		await service.restoreDraftRefs(
			agent,
			{ versionId: 'version-1' },
			[{ type: 'skill', id: 'zeta' }],
			ctx,
		);

		expect(agentSkillUsage.restoreFromVersion).toHaveBeenCalledWith(
			'version-1',
			[{ id: 'zeta' }],
			ctx,
		);
		expect(agentSkillUsage.checkRefs).not.toHaveBeenCalled();
		expect(agentSkillRepository.replaceDependencies).toHaveBeenCalledWith(
			'agent-1',
			[{ skillId: 'zeta', versionId: pinId }],
			ctx,
		);
	});

	it('removes the pin of one ref and keeps the others', async () => {
		agentSkillRepository.findDependencies.mockResolvedValue(
			new Map([
				[
					'agent-1',
					[
						{ skillId: 'zeta', versionId: pinId },
						{ skillId: 'alpha', versionId: 'alpha-pin' },
					],
				],
			]),
		);

		await service.unpinDraftRef(agent, 'zeta', ctx);

		expect(agentSkillRepository.replaceDependencies).toHaveBeenCalledWith(
			'agent-1',
			[
				{ skillId: 'zeta', versionId: null },
				{ skillId: 'alpha', versionId: 'alpha-pin' },
			],
			ctx,
		);
	});

	describe('findOutdatedSkillIds', () => {
		const body = (instructions: string) => ({
			name: 'Skill',
			description: 'A skill',
			instructions,
		});

		it('lists the pinned skills whose latest text differs from the pinned text', async () => {
			skillService.resolveForAgentDraft.mockResolvedValue({
				pinned_older: body('New text.'),
				pinned_latest: body('Latest text.'),
			});

			const outdated = await service.findOutdatedSkillIds(
				[
					{ type: 'skill', id: 'pinned_older', versionId: pinId },
					{ type: 'skill', id: 'pinned_latest', versionId: pinId },
					{ type: 'skill', id: 'unpinned' },
				],
				{
					pinned_older: body('Old text.'),
					pinned_latest: body('Latest text.'),
					unpinned: body('Latest text.'),
				},
				ctx,
			);

			expect(outdated).toEqual(['pinned_older']);
			expect(skillService.resolveForAgentDraft).toHaveBeenCalledWith(
				[{ id: 'pinned_older' }, { id: 'pinned_latest' }],
				ctx,
			);
		});

		it('reads nothing when no ref is pinned', async () => {
			await expect(
				service.findOutdatedSkillIds([{ type: 'skill', id: 'unpinned' }], {}, ctx),
			).resolves.toEqual([]);
			expect(skillService.resolveForAgentDraft).not.toHaveBeenCalled();
		});
	});

	describe('createDraftRefs', () => {
		const body = { name: 'New', description: 'New description', instructions: 'Do it.' };
		const user = mock<User>({ id: 'user-1' });

		beforeEach(() => {
			agentSkillUsage.checkRefs.mockImplementation(async (_agent, refs) => refs);
			skillService.create.mockResolvedValue('skill_created');
			skillService.freeNames.mockImplementation(async (names) => names);
			skillRepository.findLatestSummaries.mockResolvedValue(new Map());
			vi.mocked(userHasScopes).mockResolvedValue(true);
		});

		it('keeps refs to hub skills and creates project skills for refs with only a body', async () => {
			skillRepository.findByIds.mockResolvedValue([mock<Skill>({ id: 'shared' })]);

			const refs = await service.createDraftRefs(
				agent,
				[
					{ type: 'skill', id: 'shared', versionId: pinId },
					{ type: 'skill', id: 'seed_skill' },
					{ type: 'skill', id: 'unknown' },
				],
				{ shared: body, seed_skill: body },
				user,
				ctx,
			);

			expect(skillService.create).toHaveBeenCalledTimes(1);
			expect(skillService.create).toHaveBeenCalledWith(
				{
					target: { projectId: 'project-1' },
					skill: body,
					source: 'agent',
					createdById: 'user-1',
				},
				ctx,
			);
			expect(refs).toEqual([
				{ type: 'skill', id: 'shared' },
				{ type: 'skill', id: 'skill_created' },
			]);
			// The attach check runs on every ref, so a ref to a skill of another project fails.
			expect(agentSkillUsage.checkRefs).toHaveBeenCalledWith(
				{ id: 'agent-1', projectId: 'project-1' },
				[{ id: 'shared' }, { id: 'skill_created' }],
				ctx,
			);
		});

		it('refuses to create a project skill without the skill create permission there', async () => {
			skillRepository.findByIds.mockResolvedValue([]);
			skillService.assertCanCreate.mockRejectedValue(new ForbiddenError('No'));

			await expect(
				service.createDraftRefs(
					agent,
					[{ type: 'skill', id: 'seed_skill' }],
					{ seed_skill: body },
					user,
					ctx,
				),
			).rejects.toThrow(ForbiddenError);
			expect(skillService.assertCanCreate).toHaveBeenCalledWith(user, { projectId: 'project-1' });
			expect(skillService.create).not.toHaveBeenCalled();
		});

		it('needs no skill permission for refs to hub skills', async () => {
			skillRepository.findByIds.mockResolvedValue([mock<Skill>({ id: 'shared' })]);

			await expect(
				service.createDraftRefs(agent, [{ type: 'skill', id: 'shared' }], {}, user, ctx),
			).resolves.toEqual([{ type: 'skill', id: 'shared' }]);
			expect(skillService.assertCanCreate).not.toHaveBeenCalled();
		});

		it('gives a new skill a free name in the project', async () => {
			skillRepository.findByIds.mockResolvedValue([]);
			skillService.freeNames.mockResolvedValue(['New 2']);

			await service.createDraftRefs(
				agent,
				[{ type: 'skill', id: 'seed_skill' }],
				{ seed_skill: body },
				user,
				ctx,
			);

			expect(skillService.freeNames).toHaveBeenCalledWith(
				['New'],
				{ projectId: 'project-1' },
				ctx,
				[],
			);
			expect(skillService.create).toHaveBeenCalledWith(
				expect.objectContaining({ skill: { ...body, name: 'New 2' } }),
				ctx,
			);
		});

		it('gives a new skill a name that differs from the skills the draft keeps', async () => {
			skillRepository.findByIds.mockResolvedValue([mock<Skill>({ id: 'shared' })]);
			skillRepository.findLatestSummaries.mockResolvedValue(
				new Map([['shared', { name: 'New', description: 'Shared', version: 1 }]]),
			);

			await service.createDraftRefs(
				agent,
				[
					{ type: 'skill', id: 'shared' },
					{ type: 'skill', id: 'seed_skill' },
				],
				{ seed_skill: body },
				user,
				ctx,
			);

			expect(skillRepository.findLatestSummaries).toHaveBeenCalledWith(['shared'], ctx);
			expect(skillService.freeNames).toHaveBeenCalledWith(
				['New'],
				{ projectId: 'project-1' },
				ctx,
				['New'],
			);
		});

		it('creates no skill without a user', async () => {
			skillRepository.findByIds.mockResolvedValue([]);

			await expect(
				service.createDraftRefs(
					agent,
					[{ type: 'skill', id: 'seed_skill' }],
					{ seed_skill: body },
					null,
					ctx,
				),
			).resolves.toEqual([]);
			expect(skillService.create).not.toHaveBeenCalled();
		});
	});

	describe('importDraftSkills', () => {
		const body = { name: 'Imported', description: 'Imported description', instructions: 'Do it.' };
		const user = mock<User>({ id: 'user-1' });
		const refs = [{ type: 'skill' as const, id: 'pkg_skill' }];

		beforeEach(() => {
			agentSkillUsage.checkRefs.mockImplementation(async (_agent, checked) => checked);
			skillService.create.mockResolvedValue('pkg_skill');
		});

		it('creates a new skill with its package id in the project of the agent', async () => {
			skillRepository.findByIds.mockResolvedValue([]);

			await expect(
				service.importDraftSkills(agent, refs, { pkg_skill: body }, user, ctx),
			).resolves.toEqual([{ type: 'skill', id: 'pkg_skill' }]);

			expect(skillService.assertCanCreate).toHaveBeenCalledWith(user, { projectId: 'project-1' });
			expect(skillService.create).toHaveBeenCalledWith(
				{
					id: 'pkg_skill',
					target: { projectId: 'project-1' },
					skill: body,
					source: 'agent',
					createdById: 'user-1',
				},
				ctx,
			);
		});

		it('refuses a new skill without the create permission in the project', async () => {
			skillRepository.findByIds.mockResolvedValue([]);
			skillService.assertCanCreate.mockRejectedValue(new ForbiddenError('No'));

			await expect(
				service.importDraftSkills(agent, refs, { pkg_skill: body }, user, ctx),
			).rejects.toThrow(ForbiddenError);
			expect(skillService.create).not.toHaveBeenCalled();
		});

		it.each([
			['another project', 'project-2'],
			['the instance', null],
		])('refuses a skill id of %s and writes nothing', async (_label, projectId) => {
			skillRepository.findByIds.mockResolvedValue([mock<Skill>({ id: 'pkg_skill', projectId })]);

			await expect(
				service.importDraftSkills(agent, refs, { pkg_skill: body }, user, ctx),
			).rejects.toThrow(ConflictError);
			expect(agentSkillRepository.replaceDependencies).not.toHaveBeenCalled();
			expect(skillService.save).not.toHaveBeenCalled();
		});

		it('refuses to change a skill of the project that the user cannot edit', async () => {
			skillRepository.findByIds.mockResolvedValue([
				mock<Skill>({ id: 'pkg_skill', projectId: 'project-1' }),
			]);
			skillService.assertCanEdit.mockRejectedValue(new ForbiddenError('No'));

			await expect(
				service.importDraftSkills(agent, refs, { pkg_skill: body }, user, ctx),
			).rejects.toThrow(ForbiddenError);
			expect(skillService.assertCanEdit).toHaveBeenCalledWith(user, ['pkg_skill'], ctx);
			expect(skillService.save).not.toHaveBeenCalled();
		});
	});

	describe('createSkills', () => {
		it.each([
			['project', { projectId: 'project-1' }],
			['instance', { projectId: null }],
		] as const)('creates a hub skill available to %s', async (availableTo, target) => {
			const body = { name: 'New', description: 'New description', instructions: 'Do it.' };
			skillService.create.mockResolvedValue('skill_created');

			await expect(
				service.createSkills(agent, [body], 'user-1', availableTo, 'agent', ctx),
			).resolves.toEqual(['skill_created']);
			expect(skillService.create).toHaveBeenCalledWith(
				{ target, skill: body, source: 'agent', createdById: 'user-1', checkNameTaken: true },
				ctx,
			);
		});

		it('stores the source the caller passed', async () => {
			const body = { name: 'New', description: 'New description', instructions: 'Do it.' };
			skillService.create.mockResolvedValue('skill_created');

			await service.createSkills(agent, [body], 'user-1', 'project', 'mcp', ctx);

			expect(skillService.create).toHaveBeenCalledWith(
				expect.objectContaining({ source: 'mcp' }),
				ctx,
			);
		});
	});

	describe('setAvailability', () => {
		it('moves the skill to the target of the choice, keeping this agent', async () => {
			await service.setAvailability(agent, 'skill_a', 'instance', ctx);

			expect(skillService.changeTarget).toHaveBeenCalledWith(
				'skill_a',
				{ projectId: null },
				'agent-1',
				ctx,
				{},
			);
		});

		it('checks the name that the same save gives the skill', async () => {
			await service.setAvailability(agent, 'skill_a', 'project', ctx, {
				nameAfterMove: 'Condense',
			});

			expect(skillService.changeTarget).toHaveBeenCalledWith(
				'skill_a',
				{ projectId: agent.projectId },
				'agent-1',
				ctx,
				{ nameAfterMove: 'Condense' },
			);
		});
	});

	describe('versionSnapshot and pinVersion', () => {
		it('pins the versions the draft runs', async () => {
			agentSkillRepository.findDependencies.mockResolvedValue(
				new Map([
					[
						'agent-1',
						[
							{ skillId: 'zeta', versionId: null },
							{ skillId: 'alpha', versionId: pinId },
						],
					],
				]),
			);
			const versionByRef = new Map([
				['zeta', 'zeta-v2'],
				['alpha', pinId],
			]);
			skillService.snapshotForSave.mockResolvedValue(versionByRef);

			const snapshot = await service.versionSnapshot(agent, ctx);
			await service.pinVersion('version-1', snapshot, ctx);

			expect(skillService.snapshotForSave).toHaveBeenCalledWith(
				[{ id: 'zeta' }, { id: 'alpha', versionId: pinId }],
				ctx,
			);
			expect(snapshot).toEqual(versionByRef);
			expect(agentSkillUsage.pinForPublish).toHaveBeenCalledWith('version-1', versionByRef, ctx);
		});

		it('rejects a ref that resolves to no version', async () => {
			agentSkillRepository.findDependencies.mockResolvedValue(
				new Map([['agent-1', [{ skillId: 'zeta', versionId: null }]]]),
			);
			skillService.snapshotForSave.mockResolvedValue(new Map());

			await expect(service.versionSnapshot(agent, ctx)).rejects.toThrow(
				'Cannot save agent with missing skills: zeta',
			);
		});

		it('pins nothing for a draft without skills', async () => {
			const snapshot = await service.versionSnapshot(agent, ctx);
			await service.pinVersion('version-1', snapshot, ctx);

			expect(snapshot).toEqual(new Map());
			expect(skillService.snapshotForSave).not.toHaveBeenCalled();
			expect(agentSkillUsage.pinForPublish).not.toHaveBeenCalled();
		});
	});
});
