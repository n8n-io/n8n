import {
	createTeamProject,
	createWorkflow,
	getPersonalProject,
	linkUserToProject,
	mockInstance,
	shareWorkflowWithProjects,
} from '@n8n/backend-test-utils';
import {
	GLOBAL_ADMIN_ROLE,
	ProjectRelationRepository,
	ProjectRepository,
	TransactionRunner,
	UserRepository,
	type User,
	WorkflowRepository,
	postgresMigrations,
	sqliteMigrations,
	wrapMigration,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { WorkflowMutationHooksProxy } from '@n8n/backend-services';
import type { IWorkflowBase } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { AuthHandlerRegistry } from '@/auth/auth-handler.registry';
import { ControllerRegistry } from '@/controller.registry';
import { UserService } from '@/services/user.service';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';
import { createFolder } from '@test-integration/db/folders';
import { createCustomRoleWithScopeSlugs } from '@test-integration/db/roles';
import {
	createAdmin,
	createChatUser,
	createMember,
	createOwner,
	createUser,
} from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { InstanceAiService } from '../../instance-ai.service';
import { SelfHealingConfigurationRepository } from '../database/self-healing-configuration.repository';
import { SelfHealingConfigurationReviewer } from '../database/self-healing-configuration-reviewer.entity';
import { SelfHealingConfigurationWorkflow } from '../database/self-healing-configuration-workflow.entity';
import { SelfHealingInvestigation } from '../database/self-healing-investigation.entity';
import { SelfHealingConfigurationService } from '../self-healing-configuration.service';

mockInstance(ActiveWorkflowManager);
const runtime = mockInstance(InstanceAiService);
const server = setupTestServer({
	modules: ['instance-ai'],
	endpointGroups: [],
	setupTimeout: 30_000,
});
let configurations: SelfHealingConfigurationService;
let repository: SelfHealingConfigurationRepository;

beforeAll(async () => {
	await import('../self-healing-configurations.controller.js');
	Container.get(ControllerRegistry).activate(server.app);
	await Container.get(AuthHandlerRegistry).init();
	configurations = Container.get(SelfHealingConfigurationService);
	repository = Container.get(SelfHealingConfigurationRepository);
	Container.get(WorkflowMutationHooksProxy).registerProvider(configurations);
});

beforeEach(() => {
	runtime.routeCancelRun.mockReset();
});

afterEach(async () => {
	await Container.get(DataSource)
		.getRepository(SelfHealingInvestigation)
		.createQueryBuilder()
		.delete()
		.execute();
});

async function fixture() {
	const user = await createUser();
	const project = await createTeamProject(undefined, user);
	const workflow = await createWorkflow({}, project);
	const input = {
		scope: 'selected' as const,
		enabled: false,
		workflowIds: [workflow.id],
		reviewerIds: [user.id],
		includeAllProjectMembers: false,
	};
	return {
		user,
		project,
		workflow,
		input,
		url: `/projects/${project.id}/self-healing-configurations`,
	};
}

async function createInvestigation(
	configurationId: number,
	{ user, project, workflow }: Awaited<ReturnType<typeof fixture>>,
	finishedAt: Date | null = null,
) {
	return await Container.get(DataSource).getRepository(SelfHealingInvestigation).save({
		id: randomUUID(),
		configurationId,
		workflowId: workflow.id,
		projectId: project.id,
		backgroundUserId: user.id,
		executionId: randomUUID(),
		threadId: randomUUID(),
		runId: randomUUID(),
		publishedVersionId: randomUUID(),
		finishedAt,
	});
}

it.each(['pause', 'remove'] as const)(
	'requests cancellation of only unfinished investigations after %s commits',
	async (action) => {
		const first = await fixture();
		const configuration = await configurations.save(first.user, first.project.id, {
			...first.input,
			enabled: true,
		});
		await createInvestigation(configuration.id, first, new Date());
		const active = await createInvestigation(configuration.id, first);
		const other = await fixture();
		const otherConfiguration = await configurations.save(other.user, other.project.id, other.input);
		await createInvestigation(otherConfiguration.id, other);
		const persistedStates: (boolean | undefined)[] = [];
		runtime.routeCancelRun.mockImplementationOnce(async () => {
			persistedStates.push((await repository.findOneBy({ id: configuration.id }))?.enabled);
		});

		if (action === 'pause') {
			await configurations.setEnabled(first.user, first.project.id, configuration.id, false);
		} else {
			await configurations.remove(first.project.id, configuration.id);
		}

		expect(runtime.routeCancelRun).toHaveBeenCalledExactlyOnceWith(active.threadId);
		expect(persistedStates).toEqual([action === 'pause' ? false : undefined]);
	},
);

it.each(['pause', 'remove'] as const)(
	'keeps a committed %s successful and continues cancellation after a request fails',
	async (action) => {
		const first = await fixture();
		const configuration = await configurations.save(first.user, first.project.id, {
			...first.input,
			enabled: true,
		});
		const secondWorkflow = await createWorkflow({}, first.project);
		const firstRun = await createInvestigation(configuration.id, first);
		const secondRun = await createInvestigation(configuration.id, {
			...first,
			workflow: secondWorkflow,
		});
		runtime.routeCancelRun.mockRejectedValueOnce(new Error('Cancellation unavailable.'));

		if (action === 'pause') {
			await expect(
				configurations.setEnabled(first.user, first.project.id, configuration.id, false),
			).resolves.toMatchObject({ enabled: false });
		} else {
			await expect(
				configurations.remove(first.project.id, configuration.id),
			).resolves.toBeUndefined();
			expect(await repository.findOneBy({ id: configuration.id })).toBeNull();
		}

		expect(runtime.routeCancelRun).toHaveBeenCalledTimes(2);
		expect(runtime.routeCancelRun).toHaveBeenCalledWith(firstRun.threadId);
		expect(runtime.routeCancelRun).toHaveBeenCalledWith(secondRun.threadId);
	},
);

it.each(['pause', 'remove'] as const)(
	'does not request cancellation when %s rolls back',
	async (action) => {
		const first = await fixture();
		const configuration = await configurations.save(first.user, first.project.id, {
			...first.input,
			enabled: true,
		});
		const active = await createInvestigation(configuration.id, first);
		const save = repository.saveConfiguration.bind(repository);
		const remove = repository.deleteConfiguration.bind(repository);
		const failure = new Error('Transaction failed.');
		const write =
			action === 'pause'
				? vi.spyOn(repository, 'saveConfiguration').mockImplementationOnce(async (...args) => {
						await save(...args);
						throw failure;
					})
				: vi.spyOn(repository, 'deleteConfiguration').mockImplementationOnce(async (...args) => {
						await remove(...args);
						throw failure;
					});

		try {
			await expect(
				action === 'pause'
					? configurations.setEnabled(first.user, first.project.id, configuration.id, false)
					: configurations.remove(first.project.id, configuration.id),
			).rejects.toThrow(failure);
			expect(runtime.routeCancelRun).not.toHaveBeenCalled();
			expect(await repository.findOneBy({ id: configuration.id })).toMatchObject({ enabled: true });
			expect(
				await Container.get(DataSource)
					.getRepository(SelfHealingInvestigation)
					.findOneBy({ id: active.id }),
			).toMatchObject({ finishedAt: null });
		} finally {
			write.mockRestore();
		}
	},
);

it('does not cancel investigations when enabling or editing a configuration', async () => {
	const first = await fixture();
	const configuration = await configurations.save(first.user, first.project.id, first.input);
	await createInvestigation(configuration.id, first);

	await configurations.setEnabled(first.user, first.project.id, configuration.id, true);
	await configurations.save(first.user, first.project.id, first.input, configuration.id);

	expect(runtime.routeCancelRun).not.toHaveBeenCalled();
});

it('persists disabled configurations through the settings API and captures the enabler on resume', async () => {
	const { user, input, url } = await fixture();
	const agent = server.authAgentFor(user);
	const created = await agent.post(url).send(input);
	expect(created.status, JSON.stringify(created.body)).toBe(200);
	const id: number = created.body.data.id;
	expect(created.body.data).toMatchObject({ ...input, enabledById: null });
	const loaded = await agent.get(`${url}/${id}`).expect(200);
	expect(loaded.body.data).toEqual(created.body.data);
	const resumed = await agent.patch(`${url}/${id}/enabled`).send({ enabled: true }).expect(200);
	expect(resumed.body.data).toMatchObject({ enabled: true, enabledById: user.id });
});

it.each([false, true])(
	'keeps the current enabled=%s state when saving a stale form',
	async (enabled) => {
		const { user, project, input, url } = await fixture();
		const editor = await createUser();
		await linkUserToProject(editor, project, 'project:admin');
		const configuration = await configurations.save(user, project.id, {
			...input,
			enabled: !enabled,
		});
		await configurations.setEnabled(user, project.id, configuration.id, enabled);
		const current = await configurations.get(project.id, configuration.id);
		const edited = { ...input, scope: 'all' as const, workflowIds: [], enabled: !enabled };

		const saved = await server
			.authAgentFor(editor)
			.patch(`${url}/${configuration.id}`)
			.send(edited)
			.expect(200);
		expect(saved.body.data).toMatchObject({
			scope: 'all',
			workflowIds: [],
			enabled,
			enabledById: current.enabledById,
		});
		// Internal callers must also preserve the persisted state.
		expect(await configurations.save(editor, project.id, edited, configuration.id)).toMatchObject({
			enabled,
			enabledById: current.enabledById,
		});
	},
);

it('keeps an enabled configuration active when an edit omits enabled', async () => {
	const { user, project, input, url } = await fixture();
	const configuration = await configurations.save(user, project.id, { ...input, enabled: true });
	const saved = await server
		.authAgentFor(user)
		.patch(`${url}/${configuration.id}`)
		.send({
			scope: 'all',
			workflowIds: [],
			reviewerIds: input.reviewerIds,
		})
		.expect(200);
	expect(saved.body.data).toMatchObject({ scope: 'all', enabled: true, enabledById: user.id });
});

it('pauses after the sole reviewer is deleted and requires a replacement before resuming', async () => {
	const { user, project, workflow, input } = await fixture();
	const reviewer = await createUser();
	await linkUserToProject(reviewer, project, 'project:editor');
	const configuration = await configurations.save(user, project.id, {
		...input,
		enabled: true,
		reviewerIds: [reviewer.id],
	});
	await Container.get(UserRepository).delete(reviewer.id);
	await expect(configurations.setEnabled(user, project.id, configuration.id, true)).rejects.toThrow(
		'No reviewer can edit these workflows',
	);

	await configurations.recheckAccess(configuration.id, project.id, workflow.id);
	expect(await configurations.get(project.id, configuration.id)).toMatchObject({
		enabled: false,
		enabledById: user.id,
		reviewerIds: [],
	});
	expect(runtime.routeCancelRun).not.toHaveBeenCalled();
	await expect(configurations.setEnabled(user, project.id, configuration.id, true)).rejects.toThrow(
		'No reviewer can edit these workflows',
	);
	expect(await configurations.save(user, project.id, input, configuration.id)).toMatchObject({
		enabled: false,
		enabledById: user.id,
		reviewerIds: [user.id],
	});
	expect(await configurations.setEnabled(user, project.id, configuration.id, true)).toMatchObject({
		enabled: true,
		enabledById: user.id,
	});
});

it('checks workflow and execution access when creating an enabled configuration', async () => {
	const { user, project, input, url } = await fixture();
	const settingsAdmin = await createUser();
	const role = await createCustomRoleWithScopeSlugs(['project:update']);
	await linkUserToProject(settingsAdmin, project, role.slug);
	const agent = server.authAgentFor(settingsAdmin);

	await agent
		.post(url)
		.send({ ...input, enabled: true })
		.expect(403);
	expect(await configurations.list(project.id)).toEqual([]);
	const created = await agent.post(url).send(input).expect(200);
	expect(created.body.data).toMatchObject({
		enabled: false,
		enabledById: null,
		reviewerIds: [user.id],
	});
});

it('requires existing project settings permission for every operation', async () => {
	const admin = await createUser();
	const editor = await createUser();
	const project = await createTeamProject(undefined, admin);
	await linkUserToProject(editor, project, 'project:editor');
	const config = await configurations.save(admin, project.id, {
		scope: 'all',
		workflowIds: [],
		reviewerIds: [admin.id],
		includeAllProjectMembers: false,
		enabled: false,
	});
	const agent = server.authAgentFor(editor);
	const url = `/projects/${project.id}/self-healing-configurations`;
	await agent.get(url).expect(403);
	await agent.get(`${url}/options`).expect(403);
	await agent.get(`${url}/${config.id}`).expect(403);
	await agent.post(url).send(config).expect(403);
	await agent.patch(`${url}/${config.id}`).send(config).expect(403);
	await agent.patch(`${url}/${config.id}/enabled`).send({ enabled: true }).expect(403);
	await agent.delete(`${url}/${config.id}`).expect(403);
});

it('lets a personal project owner manage self-healing in their personal project', async () => {
	const owner = await createUser();
	const project = await getPersonalProject(owner);
	const workflow = await createWorkflow({}, project);
	const agent = server.authAgentFor(owner);
	const url = `/projects/${project.id}/self-healing-configurations`;

	const options = await agent.get(`${url}/options`).expect(200);
	expect(options.body.data).toMatchObject({
		workflows: [{ id: workflow.id }],
		reviewers: expect.arrayContaining([expect.objectContaining({ id: owner.id })]),
	});
	const created = await agent
		.post(url)
		.send({
			scope: 'selected',
			workflowIds: [workflow.id],
			reviewerIds: [],
			includeAllProjectMembers: true,
			enabled: true,
		})
		.expect(200);
	const id: number = created.body.data.id;
	expect(created.body.data).toMatchObject({
		enabled: true,
		enabledById: owner.id,
		reviewerIds: [],
		includeAllProjectMembers: true,
	});
	expect(await repository.isReviewer(id, owner.id, {})).toBe(true);
	const configuration = await repository.findOneByOrFail({ id });
	expect((await configurations.resolveActorOrPause(configuration, workflow.id, {}))?.id).toBe(
		owner.id,
	);
	await agent.get(url).expect(200);
	await agent.get(`${url}/${id}`).expect(200);
	await agent
		.patch(`${url}/${id}`)
		.send({ scope: 'all', workflowIds: [], reviewerIds: [], includeAllProjectMembers: true })
		.expect(200);
	await agent.patch(`${url}/${id}/enabled`).send({ enabled: false }).expect(200);
	await agent.delete(`${url}/${id}`).expect(200);
	expect(await configurations.list(project.id)).toEqual([]);
});

async function expectNoConfigurationAccess(user: User, projectId: string, id: number) {
	const agent = server.authAgentFor(user);
	const url = `/projects/${projectId}/self-healing-configurations`;
	const body = {
		scope: 'all',
		workflowIds: [],
		reviewerIds: [],
		includeAllProjectMembers: true,
		enabled: false,
	};
	await agent.get(url).expect(403);
	await agent.get(`${url}/options`).expect(403);
	await agent.get(`${url}/${id}`).expect(403);
	await agent.post(url).send(body).expect(403);
	await agent.patch(`${url}/${id}`).send(body).expect(403);
	await agent.patch(`${url}/${id}/enabled`).send({ enabled: false }).expect(403);
	await agent.delete(`${url}/${id}`).expect(403);
	expect(await configurations.list(projectId)).toHaveLength(1);
}

it.each([
	['member', createUser],
	['global admin', createAdmin],
	['global owner', createOwner],
])("denies a %s access to another user's personal project", async (_, createActor) => {
	const owner = await createUser();
	const project = await getPersonalProject(owner);
	const config = await configurations.save(owner, project.id, {
		scope: 'all',
		workflowIds: [],
		reviewerIds: [],
		includeAllProjectMembers: true,
		enabled: false,
	});

	await expectNoConfigurationAccess(await createActor(), project.id, config.id);
});

it('denies a chat user access to their personal project for every operation', async () => {
	const chatUser = await createChatUser();
	const project = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
		chatUser.id,
	);
	const config = await repository.save(
		repository.create({
			projectId: project.id,
			scope: 'all',
			includeAllProjectMembers: true,
			enabled: false,
		}),
	);

	await expectNoConfigurationAccess(chatUser, project.id, config.id);
});

