import { formatSkillWorkflowMention, type AgentJsonConfig } from '@n8n/api-types';
import {
	createTeamProject,
	createWorkflow,
	getPersonalProject,
	mockInstance,
	shareWorkflowWithProjects,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import type { IWorkflowDb, Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';

import { AgentRuntimeCacheService } from '@/modules/agents/agent-runtime-cache.service';
import { AgentSkillWorkflowAccessService } from '@/modules/agents/agent-skill-workflow-access.service';
import { AgentTaskService } from '@/modules/agents/agent-task.service';
import { AgentUpdateBroadcaster } from '@/modules/agents/agent-update-broadcaster';
import { AgentValidationService } from '@/modules/agents/agent-validation.service';
import { AgentsService } from '@/modules/agents/agents.service';
import { AgentsSettingsService } from '@/modules/agents/agents-settings.service';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { AgentSkillRepository } from '@/modules/agents/repositories/agent-skill.repository';
import { registerSkillUsage } from '@/modules/agents/register-skill-usage';
import { getAgentSkillHash } from '@/modules/agents/utils/agent-config-hash';
import { SkillService, WorkflowsInSkillsFlagGate } from '@/modules/skills';
import { deleteAllSkills, findLatestSkillVersion } from '@/modules/skills/testing';
import { Telemetry } from '@/telemetry';

import { createMember, createOwner } from '../shared/db/users';

const config: AgentJsonConfig = { name: 'Agent', model: '', instructions: 'Help.' };

describe('AgentSkillWorkflowAccessService', () => {
	let owner: User;
	let member: User;
	let agentProject: Project;
	let otherProject: Project;
	let service: AgentSkillWorkflowAccessService;
	const flagGate = mockInstance(WorkflowsInSkillsFlagGate);
	mockInstance(AgentUpdateBroadcaster);

	beforeAll(async () => {
		mockInstance(Telemetry);
		mockInstance(AgentRuntimeCacheService);
		mockInstance(AgentTaskService).requestReconcile.mockResolvedValue(undefined);
		const validation = mockInstance(AgentValidationService);
		validation.validateAgentEntityConfiguration.mockResolvedValue({ status: 'valid', issues: [] });
		await testModules.loadModules(['skills', 'agents']);
		await testDb.init();
		registerSkillUsage();
		await Container.get(AgentsSettingsService).setEnabled(true);
		owner = await createOwner();
		member = await createMember();
		service = Container.get(AgentSkillWorkflowAccessService);
	});

	beforeEach(async () => {
		flagGate.isEnabled.mockResolvedValue(true);
		agentProject = await createTeamProject();
		otherProject = await createTeamProject();
	});

	afterEach(async () => {
		await Container.get(AgentRepository).delete({});
		await deleteAllSkills();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function createAgent(projectId: string) {
		const agent = await Container.get(AgentsService).create(projectId, 'Agent', {
			actor: { kind: 'user', user: owner },
			schema: config,
		});
		return agent.id;
	}

	async function createSkillMentioning(
		workflows: Array<Pick<IWorkflowDb, 'id' | 'name'>>,
		projectId: string | null = null,
	) {
		const mentions = workflows.map(({ id, name }) =>
			formatSkillWorkflowMention({ workflowId: id, name }),
		);
		return await Container.get(SkillService).createTrusted({
			target: { projectId },
			skill: {
				name: 'Skill',
				description: 'Skill description',
				instructions: `Use ${mentions.join(' and ')}.`,
			},
			source: 'ui',
			createdById: owner.id,
		});
	}

	it('lists only the existing workflows that the agent project cannot use', async () => {
		const owned = await createWorkflow({ name: 'Owned' }, agentProject);
		const shared = await createWorkflow({ name: 'Shared' }, otherProject);
		await shareWorkflowWithProjects(shared, [{ project: agentProject }]);
		const outside = await createWorkflow({ name: 'Outside' }, otherProject);
		const archived = await createWorkflow({ name: 'Archived', isArchived: true }, otherProject);
		const skillId = await createSkillMentioning([
			owned,
			shared,
			outside,
			archived,
			{ id: 'deletedWorkflowId', name: 'Deleted' },
		]);
		const agentId = await createAgent(agentProject.id);

		await expect(
			service.findOutsideProjectWorkflowIds(owner, agentProject.id, agentId, skillId),
		).resolves.toEqual([outside.id]);
	});

	it('counts a workflow shared with a personal agent project as usable', async () => {
		const personalProject = await getPersonalProject(owner);
		const shared = await createWorkflow({ name: 'Shared' }, otherProject);
		await shareWorkflowWithProjects(shared, [{ project: personalProject }]);
		const outside = await createWorkflow({ name: 'Outside' }, otherProject);
		const skillId = await createSkillMentioning([shared, outside]);
		const agentId = await createAgent(personalProject.id);

		await expect(
			service.findOutsideProjectWorkflowIds(owner, personalProject.id, agentId, skillId),
		).resolves.toEqual([outside.id]);
	});

	it('lists only the outside workflows that the user can read', async () => {
		const readable = await createWorkflow({ name: 'Readable' }, member);
		const unreadable = await createWorkflow({ name: 'Unreadable' }, otherProject);
		const skillId = await createSkillMentioning([readable, unreadable]);
		const agentId = await createAgent(agentProject.id);

		await expect(
			service.findOutsideProjectWorkflowIds(member, agentProject.id, agentId, skillId),
		).resolves.toEqual([readable.id]);
	});

	it('reads the skill version that the agent draft pins', async () => {
		const outside = await createWorkflow({ name: 'Outside' }, otherProject);
		const skillId = await createSkillMentioning([outside]);
		const pinnedVersion = await findLatestSkillVersion(skillId);
		await Container.get(SkillService).saveTrusted(
			skillId,
			{
				instructions: 'Help.',
				baseSkillHash: getAgentSkillHash({
					name: 'Skill',
					description: 'Skill description',
					instructions: `Use ${formatSkillWorkflowMention({ workflowId: outside.id, name: outside.name })}.`,
				}),
			},
			owner.id,
		);
		const agentId = await createAgent(agentProject.id);
		await Container.get(AgentSkillRepository).replaceDependencies(agentId, [
			{ skillId, versionId: pinnedVersion?.id },
		]);

		await expect(
			service.findOutsideProjectWorkflowIds(owner, agentProject.id, agentId, skillId),
		).resolves.toEqual([outside.id]);
	});

	it('lists nothing when workflows in skills are off', async () => {
		flagGate.isEnabled.mockResolvedValue(false);
		const outside = await createWorkflow({ name: 'Outside' }, otherProject);
		const skillId = await createSkillMentioning([outside]);
		const agentId = await createAgent(agentProject.id);

		await expect(
			service.findOutsideProjectWorkflowIds(owner, agentProject.id, agentId, skillId),
		).resolves.toEqual([]);
	});

	it('answers like a missing skill when the user cannot read the skill', async () => {
		const outside = await createWorkflow({ name: 'Outside' }, otherProject);
		const skillId = await createSkillMentioning([outside], otherProject.id);
		const agentId = await createAgent(agentProject.id);

		await expect(
			service.findOutsideProjectWorkflowIds(member, agentProject.id, agentId, skillId),
		).rejects.toThrow(NotFoundError);
	});

	it('answers like a missing agent when the agent is not in the project', async () => {
		const skillId = await createSkillMentioning([]);
		const agentId = await createAgent(otherProject.id);

		await expect(
			service.findOutsideProjectWorkflowIds(owner, agentProject.id, agentId, skillId),
		).rejects.toThrow(NotFoundError);
	});
});
