/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests reference unbound methods */
import type { AgentJsonSkillConfig } from '@n8n/api-types';
import type { OperationContext, TransactionRunner, User } from '@n8n/db';
import { UserError } from '@n8n/errors';
import type { MockInstance, Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { SkillRuntimeService, SkillService, SkillTarget } from '@/modules/skills';
import { userHasScopes } from '@/permissions.ee/check-access';

import { AgentSkillRefsService } from '../agent-skill-refs.service';
import type { AgentHistory } from '../entities/agent-history.entity';
import type { Agent } from '../entities/agent.entity';
import type { AgentSkillRepository } from '../repositories/agent-skill.repository';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

const ctx: OperationContext = {};
const pinId = '0b2c6f1e-7d3a-4c1b-9f2e-5a6b7c8d9e0f';
const baseConfig = { name: 'Agent', model: 'anthropic/claude-sonnet-4-5', instructions: 'Help.' };
const agent = { id: 'agent-1', projectId: 'project-1', schema: baseConfig } as unknown as Agent;

function skillBody(name: string) {
	return { name, description: `${name} description`, instructions: `${name} instructions` };
}

describe('AgentSkillRefsService', () => {
	let agentSkillRepository: Mocked<AgentSkillRepository>;
	let skillService: Mocked<SkillService>;
	let skillRuntime: Mocked<SkillRuntimeService>;
	let checkRefs: MockInstance<AgentSkillRefsService['checkRefs']>;
	let service: AgentSkillRefsService;

	beforeEach(() => {
		// The module mock outlives each test, so clear the calls of earlier ones.
		vi.mocked(userHasScopes).mockClear();
		agentSkillRepository = mock<AgentSkillRepository>();
		skillService = mock<SkillService>();
		skillRuntime = mock<SkillRuntimeService>();
		const txRunner = mock<TransactionRunner>();
		txRunner.run.mockImplementation(async (runCtx, fn) => await fn(runCtx));
		service = new AgentSkillRefsService(agentSkillRepository, skillService, skillRuntime, txRunner);
		checkRefs = vi.spyOn(service, 'checkRefs');
		agentSkillRepository.findDependencies.mockResolvedValue(new Map());
		agentSkillRepository.findPins.mockResolvedValue([]);
		skillRuntime.resolveVersions.mockResolvedValue(new Map());
		skillRuntime.findTargets.mockImplementation(
			async (ids) => new Map(ids.map((id) => [id, { projectId: null, agentId: null }])),
		);
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
			expect(agentSkillRepository.findPins).not.toHaveBeenCalled();
		});
	});

	describe('readVersion', () => {
		it('returns the pins of the version in order and the pinned bodies', async () => {
			agentSkillRepository.findPins.mockResolvedValue([
				{ skillId: 'zeta', skillVersionId: 'zeta-v1' },
				{ skillId: 'alpha', skillVersionId: 'alpha-v3' },
			]);
			skillRuntime.resolveVersions.mockResolvedValue(
				new Map([
					['zeta-v1', { skillId: 'zeta', skill: skillBody('Zeta') }],
					['alpha-v3', { skillId: 'alpha', skill: skillBody('Alpha') }],
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
			expect(agentSkillRepository.findPins).toHaveBeenCalledWith('version-1', ctx);
		});

		it('leaves out a pin whose version is gone', async () => {
			agentSkillRepository.findPins.mockResolvedValue([
				{ skillId: 'zeta', skillVersionId: 'zeta-v1' },
				{ skillId: 'gone', skillVersionId: 'gone-v1' },
			]);
			skillRuntime.resolveVersions.mockResolvedValue(
				new Map([['zeta-v1', { skillId: 'zeta', skill: skillBody('Zeta') }]]),
			);

			const result = await service.readVersion({ versionId: 'version-1' }, ctx);

			expect(skillRuntime.resolveVersions).toHaveBeenCalledWith(['zeta-v1', 'gone-v1'], ctx);
			expect(result.skillRefs).toEqual([{ type: 'skill', id: 'zeta' }]);
			expect(Object.keys(result.skills)).toEqual(['zeta']);
		});

		it('keeps pin order for numeric skill ids', async () => {
			agentSkillRepository.findPins.mockResolvedValue([
				{ skillId: 'zeta', skillVersionId: 'zeta-v1' },
				{ skillId: '42', skillVersionId: 'numeric-v1' },
			]);
			skillRuntime.resolveVersions.mockResolvedValue(
				new Map([
					['zeta-v1', { skillId: 'zeta', skill: skillBody('Zeta') }],
					['numeric-v1', { skillId: '42', skill: skillBody('Numeric') }],
				]),
			);

			const result = await service.readVersion({ versionId: 'version-1' }, ctx);

			expect(result.skillRefs).toEqual([
				{ type: 'skill', id: 'zeta' },
				{ type: 'skill', id: '42' },
			]);
			expect(result.skills['42']?.name).toBe('Numeric');
		});
	});

	describe('skillsForRefs', () => {
		it('resolves the latest or the pinned version of each ref', async () => {
			const refs: AgentJsonSkillConfig[] = [
				{ type: 'skill', id: 'zeta' },
				{ type: 'skill', id: 'alpha', versionId: pinId },
			];
			skillRuntime.resolveForAgentDraft.mockResolvedValue({});

			await service.skillsForRefs(refs, ctx);

			expect(skillRuntime.resolveForAgentDraft).toHaveBeenCalledWith(
				[{ id: 'zeta' }, { id: 'alpha', versionId: pinId }],
				ctx,
			);
		});

		it('reads nothing for a draft without skills', async () => {
			await expect(service.skillsForRefs(undefined, ctx)).resolves.toEqual({});
			expect(skillRuntime.resolveForAgentDraft).not.toHaveBeenCalled();
		});
	});

	describe('effectiveDraftRefs', () => {
		it('returns the refs the attach check keeps and writes nothing', async () => {
			checkRefs.mockResolvedValue([{ id: 'zeta' }]);

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
			checkRefs.mockResolvedValue([{ id: 'zeta' }, { id: 'alpha', versionId: pinId }]);

			await service.replaceDraftRefs(
				agent,
				[
					{ type: 'skill', id: 'zeta' },
					{ type: 'skill', id: 'alpha', versionId: pinId },
				],
				ctx,
			);

			expect(checkRefs).toHaveBeenCalledWith(
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

		it('drops the refs to skills that are gone', async () => {
			checkRefs.mockResolvedValue([{ id: 'zeta' }, { id: 'gone' }]);
			skillRuntime.findTargets.mockResolvedValue(
				new Map([['zeta', { projectId: null, agentId: null }]]),
			);

			await service.replaceDraftRefs(agent, [{ type: 'skill', id: 'zeta' }], ctx);

			expect(agentSkillRepository.replaceDependencies).toHaveBeenCalledWith(
				'agent-1',
				[{ skillId: 'zeta', versionId: null }],
				ctx,
			);
		});

		it('removes every row when the refs are undefined', async () => {
			checkRefs.mockResolvedValue([]);

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
		agentSkillRepository.findPins.mockResolvedValue([{ skillId: 'zeta', skillVersionId: pinId }]);

		await service.restoreDraftRefs(
			agent,
			{ versionId: 'version-1' },
			[{ type: 'skill', id: 'zeta' }],
			ctx,
		);

		expect(agentSkillRepository.findPins).toHaveBeenCalledWith('version-1', ctx);
		expect(checkRefs).not.toHaveBeenCalled();
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
			skillRuntime.resolveForAgentDraft.mockResolvedValue({
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
			expect(skillRuntime.resolveForAgentDraft).toHaveBeenCalledWith(
				[{ id: 'pinned_older' }, { id: 'pinned_latest' }],
				ctx,
			);
		});

		it('reads nothing when no ref is pinned', async () => {
			await expect(
				service.findOutdatedSkillIds([{ type: 'skill', id: 'unpinned' }], {}, ctx),
			).resolves.toEqual([]);
			expect(skillRuntime.resolveForAgentDraft).not.toHaveBeenCalled();
		});
	});

	describe('createDraftRefs', () => {
		const body = { name: 'New', description: 'New description', instructions: 'Do it.' };
		const user = mock<User>({ id: 'user-1' });

		beforeEach(() => {
			checkRefs.mockImplementation(async (_agent, refs) => refs);
			skillService.createTrusted.mockResolvedValue('skill_created');
			vi.mocked(userHasScopes).mockResolvedValue(true);
		});

		it('keeps refs to skills and creates agent skills for refs with only a body', async () => {
			skillRuntime.findTargets.mockResolvedValueOnce(
				new Map([['shared', { projectId: null, agentId: null }]]),
			);

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

			expect(skillService.createTrusted).toHaveBeenCalledTimes(1);
			expect(skillService.createTrusted).toHaveBeenCalledWith(
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
			expect(checkRefs).toHaveBeenCalledWith(
				{ id: 'agent-1', projectId: 'project-1' },
				[{ id: 'shared' }, { id: 'skill_created' }],
				ctx,
			);
		});

		it('creates an agent skill without a project skill scope', async () => {
			skillRuntime.findTargets.mockResolvedValueOnce(new Map());
			vi.mocked(userHasScopes).mockResolvedValue(false);

			await expect(
				service.createDraftRefs(
					agent,
					[{ type: 'skill', id: 'seed_skill' }],
					{ seed_skill: body },
					user,
					ctx,
				),
			).resolves.toEqual([{ type: 'skill', id: 'skill_created' }]);
			// The skill is part of the agent, so the agent permission of the caller is enough.
			expect(userHasScopes).not.toHaveBeenCalled();
		});

		it('needs no skill permission for refs to skills', async () => {
			skillRuntime.findTargets.mockResolvedValueOnce(
				new Map([['shared', { projectId: null, agentId: null }]]),
			);
			vi.mocked(userHasScopes).mockResolvedValue(false);

			await expect(
				service.createDraftRefs(agent, [{ type: 'skill', id: 'shared' }], {}, user, ctx),
			).resolves.toEqual([{ type: 'skill', id: 'shared' }]);
			expect(userHasScopes).not.toHaveBeenCalled();
		});

		it('copies a skill of another agent only for the new agent', async () => {
			skillRuntime.findTargets.mockResolvedValueOnce(
				new Map([['private', { projectId: null, agentId: 'agent-source' }]]),
			);
			agentSkillRepository.findAgents.mockResolvedValue(
				new Map([['agent-source', { name: 'Source', projectId: 'project-1' }]]),
			);
			skillRuntime.resolveForAgentDraft.mockResolvedValue({ private: body });

			const refs = await service.createDraftRefs(
				agent,
				[{ type: 'skill', id: 'private' }],
				{},
				user,
				ctx,
			);

			expect(skillService.createTrusted).toHaveBeenCalledWith(
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
			skillRuntime.findTargets.mockResolvedValueOnce(
				new Map([['private', { projectId: null, agentId: 'agent-elsewhere' }]]),
			);
			agentSkillRepository.findAgents.mockResolvedValue(
				new Map([['agent-elsewhere', { name: 'Elsewhere', projectId: 'project-2' }]]),
			);

			await service.createDraftRefs(agent, [{ type: 'skill', id: 'private' }], {}, user, ctx);

			expect(skillRuntime.resolveForAgentDraft).not.toHaveBeenCalled();
			expect(skillService.createTrusted).not.toHaveBeenCalled();
			// The ref stays a plain ref, so the attach check refuses it.
			expect(checkRefs).toHaveBeenCalledWith(
				{ id: 'agent-1', projectId: 'project-1' },
				[{ id: 'private' }],
				ctx,
			);
		});

		it('creates no skill without a user', async () => {
			skillRuntime.findTargets.mockResolvedValueOnce(new Map());

			await expect(
				service.createDraftRefs(
					agent,
					[{ type: 'skill', id: 'seed_skill' }],
					{ seed_skill: body },
					null,
					ctx,
				),
			).resolves.toEqual([]);
			expect(skillService.createTrusted).not.toHaveBeenCalled();
		});
	});

	describe('createSkills', () => {
		it.each([
			['project', { projectId: 'project-1', agentId: null }],
			['agent', { projectId: null, agentId: 'agent-1' }],
			['instance', { projectId: null, agentId: null }],
		] as const)('creates a skill available to %s', async (availableTo, target) => {
			const body = { name: 'New', description: 'New description', instructions: 'Do it.' };
			skillService.createTrusted.mockResolvedValue('skill_created');

			await expect(
				service.createSkills(agent, [body], 'user-1', availableTo, 'agent', ctx),
			).resolves.toEqual(['skill_created']);
			expect(skillService.createTrusted).toHaveBeenCalledWith(
				{ target, skill: body, source: 'agent', createdById: 'user-1', checkNameTaken: true },
				ctx,
			);
		});

		it('stores the source the caller passed', async () => {
			const body = { name: 'New', description: 'New description', instructions: 'Do it.' };
			skillService.createTrusted.mockResolvedValue('skill_created');

			await service.createSkills(agent, [body], 'user-1', 'project', 'mcp', ctx);

			expect(skillService.createTrusted).toHaveBeenCalledWith(
				expect.objectContaining({ source: 'mcp' }),
				ctx,
			);
		});
	});

	describe('setAvailability', () => {
		it('moves the skill to the target of the choice, keeping this agent', async () => {
			await service.setAvailability(agent, 'skill_a', 'agent', ctx);

			expect(skillService.moveTrusted).toHaveBeenCalledWith(
				'skill_a',
				{ projectId: null, agentId: 'agent-1' },
				'agent-1',
				ctx,
				{},
			);
		});

		it('checks the name that the same save gives the skill', async () => {
			await service.setAvailability(agent, 'skill_a', 'project', ctx, {
				nameAfterMove: 'Condense',
			});

			expect(skillService.moveTrusted).toHaveBeenCalledWith(
				'skill_a',
				{ projectId: agent.projectId, agentId: null },
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
			skillRuntime.snapshotForSave.mockResolvedValue(versionByRef);

			const snapshot = await service.versionSnapshot(agent, ctx);
			await service.pinVersion('version-1', snapshot, ctx);

			expect(skillRuntime.snapshotForSave).toHaveBeenCalledWith(
				[{ id: 'zeta' }, { id: 'alpha', versionId: pinId }],
				ctx,
			);
			expect(snapshot).toEqual(versionByRef);
			expect(agentSkillRepository.insertPins).toHaveBeenCalledWith(
				[
					{ agentVersionId: 'version-1', skillId: 'zeta', skillVersionId: 'zeta-v2' },
					{ agentVersionId: 'version-1', skillId: 'alpha', skillVersionId: pinId },
				],
				ctx,
			);
		});

		it('rejects a ref that resolves to no version', async () => {
			agentSkillRepository.findDependencies.mockResolvedValue(
				new Map([['agent-1', [{ skillId: 'zeta', versionId: null }]]]),
			);
			skillRuntime.snapshotForSave.mockResolvedValue(new Map());

			await expect(service.versionSnapshot(agent, ctx)).rejects.toThrow(
				'Cannot save agent with missing skills: zeta',
			);
		});

		it('pins nothing for a draft without skills', async () => {
			const snapshot = await service.versionSnapshot(agent, ctx);
			await service.pinVersion('version-1', snapshot, ctx);

			expect(snapshot).toEqual(new Map());
			expect(skillRuntime.snapshotForSave).not.toHaveBeenCalled();
			expect(agentSkillRepository.insertPins).not.toHaveBeenCalled();
		});
	});
});

describe('AgentSkillRefsService attach check', () => {
	const PROJECT = 'project-1';
	const TX_CTX = { trx: {} } as OperationContext;
	const agentSkills = mock<AgentSkillRepository>();
	const skillService = mock<SkillService>();
	const skillRuntime = mock<SkillRuntimeService>();
	const txRunner = mock<TransactionRunner>();
	const service = new AgentSkillRefsService(agentSkills, skillService, skillRuntime, txRunner);

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

	const target = (where: Partial<SkillTarget> = {}): SkillTarget => ({
		projectId: where.projectId ?? null,
		agentId: where.agentId ?? null,
	});

	/** The skills that exist, with the name of the latest version and of pinned versions. */
	function givenSkills(
		skills: Array<{ id: string; where?: Partial<SkillTarget>; name: string }>,
		pinnedNames: Record<string, string> = {},
	) {
		skillRuntime.findTargets.mockImplementation(
			async (ids) =>
				new Map(
					skills
						.filter((skill) => ids.includes(skill.id))
						.map((skill) => [skill.id, target(skill.where)]),
				),
		);
		skillRuntime.runtimeNames.mockResolvedValue(
			(ref) =>
				(ref.versionId ? pinnedNames[ref.versionId] : undefined) ??
				skills.find((skill) => skill.id === ref.id)?.name,
		);
	}

	beforeEach(() => {
		vi.resetAllMocks();
		txRunner.run.mockImplementation(async (runCtx, fn) => await fn(runCtx));
		agentSkills.findDependencies.mockResolvedValue(new Map());
		givenSkills([]);
	});

	it('restores the pin of each ref that the agent version used and writes no skill', async () => {
		agentSkills.findPins.mockResolvedValue([{ skillId: 'skill_a', skillVersionId: 'skill_a-v1' }]);
		givenSkills([
			{ id: 'skill_a', name: 'Pricing' },
			{ id: 'skill_unpinned', name: 'Tone' },
		]);

		await service.restoreDraftRefs(
			{ id: 'agent-1' },
			{ versionId: 'agent-version-1' },
			[
				{ type: 'skill', id: 'skill_a' },
				{ type: 'skill', id: 'skill_unpinned', versionId: 'stale' },
			],
			TX_CTX,
		);

		expect(agentSkills.replaceDependencies).toHaveBeenCalledWith(
			'agent-1',
			[
				{ skillId: 'skill_a', versionId: 'skill_a-v1' },
				{ skillId: 'skill_unpinned', versionId: null },
			],
			TX_CTX,
		);
		expect(skillService.saveTrusted).not.toHaveBeenCalled();
	});

	it('drops a restored ref whose skill is gone', async () => {
		agentSkills.findPins.mockResolvedValue([
			{ skillId: 'skill_a', skillVersionId: 'skill_a-v1' },
			{ skillId: 'skill_gone', skillVersionId: 'skill_gone-v1' },
		]);
		givenSkills([{ id: 'skill_a', name: 'Pricing' }]);

		await service.restoreDraftRefs(
			{ id: 'agent-1' },
			{ versionId: 'agent-version-1' },
			[
				{ type: 'skill', id: 'skill_gone' },
				{ type: 'skill', id: 'skill_a' },
			],
			TX_CTX,
		);

		expect(skillRuntime.findTargets).toHaveBeenCalledWith(['skill_gone', 'skill_a'], TX_CTX);
		expect(agentSkills.replaceDependencies).toHaveBeenCalledWith(
			'agent-1',
			[{ skillId: 'skill_a', versionId: 'skill_a-v1' }],
			TX_CTX,
		);
	});

	it('restores no refs for a version without skills', async () => {
		agentSkills.findPins.mockResolvedValue([]);

		await service.restoreDraftRefs(
			{ id: 'agent-1' },
			{ versionId: 'agent-version-1' },
			undefined,
			TX_CTX,
		);

		expect(agentSkills.replaceDependencies).toHaveBeenCalledWith('agent-1', [], TX_CTX);
	});

	describe('assertVersionAccess', () => {
		const version = { versionId: 'agent-version-1' } as AgentHistory;

		it.each([
			[[]],
			[[{ id: 'skill_a', where: { projectId: 'another-project' }, name: 'Pricing' }]],
		])('refuses missing or inaccessible saved skills', async (skills) => {
			agentSkills.findPinnedSkillIds.mockResolvedValue(['skill_a']);
			givenSkills(skills);
			await expect(
				service.assertVersionAccess({ id: 'agent-1', projectId: PROJECT }, version, TX_CTX),
			).rejects.toThrow('A saved skill is no longer available to this agent');
		});

		it('holds the skill lock through publication and accepts an accessible skill', async () => {
			agentSkills.findPinnedSkillIds.mockResolvedValue(['skill_a']);
			givenSkills([{ id: 'skill_a', where: { projectId: PROJECT }, name: 'Pricing' }]);
			await service.assertVersionAccess({ id: 'agent-1', projectId: PROJECT }, version, TX_CTX);
			expect(skillRuntime.lockForPublish).toHaveBeenCalledWith(['skill_a'], TX_CTX);
		});
	});

	describe('isAttachable', () => {
		const agent = { id: 'agent-1', projectId: PROJECT };

		it.each([
			['an instance skill', {}, true],
			['a skill of the agent project', { projectId: PROJECT }, true],
			['a skill of another project', { projectId: 'project-2' }, false],
			['a skill of this agent', { agentId: 'agent-1' }, true],
			['a skill of another agent', { agentId: 'agent-2' }, false],
		])('is %s attachable: %s', (_label, where, expected) => {
			expect(service.isAttachable(target(where), agent)).toBe(expected);
		});
	});

	describe('checkRefs', () => {
		const agent = { id: 'agent-1', projectId: PROJECT };

		function givenAgentRefs(refs: Array<{ skillId: string; versionId?: string }>) {
			agentSkills.findDependencies.mockResolvedValue(
				new Map([['agent-1', refs.map((ref) => ({ versionId: null, ...ref }))]]),
			);
		}

		beforeEach(() => givenAgentRefs([{ skillId: 'skill_old' }]));

		it("reads the agent's current refs from its dependency rows", async () => {
			await service.checkRefs(agent, []);

			expect(agentSkills.findDependencies).toHaveBeenCalledWith(['agent-1'], {});
		});

		it('keeps a new ref to an attachable skill', async () => {
			givenSkills([
				{ id: 'skill_old', where: { projectId: PROJECT }, name: 'Pricing' },
				{ id: 'skill_new', name: 'Tone' },
			]);

			const refs = await service.checkRefs(agent, [{ id: 'skill_old' }, { id: 'skill_new' }]);

			expect(refs).toEqual([{ id: 'skill_old' }, { id: 'skill_new' }]);
		});

		it('holds a shared lock on newly attached skills in the caller transaction', async () => {
			givenSkills([
				{ id: 'skill_old', where: { projectId: PROJECT }, name: 'Pricing' },
				{ id: 'skill_new', name: 'Tone' },
			]);

			await service.checkRefs(agent, [{ id: 'skill_old' }, { id: 'skill_new' }], TX_CTX);

			expect(skillRuntime.lockForAttach).toHaveBeenCalledWith(['skill_new'], TX_CTX);
		});

		it('compares the name of the version a pinned ref runs, not the latest name', async () => {
			givenAgentRefs([{ skillId: 'skill_old', versionId: 'skill_old-v1' }]);
			// The agent runs v1, which is still called "Pricing".
			givenSkills(
				[
					{ id: 'skill_old', where: { projectId: PROJECT }, name: 'Tone' },
					{ id: 'skill_new', name: 'tone' },
				],
				{ 'skill_old-v1': 'Pricing' },
			);

			await expect(
				service.checkRefs(agent, [
					{ id: 'skill_old', versionId: 'skill_old-v1' },
					{ id: 'skill_new' },
				]),
			).resolves.toEqual([{ id: 'skill_old', versionId: 'skill_old-v1' }, { id: 'skill_new' }]);
		});

		it('drops a new ref to a missing skill', async () => {
			givenSkills([{ id: 'skill_old', where: { projectId: PROJECT }, name: 'Pricing' }]);

			const refs = await service.checkRefs(agent, [{ id: 'skill_old' }, { id: 'skill_gone' }]);

			expect(refs).toEqual([{ id: 'skill_old' }]);
		});

		it('keeps a ref the agent already had even when its skill is gone', async () => {
			const refs = await service.checkRefs(agent, [{ id: 'skill_old' }]);

			expect(refs).toEqual([{ id: 'skill_old' }]);
		});

		it.each([
			['a skill of another agent', { agentId: 'agent-2' }],
			['a skill of another project', { projectId: 'project-2' }],
		])('rejects a new ref to %s', async (_label, where) => {
			givenSkills([{ id: 'skill_new', where, name: 'Tone' }]);

			await expectError(
				service.checkRefs(agent, [{ id: 'skill_new' }]),
				UserError,
				'Skill "Tone" (skill_new) is not available to this agent. An agent can use the skills of its own project, its own skills and instance skills.',
			);
		});

		it('names a rejected skill by its id when it has no saved version', async () => {
			givenSkills([{ id: 'skill_new', where: { agentId: 'agent-2' }, name: 'Tone' }]);
			skillRuntime.runtimeNames.mockResolvedValue(() => undefined);

			await expectError(
				service.checkRefs(agent, [{ id: 'skill_new' }]),
				UserError,
				'Skill "skill_new" (skill_new) is not available to this agent. An agent can use the skills of its own project, its own skills and instance skills.',
			);
		});

		it('finds no clash for skills without a saved version', async () => {
			givenSkills([
				{ id: 'skill_old', where: { projectId: PROJECT }, name: 'Tone' },
				{ id: 'skill_new', name: 'Tone' },
			]);
			skillRuntime.runtimeNames.mockResolvedValue(() => undefined);

			await expect(
				service.checkRefs(agent, [{ id: 'skill_old' }, { id: 'skill_new' }]),
			).resolves.toEqual([{ id: 'skill_old' }, { id: 'skill_new' }]);
		});

		it('rejects a new ref whose name clashes with a skill of the agent', async () => {
			givenSkills([
				{ id: 'skill_old', where: { projectId: PROJECT }, name: 'Brand voice' },
				{ id: 'skill_new', name: 'brand-voice' },
			]);

			await expectError(
				service.checkRefs(agent, [{ id: 'skill_old' }, { id: 'skill_new' }]),
				UserError,
				'This agent already has a skill with a name like "brand-voice". Rename one of them, or detach the other skill first.',
			);
		});

		it('keeps a clash the agent already had', async () => {
			givenAgentRefs([{ skillId: 'skill_a' }, { skillId: 'skill_b' }]);
			givenSkills([
				{ id: 'skill_a', where: { projectId: PROJECT }, name: 'Pricing' },
				{ id: 'skill_b', where: { projectId: PROJECT }, name: 'pricing' },
			]);

			const refs = await service.checkRefs(agent, [{ id: 'skill_a' }, { id: 'skill_b' }]);

			expect(refs).toHaveLength(2);
		});

		it('keeps a pin the agent already had and drops a pin it did not have', async () => {
			givenAgentRefs([{ skillId: 'skill_a', versionId: 'v1' }, { skillId: 'skill_b' }]);
			givenSkills([
				{ id: 'skill_a', where: { projectId: PROJECT }, name: 'Pricing' },
				{ id: 'skill_b', where: { projectId: PROJECT }, name: 'Tone' },
			]);

			const refs = await service.checkRefs(agent, [
				{ id: 'skill_a', versionId: 'v1' },
				{ id: 'skill_b', versionId: 'v9' },
			]);

			expect(refs).toEqual([{ id: 'skill_a', versionId: 'v1' }, { id: 'skill_b' }]);
		});

		it('lets a save clear a pin', async () => {
			givenAgentRefs([{ skillId: 'skill_a', versionId: 'v1' }]);
			givenSkills([{ id: 'skill_a', where: { projectId: PROJECT }, name: 'Pricing' }]);

			expect(await service.checkRefs(agent, [{ id: 'skill_a' }])).toEqual([{ id: 'skill_a' }]);
		});
	});
});
