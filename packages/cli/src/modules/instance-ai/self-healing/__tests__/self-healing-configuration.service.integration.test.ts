import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	mockInstance,
	shareWorkflowWithProjects,
} from '@n8n/backend-test-utils';
import {
	GLOBAL_ADMIN_ROLE,
	TransactionRunner,
	UserRepository,
	WorkflowRepository,
	postgresMigrations,
	sqliteMigrations,
	wrapMigration,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { WorkflowMutationHooksProxy } from '@n8n/backend-services';
import { randomUUID } from 'node:crypto';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { AuthHandlerRegistry } from '@/auth/auth-handler.registry';
import { ControllerRegistry } from '@/controller.registry';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';
import { createFolder } from '@test-integration/db/folders';
import { createCustomRoleWithScopeSlugs } from '@test-integration/db/roles';
import { createUser } from '@test-integration/db/users';
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
		'Select at least one reviewer',
	);

	await configurations.recheckAccess(configuration.id, project.id, workflow.id);
	expect(await configurations.get(project.id, configuration.id)).toMatchObject({
		enabled: false,
		enabledById: user.id,
		reviewerIds: [],
	});
	expect(runtime.routeCancelRun).not.toHaveBeenCalled();
	await expect(configurations.setEnabled(user, project.id, configuration.id, true)).rejects.toThrow(
		'Select at least one reviewer',
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
	).rejects.toThrow('reviewers with workflow edit access');
});

it('validates only requested IDs and stores duplicate selections once', async () => {
	const { user, project, workflow, input } = await fixture();
	await createWorkflow({}, project);
	const globalAdmin = await createUser({ role: GLOBAL_ADMIN_ROLE });
	const otherAdmin = await createUser({ role: GLOBAL_ADMIN_ROLE });
	const otherEditor = await createUser();
	await linkUserToProject(otherEditor, project, 'project:editor');
	const workflowLookup = vi.spyOn(repository, 'listProjectWorkflows');
	const reviewerLookup = vi.spyOn(
		Container.get(UserRepository),
		'findEligibleByProjectOrGlobalRoles',
	);
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
			expect.objectContaining({ projectId: project.id, userIds: reviewerIds }),
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
		expect(choices.reviewers.map(({ id }) => id)).toEqual(
			expect.arrayContaining([user.id, globalAdmin.id, otherAdmin.id, otherEditor.id]),
		);
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

it('accepts scope-derived global or project reviewers and rejects ineligible selections', async () => {
	const { user, project, input } = await fixture();
	const projectRole = await createCustomRoleWithScopeSlugs(['workflow:read', 'workflow:update']);
	const globalRole = await createCustomRoleWithScopeSlugs(['workflow:read', 'workflow:update'], {
		roleType: 'global',
	});
	const projectReviewer = await createUser();
	await linkUserToProject(projectReviewer, project, projectRole.slug);
	const globalReviewer = await createUser({ role: globalRole });
	const disabledAdmin = await createUser({ role: GLOBAL_ADMIN_ROLE, disabled: true });
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
		).rejects.toThrow('reviewers with workflow edit access');
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
		reviewerIds: [user.id],
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
	const migration = db.migrations.find(
		({ constructor }) => constructor.name === 'CreateSelfHealingConfigurations1792742505678',
	);
	if (!migration) throw new Error('Configuration migration is not registered.');
	const runner = db.createQueryRunner();
	try {
		await migration.down(runner);
		try {
			expect(await runner.hasTable(repository.metadata.tablePath)).toBe(false);
		} finally {
			await migration.up(runner);
		}
		expect(await runner.hasTable(repository.metadata.tablePath)).toBe(true);
	} finally {
		await runner.release();
	}
	const { user, project, input } = await fixture();
	expect(await configurations.save(user, project.id, input)).toMatchObject(input);
});
