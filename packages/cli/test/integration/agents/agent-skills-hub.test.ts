/**
 * Agents read and write their skills through the skills hub (CONTEXT-225).
 * A draft keeps its skill refs in `agent_skill_dependency`, a published
 * version keeps its pins in `agent_version_skill_dependency`, and the skill text lives in
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
import { TransactionRunner, type Project, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { registerSkillAgentsProvider } from '@/modules/agents/register-skill-agents-provider';
import { AgentPublishService } from '@/modules/agents/agent-publish.service';
import { AgentRuntimeCacheService } from '@/modules/agents/agent-runtime-cache.service';
import { AgentSkillRefsService } from '@/modules/agents/agent-skill-refs.service';
import { AgentSkillsService } from '@/modules/agents/agent-skills.service';
import { AgentTaskService } from '@/modules/agents/agent-task.service';
import { AgentUpdateBroadcaster } from '@/modules/agents/agent-update-broadcaster';
import { AgentValidationService } from '@/modules/agents/agent-validation.service';
import { AgentsService } from '@/modules/agents/agents.service';
import { AgentsSettingsService } from '@/modules/agents/agents-settings.service';
import {
	type Agent,
	isProjectAgent,
	type ProjectAgent,
} from '@/modules/agents/entities/agent.entity';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { SkillRepository } from '@/modules/skills/skill.repository';
import { AgentSkillRepository } from '@/modules/agents/repositories/agent-skill.repository';
import { SkillService, toAgentSkill } from '@/modules/skills/skill.service';
import {
	markAgentDraftDirty,
	saveAgentDraftFenced,
} from '@/modules/agents/utils/agent-draft.utils';
import { getAgentSkillHash } from '@/modules/agents/utils/agent-config-hash';
import { Telemetry } from '@/telemetry';

import { createCustomRoleWithScopeSlugs } from '../shared/db/roles';
import { createMember, createOwner, createUser } from '../shared/db/users';

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
		validation.validateAgentHistoryConfiguration.mockResolvedValue({ status: 'valid', issues: [] });
		await testModules.loadModules(['skills', 'agents']);
		await testDb.init();
		registerSkillAgentsProvider();
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
			target: { projectId: target.projectId },
			skill,
			source: 'ui',
			createdById: owner.id,
		});
	}

	/** Saves new instructions on top of the latest version, as an editor does. */
	async function saveInstructions(skillId: string, instructions: string) {
		const latest = (await Container.get(SkillRepository).findLatestSaved([skillId])).get(skillId);
		if (!latest) throw new Error(`Skill ${skillId} not found`);
		const baseSkillHash = getAgentSkillHash(toAgentSkill(latest));
		return await skillService.save(skillId, { instructions, baseSkillHash }, owner.id);
	}

	async function createAgent(skillIds: string[], projectId = project.id) {
		return await agentsService.create(projectId, 'Agent', {
			actor: actor(),
			schema: { ...config, skills: skillIds.map((id) => ({ type: 'skill', id })) },
		});
	}

	async function reload(agent: Agent): Promise<ProjectAgent> {
		const found = await agentRepository.findOneByOrFail({ id: agent.id });
		if (!isProjectAgent(found)) throw new Error(`Agent "${agent.id}" is not a project agent`);
		return found;
	}

	async function publish(agent: ProjectAgent) {
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

	it('saves each shared-skill edit as a complete draft version', async () => {
		const skill = await createSkill(body('Writing', 'First instructions'));
		const agent = await createAgent([skill]);
		await saveInstructions(skill, 'Second instructions');
		const second = await reload(agent);
		await saveInstructions(skill, 'Third instructions');
		const third = await reload(agent);
		expect(new Set([agent.versionId, second.versionId, third.versionId]).size).toBe(3);
		const history = Container.get(AgentHistoryRepository);
		for (const [versionId, instructions] of [
			[agent.versionId, 'First instructions'],
			[second.versionId, 'Second instructions'],
			[third.versionId, 'Third instructions'],
		]) {
			const saved = await history.findByVersionAndAgentId(versionId!, agent.id);
			expect(saved).not.toBeNull();
			const snapshot = await skillRefs.readVersion(saved!, {});
			expect(snapshot.skills[skill]?.instructions).toBe(instructions);
			expect(saved?.skills).toBeNull();
		}
		expect(third.activeVersionId).toBeNull();
	});

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

	it('keeps the attach order when the refs are written in another order', async () => {
		const first = await createSkill(body('First'));
		const second = await createSkill(body('Second'));
		const agent = await reload(await createAgent([first, second]));

		// As a config save does: advance the draft and write the refs in one transaction.
		markAgentDraftDirty(agent);
		await Container.get(TransactionRunner).run({}, async (ctx) => {
			await saveAgentDraftFenced(agentRepository, agent, ctx);
			await skillRefs.replaceDraftRefs(
				agent,
				[
					{ type: 'skill', id: second },
					{ type: 'skill', id: first },
				],
				ctx,
			);
		});

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
		await saveInstructions(skill, 'Newer text.');
		const latestBefore = (await Container.get(SkillRepository).findLatestSaved([skill])).get(skill);

		await publishService.revertToPublishedAgent(agent.id, project.id, owner, 'user');

		const refs = await skillRefs.refsForDraft(agent, {});
		const pinned = (
			await Container.get(AgentSkillRepository).findPinned(agent.activeVersionId!)
		).get(skill);
		expect(refs).toEqual([{ type: 'skill', id: skill, versionId: pinned?.version.id }]);
		const draft = await skillRefs.readDraft(agent, {});
		expect(await instructionsOf(draft.skills)).toEqual({ [skill]: 'Published text.' });
		const latestAfter = (await Container.get(SkillRepository).findLatestSaved([skill])).get(skill);
		expect(latestAfter?.version.id).toBe(latestBefore?.version.id);
	});

	it('reverts an agent that pins an instance skill the user cannot edit', async () => {
		const instanceSkill = await createSkill(body('Instance'), { projectId: null });
		const agent = (await publish(await createAgent([instanceSkill])))!;
		await saveInstructions(instanceSkill, 'Changed by an admin.');

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

	it('refuses a skill from the agent builder whose name a skill of its project has', async () => {
		await createSkill(body('Triage'));
		const agent = await createAgent([]);

		await expect(
			agentSkillsService.createAndAttachSkill(agent.id, project.id, body('TRIAGE'), {
				user: editor,
				modifiedBy: 'builder',
			}),
		).rejects.toThrow('That name is taken, choose another');
	});

	it('lets the agent builder use a name that only an instance skill has', async () => {
		await createSkill(body('Triage'), { projectId: null });
		const agent = await createAgent([]);

		const created = await agentSkillsService.createAndAttachSkill(
			agent.id,
			project.id,
			body('Triage'),
			{ user: editor, modifiedBy: 'builder' },
		);

		expect(created.id).toBeDefined();
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
		expect(hubSkill).toMatchObject({ projectId: project.id, source: 'agent' });
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

	it('publishes the skills as pins and writes no agent_history.skills', async () => {
		const skill = await createSkill(body('Published', 'Published text.'));
		const published = (await publish(await createAgent([skill])))!;
		const version = published.activeVersion!;

		expect(version.skills).toBeNull();
		expect(version.schema).not.toHaveProperty('skills');
		// The pins hold the skills of the version.
		const { skillRefs: refs, skills } = await skillRefs.readVersion(version, {});
		expect(refs).toEqual([{ type: 'skill', id: skill }]);
		expect(await instructionsOf(skills)).toEqual({ [skill]: 'Published text.' });
	});

	it('does not write agents.skills on skill writes, publish or revert', async () => {
		const agent = await createAgent([]);
		// A value that an earlier release wrote.
		const oldSkills = { old: body('Old') };
		const stored = await reload(agent);
		stored.skills = oldSkills;
		await agentRepository.save(stored);
		const context = { user: editor, modifiedBy: 'builder' as const };

		const created = await agentSkillsService.createAndAttachSkill(
			agent.id,
			project.id,
			body('Triage'),
			context,
		);
		await agentSkillsService.updateSkill(
			agent.id,
			project.id,
			created.id,
			{ instructions: 'Sort tickets by urgency.' },
			context,
			created.skillHash,
		);
		const published = (await publish(await reload(agent)))!;
		await agentSkillsService.deleteSkill(agent.id, project.id, created.id, context);
		await publishService.revertToPublishedAgent(agent.id, project.id, owner, 'user');

		const row = await reload(agent);
		expect(row.skills).toEqual(oldSkills);
		// The revert pins the ref to the published version.
		expect(await skillRefs.refsForDraft(row, {})).toEqual([
			{ type: 'skill', id: created.id, versionId: expect.any(String) },
		]);
		expect(published.activeVersion?.skills).toBeNull();
	});

	it('refuses to move a skill out of a scope where the user cannot delete it', async () => {
		// A custom role that may create and edit instance skills but delete none.
		const role = await createCustomRoleWithScopeSlugs(
			['skill:create', 'skill:read', 'skill:update'],
			{
				roleType: 'global',
			},
		);
		const noDelete = await createUser({ role });
		await linkUserToProject(noDelete, project, 'project:editor');
		const instanceSkill = await createSkill(body('Company glossary'), { projectId: null });
		const agent = await createAgent([instanceSkill]);

		await expect(
			agentSkillsService.updateSkill(
				agent.id,
				project.id,
				instanceSkill,
				{},
				{ user: noDelete, modifiedBy: 'user' },
				undefined,
				undefined,
				'project',
			),
		).rejects.toThrow('You are not allowed to move this skill out of its scope.');
		expect((await Container.get(SkillRepository).findByIds([instanceSkill]))[0]).toMatchObject({
			projectId: null,
		});
	});

	it('refuses to move a project skill for a project role without delete', async () => {
		const role = await createCustomRoleWithScopeSlugs(
			['projectSkill:create', 'projectSkill:read', 'projectSkill:update'],
			{ roleType: 'project' },
		);
		const noDelete = await createMember();
		await linkUserToProject(noDelete, project, role.slug as never);
		const projectSkill = await createSkill(body('Tone of voice'));
		const agent = await createAgent([projectSkill]);

		await expect(
			agentSkillsService.updateSkill(
				agent.id,
				project.id,
				projectSkill,
				{},
				{ user: noDelete, modifiedBy: 'user' },
				undefined,
				undefined,
				'instance',
			),
		).rejects.toThrow('You are not allowed to move this skill out of its scope.');
		expect((await Container.get(SkillRepository).findByIds([projectSkill]))[0]).toMatchObject({
			projectId: project.id,
		});
	});

	it('trims the name of a skill the agent page creates, and refuses a blank one', async () => {
		const agent = await createAgent([]);
		const context = { user: editor, modifiedBy: 'user' as const };

		await expect(
			agentSkillsService.createAndAttachSkill(agent.id, project.id, body('   '), context),
		).rejects.toThrow('Skill name is required.');
		const created = await agentSkillsService.createAndAttachSkill(
			agent.id,
			project.id,
			body('  Summarize  '),
			context,
		);

		// The answer and its hash match the stored skill, so the next edit passes the base check.
		expect(created.skill.name).toBe('Summarize');
		const { skills } = await skillRefs.readDraft(await reload(agent), {});
		expect(skills[created.id]?.name).toBe('Summarize');
		expect(created.skillHash).toBe(getAgentSkillHash(skills[created.id]!));
	});

	it('changes where a skill can be added only while every other agent keeps it', async () => {
		const agent = await createAgent([]);
		// Only the owner may put a skill on the whole instance.
		const context = { user: owner, modifiedBy: 'user' as const };
		const created = await agentSkillsService.createAndAttachSkill(
			agent.id,
			project.id,
			body('Movable'),
			context,
		);

		const update = async (availableTo: 'project' | 'instance') =>
			await agentSkillsService.updateSkill(
				agent.id,
				project.id,
				created.id,
				{},
				context,
				undefined,
				undefined,
				availableTo,
			);

		await update('instance');
		expect((await Container.get(SkillRepository).findByIds([created.id]))[0]).toMatchObject({
			projectId: null,
		});
		const elsewhere = await createTeamProject();
		const other = await createAgent([created.id], elsewhere.id);
		await expect(update('project')).rejects.toThrow('would lose access to this skill.');
		expect((await Container.get(SkillRepository).findByIds([created.id]))[0]).toMatchObject({
			projectId: null,
		});

		// A published pin counts too, after the draft no longer refers to the skill.
		await publish(await reload(other));
		await skillRefs.replaceDraftRefs(await reload(other), [], {});
		expect(await skillRefs.refsForDraft(await reload(other), {})).toEqual([]);
		await expect(update('project')).rejects.toThrow('would lose access to this skill.');
	});

	it('renames and moves a skill in one save to a name that only the old scope holds', async () => {
		const agent = await createAgent([]);
		// Only the owner may put a skill on the whole instance.
		const context = { user: owner, modifiedBy: 'user' as const };
		const created = await agentSkillsService.createAndAttachSkill(
			agent.id,
			project.id,
			body('Summarize'),
			context,
		);
		const update = async (updates: Partial<AgentSkill>, availableTo: 'project' | 'instance') =>
			await agentSkillsService.updateSkill(
				agent.id,
				project.id,
				created.id,
				updates,
				context,
				undefined,
				undefined,
				availableTo,
			);
		await update({}, 'instance');
		await createSkill(body('summarize'));

		await update({ name: 'Condense' }, 'project');

		expect((await Container.get(SkillRepository).findByIds([created.id]))[0]).toMatchObject({
			projectId: project.id,
		});
		const { skills } = await skillRefs.readDraft(await reload(agent), {});
		expect(skills[created.id]?.name).toBe('Condense');
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

	it('creates a project skill for a seeded ref that has only a body, with a free name', async () => {
		await createSkill(body('Seeded skill'));
		const agent = await agentsService.create(project.id, 'Seeded', {
			actor: actor(),
			schema: { ...config, skills: [{ type: 'skill', id: 'seed_skill' }] },
			skills: { seed_skill: body('Seeded skill') },
			skillCreator: owner,
		});

		const { skillRefs: refs, skills } = await skillRefs.readDraft(agent, {});
		expect(refs).toHaveLength(1);
		expect(refs?.[0].id).not.toBe('seed_skill');
		expect(Object.values(skills)).toEqual([{ ...body('Seeded skill'), name: 'Seeded skill 2' }]);
		const [hubSkill] = await Container.get(SkillRepository).findByIds([refs![0].id]);
		expect(hubSkill).toMatchObject({ projectId: project.id, source: 'agent' });

		// The skill belongs to the project, so it outlives the agent.
		await agentsService.delete(agent.id, project.id);
		expect(await Container.get(SkillRepository).findByIds([refs![0].id])).toHaveLength(1);
	});
});