it('denies a user downgraded to chat user access to their personal project', async () => {
	const member = await createMember();
	const project = await getPersonalProject(member);
	const config = await configurations.save(member, project.id, {
		scope: 'all',
		workflowIds: [],
		reviewerIds: [],
		includeAllProjectMembers: true,
		enabled: false,
	});
	await server
		.authAgentFor(member)
		.get(`/projects/${project.id}/self-healing-configurations`)
		.expect(200);

	await Container.get(UserService).changeUserRole(member, { newRoleName: 'global:chatUser' });

	await expectNoConfigurationAccess(member, project.id, config.id);
});

it('reports the investigation time in UTC when the server uses another timezone', async () => {
	const { user, project, workflow, input } = await fixture();
	const configuration = await configurations.save(user, project.id, input);
	expect(configuration.lastActivity).toBeNull();
	vi.stubEnv('TZ', 'Europe/Prague');
	try {
		const createdAt = new Date('2026-07-03T12:00:00.123Z');
		await Container.get(DataSource).getRepository(SelfHealingInvestigation).save({
			id: randomUUID(),
			configurationId: configuration.id,
			workflowId: workflow.id,
			projectId: project.id,
			backgroundUserId: user.id,
			executionId: '1',
			threadId: randomUUID(),
			runId: randomUUID(),
			publishedVersionId: randomUUID(),
			createdAt,
		});

		expect((await configurations.get(project.id, configuration.id)).lastActivity).toBe(
			createdAt.toISOString(),
		);
	} finally {
		vi.unstubAllEnvs();
		await configurations.remove(project.id, configuration.id);
	}
});

