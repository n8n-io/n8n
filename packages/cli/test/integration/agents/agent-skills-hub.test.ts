/**
 * Agents read and write their skills through the skills hub (CONTEXT-225).
 * A draft keeps its skill refs in `agent_skill_dependency`, a published
 * version keeps its pins in `agent_history_skill`, and the skill text lives in
 * `skill_version`. These tests run the agent services against real rows.
 */
import type { AgentJsonConfig, AgentSkill } from '@n8n/api-types';
import {
	createTeamProject,
	linkUserToProject,
	mockInstance,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { AgentPublishService } from '@/modules/agents/agent-publish.service';
import { AgentRuntimeCacheService } from '@/modules/agents/agent-runtime-cache.service';
import { AgentSkillRefsService } from '@/modules/agents/agent-skill-refs.service';
import { AgentSkillsService } from '@/modules/agents/agent-skills.service';
import { AgentTaskService } from '@/modules/agents/agent-task.service';
import { AgentUpdateBroadcaster } from '@/modules/agents/agent-update-broadcaster';
import { AgentValidationService } from '@/modules/agents/agent-validation.service';
import { AgentsService } from '@/modules/agents/agents.service';
import { AgentsSettingsService } from '@/modules/agents/agents-settings.service';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { SkillRepository } from '@/modules/agents/repositories/skill.repository';
import { SkillService } from '@/modules/agents/skills/skill.service';
import { Telemetry } from '@/telemetry';

import { createMember, createOwner } from '../shared/db/users';

const config: AgentJsonConfig = { name: 'Agent', model: '', instructions: 'Help.' };

function body(name: string, instructions = `${name} instructions.`): AgentSkill {
	return { name, description: `${name} description`, instructions };
}

describe('Agent skills in the skills hub', () => {
	let owner: User;
	let editor: User;
	let project: Project;
	let agentsService: AgentsService;
	let agentSkillsService: AgentSkillsService;
	let publishService: AgentPublishService;
	let skillRefs: AgentSkillRefsService;
	let skillService: SkillService;
	let agentRepository: AgentRepository;
	const broadcaster = mockInstance(AgentUpdateBroadcaster);

	beforeAll(async () => {
		mockInstance(Telemetry);
		mockInstance(AgentRuntimeCacheService);
		mockInstance(AgentTaskService).requestReconcile.mockResolvedValue(undefined);
		const validation = mockInstance(AgentValidationService);
		validation.validateAgentEntityConfiguration.mockResolvedValue({ status: 'valid', issues: [] });
		await testModules.loadModules(['agents']);
		await testDb.init();
		await Container.get(AgentsSettingsService).setEnabled(true);
		owner = await createOwner();
		editor = await createMember();
		agentsService = Container.get(AgentsService);
		agentSkillsService = Container.get(AgentSkillsService);
		publishService = Container.get(AgentPublishService);
		skillRefs = Container.get(AgentSkillRefsService);
		skillService = Container.get(SkillService);
		agentRepository = Container.get(AgentRepository);
	});

	beforeEach(async () => {
		project = await createTeamProject();
		await linkUserToProject(editor, project, 'project:editor');
	});

	afterEach(async () => {
		await agentRepository.delete({});
		await Container.get(SkillRepository).delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const actor = () => ({ kind: 'user' as const, user: owner });

	async function createSkill(
		skill: AgentSkill,
		target: { projectId: string | null } = { projectId: project.id },
	) {
		return await skillService.create({
			target: { userId: null, projectId: target.projectId },
			skill,
			source: 'ui',
			createdById: owner.id,
		});
	}

	async function createAgent(skillIds: string[], projectId = project.id) {
		return await agentsService.create(projectId, 'Agent', {
			actor: actor(),
			schema: { ...config, skills: skillIds.map((id) => ({ type: 'skill', id })) },
		});
	}

	async function reload(agent: Agent) {
		return await agentRepository.findOneByOrFail({ id: agent.id });
	}

	async function publish(agent: Agent) {
		await publishService.publishAgent(agent.id, agent.projectId, owner, {
			by: 'user',
			trigger: 'explicit',
		});
		return await agentRepository.findByIdAndProjectId(agent.id, agent.projectId);
	}

	async function instructionsOf(skillsRecord: Record<string, AgentSkill>) {
		return Object.fromEntries(
			Object.entries(skillsRecord).map(([id, skill]) => [id, skill.instructions]),
		);
	}

	it('lists the skills of a draft and of its published version in the same attach order', async () => {
		const zeta = await createSkill(body('Zeta'));
		const alpha = await createSkill(body('Alpha'));
		const mid = await createSkill(body('Mid'));
		const agent = await createAgent([zeta, alpha, mid]);

		const published = await publish(agent);
		const draftRefs = await skillRefs.refsForDraft(agent, {});
		const publishedRefs = await skillRefs.refsForVersion(published!.activeVersion!, {});

		expect(draftRefs?.map((ref) => ref.id)).toEqual([zeta, alpha, mid]);
		expect(publishedRefs?.map((ref) => ref.id)).toEqual([zeta, alpha, mid]);
		const { skills } = await skillRefs.readVersion(published!.activeVersion!, {});
		expect(Object.keys(skills)).toEqual([zeta, alpha, mid]);
	});

	it('keeps the attach order when a config save reorders the refs', async () => {
		const first = await createSkill(body('First'));
		const second = await createSkill(body('Second'));
		const agent = await createAgent([first, second]);

		await skillRefs.replaceDraftRefs(
			agent,
			[
				{ type: 'skill', id: second },
				{ type: 'skill', id: first },
			],
			{},
		);

		expect((await skillRefs.refsForDraft(agent, {}))?.map((ref) => ref.id)).toEqual([
			first,
			second,
		]);
	});

	it('marks every following agent as changed on a shared skill save, and a published agent keeps its pinned text', async () => {
		const shared = await createSkill(body('Shared', 'Version one.'));
		const first = (await publish(await createAgent([shared])))!;
		const second = (await publish(await createAgent([shared])))!;
		expect(first.versionId).toBe(first.activeVersionId);

		await agentSkillsService.updateSkill(
			first.id,
			project.id,
			shared,
			{ instructions: 'Version two.' },
			{ user: owner, modifiedBy: 'user' },
		);

		for (const agent of [first, second]) {
			const stored = await reload(agent);
			expect(stored.versionId).not.toBe(stored.activeVersionId);
			const draft = await skillRefs.readDraft(stored, {});
			expect(await instructionsOf(draft.skills)).toEqual({ [shared]: 'Version two.' });
			const version = await skillRefs.readVersion(agent.activeVersion!, {});
			expect(await instructionsOf(version.skills)).toEqual({ [shared]: 'Version one.' });
		}
		expect(broadcaster.notify).toHaveBeenCalledWith(
			expect.objectContaining({ agentId: second.id }),
			undefined,
		);
	});

	it('reverts to the pinned versions without changing the hub', async () => {
		const skill = await createSkill(body('Skill', 'Published text.'));
		const agent = (await publish(await createAgent([skill])))!;
		await skillService.save(skill, { instructions: 'Newer text.' }, owner.id);
		const latestBefore = (await Container.get(SkillRepository).findLatestSaved([skill])).get(skill);

		await publishService.revertToPublishedAgent(agent.id, project.id, owner, 'user');

		const refs = await skillRefs.refsForDraft(agent, {});
		const pinned = (await Container.get(SkillRepository).findPinned(agent.activeVersionId!)).get(
			skill,
		);
		expect(refs).toEqual([{ type: 'skill', id: skill, versionId: pinned?.version.id }]);
		const draft = await skillRefs.readDraft(agent, {});
		expect(await instructionsOf(draft.skills)).toEqual({ [skill]: 'Published text.' });
		const latestAfter = (await Container.get(SkillRepository).findLatestSaved([skill])).get(skill);
		expect(latestAfter?.version.id).toBe(latestBefore?.version.id);
	});

	it('reverts an agent that pins an instance skill the user cannot edit', async () => {
		const instanceSkill = await createSkill(body('Instance'), { projectId: null });
		const agent = (await publish(await createAgent([instanceSkill])))!;
		await skillService.save(instanceSkill, { instructions: 'Changed by an admin.' }, owner.id);

		await publishService.revertToPublishedAgent(agent.id, project.id, editor, 'user');

		const refs = await skillRefs.refsForDraft(agent, {});
		expect(refs?.[0]).toMatchObject({ id: instanceSkill, versionId: expect.any(String) });
		await expect(
			agentSkillsService.updateSkill(
				agent.id,
				project.id,
				instanceSkill,
				{ instructions: 'Edited by the editor.' },
				{ user: editor, modifiedBy: 'user' },
			),
		).rejects.toThrow('This agent uses an older version of this skill.');
	});

	it('creates, updates and detaches a skill from the agent builder', async () => {
		const agent = await createAgent([]);
		const context = { user: editor, modifiedBy: 'builder' as const };

		const created = await agentSkillsService.createAndAttachSkill(
			agent.id,
			project.id,
			body('Triage'),
			context,
		);
		const [hubSkill] = await Container.get(SkillRepository).findByIds([created.id]);
		expect(hubSkill).toMatchObject({ projectId: project.id, userId: null, source: 'agent' });
		expect(await skillRefs.refsForDraft(agent, {})).toEqual([{ type: 'skill', id: created.id }]);

		const updated = await agentSkillsService.updateSkill(
			agent.id,
			project.id,
			created.id,
			{ instructions: 'Sort tickets by urgency.' },
			context,
			created.skillHash,
		);
		expect(updated.skill.instructions).toBe('Sort tickets by urgency.');
		await expect(
			agentSkillsService.updateSkill(
				agent.id,
				project.id,
				created.id,
				{ instructions: 'Stale edit.' },
				context,
				created.skillHash,
			),
		).rejects.toThrow('Skill was changed elsewhere');

		await agentSkillsService.deleteSkill(agent.id, project.id, created.id, context);
		expect(await skillRefs.refsForDraft(agent, {})).toEqual([]);
		expect(await Container.get(SkillRepository).findByIds([created.id])).toHaveLength(1);
	});

	it('shares the skills of a duplicated agent', async () => {
		const skill = await createSkill(body('Shared'));
		const original = await createAgent([skill]);
		const { skills } = await skillRefs.readDraft(original, {});

		const duplicate = await agentsService.create(project.id, 'Copy', {
			actor: actor(),
			user: owner,
			schema: { ...config, skills: [{ type: 'skill', id: skill }] },
			skills,
		});

		expect(await skillRefs.refsForDraft(duplicate, {})).toEqual([{ type: 'skill', id: skill }]);
		expect(await Container.get(SkillRepository).findByIds([skill])).toHaveLength(1);
	});

	it('refuses a duplicate into another project', async () => {
		const skill = await createSkill(body('Project skill'));
		const original = await createAgent([skill]);
		const { skills } = await skillRefs.readDraft(original, {});
		const otherProject = await createTeamProject();

		const duplicate = agentsService.create(otherProject.id, 'Copy', {
			actor: actor(),
			user: owner,
			schema: { ...config, skills: [{ type: 'skill', id: skill }] },
			skills,
		});

		await expect(duplicate).rejects.toThrow(UserError);
		await expect(duplicate).rejects.toThrow('is not available to this agent');
		expect(await agentRepository.findBy({ projectId: otherProject.id })).toEqual([]);
	});

	it('creates a hub skill for a seeded ref that has only a body', async () => {
		const agent = await agentsService.create(project.id, 'Seeded', {
			actor: actor(),
			schema: { ...config, skills: [{ type: 'skill', id: 'seed_skill' }] },
			skills: { seed_skill: body('Seeded skill') },
		});

		const { skillRefs: refs, skills } = await skillRefs.readDraft(agent, {});
		expect(refs).toHaveLength(1);
		expect(refs?.[0].id).not.toBe('seed_skill');
		expect(Object.values(skills)).toEqual([body('Seeded skill')]);
		const [hubSkill] = await Container.get(SkillRepository).findByIds([refs![0].id]);
		expect(hubSkill).toMatchObject({ projectId: project.id, source: 'agent' });
	});
});
