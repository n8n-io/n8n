/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests reference unbound methods */
import type { AgentJsonSkillConfig, StoredAgentConfig } from '@n8n/api-types';
import { AgentsConfig } from '@n8n/config';
import type { OperationContext, User } from '@n8n/db';
import { ForbiddenError } from '@n8n/errors';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';

import { AgentSkillRefsService } from '../agent-skill-refs.service';
import type { AgentHistory } from '../entities/agent-history.entity';
import type { Agent } from '../entities/agent.entity';
import type { AgentRepository } from '../repositories/agent.repository';
import type { SkillFile } from '../entities/skill-file.entity';
import type { SkillVersion } from '../entities/skill-version.entity';
import type { Skill } from '../entities/skill.entity';
import type { ResolvedSkillRow, SkillRepository } from '../repositories/skill.repository';
import type { SkillService } from '../skills/skill.service';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

const ctx: OperationContext = {};
const pinId = '0b2c6f1e-7d3a-4c1b-9f2e-5a6b7c8d9e0f';
const baseConfig = { name: 'Agent', model: 'anthropic/claude-sonnet-4-5', instructions: 'Help.' };
const agent = { id: 'agent-1', projectId: 'project-1', schema: baseConfig } as unknown as Agent;

function row(skillId: string, versionId: string, name: string): ResolvedSkillRow {
	return {
		skill: mock<Skill>({ id: skillId, agentId: null }),
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
	let agentRepository: Mocked<AgentRepository>;
	let agentsConfig: AgentsConfig;
	let service: AgentSkillRefsService;

	beforeEach(() => {
		skillRepository = mock<SkillRepository>();
		skillService = mock<SkillService>();
		agentRepository = mock<AgentRepository>();
		agentsConfig = Object.assign(new AgentsConfig(), { skillsHubEnabled: true });
		service = new AgentSkillRefsService(
			skillRepository,
			skillService,
			agentRepository,
			agentsConfig,
		);
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

			const result = await service.readVersion(
				{ versionId: 'version-1', schema: null, skills: null },
				ctx,
			);

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

			await service.skillsForRefs(agent, refs, ctx);

			expect(skillService.resolveForAgentDraft).toHaveBeenCalledWith(
				[{ id: 'zeta' }, { id: 'alpha', versionId: pinId }],
				ctx,
			);
		});

		it('reads nothing for a draft without skills', async () => {
			await expect(service.skillsForRefs(agent, undefined, ctx)).resolves.toEqual({});
			expect(skillService.resolveForAgentDraft).not.toHaveBeenCalled();
		});
	});

	describe('effectiveDraftRefs', () => {
		it('returns the refs the attach check keeps and writes nothing', async () => {
			skillService.checkRefs.mockResolvedValue([{ id: 'zeta' }]);

			const refs = await service.effectiveDraftRefs(
				agent,
				[
					{ type: 'skill', id: 'zeta' },
					{ type: 'skill', id: 'stale' },
				],
				ctx,
			);

			expect(refs).toEqual([{ type: 'skill', id: 'zeta' }]);
			expect(skillRepository.replaceDependencies).not.toHaveBeenCalled();
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
			{ versionId: 'version-1', skills: null },
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
		const user = mock<User>({ id: 'user-1' });

		beforeEach(() => {
			skillService.checkRefs.mockImplementation(async (_agent, refs) => refs);
			skillService.create.mockResolvedValue('skill_created');
			vi.mocked(userHasScopes).mockResolvedValue(true);
		});

		it('keeps refs to hub skills and creates agent skills for refs with only a body', async () => {
			skillRepository.findByIds.mockResolvedValue([mock<Skill>({ id: 'shared', agentId: null })]);

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
					target: { projectId: null, agentId: 'agent-1' },
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

		it('refuses to create a skill when the user may not create project skills', async () => {
			skillRepository.findByIds.mockResolvedValue([]);
			vi.mocked(userHasScopes).mockResolvedValue(false);

			await expect(
				service.createDraftRefs(
					agent,
					[{ type: 'skill', id: 'seed_skill' }],
					{ seed_skill: body },
					user,
					ctx,
				),
			).rejects.toThrow(ForbiddenError);
			expect(userHasScopes).toHaveBeenCalledWith(user, ['projectSkill:create'], false, {
				projectId: 'project-1',
			});
			expect(skillService.create).not.toHaveBeenCalled();
		});

		it('needs no skill permission for refs to hub skills', async () => {
			skillRepository.findByIds.mockResolvedValue([mock<Skill>({ id: 'shared', agentId: null })]);
			vi.mocked(userHasScopes).mockResolvedValue(false);

			await expect(
				service.createDraftRefs(agent, [{ type: 'skill', id: 'shared' }], {}, user, ctx),
			).resolves.toEqual([{ type: 'skill', id: 'shared' }]);
			expect(userHasScopes).not.toHaveBeenCalled();
		});

		it('copies a skill of another agent only for the new agent', async () => {
			skillRepository.findByIds.mockResolvedValue([
				mock<Skill>({ id: 'private', agentId: 'agent-source' }),
			]);
			skillRepository.findAgents.mockResolvedValue(
				new Map([['agent-source', { name: 'Source', projectId: 'project-1' }]]),
			);
			skillService.resolveForAgentDraft.mockResolvedValue({ private: body });

			const refs = await service.createDraftRefs(
				agent,
				[{ type: 'skill', id: 'private' }],
				{},
				user,
				ctx,
			);

			expect(skillService.create).toHaveBeenCalledWith(
				{
					target: { projectId: null, agentId: 'agent-1' },
					skill: body,
					source: 'agent',
					createdById: 'user-1',
				},
				ctx,
			);
			expect(refs).toEqual([{ type: 'skill', id: 'skill_created' }]);
		});

		it('does not read or copy an agent skill of another project', async () => {
			skillRepository.findByIds.mockResolvedValue([
				mock<Skill>({ id: 'private', agentId: 'agent-elsewhere' }),
			]);
			skillRepository.findAgents.mockResolvedValue(
				new Map([['agent-elsewhere', { name: 'Elsewhere', projectId: 'project-2' }]]),
			);

			await service.createDraftRefs(agent, [{ type: 'skill', id: 'private' }], {}, user, ctx);

			expect(skillService.resolveForAgentDraft).not.toHaveBeenCalled();
			expect(skillService.create).not.toHaveBeenCalled();
			// The ref stays a plain ref, so the attach check refuses it.
			expect(skillService.checkRefs).toHaveBeenCalledWith(
				{ id: 'agent-1', projectId: 'project-1' },
				[{ id: 'private' }],
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

	describe('createSkills', () => {
		it.each([
			['project', { projectId: 'project-1', agentId: null }],
			['agent', { projectId: null, agentId: 'agent-1' }],
			['instance', { projectId: null, agentId: null }],
		] as const)('creates a hub skill available to %s', async (availableTo, target) => {
			const body = { name: 'New', description: 'New description', instructions: 'Do it.' };
			skillService.create.mockResolvedValue('skill_created');

			await expect(
				service.createSkills(agent, [body], 'user-1', availableTo, ctx),
			).resolves.toEqual(['skill_created']);
			expect(skillService.create).toHaveBeenCalledWith(
				{ target, skill: body, source: 'agent', createdById: 'user-1' },
				ctx,
			);
		});
	});

	describe('setAvailability', () => {
		it('moves the skill to the target of the choice, keeping this agent', async () => {
			await service.setAvailability(agent, 'skill_a', 'agent', ctx);

			expect(skillService.changeTarget).toHaveBeenCalledWith(
				'skill_a',
				{ projectId: null, agentId: 'agent-1' },
				'agent-1',
				ctx,
			);
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

	describe('with the skills hub off', () => {
		const notes = { name: 'Notes', description: 'Take notes', instructions: 'Write.' };
		const billing = { name: 'Billing', description: 'Bills', instructions: 'Bill.' };
		const legacyAgent = (skills: unknown[], bodies = { notes, billing }) =>
			({
				id: 'agent-1',
				projectId: 'project-1',
				schema: { ...baseConfig, skills } as unknown as StoredAgentConfig,
				skills: { ...bodies },
			}) as unknown as Agent;

		beforeEach(() => {
			agentsConfig.skillsHubEnabled = false;
		});

		it('reads the refs and bodies from the agent row and hides disabled refs', async () => {
			const draft = legacyAgent([
				{ type: 'skill', id: 'notes' },
				{ type: 'skill', id: 'billing', enabled: false },
			]);

			await expect(service.readDraft(draft, ctx)).resolves.toEqual({
				skillRefs: [{ type: 'skill', id: 'notes' }],
				skills: { notes },
			});
			expect(skillRepository.findDependencies).not.toHaveBeenCalled();
		});

		it('reads a published version from the agent_history row', async () => {
			const version = {
				versionId: 'version-1',
				schema: { ...baseConfig, skills: [{ type: 'skill', id: 'notes' }] },
				skills: { notes },
			} as unknown as AgentHistory;

			await expect(service.readVersion(version, ctx)).resolves.toEqual({
				skillRefs: [{ type: 'skill', id: 'notes' }],
				skills: { notes },
			});
			expect(skillRepository.findPinned).not.toHaveBeenCalled();
		});

		it('writes the refs to the stored config and drops refs without a body', async () => {
			const draft = legacyAgent([{ type: 'skill', id: 'notes' }]);

			await service.replaceDraftRefs(
				draft,
				[
					{ type: 'skill', id: 'billing', versionId: pinId },
					{ type: 'skill', id: 'unknown' },
				],
				ctx,
			);

			expect(draft.schema?.skills).toEqual([{ type: 'skill', id: 'billing' }]);
			expect(agentRepository.updateDraftSkills).toHaveBeenCalledWith(draft, ctx);
			expect(skillService.checkRefs).not.toHaveBeenCalled();
		});

		it('creates skills as bodies on the agent row', async () => {
			const draft = legacyAgent([], {} as never);

			const ids = await service.createSkills(draft, [notes], 'user-1', 'agent', ctx);

			expect(draft.skills).toEqual({ [ids[0]]: notes });
			expect(agentRepository.updateDraftSkills).toHaveBeenCalledWith(draft, ctx);
			expect(skillService.create).not.toHaveBeenCalled();
		});

		it('restores the refs and bodies of a published version', async () => {
			const draft = legacyAgent([{ type: 'skill', id: 'billing' }]);

			await service.restoreDraftRefs(
				draft,
				{ versionId: 'version-1', skills: { notes } },
				[{ type: 'skill', id: 'notes' }],
				ctx,
			);

			expect(draft.schema?.skills).toEqual([{ type: 'skill', id: 'notes' }]);
			expect(draft.skills).toEqual({ notes });
			expect(skillService.restoreFromVersion).not.toHaveBeenCalled();
		});

		it('copies the refs and bodies into a new published version', () => {
			const draft = legacyAgent([
				{ type: 'skill', id: 'notes' },
				{ type: 'skill', id: 'billing', enabled: false },
			]);

			expect(service.versionColumns(draft)).toEqual({ schema: draft.schema, skills: { notes } });
		});

		it('refuses to publish a ref without a body', () => {
			const draft = legacyAgent([{ type: 'skill', id: 'gone' }]);

			expect(() => service.versionColumns(draft)).toThrow(
				'Cannot publish agent with missing skill bodies: gone',
			);
		});

		it('reports no outdated skills', async () => {
			await expect(
				service.findOutdatedSkillIds([{ type: 'skill', id: 'notes', versionId: pinId }], {}, ctx),
			).resolves.toEqual([]);
		});
	});
});