it('keeps paused selections disjoint and releases them on removal', async () => {
	const { user, project, workflow, input } = await fixture();
	const all = await configurations.save(user, project.id, {
		...input,
		scope: 'all',
		workflowIds: [],
		enabled: true,
	});
	const selected = await configurations.save(user, project.id, input);
	expect((await repository.findForWorkflow(project.id, workflow.id))?.id).toBe(selected.id);
	await expect(configurations.save(user, project.id, input)).rejects.toThrow('already belongs');
	await configurations.remove(project.id, selected.id);
	expect((await repository.findForWorkflow(project.id, workflow.id))?.id).toBe(all.id);
	const replacement = await configurations.save(user, project.id, input);
	expect(replacement.id).not.toBe(selected.id);
	expect(await repository.findOneBy({ id: selected.id })).toBeNull();
	await expect(configurations.setEnabled(user, project.id, selected.id, true)).rejects.toThrow(
		'not found',
	);
});

it('removes moved workflow selections and uses the destination configuration', async () => {
	const { user, project, workflow, input } = await fixture();
	const remaining = await createWorkflow({}, project);
	const selected = await configurations.save(user, project.id, {
		...input,
		workflowIds: [workflow.id, remaining.id],
	});
	const destination = await createTeamProject(undefined, user);
	const transfers = Container.get(EnterpriseWorkflowService);

	await transfers.transferWorkflow(user, workflow.id, destination.id);

	expect((await configurations.get(project.id, selected.id)).workflowIds).toEqual([remaining.id]);
	expect(await repository.findForWorkflow(destination.id, workflow.id)).toBeNull();

	const all = await configurations.save(user, destination.id, {
		...input,
		scope: 'all',
		workflowIds: [],
		enabled: true,
	});
	expect((await repository.findForWorkflow(destination.id, workflow.id))?.id).toBe(all.id);
	expect((await configurations.get(destination.id, all.id)).workflowIds).toEqual([]);

	await transfers.transferWorkflow(user, remaining.id, destination.id);
	expect((await configurations.get(project.id, selected.id)).workflowIds).toEqual([]);

	await transfers.transferWorkflow(user, workflow.id, project.id);
	expect(await repository.findForWorkflow(project.id, workflow.id)).toBeNull();
});

