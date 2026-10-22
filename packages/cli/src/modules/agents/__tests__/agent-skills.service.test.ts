/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/unbound-method -- async mock stubs and unbound-method references are acceptable test idioms */
import type { AgentJsonSkillConfig, AgentSkill } from '@n8n/api-types';
import type { EventService, ProjectScopeService } from '@n8n/backend-services';
import { mockLogger } from '@n8n/backend-test-utils';
import { GLOBAL_MEMBER_ROLE, type TransactionRunner, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { ConflictError, ForbiddenError, NotFoundError } from '@n8n/errors';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';

import type { AgentModificationTelemetryService } from '../agent-modification-telemetry.service';
import { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import { AgentSaveCompletionService } from '../agent-save-completion.service';
import { AgentSkillsService } from '../agent-skills.service';
import type { AgentUpdateBroadcaster } from '../agent-update-broadcaster';
import type { ProjectAgent } from '../entities/agent.entity';
import { composeJsonConfig } from '../json-config/agent-config-composition';
import type { AgentRepository } from '../repositories/agent.repository';
import type { SkillSaveResult, SkillService } from '@/modules/skills/skill.service';
import type { SkillsTelemetry } from '@/modules/skills/skills-telemetry';
import { getAgentConfigHash, getAgentSkillHash } from '../utils/agent-config-hash';
import {
	type AgentFixtureOverrides,
	type FakeAgentSkillRefsService,
	createAgentSkillRefsService,
} from './test-utils/stored-agent-config';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

const agentId = 'agent-1';
const projectId = 'project-1';
const user = { id: 'user-1' } as never;
const context = { user, modifiedBy: 'user' as const, pushRef: 'push-ref-1' };
const versionId = 'v1';
const pinId = '0b2c6f1e-7d3a-4c1b-9f2e-5a6b7c8d9e0f';
const baseConfig = {
	name: 'Test Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Be helpful',
};

const skill: AgentSkill = {
	name: 'Summarize Notes',
	description: 'Summarizes a meeting transcript',
	instructions: 'Extract decisions and action items.',
};

function makeAgent(overrides: AgentFixtureOverrides = {}): ProjectAgent {
	return {
		id: agentId,
		projectId,
		versionId,
		schema: null,
		activeVersionId: null,
		activeVersion: null,
		tools: {},
		updatedAt: new Date(),
		...overrides,
	} as unknown as ProjectAgent;
}

function saveResult(overrides: Partial<SkillSaveResult> = {}): SkillSaveResult {
	return {
		versionId: 'skill-version-2',
		version: 2,
		created: true,
		skill: { ...skill, instructions: 'New instructions.' },
		followingAgentIds: [],
		...overrides,
	};
}

describe('AgentSkillsService', () => {
	let service: AgentSkillsService;
	let agentRepository: Mocked<AgentRepository>;
	let skillService: Mocked<SkillService>;
	let skillRefs: FakeAgentSkillRefsService;
	let transactionRunner: Mocked<TransactionRunner>;
	let runtimeCacheService: Mocked<AgentRuntimeCacheService>;
	let modificationTelemetry: Mocked<AgentModificationTelemetryService>;
	let agentUpdateBroadcaster: Mocked<AgentUpdateBroadcaster>;
	let skillsTelemetry: Mocked<SkillsTelemetry>;
	let projectScopeService: Mocked<ProjectScopeService>;

	function givenAgent(overrides: AgentFixtureOverrides = {}) {
		const agent = makeAgent(overrides);
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		return agent;
	}

	beforeEach(() => {
		vi.clearAllMocks();
		Container.reset();

		agentRepository = mock<AgentRepository>();
		skillService = mock<SkillService>();
		skillRefs = createAgentSkillRefsService();
		runtimeCacheService = mock<AgentRuntimeCacheService>();
		Container.set(AgentRuntimeCacheService, runtimeCacheService);
		agentRepository.saveDraftFenced.mockResolvedValue(true);
		modificationTelemetry = mock<AgentModificationTelemetryService>();
		agentUpdateBroadcaster = mock<AgentUpdateBroadcaster>();
		transactionRunner = mock<TransactionRunner>();
		transactionRunner.run.mockImplementation(async (ctx, fn) => await fn(ctx));
		vi.mocked(userHasScopes).mockResolvedValue(true);
		skillsTelemetry = mock<SkillsTelemetry>();
		projectScopeService = mock<ProjectScopeService>();
		projectScopeService.getProjectIds.mockResolvedValue([projectId]);
		service = new AgentSkillsService(
			mockLogger(),
			agentRepository,
			new AgentSaveCompletionService(
				mock<EventService>(),
				agentUpdateBroadcaster,
				modificationTelemetry,
			),
			skillRefs,
			skillService,
			transactionRunner,
			skillsTelemetry,
			projectScopeService,
		);
	});

	describe('createAndAttachSkills', () => {
		beforeEach(() => {
			let next = 0;
			skillRefs.createSkills.mockImplementation(async (_agent, skills) =>
				skills.map(() => `skill_new${++next}`),
			);
		});

		it('creates hub skills in the agent project and attaches them in one transaction, in input order', async () => {
			skillRefs.bodies.existing = { ...skill, name: 'Existing' };
			const agent = givenAgent({
				schema: { ...baseConfig, skills: [{ type: 'skill', id: 'existing' }] },
			});
			const second = { ...skill, name: 'Second Skill' };

			const result = await service.createAndAttachSkills(
				agentId,
				projectId,
				[skill, second],
				context,
			);

			expect(result.skills.map(({ id, skill: body }) => [id, body.name])).toEqual([
				['skill_new1', 'Summarize Notes'],
				['skill_new2', 'Second Skill'],
			]);
			expect(skillRefs.createSkills).toHaveBeenCalledWith(
				agent,
				[skill, second],
				'user-1',
				'project',
				{},
			);
			expect(userHasScopes).toHaveBeenCalledWith(user, ['projectSkill:create'], false, {
				projectId,
			});
			const refs: AgentJsonSkillConfig[] = [
				{ type: 'skill', id: 'existing' },
				{ type: 'skill', id: 'skill_new1' },
				{ type: 'skill', id: 'skill_new2' },
			];
			expect(skillRefs.replaceDraftRefs).toHaveBeenCalledWith(agent, refs, {});
			expect(transactionRunner.run).toHaveBeenCalledTimes(1);
			expect(agentRepository.saveDraftFenced).toHaveBeenCalledTimes(1);
			expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledTimes(1);
			expect(result.configHash).toBe(getAgentConfigHash(composeJsonConfig(agent, refs)));
		});

		it('reports a skill that a person made in the agent builder, with the method sent', async () => {
			givenAgent({ schema: baseConfig });

			await service.createAndAttachSkill(agentId, projectId, skill, context, 'project', 'upload');

			expect(skillsTelemetry.created).toHaveBeenCalledWith(
				'user-1',
				['skill_new1'],
				'agent',
				'upload',
			);
		});

		it.each([
			['builder', 'agent'],
			['mcp', 'mcp'],
		] as const)('reports a skill that %s wrote as written with AI', async (modifiedBy, source) => {
			givenAgent({ schema: baseConfig });

			await service.createAndAttachSkills(agentId, projectId, [skill], { user, modifiedBy });

			expect(skillsTelemetry.created).toHaveBeenCalledWith('user-1', ['skill_new1'], source, 'ai');
		});

		it('reports nothing with the skills hub off', async () => {
			Object.assign(skillRefs, { usesSkillsHub: false });
			givenAgent({ schema: baseConfig });

			await service.createAndAttachSkill(agentId, projectId, skill, context);

			expect(skillsTelemetry.created).not.toHaveBeenCalled();
		});

		it('keeps allowed tools on the agent row when the skills hub is off', async () => {
			Object.assign(skillRefs, { usesSkillsHub: false });
			givenAgent({ schema: baseConfig });

			await service.createAndAttachSkill(
				agentId,
				projectId,
				{ ...skill, allowedTools: ['search'] },
				context,
			);

			expect(skillRefs.createSkills).toHaveBeenCalledWith(
				expect.anything(),
				[{ ...skill, allowedTools: ['search'] }],
				'user-1',
				'project',
				{},
			);
		});

		it('drops allowed tools from the stored skill', async () => {
			givenAgent({ schema: baseConfig });

			const result = await service.createAndAttachSkill(
				agentId,
				projectId,
				{ ...skill, allowedTools: ['search'] },
				context,
			);

			expect(result.skill).toEqual(skill);
			expect(skillRefs.createSkills).toHaveBeenCalledWith(
				expect.anything(),
				[skill],
				'user-1',
				'project',
				{},
			);
		});

		it('refuses an instance skill without the global skill create permission', async () => {
			givenAgent({ schema: baseConfig });

			const member = mock<User>({ id: 'user-1', role: GLOBAL_MEMBER_ROLE });

			await expect(
				service.createAndAttachSkill(
					agentId,
					projectId,
					skill,
					{ ...context, user: member },
					'instance',
				),
			).rejects.toThrow('You are not allowed to create skills for the whole instance.');
			expect(skillRefs.createSkills).not.toHaveBeenCalled();
		});

		it('rejects the batch without writing when the agent has no config yet', async () => {
			givenAgent();

			await expect(
				service.createAndAttachSkills(agentId, projectId, [skill], context),
			).rejects.toThrow('Agent has no JSON config yet.');
			expect(skillRefs.createSkills).not.toHaveBeenCalled();
		});

		it('rejects an empty batch before loading anything', async () => {
			await expect(service.createAndAttachSkills(agentId, projectId, [], context)).rejects.toThrow(
				'At least one skill is required.',
			);
			expect(agentRepository.findByIdAndProjectId).not.toHaveBeenCalled();
		});

		it('rejects a user who may not create skills in the project', async () => {
			givenAgent({ schema: baseConfig });
			vi.mocked(userHasScopes).mockResolvedValue(false);

			await expect(
				service.createAndAttachSkills(agentId, projectId, [skill], context),
			).rejects.toThrow(ForbiddenError);
			expect(skillRefs.createSkills).not.toHaveBeenCalled();
		});

		it('creates a skill for this agent only without a project skill scope', async () => {
			givenAgent({ schema: baseConfig });
			vi.mocked(userHasScopes).mockResolvedValue(false);
			skillRefs.createSkills.mockResolvedValue(['skill_new']);

			await service.createAndAttachSkill(agentId, projectId, skill, context, 'agent');

			expect(userHasScopes).not.toHaveBeenCalled();
			expect(skillRefs.createSkills).toHaveBeenCalledWith(
				expect.anything(),
				[skill],
				'user-1',
				'agent',
				{},
			);
		});

		it('rejects a name that is hard to tell apart from a skill of the agent', async () => {
			skillRefs.bodies.existing = skill;
			givenAgent({ schema: { ...baseConfig, skills: [{ type: 'skill', id: 'existing' }] } });

			await expect(
				service.createAndAttachSkills(
					agentId,
					projectId,
					[{ ...skill, name: ' summarize-notes ' }],
					context,
				),
			).rejects.toThrow('Agent already has a skill with a name like "summarize-notes".');
			expect(skillRefs.createSkills).not.toHaveBeenCalled();
			expect(agentRepository.saveDraftFenced).not.toHaveBeenCalled();
		});

		it('rejects two names in one batch that are hard to tell apart', async () => {
			givenAgent({ schema: baseConfig });

			await expect(
				service.createAndAttachSkills(
					agentId,
					projectId,
					[skill, { ...skill, name: 'summarize_notes' }],
					context,
				),
			).rejects.toThrow(
				'The new skills "Summarize Notes", "summarize_notes" are hard to tell apart.',
			);
			expect(skillRefs.createSkills).not.toHaveBeenCalled();
		});

		it('rejects the whole batch when one item is invalid', async () => {
			givenAgent({ schema: baseConfig });

			await expect(
				service.createAndAttachSkills(
					agentId,
					projectId,
					[skill, { ...skill, name: 'Other', instructions: '' }],
					context,
				),
			).rejects.toThrow('Invalid agent skill');
			expect(skillRefs.createSkills).not.toHaveBeenCalled();
		});
	});

	it('lists and updates every body on the agent row while the skills hub is off', async () => {
		Object.assign(skillRefs, { usesSkillsHub: false });
		// `old` has no ref, as after a ref was switched off or removed on master.
		const agent = givenAgent({
			schema: { ...baseConfig, skills: [{ type: 'skill', id: 'skill_a' }] },
			skills: { skill_a: skill, old: { ...skill, name: 'Old' } },
		});

		await expect(service.listSkills(agentId, projectId)).resolves.toEqual(agent.skills);
		await expect(service.getSkill(agentId, projectId, 'old')).resolves.toMatchObject({
			name: 'Old',
		});
		await service.updateSkill(agentId, projectId, 'old', { instructions: 'Updated.' }, context);
		expect(agent.skills.old).toMatchObject({ name: 'Old', instructions: 'Updated.' });
	});

	it('refuses a rename onto the name of an unreferenced body while the skills hub is off', async () => {
		Object.assign(skillRefs, { usesSkillsHub: false });
		givenAgent({
			schema: { ...baseConfig, skills: [{ type: 'skill', id: 'skill_a' }] },
			skills: {
				skill_a: skill,
				old: { ...skill, name: 'Old' },
				older: { ...skill, name: 'Older' },
			},
		});

		await expect(
			service.updateSkill(agentId, projectId, 'old', { name: 'older' }, context),
		).rejects.toThrow('Agent already has a skill with a name like "older".');
	});

	it('lists the skills the draft runs', async () => {
		skillRefs.bodies.skill_a = skill;
		givenAgent({ schema: { ...baseConfig, skills: [{ type: 'skill', id: 'skill_a' }] } });

		await expect(service.listSkills(agentId, projectId)).resolves.toEqual({ skill_a: skill });
		await expect(service.getSkill(agentId, projectId, 'skill_a')).resolves.toEqual(skill);
		await expect(service.getSkill(agentId, projectId, 'toString')).rejects.toThrow(NotFoundError);
	});

	describe('updateSkill', () => {
		beforeEach(() => {
			skillRefs.bodies.skill_a = skill;
			skillService.save.mockResolvedValue(saveResult());
		});

		it('changes where the skill can be added without saving a new version', async () => {
			const agent = givenAgent({
				schema: { ...baseConfig, skills: [{ type: 'skill', id: 'skill_a' }] },
				skills: { skill_a: skill },
			});
			skillRefs.availabilityOf.mockResolvedValue('project');
			skillService.assertCanMove.mockResolvedValue({ projectId, agentId: null });

			await service.updateSkill(
				agentId,
				projectId,
				'skill_a',
				{},
				context,
				undefined,
				undefined,
				'agent',
			);

			expect(skillService.assertCanEdit).toHaveBeenCalledWith(user, ['skill_a']);
			expect(skillService.assertCanMove).toHaveBeenCalledWith(user, 'skill_a');
			expect(skillRefs.setAvailability).toHaveBeenCalledWith(
				agent,
				'skill_a',
				'agent',
				{},
				// A refused move names only the agents in projects the user may read.
				{ checkedSource: { projectId, agentId: null }, agentProjectIds: [projectId] },
			);
			expect(skillService.save).not.toHaveBeenCalled();
		});

		it('refuses to change where the skill can be added without the delete permission', async () => {
			givenAgent({
				schema: { ...baseConfig, skills: [{ type: 'skill', id: 'skill_a' }] },
				skills: { skill_a: skill },
			});
			skillRefs.availabilityOf.mockResolvedValue('project');
			skillService.assertCanMove.mockRejectedValue(
				new ForbiddenError('You are not allowed to move this skill out of its scope.'),
			);

			await expect(
				service.updateSkill(
					agentId,
					projectId,
					'skill_a',
					{},
					context,
					undefined,
					undefined,
					'agent',
				),
			).rejects.toThrow('You are not allowed to move this skill out of its scope.');
			expect(skillRefs.setAvailability).not.toHaveBeenCalled();
			expect(skillService.save).not.toHaveBeenCalled();
		});

		it('writes nothing when the skill keeps where it can be added', async () => {
			givenAgent({ schema: { ...baseConfig, skills: [{ type: 'skill', id: 'skill_a' }] } });
			skillRefs.availabilityOf.mockResolvedValue('agent');

			await service.updateSkill(
				agentId,
				projectId,
				'skill_a',
				{},
				context,
				undefined,
				undefined,
				'agent',
			);

			expect(skillRefs.setAvailability).not.toHaveBeenCalled();
			expect(skillService.save).not.toHaveBeenCalled();
		});

		it('sets and clears allowed tools on the agent row when the skills hub is off', async () => {
			Object.assign(skillRefs, { usesSkillsHub: false });
			const agent = givenAgent({
				schema: { ...baseConfig, skills: [{ type: 'skill', id: 'skill_a' }] },
				skills: { skill_a: skill },
			});

			await service.updateSkill(
				agentId,
				projectId,
				'skill_a',
				{ allowedTools: ['search'] },
				context,
				getAgentSkillHash(skill),
			);
			expect(agent.skills.skill_a).toEqual({ ...skill, allowedTools: ['search'] });

			await service.updateSkill(agentId, projectId, 'skill_a', { allowedTools: [] }, context);
			expect(agent.skills.skill_a).toEqual(skill);
		});

		it('updates the body on the agent row when the skills hub is off', async () => {
			Object.assign(skillRefs, { usesSkillsHub: false });
			const agent = givenAgent({
				schema: { ...baseConfig, skills: [{ type: 'skill', id: 'skill_a' }] },
				skills: { skill_a: skill },
			});

			const result = await service.updateSkill(
				agentId,
				projectId,
				'skill_a',
				{ instructions: 'New instructions.' },
				context,
				getAgentSkillHash(skill),
			);

			expect(agent.skills.skill_a).toEqual({ ...skill, instructions: 'New instructions.' });
			expect(agentRepository.saveDraftFenced).toHaveBeenCalledWith(agent, {});
			expect(result.skill.instructions).toBe('New instructions.');
			expect(skillService.assertCanEdit).not.toHaveBeenCalled();
			expect(skillService.save).not.toHaveBeenCalled();
		});

		it('saves the next version with the skill edit permission, then refreshes the agents that follow it', async () => {
			const agent = givenAgent({
				schema: { ...baseConfig, skills: [{ type: 'skill', id: 'skill_a' }] },
				skills: { skill_a: skill },
			});
			const fresh = {
				...agent,
				versionId: 'v2',
				schema: { ...agent.schema, instructions: 'Saved by a concurrent config edit.' },
			} as ProjectAgent;
			agentRepository.findByIdAndProjectId
				.mockResolvedValueOnce(agent)
				.mockResolvedValueOnce(fresh);
			skillService.save.mockResolvedValue(saveResult({ followingAgentIds: [agentId, 'agent-2'] }));

			const result = await service.updateSkill(
				agentId,
				projectId,
				'skill_a',
				{ instructions: 'New instructions.', allowedTools: ['search'] },
				context,
				getAgentSkillHash(skill),
			);

			expect(skillService.assertCanEdit).toHaveBeenCalledWith(user, ['skill_a']);
			expect(skillsTelemetry.updated).toHaveBeenCalledWith('user-1', 'skill_a', 'agent', 2, false);
			expect(skillService.save).toHaveBeenCalledWith(
				'skill_a',
				{
					name: skill.name,
					description: skill.description,
					instructions: 'New instructions.',
					references: [],
					baseSkillHash: getAgentSkillHash(skill),
				},
				'user-1',
				{},
			);
			// The other agents get a refresh after the commit. This agent gets the save completion.
			expect(skillService.refreshFollowingAgents).toHaveBeenCalledWith(['agent-2'], 'push-ref-1');
			expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith(agentId);
			expect(agentUpdateBroadcaster.notify).toHaveBeenCalledWith(
				{ projectId, agentId, source: 'user' },
				'push-ref-1',
			);
			expect(modificationTelemetry.record).toHaveBeenCalledWith(
				expect.objectContaining({
					agent: fresh,
					config: expect.objectContaining({ instructions: 'Saved by a concurrent config edit.' }),
					changedParts: ['skills'],
				}),
			);
			expect(agentRepository.saveDraftFenced).not.toHaveBeenCalled();
			expect(result).toEqual({
				id: 'skill_a',
				skill: { ...skill, instructions: 'New instructions.' },
				skillHash: getAgentSkillHash({ ...skill, instructions: 'New instructions.' }),
				versionId: 'v2',
			});
		});

		it('reports nothing for a save that stored no new version', async () => {
			givenAgent({
				schema: { ...baseConfig, skills: [{ type: 'skill', id: 'skill_a' }] },
				skills: { skill_a: skill },
			});
			skillService.save.mockResolvedValue(saveResult({ created: false }));

			await service.updateSkill(
				agentId,
				projectId,
				'skill_a',
				{ instructions: 'New instructions.' },
				{ user, modifiedBy: 'mcp' },
			);

			expect(skillsTelemetry.updated).not.toHaveBeenCalled();
		});

		it('clears the pin of this agent when the pin is the latest version', async () => {
			const agent = givenAgent({
				schema: { ...baseConfig, skills: [{ type: 'skill', id: 'skill_a', versionId: pinId }] },
			});

			await service.updateSkill(
				agentId,
				projectId,
				'skill_a',
				{ instructions: 'New instructions.' },
				context,
				getAgentSkillHash(skill),
			);

			expect(agentRepository.saveDraftFenced).toHaveBeenCalledWith(agent, {});
			expect(skillRefs.unpinDraftRef).toHaveBeenCalledWith(agent, 'skill_a', {});
			await expect(skillRefs.refsForDraft(agent, {})).resolves.toEqual([
				{ type: 'skill', id: 'skill_a' },
			]);
			expect(skillService.save).toHaveBeenCalledWith(
				'skill_a',
				expect.objectContaining({ baseSkillHash: getAgentSkillHash(skill) }),
				'user-1',
				{},
			);
		});

		it('refuses to edit a pin to an older version', async () => {
			givenAgent({
				schema: { ...baseConfig, skills: [{ type: 'skill', id: 'skill_a', versionId: pinId }] },
			});
			const olderSkill = { ...skill, instructions: 'Older instructions.' };
			skillRefs.skillsForRefs.mockResolvedValueOnce({ skill_a: olderSkill });

			await expect(
				service.updateSkill(
					agentId,
					projectId,
					'skill_a',
					{ instructions: 'New instructions.' },
					context,
					getAgentSkillHash(olderSkill),
				),
			).rejects.toThrow(
				'This agent uses an older version of this skill. Use the latest version first, then edit the skill. To use the latest version, remove versionId from the skill ref in the agent config.',
			);
			expect(skillRefs.unpinDraftRef).not.toHaveBeenCalled();
			expect(skillService.save).not.toHaveBeenCalled();
		});

		it('rejects a stale base hash without saving', async () => {
			givenAgent({ schema: { ...baseConfig, skills: [{ type: 'skill', id: 'skill_a' }] } });

			await expect(
				service.updateSkill(
					agentId,
					projectId,
					'skill_a',
					{ instructions: 'New instructions.' },
					context,
					'stale',
				),
			).rejects.toThrow(ConflictError);
			expect(skillService.save).not.toHaveBeenCalled();
		});

		it('rejects a user who may use but not edit the skill', async () => {
			givenAgent({ schema: { ...baseConfig, skills: [{ type: 'skill', id: 'skill_a' }] } });
			skillService.assertCanEdit.mockRejectedValue(new ForbiddenError('You can use but not edit'));

			await expect(
				service.updateSkill(agentId, projectId, 'skill_a', { instructions: 'New.' }, context),
			).rejects.toThrow(ForbiddenError);
			expect(skillService.save).not.toHaveBeenCalled();
		});

		it('rejects a skill that is not attached to the agent', async () => {
			givenAgent({ schema: baseConfig });

			await expect(
				service.updateSkill(agentId, projectId, 'skill_a', { instructions: 'New.' }, context),
			).rejects.toThrow(NotFoundError);
		});

		it('saves nothing when the update does not change the skill', async () => {
			givenAgent({ schema: { ...baseConfig, skills: [{ type: 'skill', id: 'skill_a' }] } });

			const result = await service.updateSkill(
				agentId,
				projectId,
				'skill_a',
				{ name: skill.name },
				context,
			);

			expect(result).toEqual({
				id: 'skill_a',
				skill,
				skillHash: getAgentSkillHash(skill),
				versionId,
			});
			expect(skillService.assertCanEdit).not.toHaveBeenCalled();
			expect(skillService.save).not.toHaveBeenCalled();
			expect(modificationTelemetry.record).not.toHaveBeenCalled();
		});

		it('applies instruction edits to the version this agent shows', async () => {
			givenAgent({ schema: { ...baseConfig, skills: [{ type: 'skill', id: 'skill_a' }] } });

			await service.updateSkill(
				agentId,
				projectId,
				'skill_a',
				{},
				context,
				getAgentSkillHash(skill),
				[{ oldText: 'action items', newText: 'owners' }],
			);

			expect(skillService.save).toHaveBeenCalledWith(
				'skill_a',
				expect.objectContaining({ instructions: 'Extract decisions and owners.' }),
				'user-1',
				{},
			);
		});

		it('removes the references when an update clears them', async () => {
			skillRefs.bodies.skill_a = {
				...skill,
				references: [{ path: 'references/a.md', content: 'A' }],
			};
			givenAgent({ schema: { ...baseConfig, skills: [{ type: 'skill', id: 'skill_a' }] } });

			await service.updateSkill(agentId, projectId, 'skill_a', { references: [] }, context);

			expect(skillService.save).toHaveBeenCalledWith(
				'skill_a',
				expect.objectContaining({ references: [] }),
				'user-1',
				{},
			);
		});
	});

	describe('deleteSkill', () => {
		it('detaches the skill and keeps the hub skill', async () => {
			const agent = givenAgent({
				schema: {
					...baseConfig,
					skills: [
						{ type: 'skill', id: 'skill_a' },
						{ type: 'skill', id: 'skill_b' },
					],
				},
			});

			await service.deleteSkill(agentId, projectId, 'skill_a', context);

			expect(skillRefs.replaceDraftRefs).toHaveBeenCalledWith(
				agent,
				[{ type: 'skill', id: 'skill_b' }],
				{},
			);
			expect(agentRepository.saveDraftFenced).toHaveBeenCalledWith(agent, {});
			expect(skillService.deleteSkill).not.toHaveBeenCalled();
			expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith(agentId);
		});

		it('rejects a skill that is not attached to the agent', async () => {
			givenAgent({ schema: baseConfig });

			await expect(service.deleteSkill(agentId, projectId, 'skill_a', context)).rejects.toThrow(
				NotFoundError,
			);
			expect(agentRepository.saveDraftFenced).not.toHaveBeenCalled();
		});
	});
});
