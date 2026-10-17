import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	mockInstance,
} from '@n8n/backend-test-utils';
import { TransactionRunner, postgresMigrations, sqliteMigrations, wrapMigration } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { AuthHandlerRegistry } from '@/auth/auth-handler.registry';
import { ControllerRegistry } from '@/controller.registry';
import { createUser } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { SelfHealingConfigurationRepository } from '../database/self-healing-configuration.repository';
import { SelfHealingInvestigation } from '../database/self-healing-investigation.entity';
import { SelfHealingConfigurationService } from '../self-healing-configuration.service';

mockInstance(ActiveWorkflowManager);
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
			baseline: {},
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
		({ constructor }) => constructor.name === 'CreateSelfHealingConfigurations1792250412594',
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