it('keeps selections when a workflow moves between folders in the same project', async () => {
	const { user, project, workflow, input } = await fixture();
	const selected = await configurations.save(user, project.id, input);
	const folder = await createFolder(project);

	await Container.get(EnterpriseWorkflowService).transferWorkflow(
		user,
		workflow.id,
		project.id,
		[],
		folder.id,
	);

	expect((await configurations.get(project.id, selected.id)).workflowIds).toEqual([workflow.id]);
});

it('keeps destination selections saved before transfer cleanup', async () => {
	const { user, project, workflow, input } = await fixture();
	const selected = await configurations.save(user, project.id, input);
	const destination = await createTeamProject(undefined, user);
	const removeWorkflowSelections = repository.removeWorkflowSelections.bind(repository);
	const cleanup = vi
		.spyOn(repository, 'removeWorkflowSelections')
		.mockImplementationOnce(async (workflowIds) => {
			await configurations.save(user, destination.id, input);
			await removeWorkflowSelections(workflowIds);
		});

	try {
		await Container.get(EnterpriseWorkflowService).transferWorkflow(
			user,
			workflow.id,
			destination.id,
		);

		expect(cleanup).toHaveBeenCalledWith([workflow.id]);
		expect((await configurations.get(project.id, selected.id)).workflowIds).toEqual([]);
		expect(await configurations.list(destination.id)).toEqual([
			expect.objectContaining({ workflowIds: [workflow.id] }),
		]);
	} finally {
		cleanup.mockRestore();
	}
});

it('removes selected workflows from a transferred folder and its subfolders', async () => {
	const { user, project, workflow, input } = await fixture();
	const folder = await createFolder(project);
	const childFolder = await createFolder(project, { parentFolder: folder });
	const first = await createWorkflow({ parentFolder: folder }, project);
	const second = await createWorkflow({ parentFolder: childFolder }, project);
	const selected = await configurations.save(user, project.id, {
		...input,
		workflowIds: [workflow.id, first.id, second.id],
	});
	const destination = await createTeamProject(undefined, user);

	await Container.get(EnterpriseWorkflowService).transferFolder(
		user,
		project.id,
		folder.id,
		destination.id,
		'0',
	);

	expect((await configurations.get(project.id, selected.id)).workflowIds).toEqual([workflow.id]);
	expect((await repository.listProjectWorkflows(destination.id)).map(({ id }) => id)).toEqual(
		expect.arrayContaining([first.id, second.id]),
	);
});

it('does not fail a committed workflow transfer when selection cleanup fails', async () => {
	const { user, project, workflow, input } = await fixture();
	await configurations.save(user, project.id, input);
	const destination = await createTeamProject(undefined, user);
	const cleanup = vi
		.spyOn(repository, 'removeWorkflowSelections')
		.mockRejectedValueOnce(new Error('Database unavailable'));

	try {
		await expect(
			Container.get(EnterpriseWorkflowService).transferWorkflow(user, workflow.id, destination.id),
		).resolves.toBeUndefined();
		expect((await repository.listProjectWorkflows(destination.id)).map(({ id }) => id)).toContain(
			workflow.id,
		);
	} finally {
		cleanup.mockRestore();
	}
});

it('permits one all-workflows configuration, including paused ones', async () => {
	const { user, project, input } = await fixture();
	const all = { ...input, scope: 'all' as const, workflowIds: [] };
	const config = await configurations.save(user, project.id, all);
	await expect(configurations.save(user, project.id, all)).rejects.toThrow('already has');
	await configurations.remove(project.id, config.id);
	expect((await configurations.save(user, project.id, all)).id).not.toBe(config.id);
});

it('rejects workflows and reviewers outside the project', async () => {
	const { user, project, input } = await fixture();
	const other = await fixture();
	await expect(
		configurations.save(user, project.id, { ...input, workflowIds: [other.workflow.id] }),
	).rejects.toThrow('from this project');
	await expect(
		configurations.save(user, project.id, { ...input, reviewerIds: [other.user.id] }),
	).rejects.toThrow('project members with workflow edit access');
});

it('validates only requested IDs and stores duplicate selections once', async () => {
	const { user, project, workflow, input } = await fixture();
	await createWorkflow({}, project);
	const globalAdmin = await createUser({ role: GLOBAL_ADMIN_ROLE });
	await linkUserToProject(globalAdmin, project, 'project:viewer');
	const otherAdmin = await createUser({ role: GLOBAL_ADMIN_ROLE });
	await linkUserToProject(otherAdmin, project, 'project:viewer');
	const outsideAdmin = await createUser({ role: GLOBAL_ADMIN_ROLE });
	const otherEditor = await createUser();
	await linkUserToProject(otherEditor, project, 'project:editor');
	const workflowLookup = vi.spyOn(repository, 'listProjectWorkflows');
	const reviewerLookup = vi.spyOn(repository, 'findProjectMembersWithEditAccess');
	const workflowIds = [workflow.id, workflow.id];
	const reviewerIds = [user.id, globalAdmin.id, user.id];

	try {
		const saved = await configurations.save(user, project.id, {
			...input,
			workflowIds,
			reviewerIds,
		});

		expect(saved.workflowIds).toEqual([workflow.id]);
		expect(saved.reviewerIds).toHaveLength(2);
		expect(saved.reviewerIds).toEqual(expect.arrayContaining([user.id, globalAdmin.id]));
		expect(workflowLookup).toHaveBeenCalledExactlyOnceWith(project.id, workflowIds);
		expect(await workflowLookup.mock.results[0].value).toEqual([
			expect.objectContaining({ id: workflow.id }),
		]);
		expect(reviewerLookup).toHaveBeenCalledExactlyOnceWith(
			project.id,
			expect.anything(),
			reviewerIds,
		);
		const reviewers = await reviewerLookup.mock.results[0].value;
		expect(reviewers).toHaveLength(2);
		expect(reviewers).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: user.id }),
				expect.objectContaining({ id: globalAdmin.id }),
			]),
		);

		const choices = await configurations.getConfigurationChoices(project.id);
		expect(choices.workflows).toHaveLength(2);
		expect(choices.reviewers.map(({ id }) => id).sort()).toEqual(
			[user.id, globalAdmin.id, otherAdmin.id, otherEditor.id].sort(),
		);
		expect(choices.reviewers.map(({ id }) => id)).not.toContain(outsideAdmin.id);
	} finally {
		workflowLookup.mockRestore();
		reviewerLookup.mockRestore();
	}
});

