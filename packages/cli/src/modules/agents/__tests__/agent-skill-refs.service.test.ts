/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests reference unbound methods */
import type { AgentJsonSkillConfig } from '@n8n/api-types';
import type { OperationContext } from '@n8n/db';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { AgentSkillRefsService } from '../agent-skill-refs.service';
import type { Agent } from '../entities/agent.entity';
import type { SkillFile } from '../entities/skill-file.entity';
import type { SkillVersion } from '../entities/skill-version.entity';
import type { Skill } from '../entities/skill.entity';
import type { ResolvedSkillRow, SkillRepository } from '../repositories/skill.repository';
import type { SkillService } from '../skills/skill.service';

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
	let skillService: Mocked<SkillService>;
	let service: AgentSkillRefsService;

	beforeEach(() => {
		skillRepository = mock<SkillRepository>();
		skillService = mock<SkillService>();
		service = new AgentSkillRefsService(skillRepository, skillService);
		skillRepository.findDependencies.mockResolvedValue(new Map());
		skillRepository.findPinned.mockResolvedValue(new Map());
	});

	describe('refsForDraft', () => {
		it('returns the dependency rows in attach order, with the pins', async () => {
			skillRepository.findDependencies.mockResolvedValue(
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
			expect(skillRepository.findDependencies).toHaveBeenCalledWith(['agent-1'], ctx);
		});

		it('returns an empty list when the draft has no skills', async () => {
			await expect(service.refsForDraft(agent, ctx)).resolves.toEqual([]);
		});
	});

	describe('readVersion', () => {
		it('returns the pins of the version in order and the pinned bodies', async () => {
			skillRepository.findPinned.mockResolvedValue(
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
			expect(skillRepository.findPinned).toHaveBeenCalledWith('version-1', ctx);
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

	describe('replaceDraftRefs', () => {
		it('checks the refs and writes the dependency rows', async () => {
			skillService.checkRefs.mockResolvedValue([{ id: 'zeta' }, { id: 'alpha', versionId: pinId }]);

			await service.replaceDraftRefs(
				agent,
				[
					{ type: 'skill', id: 'zeta' },
					{ type: 'skill', id: 'alpha', versionId: pinId },
				],
				ctx,
			);

			expect(skillService.checkRefs).toHaveBeenCalledWith(
				{ id: 'agent-1', projectId: 'project-1' },
				[{ id: 'zeta' }, { id: 'alpha', versionId: pinId }],
				ctx,
			);
			expect(skillRepository.replaceDependencies).toHaveBeenCalledWith(
				'agent-1',
				[
					{ skillId: 'zeta', versionId: null },
					{ skillId: 'alpha', versionId: pinId },
				],
				ctx,
			);
		});

		it('removes every row when the refs are undefined', async () => {
			skillService.checkRefs.mockResolvedValue([]);

			await service.replaceDraftRefs(agent, undefined, ctx);

			expect(skillRepository.replaceDependencies).toHaveBeenCalledWith('agent-1', [], ctx);
		});

		it('rejects refs for an agent without a config', async () => {
			await expect(
				service.replaceDraftRefs(
					{ ...agent, schema: null } as Agent,
					[{ type: 'skill', id: 'zeta' }],
					ctx,
				),
			).rejects.toThrow('Cannot set skill refs on an agent without a config');
			expect(skillRepository.replaceDependencies).not.toHaveBeenCalled();
		});
	});

	it('restores the pins of a published version without the attach check', async () => {
		skillService.restoreFromVersion.mockResolvedValue([{ id: 'zeta', versionId: pinId }]);

		await service.restoreDraftRefs(
			agent,
			{ versionId: 'version-1' },
			[{ type: 'skill', id: 'zeta' }],
			ctx,
		);

		expect(skillService.restoreFromVersion).toHaveBeenCalledWith(
			'version-1',
			[{ id: 'zeta' }],
			ctx,
		);
		expect(skillService.checkRefs).not.toHaveBeenCalled();
		expect(skillRepository.replaceDependencies).toHaveBeenCalledWith(
			'agent-1',
			[{ skillId: 'zeta', versionId: pinId }],
			ctx,
		);
	});

	it('removes the pin of one ref and keeps the others', async () => {
		skillRepository.findDependencies.mockResolvedValue(
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

		expect(skillRepository.replaceDependencies).toHaveBeenCalledWith(
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

		beforeEach(() => {
			skillService.checkRefs.mockImplementation(async (_agent, refs) => refs);
			skillService.create.mockResolvedValue('skill_created');
		});

		it('keeps refs to hub skills and creates hub skills for refs with only a body', async () => {
			skillRepository.findByIds.mockResolvedValue([mock<Skill>({ id: 'shared' })]);

			const refs = await service.createDraftRefs(
				agent,
				[
					{ type: 'skill', id: 'shared', versionId: pinId },
					{ type: 'skill', id: 'seed_skill' },
					{ type: 'skill', id: 'unknown' },
				],
				{ shared: body, seed_skill: body },
				'user-1',
				ctx,
			);

			expect(skillService.create).toHaveBeenCalledTimes(1);
			expect(skillService.create).toHaveBeenCalledWith(
				{
					target: { userId: null, projectId: 'project-1' },
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
			expect(skillService.checkRefs).toHaveBeenCalledWith(
				{ id: 'agent-1', projectId: 'project-1' },
				[{ id: 'shared' }, { id: 'skill_created' }],
				ctx,
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

	describe('pinDraftForPublish', () => {
		it('pins each draft ref to the version it runs, in draft order', async () => {
			skillRepository.findDependencies.mockResolvedValue(
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
			skillService.snapshotForPublish.mockResolvedValue({ skills: {}, versionByRef });

			await service.pinDraftForPublish(agent, 'version-1', ctx);

			expect(skillService.snapshotForPublish).toHaveBeenCalledWith(
				[{ id: 'zeta' }, { id: 'alpha', versionId: pinId }],
				ctx,
			);
			expect(skillService.pinForPublish).toHaveBeenCalledWith('version-1', versionByRef, ctx);
		});

		it('rejects a ref that resolves to no version', async () => {
			skillRepository.findDependencies.mockResolvedValue(
				new Map([['agent-1', [{ skillId: 'zeta', versionId: null }]]]),
			);
			skillService.snapshotForPublish.mockResolvedValue({ skills: {}, versionByRef: new Map() });

			await expect(service.pinDraftForPublish(agent, 'version-1', ctx)).rejects.toThrow(
				'Cannot publish agent with missing skills: zeta',
			);
			expect(skillService.pinForPublish).not.toHaveBeenCalled();
		});

		it('pins nothing for a draft without skills', async () => {
			await service.pinDraftForPublish(agent, 'version-1', ctx);

			expect(skillService.snapshotForPublish).not.toHaveBeenCalled();
		});
	});
});
