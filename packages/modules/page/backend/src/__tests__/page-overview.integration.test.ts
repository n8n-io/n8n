import { LicenseState } from '@n8n/backend-common';
import {
	createActiveWorkflow,
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import {
	ExecutionEntity,
	GLOBAL_OWNER_ROLE,
	WorkflowEntity,
	type Project,
	type User,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import type { ExecutionStatus, INode } from 'n8n-workflow';

import { createUser } from './fixtures/users';
import { PageEntity } from '../page.entity';
import { PageService } from '../page.service';

beforeAll(async () => {
	await testModules.loadModules(['page'], {
		page: async () => await import('../page.module.js'),
	});
	await testDb.init();
	Container.get(LicenseState).setLicenseProvider({
		isLicensed: () => true,
		getValue: () => undefined,
	});
});

afterAll(async () => {
	await testDb.terminate();
});

describe('PageService overview', () => {
	let pageService: PageService;
	let owner: User;
	let project: Project;

	const pageRows = () => Container.get(DataSource).getRepository(PageEntity);

	const node = (type: string, attributes: Partial<INode> = {}): INode => ({
		id: `id-of-${type}`,
		name: type,
		type,
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...attributes,
	});

	const setUpdatedAt = async (pageId: string, minutesFromNow: number) =>
		await pageRows().update(
			{ id: pageId },
			{ updatedAt: new Date(Date.now() + minutesFromNow * 60_000) },
		);

	const setWorkflowUpdatedAt = async (workflowId: string, minutesFromNow: number) =>
		await Container.get(DataSource)
			.getRepository(WorkflowEntity)
			.update({ id: workflowId }, { updatedAt: new Date(Date.now() + minutesFromNow * 60_000) });

	const createExecution = async (
		workflowId: string,
		status: ExecutionStatus,
		attributes: Partial<ExecutionEntity> = {},
	) =>
		await Container.get(DataSource)
			.getRepository(ExecutionEntity)
			.save({
				workflowId,
				status,
				finished: status === 'success',
				mode: 'trigger',
				createdAt: new Date('2026-11-16T10:00:00.000Z'),
				startedAt: new Date('2026-11-16T10:00:00.000Z'),
				stoppedAt: new Date('2026-11-16T10:00:05.000Z'),
				...attributes,
			});

	beforeAll(() => {
		pageService = Container.get(PageService);
	});

	beforeEach(async () => {
		await pageRows().delete({});
		owner = await createUser({ role: GLOBAL_OWNER_ROLE });
		project = await createTeamProject();
	});

	it('should list the workflows of the project that are not archived, by name', async () => {
		await createWorkflow({ name: 'B sync', nodes: [node('n8n-nodes-base.webhook')] }, project);
		await createWorkflow({ name: 'A report', nodes: [] }, project);
		await createWorkflow({ name: 'Archived', isArchived: true }, project);
		await createWorkflow({ name: 'Other project' }, await createTeamProject());

		const overview = await pageService.getProjectOverview(owner, project.id);

		expect(overview.workflows).toEqual([
			{
				id: expect.any(String),
				name: 'A report',
				projectId: project.id,
				projectName: project.name,
				active: false,
				category: 'manual',
				nodeTypes: [],
				credentialTypes: [],
				pageCount: 0,
			},
			{
				id: expect.any(String),
				name: 'B sync',
				projectId: project.id,
				projectName: project.name,
				active: false,
				category: 'webhook',
				nodeTypes: ['n8n-nodes-base.webhook'],
				credentialTypes: [],
				pageCount: 0,
			},
		]);
	});

	it('should give the distinct types of the working nodes, the triggers first, at most 6', async () => {
		await createWorkflow(
			{
				name: 'Sync',
				nodes: [
					node('n8n-nodes-base.stickyNote'),
					node('n8n-nodes-base.set'),
					node('n8n-nodes-base.set', { id: 'second-set', name: 'Second set' }),
					node('n8n-nodes-base.scheduleTrigger', { disabled: true }),
					node('n8n-nodes-base.slackTrigger'),
					node('n8n-nodes-base.if'),
					node('n8n-nodes-base.slack'),
					node('n8n-nodes-base.httpRequest'),
					node('n8n-nodes-base.code'),
					node('n8n-nodes-base.merge'),
				],
			},
			project,
		);

		const [workflow] = (await pageService.getProjectOverview(owner, project.id)).workflows;

		expect(workflow.category).toBe('appEvent');
		expect(workflow.nodeTypes).toEqual([
			'n8n-nodes-base.slackTrigger',
			'n8n-nodes-base.set',
			'n8n-nodes-base.if',
			'n8n-nodes-base.slack',
			'n8n-nodes-base.httpRequest',
			'n8n-nodes-base.code',
		]);
	});

	it('should give the key fact of the trigger of each workflow', async () => {
		await createWorkflow(
			{
				name: 'A webhook',
				nodes: [
					node('n8n-nodes-base.webhook', {
						disabled: true,
						parameters: { httpMethod: 'GET', path: 'disabled' },
					}),
					node('n8n-nodes-base.webhook', {
						id: 'second-webhook',
						name: 'Second webhook',
						parameters: { httpMethod: 'POST', path: 'acme/orders' },
					}),
				],
			},
			project,
		);
		await createWorkflow(
			{
				name: 'B schedule',
				nodes: [
					node('n8n-nodes-base.scheduleTrigger', {
						parameters: { rule: { interval: [{ field: 'days', triggerAtHour: 2 }] } },
					}),
				],
			},
			project,
		);
		await createWorkflow(
			{
				name: 'C expression',
				nodes: [node('n8n-nodes-base.webhook', { parameters: { path: '={{ $json.path }}' } })],
			},
			project,
		);
		await createWorkflow({ name: 'D manual', nodes: [node('n8n-nodes-base.set')] }, project);

		const overview = await pageService.getProjectOverview(owner, project.id);

		expect(overview.workflows.map(({ trigger }) => trigger)).toEqual([
			{ kind: 'webhook', method: 'POST', path: 'acme/orders' },
			{ kind: 'schedule', field: 'days', triggerAtHour: 2 },
			undefined,
			undefined,
		]);
		expect(overview.workflows[3]).not.toHaveProperty('trigger');
	});

	it('should tell that a published workflow is active', async () => {
		await createActiveWorkflow({ name: 'Published' }, project);

		const [workflow] = (await pageService.getProjectOverview(owner, project.id)).workflows;

		expect(workflow).toMatchObject({ name: 'Published', active: true, category: 'schedule' });
	});

	it('should give the page with the most links to the workflow or its nodes', async () => {
		const workflow = await createWorkflow({ name: 'Sync' }, project);
		await pageService.createPage(project.id, owner, {
			title: 'Mention',
			content: `See [Sync](/workflow/${workflow.id}).`,
		});
		const runbook = await pageService.createPage(project.id, owner, {
			title: 'Runbook',
			content: [
				'# Sync runbook',
				'',
				`The **workflow** [Sync](/workflow/${workflow.id}) copies the orders.`,
				'',
				`The [Webhook](/workflow/${workflow.id}/node1) node receives them.`,
			].join('\n'),
		});
		await pageService.createPage(project.id, owner, { title: 'No link', content: 'Text' });

		const overview = await pageService.getProjectOverview(owner, project.id);

		expect(overview.workflows).toEqual([
			expect.objectContaining({
				id: workflow.id,
				pageCount: 2,
				page: {
					id: runbook.id,
					title: 'Runbook',
					excerpt: 'The workflow Sync copies the orders.',
					hasTour: true,
					outdated: false,
				},
			}),
		]);
	});

	it('should give the newest page when two pages have the same number of links', async () => {
		const workflow = await createWorkflow({ name: 'Sync' }, project);
		const content = `See [Sync](/workflow/${workflow.id}).`;
		const newest = await pageService.createPage(project.id, owner, { title: 'Newest', content });
		const older = await pageService.createPage(project.id, owner, { title: 'Older', content });
		await setUpdatedAt(older.id, 1);
		await setUpdatedAt(newest.id, 2);

		const [documented] = (await pageService.getProjectOverview(owner, project.id)).workflows;

		expect(documented.page).toEqual({
			id: newest.id,
			title: 'Newest',
			excerpt: 'See Sync.',
			hasTour: false,
			outdated: false,
		});
		expect(documented.pageCount).toBe(2);
	});

	it('should give a tour only for the workflow whose nodes the page links to', async () => {
		const toured = await createWorkflow({ name: 'A toured' }, project);
		const mentioned = await createWorkflow({ name: 'B mentioned' }, project);
		await pageService.createPage(project.id, owner, {
			title: 'Both',
			content: `[Node](/workflow/${toured.id}/node1) and [Other](/workflow/${mentioned.id}).`,
		});

		const overview = await pageService.getProjectOverview(owner, project.id);

		expect(overview.workflows.map(({ page }) => page?.hasTour)).toEqual([true, false]);
	});

	it('should not count the pages of another project', async () => {
		const workflow = await createWorkflow({ name: 'Sync' }, project);
		await pageService.createPage(await createTeamProject().then((p) => p.id), owner, {
			title: 'Elsewhere',
			content: `See [Sync](/workflow/${workflow.id}).`,
		});

		const [undocumented] = (await pageService.getProjectOverview(owner, project.id)).workflows;

		expect(undocumented.pageCount).toBe(0);
		expect(undocumented).not.toHaveProperty('page');
	});

	describe('the summary of the project', () => {
		it('should give no summary to a project that has none', async () => {
			expect(await pageService.getProjectOverview(owner, project.id)).not.toHaveProperty('summary');
		});

		it('should create one empty summary for a project and give it again', async () => {
			const created = await pageService.ensureProjectSummary(project.id, owner);
			const again = await pageService.ensureProjectSummary(project.id, owner);

			expect(again.id).toBe(created.id);
			expect((await pageService.getProjectOverview(owner, project.id)).summary).toEqual({
				id: created.id,
				title: 'About this project',
				version: 1,
				isEmpty: true,
			});
		});

		it('should not count the summary as the page of a workflow', async () => {
			const workflow = await createWorkflow({ name: 'Sync' }, project);
			const summary = await pageService.ensureProjectSummary(project.id, owner);
			await pageService.replacePageContent(
				project.id,
				summary.id,
				`This project syncs orders. See [Sync](/workflow/${workflow.id}).`,
			);

			const overview = await pageService.getProjectOverview(owner, project.id);

			expect(overview.summary).toMatchObject({ id: summary.id, version: 2, isEmpty: false });
			expect(overview.workflows[0].pageCount).toBe(0);
			expect(overview.workflows[0]).not.toHaveProperty('page');
		});
	});

	it('should leave out the workflows that the user cannot read', async () => {
		await createWorkflow({ name: 'Sync' }, project);
		const outsider = await createUser();

		expect(await pageService.getProjectOverview(outsider, project.id)).toEqual({ workflows: [] });
	});

	it('should give the distinct credential types of the working nodes, at most 4', async () => {
		const withCredentials = (type: string, credentialTypes: string[], attributes = {}) =>
			node(type, {
				credentials: Object.fromEntries(
					credentialTypes.map((credentialType) => [credentialType, { id: '1', name: 'Mine' }]),
				),
				...attributes,
			});
		await createWorkflow(
			{
				name: 'Sync',
				nodes: [
					withCredentials('n8n-nodes-base.slack', ['slackApi']),
					withCredentials('n8n-nodes-base.slackTrigger', ['slackApi']),
					withCredentials('n8n-nodes-base.github', ['githubApi'], { disabled: true }),
					withCredentials('n8n-nodes-base.httpRequest', ['httpHeaderAuth', 'httpSslAuth']),
					withCredentials('n8n-nodes-base.notion', ['notionApi']),
					withCredentials('n8n-nodes-base.jira', ['jiraSoftwareCloudApi']),
				],
			},
			project,
		);

		const [workflow] = (await pageService.getProjectOverview(owner, project.id)).workflows;

		expect(workflow.credentialTypes).toEqual([
			'slackApi',
			'httpHeaderAuth',
			'httpSslAuth',
			'notionApi',
		]);
	});

	it('should tell that a page is outdated when the workflow changed after it', async () => {
		const changed = await createWorkflow({ name: 'A changed' }, project);
		const stable = await createWorkflow({ name: 'B stable' }, project);
		await pageService.createPage(project.id, owner, {
			title: 'Both',
			content: `[A](/workflow/${changed.id}) and [B](/workflow/${stable.id}).`,
		});
		await setWorkflowUpdatedAt(changed.id, 5);
		await setWorkflowUpdatedAt(stable.id, -5);

		const overview = await pageService.getProjectOverview(owner, project.id);

		expect(overview.workflows.map(({ page }) => page?.outdated)).toEqual([true, false]);
	});

	it('should give the last execution of each workflow that succeeded or failed', async () => {
		const failing = await createWorkflow({ name: 'A failing' }, project);
		const healthy = await createWorkflow({ name: 'B healthy' }, project);
		await createWorkflow({ name: 'C never ran' }, project);
		await createExecution(failing.id, 'success');
		await createExecution(failing.id, 'error', {
			stoppedAt: new Date('2026-11-17T08:00:00.000Z'),
		});
		await createExecution(failing.id, 'running', { stoppedAt: null });
		await createExecution(failing.id, 'canceled');
		await createExecution(healthy.id, 'error');
		await createExecution(healthy.id, 'success');
		await createExecution(healthy.id, 'error', { deletedAt: new Date() });

		const overview = await pageService.getProjectOverview(owner, project.id);

		expect(overview.workflows.map(({ lastExecution }) => lastExecution)).toEqual([
			{ status: 'error', finishedAt: '2026-11-17T08:00:00.000Z' },
			{ status: 'success', finishedAt: '2026-11-16T10:00:05.000Z' },
			undefined,
		]);
	});

	describe('getOverview', () => {
		it('should give the workflows of every project where the user can list pages', async () => {
			const member = await createUser();
			const otherProject = await createTeamProject('Other');
			const hiddenProject = await createTeamProject('Hidden');
			await linkUserToProject(member, project, 'project:viewer');
			await linkUserToProject(member, otherProject, 'project:editor');
			await createWorkflow({ name: 'A first' }, project);
			const second = await createWorkflow({ name: 'B second' }, otherProject);
			await createWorkflow({ name: 'C hidden' }, hiddenProject);
			await pageService.createPage(otherProject.id, owner, {
				title: 'Runbook',
				content: `See [B](/workflow/${second.id}).`,
			});

			const overview = await pageService.getOverview(member);

			expect(
				overview.workflows.map(({ name, projectId, projectName, pageCount }) => ({
					name,
					projectId,
					projectName,
					pageCount,
				})),
			).toEqual([
				{ name: 'A first', projectId: project.id, projectName: project.name, pageCount: 0 },
				{ name: 'B second', projectId: otherProject.id, projectName: 'Other', pageCount: 1 },
			]);
		});

		it('should count only the pages of the project of the workflow', async () => {
			const workflow = await createWorkflow({ name: 'Sync' }, project);
			await pageService.createPage(await createTeamProject().then((p) => p.id), owner, {
				title: 'Elsewhere',
				content: `See [Sync](/workflow/${workflow.id}).`,
			});

			const overview = await pageService.getOverview(owner);

			expect(overview.workflows.find(({ id }) => id === workflow.id)).toMatchObject({
				pageCount: 0,
			});
		});
	});
});