it('does not look up workflows when saving all-workflow coverage', async () => {
	const { user, project, input } = await fixture();
	const workflowLookup = vi.spyOn(repository, 'listProjectWorkflows');
	try {
		expect(
			await configurations.save(user, project.id, { ...input, scope: 'all', workflowIds: [] }),
		).toMatchObject({ scope: 'all', workflowIds: [] });
		expect(workflowLookup).not.toHaveBeenCalled();
	} finally {
		workflowLookup.mockRestore();
	}
});

it('accepts project members with scope-derived global or project roles and rejects others', async () => {
	const { user, project, input } = await fixture();
	const projectRole = await createCustomRoleWithScopeSlugs(['workflow:read', 'workflow:update']);
	const globalRole = await createCustomRoleWithScopeSlugs(['workflow:read', 'workflow:update'], {
		roleType: 'global',
	});
	const projectReviewer = await createUser();
	await linkUserToProject(projectReviewer, project, projectRole.slug);
	const globalReviewer = await createUser({ role: globalRole });
	await linkUserToProject(globalReviewer, project, 'project:viewer');
	const outsideGlobalReviewer = await createUser({ role: globalRole });
	const outsideAdmin = await createUser({ role: GLOBAL_ADMIN_ROLE });
	const disabledAdmin = await createUser({ role: GLOBAL_ADMIN_ROLE, disabled: true });
	await linkUserToProject(disabledAdmin, project, 'project:viewer');
	const disabledEditor = await createUser({ disabled: true });
	await linkUserToProject(disabledEditor, project, 'project:editor');
	const reader = await createUser();
	const readOnlyRole = await createCustomRoleWithScopeSlugs(['workflow:read']);
	await linkUserToProject(reader, project, readOnlyRole.slug);
	const outsider = await createUser();
	const otherProject = await createTeamProject(undefined, outsider);
	await linkUserToProject(outsider, otherProject, projectRole.slug);
	const reviewerIds = [projectReviewer.id, globalReviewer.id];
	const saved = await configurations.save(user, project.id, { ...input, reviewerIds });
	expect([...saved.reviewerIds].sort()).toEqual([...reviewerIds].sort());

	for (const invalidId of [
		outsideGlobalReviewer.id,
		outsideAdmin.id,
		disabledAdmin.id,
		disabledEditor.id,
		reader.id,
		outsider.id,
		randomUUID(),
	]) {
		await expect(
			configurations.save(
				user,
				project.id,
				{ ...input, reviewerIds: [...reviewerIds, invalidId] },
				saved.id,
			),
		).rejects.toThrow('project members with workflow edit access');
		expect(await configurations.get(project.id, saved.id)).toEqual(saved);
	}
});

it('rejects a missing workflow without changing the existing selections', async () => {
	const { user, project, input } = await fixture();
	const saved = await configurations.save(user, project.id, input);
	await expect(
		configurations.save(
			user,
			project.id,
			{ ...input, workflowIds: [...input.workflowIds, 'missing'] },
			saved.id,
		),
	).rejects.toThrow('from this project');
	expect(await configurations.get(project.id, saved.id)).toEqual(saved);
});

it('lists each configuration with its own ordered selections and latest activity', async () => {
	const first = await fixture();
	const { user, project, input } = first;
	const secondReviewer = await createUser();
	await linkUserToProject(secondReviewer, project, 'project:editor');
	const secondWorkflow = await createWorkflow({}, project);
	const selected = await configurations.save(user, project.id, {
		...input,
		workflowIds: [secondWorkflow.id, first.workflow.id],
		reviewerIds: [secondReviewer.id, user.id],
	});
	const all = await configurations.save(user, project.id, {
		...input,
		scope: 'all',
		workflowIds: [],
	});
	const removedReviewer = await createUser();
	await linkUserToProject(removedReviewer, project, 'project:editor');
	const removedWorkflow = await createWorkflow({}, project);
	const empty = await configurations.save(user, project.id, {
		...input,
		workflowIds: [removedWorkflow.id],
		reviewerIds: [removedReviewer.id],
	});
	await Container.get(WorkflowRepository).delete(removedWorkflow.id);
	await Container.get(UserRepository).delete(removedReviewer.id);
	const db = Container.get(DataSource);
	const investigations = db.getRepository(SelfHealingInvestigation);
	const older = await createInvestigation(selected.id, first, new Date());
	const latest = await createInvestigation(selected.id, first, new Date());
	const allActivity = await createInvestigation(all.id, first, new Date());
	await investigations.update(older.id, { createdAt: new Date('2026-07-01T12:00:00.000Z') });
	await investigations.update(latest.id, { createdAt: new Date('2026-07-03T12:00:00.123Z') });
	await investigations.update(allActivity.id, { createdAt: new Date('2026-07-02T12:00:00.456Z') });
	const workflowRows = await db
		.getRepository(SelfHealingConfigurationWorkflow)
		.findBy({ configurationId: selected.id });
	const reviewerRows = await db
		.getRepository(SelfHealingConfigurationReviewer)
		.findBy({ configurationId: selected.id });
	const other = await fixture();
	await configurations.save(other.user, other.project.id, other.input);

	expect(await configurations.list(project.id)).toEqual([
		{
			...selected,
			workflowIds: workflowRows.map((row) => row.workflowId),
			reviewerIds: reviewerRows.map((row) => row.userId),
			lastActivity: '2026-07-03T12:00:00.123Z',
		},
		{ ...all, lastActivity: '2026-07-02T12:00:00.456Z' },
		{ ...empty, workflowIds: [], reviewerIds: [], lastActivity: null },
	]);
});

it('offers owned unarchived drafts in name order and accepts them on create and edit', async () => {
	const user = await createUser();
	const project = await createTeamProject(undefined, user);
	const last = await createWorkflow({ name: 'Z draft', activeVersionId: null }, project);
	const first = await createWorkflow({ name: 'A draft', activeVersionId: null }, project);
	await createWorkflow({ name: 'Archived workflow', isArchived: true }, project);
	await createWorkflow({ name: '[n8n Assistant test copy] A draft', isArchived: true }, project);
	const otherProject = await createTeamProject(undefined, user);
	const shared = await createWorkflow({}, otherProject);
	await shareWorkflowWithProjects(shared, [{ project }]);
	const agent = server.authAgentFor(user);
	const url = `/projects/${project.id}/self-healing-configurations`;

	const options = await agent.get(`${url}/options`).expect(200);
	expect(options.body.data.workflows).toEqual([
		{ id: first.id, name: first.name },
		{ id: last.id, name: last.name },
	]);
	const input = {
		scope: 'selected',
		enabled: false,
		workflowIds: [first.id],
		reviewerIds: [user.id],
	};
	const created = await agent.post(url).send(input).expect(200);
	expect(created.body.data.workflowIds).toEqual([first.id]);
	const saved = await agent
		.patch(`${url}/${created.body.data.id}`)
		.send({ ...input, workflowIds: [last.id] })
		.expect(200);
	expect(saved.body.data.workflowIds).toEqual([last.id]);
	await agent
		.post(url)
		.send({ ...input, workflowIds: [shared.id] })
		.expect(400);
	await agent
		.patch(`${url}/${created.body.data.id}`)
		.send({ ...input, workflowIds: [shared.id] })
		.expect(400);
});

it.each(['Archived workflow', '[n8n Assistant test copy] Workflow'])(
	'rejects archived selection %s on create and edit',
	async (name) => {
		const { user, project, input, url } = await fixture();
		const archived = await createWorkflow(
			{ name, isArchived: true, activeVersionId: null },
			project,
		);
		const agent = server.authAgentFor(user);
		const invalid = { ...input, workflowIds: [archived.id] };

		await agent.post(url).send(invalid).expect(400);
		expect(await configurations.list(project.id)).toEqual([]);
		const created = await agent.post(url).send(input).expect(200);
		await agent.patch(`${url}/${created.body.data.id}`).send(invalid).expect(400);
		expect(await configurations.get(project.id, created.body.data.id)).toEqual(created.body.data);
	},
);

it('retains archived selections and rejects saving until they are restored or removed', async () => {
	const { user, project, workflow, input, url } = await fixture();
	const agent = server.authAgentFor(user);
	const created = await agent.post(url).send(input).expect(200);
	const configurationUrl = `${url}/${created.body.data.id}`;
	const workflows = Container.get(WorkflowRepository);
	await workflows.update(workflow.id, { isArchived: true });

	const options = await agent.get(`${url}/options`).expect(200);
	expect(options.body.data.workflows).toEqual([]);
	const loaded = await agent.get(configurationUrl).expect(200);
	expect(loaded.body.data.workflowIds).toEqual([workflow.id]);
	await agent.patch(configurationUrl).send(input).expect(400);
	expect(await configurations.list(project.id)).toEqual([created.body.data]);

	await workflows.update(workflow.id, { isArchived: false });
	const restored = await agent.patch(configurationUrl).send(input).expect(200);
	expect(restored.body.data.workflowIds).toEqual([workflow.id]);

	await workflows.update(workflow.id, { isArchived: true });
	const replacement = await createWorkflow({ activeVersionId: null }, project);
	const saved = await agent
		.patch(configurationUrl)
		.send({ ...input, workflowIds: [replacement.id] })
		.expect(200);
	expect(saved.body.data.workflowIds).toEqual([replacement.id]);
});

it('disables the configuration after access loss and records a new explicit enabler', async () => {
	const user = await createUser();
	const replacement = await createUser();
	const project = await createTeamProject(undefined, user);
	await linkUserToProject(replacement, project, 'project:admin');
	const workflow = await createWorkflow({}, project);
	const config = await configurations.save(user, project.id, {
		scope: 'all',
		workflowIds: [],
		reviewerIds: [user.id, replacement.id],
		includeAllProjectMembers: false,
		enabled: true,
	});
	await linkUserToProject(user, project, 'project:viewer');
	await Container.get(TransactionRunner).run({}, async (ctx) => {
		const current = await repository.findForUpdate(config.id, project.id, ctx);
		if (!current) throw new Error('Configuration not found.');
		expect(await configurations.resolveActorOrPause(current, workflow.id, ctx)).toBeNull();
	});
	expect((await configurations.get(project.id, config.id)).enabled).toBe(false);
	expect(await configurations.setEnabled(replacement, project.id, config.id, true)).toMatchObject({
		enabled: true,
		enabledById: replacement.id,
	});
});

it('reverts and reapplies the configuration schema', async () => {
	const db = Container.get(DataSource);
	[...postgresMigrations, ...sqliteMigrations].forEach(wrapMigration);
	const findMigration = (name: string) => {
		const migration = db.migrations.find(({ constructor }) => constructor.name === name);
		if (!migration) throw new Error(`${name} is not registered.`);
		return migration;
	};
	const migration = findMigration('CreateSelfHealingConfigurations1792742505678');
	const projectMembers = findMigration(
		'AddIncludeAllProjectMembersToSelfHealingConfiguration1793106080688',
	);
	const runner = db.createQueryRunner();
	try {
		await projectMembers.down(runner);
		expect(await runner.hasColumn(repository.metadata.tablePath, 'includeAllProjectMembers')).toBe(
			false,
		);
		await migration.down(runner);
		try {
			expect(await runner.hasTable(repository.metadata.tablePath)).toBe(false);
		} finally {
			await migration.up(runner);
			await projectMembers.up(runner);
		}
		expect(await runner.hasTable(repository.metadata.tablePath)).toBe(true);
		expect(await runner.hasColumn(repository.metadata.tablePath, 'includeAllProjectMembers')).toBe(
			true,
		);
	} finally {
		await runner.release();
	}
	const { user, project, input } = await fixture();
	expect(await configurations.save(user, project.id, input)).toMatchObject(input);
});

describe('project member reviewers', () => {
	async function teamFixture() {
		const data = await fixture();
		return { ...data, input: { ...data.input, reviewerIds: [], includeAllProjectMembers: true } };
	}

	async function shareWithPersonalProject(workflow: IWorkflowBase, user: User) {
		const project = await getPersonalProject(user);
		await shareWorkflowWithProjects(workflow, [{ project }]);
	}

	it('saves project members as the only reviewers and lists them as a group', async () => {
		const { user, project, input, url } = await teamFixture();
		const created = await server
			.authAgentFor(user)
			.post(url)
			.send({ scope: input.scope, workflowIds: input.workflowIds, includeAllProjectMembers: true })
			.expect(200);
		expect(created.body.data).toMatchObject({ reviewerIds: [], includeAllProjectMembers: true });
		expect(
			await Container.get(DataSource)
				.getRepository(SelfHealingConfigurationReviewer)
				.countBy({ configurationId: created.body.data.id }),
		).toBe(0);
		expect(await configurations.list(project.id)).toEqual([
			expect.objectContaining({ id: created.body.data.id, includeAllProjectMembers: true }),
		]);
	});

	it('stores individual reviewers with the project group and clears the group on edit', async () => {
		const { user, project, input } = await teamFixture();
		const globalAdmin = await createUser({ role: GLOBAL_ADMIN_ROLE });
		await linkUserToProject(globalAdmin, project, 'project:viewer');
		const saved = await configurations.save(user, project.id, {
			...input,
			reviewerIds: [globalAdmin.id, user.id],
		});
		expect(saved).toMatchObject({ includeAllProjectMembers: true });
		expect([...saved.reviewerIds].sort()).toEqual([globalAdmin.id, user.id].sort());

		expect(
			await configurations.save(
				user,
				project.id,
				{ ...input, reviewerIds: [user.id], includeAllProjectMembers: false },
				saved.id,
			),
		).toMatchObject({ reviewerIds: [user.id], includeAllProjectMembers: false });
	});

	it('defaults existing and omitted selections to individual reviewers only', async () => {
		const { user, input, url } = await fixture();
		const created = await server
			.authAgentFor(user)
			.post(url)
			.send({ scope: input.scope, workflowIds: input.workflowIds, reviewerIds: input.reviewerIds })
			.expect(200);
		expect(created.body.data).toMatchObject({
			reviewerIds: [user.id],
			includeAllProjectMembers: false,
		});
	});

	it('requires a reviewer or the project group', async () => {
		const { user, project, input, url } = await teamFixture();
		await expect(
			configurations.save(user, project.id, { ...input, includeAllProjectMembers: false }),
		).rejects.toThrow('Select at least one reviewer');
		await server
			.authAgentFor(user)
			.post(url)
			.send({ scope: input.scope, workflowIds: input.workflowIds })
			.expect(400);
		expect(await configurations.list(project.id)).toEqual([]);
	});

	it('rejects the project group when no member can edit workflows', async () => {
		const { user, project, input } = await teamFixture();
		const disabledEditor = await createUser({ disabled: true });
		await linkUserToProject(disabledEditor, project, 'project:editor');
		await createUser({ role: GLOBAL_ADMIN_ROLE });
		await linkUserToProject(user, project, 'project:viewer');

		await expect(configurations.save(user, project.id, input)).rejects.toThrow(
			'No reviewer can edit these workflows',
		);
		expect(await configurations.list(project.id)).toEqual([]);
	});

	it('counts a global admin who is a project member through the project group', async () => {
		const { user, project, input } = await teamFixture();
		const admin = await createUser({ role: GLOBAL_ADMIN_ROLE });
		await linkUserToProject(admin, project, 'project:viewer');
		await linkUserToProject(user, project, 'project:viewer');

		expect(await configurations.save(admin, project.id, input)).toMatchObject({
			includeAllProjectMembers: true,
			reviewerIds: [],
		});
	});

	it('lets a global admin outside the project pick only the group or project members', async () => {
		const { user, project, input } = await teamFixture();
		const admin = await createUser({ role: GLOBAL_ADMIN_ROLE });

		const choices = await configurations.getConfigurationChoices(project.id);
		expect(choices.reviewers.map(({ id }) => id)).toEqual([user.id]);
		await expect(
			configurations.save(admin, project.id, {
				...input,
				reviewerIds: [admin.id],
				includeAllProjectMembers: false,
			}),
		).rejects.toThrow('project members with workflow edit access');
		expect(await configurations.list(project.id)).toEqual([]);

		const saved = await configurations.save(admin, project.id, input);
		expect(saved).toMatchObject({ includeAllProjectMembers: true, reviewerIds: [] });
		expect(
			await configurations.save(
				admin,
				project.id,
				{ ...input, reviewerIds: [user.id], includeAllProjectMembers: false },
				saved.id,
			),
		).toMatchObject({ includeAllProjectMembers: false, reviewerIds: [user.id] });
	});

	it('pauses when the only listed reviewer leaves the project', async () => {
		const { user, project, workflow, input } = await fixture();
		const reviewer = await createUser();
		await linkUserToProject(reviewer, project, 'project:editor');
		const configuration = await configurations.save(user, project.id, {
			...input,
			reviewerIds: [reviewer.id],
			enabled: true,
		});

		await Container.get(ProjectRelationRepository).delete({
			userId: reviewer.id,
			projectId: project.id,
		});
		await configurations.recheckAccess(configuration.id, project.id, workflow.id);
		expect(await configurations.get(project.id, configuration.id)).toMatchObject({
			enabled: false,
			reviewerIds: [reviewer.id],
		});
		await expect(
			configurations.setEnabled(user, project.id, configuration.id, true),
		).rejects.toThrow('No reviewer can edit these workflows');
	});

	it('pauses when no member can review and resumes after a member gains access', async () => {
		const { user, project, workflow, input } = await teamFixture();
		const enabler = await createUser({ role: GLOBAL_ADMIN_ROLE });
		const configuration = await configurations.save(enabler, project.id, {
			...input,
			enabled: true,
		});
		await linkUserToProject(user, project, 'project:viewer');

		await configurations.recheckAccess(configuration.id, project.id, workflow.id);
		expect(await configurations.get(project.id, configuration.id)).toMatchObject({
			enabled: false,
			includeAllProjectMembers: true,
		});
		await expect(
			configurations.setEnabled(enabler, project.id, configuration.id, true),
		).rejects.toThrow('No reviewer can edit these workflows');

		const member = await createUser();
		await linkUserToProject(member, project, 'project:editor');
		expect(
			await configurations.setEnabled(enabler, project.id, configuration.id, true),
		).toMatchObject({ enabled: true, enabledById: enabler.id });
	});

	it('keeps the project group when a member edits a covered workflow through a share', async () => {
		const { user, project, workflow, input } = await teamFixture();
		const enabler = await createUser({ role: GLOBAL_ADMIN_ROLE });
		const configuration = await configurations.save(enabler, project.id, {
			...input,
			enabled: true,
		});
		await linkUserToProject(user, project, 'project:viewer');
		await shareWithPersonalProject(workflow, user);

		await configurations.recheckAccess(configuration.id, project.id, workflow.id);
		expect(await configurations.get(project.id, configuration.id)).toMatchObject({
			enabled: true,
			enabledById: enabler.id,
		});

		await configurations.setEnabled(enabler, project.id, configuration.id, false);
		expect(
			await configurations.setEnabled(enabler, project.id, configuration.id, true),
		).toMatchObject({ enabled: true });
		expect(await configurations.save(user, project.id, input, configuration.id)).toMatchObject({
			includeAllProjectMembers: true,
			reviewerIds: [],
		});
	});

	it('ignores shares that do not give a project member access to a covered workflow', async () => {
		const { user, project, workflow, input } = await teamFixture();
		const selectedElsewhere = await createWorkflow({}, project);
		await configurations.save(user, project.id, {
			...input,
			workflowIds: [selectedElsewhere.id],
			reviewerIds: [user.id],
			includeAllProjectMembers: false,
		});
		await linkUserToProject(user, project, 'project:viewer');
		const outsider = await createUser();
		const otherProject = await createTeamProject();
		const otherProjectWorkflow = await createWorkflow({}, otherProject);
		await shareWithPersonalProject(selectedElsewhere, user);
		await shareWithPersonalProject(otherProjectWorkflow, user);
		await shareWithPersonalProject(workflow, outsider);
		const all = { ...input, scope: 'all' as const, workflowIds: [] };

		await expect(configurations.save(user, project.id, input)).rejects.toThrow(
			'No reviewer can edit these workflows',
		);
		await expect(configurations.save(user, project.id, all)).rejects.toThrow(
			'No reviewer can edit these workflows',
		);

		const covered = await createWorkflow({}, project);
		await shareWithPersonalProject(covered, user);
		expect(await configurations.save(user, project.id, all)).toMatchObject({ scope: 'all' });
	});

	describe('individual reviewers with workflow share access', () => {
		async function sharedReviewerFixture() {
			const data = await fixture();
			const reviewer = await createUser();
			await linkUserToProject(reviewer, data.project, 'project:editor');
			const configuration = await configurations.save(data.user, data.project.id, {
				...data.input,
				reviewerIds: [reviewer.id],
			});
			await linkUserToProject(reviewer, data.project, 'project:viewer');
			return { ...data, reviewer, configuration };
		}

		async function reviewerChoices(projectId: string) {
			const { reviewers } = await configurations.getConfigurationChoices(projectId);
			return reviewers.map(({ id }) => id);
		}

		it('keeps a selected reviewer who can still edit a covered workflow through a share', async () => {
			const { user, project, workflow, input, reviewer, configuration } =
				await sharedReviewerFixture();
			await shareWithPersonalProject(workflow, reviewer);

			expect(await reviewerChoices(project.id)).toContain(reviewer.id);
			for (const includeAllProjectMembers of [true, false]) {
				expect(
					await configurations.save(
						user,
						project.id,
						{ ...input, reviewerIds: [reviewer.id], includeAllProjectMembers },
						configuration.id,
					),
				).toMatchObject({ reviewerIds: [reviewer.id], includeAllProjectMembers });
			}
			expect(
				await configurations.setEnabled(user, project.id, configuration.id, true),
			).toMatchObject({ enabled: true });
		});

		it('rejects a selected reviewer who lost edit access, also with the project group', async () => {
			const { user, project, input, reviewer, configuration } = await sharedReviewerFixture();

			expect(await reviewerChoices(project.id)).not.toContain(reviewer.id);
			for (const includeAllProjectMembers of [false, true]) {
				await expect(
					configurations.save(
						user,
						project.id,
						{ ...input, reviewerIds: [reviewer.id], includeAllProjectMembers },
						configuration.id,
					),
				).rejects.toThrow('project members with workflow edit access');
			}
			expect(
				await configurations.save(
					user,
					project.id,
					{ ...input, reviewerIds: [], includeAllProjectMembers: true },
					configuration.id,
				),
			).toMatchObject({ reviewerIds: [], includeAllProjectMembers: true });
		});

		it('ignores shares without edit scopes or on workflows outside the project', async () => {
			const { user, project, workflow, input, reviewer, configuration } =
				await sharedReviewerFixture();
			const readOnlyRole = await createCustomRoleWithScopeSlugs(['workflow:read']);
			const readOnlyProject = await createTeamProject();
			await linkUserToProject(reviewer, readOnlyProject, readOnlyRole.slug);
			await shareWorkflowWithProjects(workflow, [{ project: readOnlyProject }]);
			await shareWithPersonalProject(await createWorkflow({}, await createTeamProject()), reviewer);

			expect(await reviewerChoices(project.id)).not.toContain(reviewer.id);
			await expect(
				configurations.save(
					user,
					project.id,
					{ ...input, reviewerIds: [reviewer.id] },
					configuration.id,
				),
			).rejects.toThrow('project members with workflow edit access');
		});

		it('requires another reviewer when the shared workflow is no longer covered', async () => {
			const { user, project, workflow, input, reviewer, configuration } =
				await sharedReviewerFixture();
			const uncovered = await createWorkflow({}, project);
			await shareWithPersonalProject(workflow, reviewer);
			const moved = { ...input, workflowIds: [uncovered.id], reviewerIds: [reviewer.id] };

			await expect(configurations.save(user, project.id, moved, configuration.id)).rejects.toThrow(
				'No reviewer can edit these workflows',
			);
			expect(await configurations.get(project.id, configuration.id)).toMatchObject({
				workflowIds: [workflow.id],
			});
			expect(
				await configurations.save(
					user,
					project.id,
					{ ...moved, reviewerIds: [reviewer.id, user.id] },
					configuration.id,
				),
			).toMatchObject({ workflowIds: [uncovered.id] });
		});
	});
});
