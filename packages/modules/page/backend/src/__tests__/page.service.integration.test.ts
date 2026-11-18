import type { PageResourceType } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { GLOBAL_OWNER_ROLE, ProjectRepository, type Project, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import type { INode, Workflow } from 'n8n-workflow';
import { setTimeout as wait } from 'node:timers/promises';

import { createUser } from './fixtures/users';
import { PageAppendConflictError } from '../errors/page-append-conflict.error';
import { PageContentTooLongError } from '../errors/page-content-too-long.error';
import { PageNotFoundError } from '../errors/page-not-found.error';
import { PageProjectNotFoundError } from '../errors/page-project-not-found.error';
import { PageVersionConflictError } from '../errors/page-version-conflict.error';
import { PageReferenceEntity } from '../page-reference.entity';
import { PageProxyService } from '../page-proxy.service';
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

describe('PageService', () => {
	let pageService: PageService;
	let owner: User;
	let project: Project;

	const pageRows = () => Container.get(DataSource).getRepository(PageEntity);
	const referenceRows = () => Container.get(DataSource).getRepository(PageReferenceEntity);

	const storedReferences = async (pageId: string) =>
		(await referenceRows().find({ where: { pageId }, order: { resourceId: 'ASC' } })).map(
			({ resourceType, resourceId, parentResourceId }) => ({
				resourceType,
				resourceId,
				parentResourceId,
			}),
		);

	const referencingTitles = async (
		user: User,
		resourceType: PageResourceType,
		resourceId: string,
	) =>
		(await pageService.listReferencingPages(user, { resourceType, resourceId }))
			.map((page) => page.title)
			.sort();

	const stickyNote = (content: string, name = 'Sticky Note') => ({
		id: `id-of-${name}`,
		name,
		type: 'n8n-nodes-base.stickyNote',
		typeVersion: 1,
		position: [0, 0] as [number, number],
		parameters: { content },
	});

	const setNode = (value: string) => ({
		id: 'id-of-set',
		name: 'Set',
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
		position: [0, 0] as [number, number],
		parameters: { content: value, notes: value },
	});

	const setUpdatedAt = async (pageId: string, minutesFromNow: number) =>
		await pageRows().update(
			{ id: pageId },
			{ updatedAt: new Date(Date.now() + minutesFromNow * 60_000) },
		);

	/** Makes another writer save the page right after each of the first `times` reads. */
	const saveElsewhereAfterReads = (times: number) => {
		const readPage = pageService.getPage.bind(pageService);
		let disturbedReads = 0;
		vi.spyOn(pageService, 'getPage').mockImplementation(async (projectId, pageId) => {
			const page = await readPage(projectId, pageId);
			if (disturbedReads < times) {
				disturbedReads += 1;
				await pageService.updatePage(projectId, pageId, {
					content: `${page.content}Other writer. `,
					baseVersion: page.version,
				});
			}
			return page;
		});
	};

	beforeAll(() => {
		pageService = Container.get(PageService);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	beforeEach(async () => {
		await pageRows().delete({});
		owner = await createUser({ role: GLOBAL_OWNER_ROLE });
		project = await createTeamProject();
	});

	describe('createPage', () => {
		it('should create a page at version 1 with empty content by default', async () => {
			const page = await pageService.createPage(project.id, owner, { title: 'Runbook' });

			expect(page).toEqual({
				id: expect.any(String),
				projectId: project.id,
				title: 'Runbook',
				content: '',
				version: 1,
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			});
			expect(new Date(page.createdAt).toISOString()).toBe(page.createdAt);
		});

		it('should store the author and the references of the content', async () => {
			const page = await pageService.createPage(project.id, owner, {
				title: 'Runbook',
				content: 'See [Sync](/workflow/wf1).',
			});

			const row = await pageRows().findOneByOrFail({ id: page.id });
			expect(row.createdById).toBe(owner.id);
			expect(await storedReferences(page.id)).toEqual([
				{ resourceType: 'workflow', resourceId: 'wf1', parentResourceId: null },
			]);
		});

		it('should reject a project that does not exist', async () => {
			await expect(
				pageService.createPage('missing-project', owner, { title: 'Runbook' }),
			).rejects.toThrow(PageProjectNotFoundError);
		});
	});

	describe('getPage', () => {
		it('should return the page of the project', async () => {
			const created = await pageService.createPage(project.id, owner, {
				title: 'Runbook',
				content: 'Text',
			});

			expect(await pageService.getPage(project.id, created.id)).toEqual(created);
		});

		it('should not find a page through another project', async () => {
			const otherProject = await createTeamProject();
			const created = await pageService.createPage(project.id, owner, { title: 'Runbook' });

			await expect(pageService.getPage(otherProject.id, created.id)).rejects.toThrow(
				PageNotFoundError,
			);
		});
	});

	describe('listPages', () => {
		it('should list the pages of the project without content, the newest update first', async () => {
			const first = await pageService.createPage(project.id, owner, { title: 'First' });
			await pageService.createPage(project.id, owner, { title: 'Second' });
			await pageService.createPage(await createTeamProject().then((p) => p.id), owner, {
				title: 'Other project',
			});
			await pageRows().update({ id: first.id }, { updatedAt: new Date(Date.now() + 60_000) });

			const pages = await pageService.listPages(project.id);

			expect(pages.map((page) => page.title)).toEqual(['First', 'Second']);
			expect(pages[0]).not.toHaveProperty('content');
		});
	});

	describe('updatePage', () => {
		it('should save the changes as the next version', async () => {
			const created = await pageService.createPage(project.id, owner, {
				title: 'Runbook',
				content: 'Old',
			});

			const updated = await pageService.updatePage(project.id, created.id, {
				content: 'New',
				baseVersion: 1,
			});

			expect(updated).toMatchObject({ title: 'Runbook', content: 'New', version: 2 });
			expect(await pageService.getPage(project.id, created.id)).toEqual(updated);
		});

		it('should reject a stale version and keep the stored page', async () => {
			const created = await pageService.createPage(project.id, owner, { title: 'Runbook' });
			await pageService.updatePage(project.id, created.id, { title: 'Second', baseVersion: 1 });

			const staleUpdate = pageService.updatePage(project.id, created.id, {
				title: 'Stale',
				content: '[Sync](/workflow/wf1)',
				baseVersion: 1,
			});

			await expect(staleUpdate).rejects.toThrow(PageVersionConflictError);
			await expect(staleUpdate).rejects.toMatchObject({
				httpStatusCode: 409,
				meta: { pageId: created.id, baseVersion: 1, currentVersion: 2 },
			});
			expect(await pageService.getPage(project.id, created.id)).toMatchObject({
				title: 'Second',
				version: 2,
			});
			expect(await storedReferences(created.id)).toEqual([]);
		});

		it('should accept only one of two parallel updates of the same version', async () => {
			const created = await pageService.createPage(project.id, owner, { title: 'Runbook' });

			const results = await Promise.allSettled(
				['A', 'B'].map(
					async (title) =>
						await pageService.updatePage(project.id, created.id, { title, baseVersion: 1 }),
				),
			);

			const saved = results.filter((result) => result.status === 'fulfilled');
			const rejected = results.filter((result) => result.status === 'rejected');
			expect(saved).toHaveLength(1);
			expect(rejected).toHaveLength(1);
			expect(rejected[0].reason).toBeInstanceOf(PageVersionConflictError);
			expect(await pageService.getPage(project.id, created.id)).toMatchObject({
				title: saved[0].value.title,
				version: 2,
			});
		});

		// The test pool on Postgres has one connection, so two service calls never overlap.
		// A second connection holds an uncommitted save to make the overlap real.
		// SQLite has one write connection, so writers cannot overlap there.
		it.runIf(process.env.DB_TYPE === 'postgresdb')(
			'should reject an update that overlaps an uncommitted save of the same version',
			async () => {
				const created = await pageService.createPage(project.id, owner, { title: 'Runbook' });
				const independentConnection = new DataSource({
					...Container.get(DataSource).options,
					migrationsRun: false,
				});
				await independentConnection.initialize();
				const firstSaver = independentConnection.createQueryRunner();

				try {
					await firstSaver.startTransaction();
					await firstSaver.manager.update(
						PageEntity,
						{ id: created.id, version: 1 },
						{ title: 'First', version: 2 },
					);
					const second = pageService.updatePage(project.id, created.id, {
						title: 'Second',
						baseVersion: 1,
					});
					const secondOutcome = second.catch((error: unknown) => error);
					// Lets the second update reach the row lock of the first save.
					await wait(300);
					await firstSaver.commitTransaction();

					expect(await secondOutcome).toBeInstanceOf(PageVersionConflictError);
					expect(await pageService.getPage(project.id, created.id)).toMatchObject({
						title: 'First',
						version: 2,
					});
				} finally {
					await firstSaver.release();
					await independentConnection.destroy();
				}
			},
		);

		it('should not update a page through another project', async () => {
			const otherProject = await createTeamProject();
			const created = await pageService.createPage(project.id, owner, { title: 'Runbook' });

			await expect(
				pageService.updatePage(otherProject.id, created.id, { title: 'Moved', baseVersion: 1 }),
			).rejects.toThrow(PageNotFoundError);
		});

		it('should replace the references with those of the new content', async () => {
			const created = await pageService.createPage(project.id, owner, {
				title: 'Runbook',
				content: '[Sync](/workflow/wf1) [Key](/home/credentials/cred1)',
			});

			await pageService.updatePage(project.id, created.id, {
				content: '[Key](/home/credentials/cred1) [Table](/projects/p1/datatables/dt1)',
				baseVersion: 1,
			});

			expect(await storedReferences(created.id)).toEqual([
				{ resourceType: 'credential', resourceId: 'cred1', parentResourceId: null },
				{ resourceType: 'dataTable', resourceId: 'dt1', parentResourceId: null },
			]);
		});

		it('should store one reference for a resource that the content links twice', async () => {
			const created = await pageService.createPage(project.id, owner, { title: 'Runbook' });

			await pageService.updatePage(project.id, created.id, {
				content: '[a](/workflow/wf1) [b](/workflow/wf1?tab=x)',
				baseVersion: 1,
			});

			expect(await storedReferences(created.id)).toEqual([
				{ resourceType: 'workflow', resourceId: 'wf1', parentResourceId: null },
			]);
		});

		it('should store the workflow of a node reference as its parent', async () => {
			const created = await pageService.createPage(project.id, owner, { title: 'Runbook' });

			await pageService.updatePage(project.id, created.id, {
				content: '[Node](/workflow/wf1/node1)',
				baseVersion: 1,
			});

			expect(await storedReferences(created.id)).toEqual([
				{ resourceType: 'node', resourceId: 'node1', parentResourceId: 'wf1' },
			]);
		});

		it('should keep the references when only the title changes', async () => {
			const created = await pageService.createPage(project.id, owner, {
				title: 'Runbook',
				content: '[Sync](/workflow/wf1)',
			});

			await pageService.updatePage(project.id, created.id, { title: 'Renamed', baseVersion: 1 });

			expect(await storedReferences(created.id)).toHaveLength(1);
		});

		it('should remove the references when the content has no link anymore', async () => {
			const created = await pageService.createPage(project.id, owner, {
				title: 'Runbook',
				content: '[Sync](/workflow/wf1)',
			});

			await pageService.updatePage(project.id, created.id, { content: '', baseVersion: 1 });

			expect(await storedReferences(created.id)).toEqual([]);
		});
	});

	describe('updatePageSection', () => {
		it('should replace the text of the section and keep the rest of the page', async () => {
			const created = await pageService.createPage(project.id, owner, {
				title: 'Report',
				content: '# Report\n\n## Latest report\n\nOld total\n\n## Related\n\nNotes',
			});

			const updated = await pageService.updatePageSection(
				project.id,
				created.id,
				'Latest report',
				'Total: 3',
			);

			expect(updated).toMatchObject({
				content: '# Report\n\n## Latest report\n\nTotal: 3\n\n## Related\n\nNotes',
				version: 2,
			});
		});

		it('should not update a section through another project', async () => {
			const created = await pageService.createPage(project.id, owner, { title: 'Report' });
			const otherProject = await createTeamProject();

			await expect(
				pageService.updatePageSection(otherProject.id, created.id, 'Latest report', 'Text'),
			).rejects.toThrow(PageNotFoundError);
		});
	});

	describe('appendToPage', () => {
		it('should add the text as a new block after the content', async () => {
			const created = await pageService.createPage(project.id, owner, {
				title: 'Report',
				content: '# Report\n',
			});

			const appended = await pageService.appendToPage(project.id, created.id, 'Total: 3');

			expect(appended).toMatchObject({ content: '# Report\n\nTotal: 3', version: 2 });
			expect(await pageService.getPage(project.id, created.id)).toEqual(appended);
		});

		it('should store the text alone in an empty page', async () => {
			const created = await pageService.createPage(project.id, owner, { title: 'Report' });

			const appended = await pageService.appendToPage(project.id, created.id, 'Total: 3');

			expect(appended.content).toBe('Total: 3');
		});

		it('should store the references of the appended text', async () => {
			const created = await pageService.createPage(project.id, owner, { title: 'Report' });

			await pageService.appendToPage(project.id, created.id, 'See [Sync](/workflow/wf1).');

			expect(await storedReferences(created.id)).toEqual([
				{ resourceType: 'workflow', resourceId: 'wf1', parentResourceId: null },
			]);
		});

		it('should not append to a page through another project', async () => {
			const otherProject = await createTeamProject();
			const created = await pageService.createPage(project.id, owner, { title: 'Report' });

			await expect(pageService.appendToPage(otherProject.id, created.id, 'Text')).rejects.toThrow(
				PageNotFoundError,
			);
			expect((await pageService.getPage(project.id, created.id)).version).toBe(1);
		});

		it('should append to the latest content when another writer saves first', async () => {
			const created = await pageService.createPage(project.id, owner, { title: 'Report' });
			saveElsewhereAfterReads(2);

			const appended = await pageService.appendToPage(project.id, created.id, 'Total: 3');

			expect(appended).toMatchObject({
				content: 'Other writer. Other writer.\n\nTotal: 3',
				version: 4,
			});
		});

		it('should fail after 3 attempts when another writer saves first each time', async () => {
			const created = await pageService.createPage(project.id, owner, { title: 'Report' });
			saveElsewhereAfterReads(3);

			const append = pageService.appendToPage(project.id, created.id, 'Total: 3');

			await expect(append).rejects.toThrow(PageAppendConflictError);
			await expect(append).rejects.toMatchObject({
				message: 'The page changed too often to append to it',
				meta: { pageId: created.id, attempts: 3 },
			});
			expect(await pageService.getPage(project.id, created.id)).toMatchObject({
				content: 'Other writer. Other writer. Other writer. ',
				version: 4,
			});
		});

		it('should reject a text that makes the page too long', async () => {
			const created = await pageService.createPage(project.id, owner, { title: 'Report' });

			await expect(
				pageService.appendToPage(project.id, created.id, 'x'.repeat(500_001)),
			).rejects.toThrow(PageContentTooLongError);
		});
	});

	describe('replacePageContent', () => {
		it('should save the content as the next version, whatever the stored version is', async () => {
			const created = await pageService.createPage(project.id, owner, {
				title: 'Report',
				content: 'Old',
			});
			await pageService.updatePage(project.id, created.id, { title: 'Renamed', baseVersion: 1 });

			const replaced = await pageService.replacePageContent(project.id, created.id, 'New');

			expect(replaced).toMatchObject({ title: 'Renamed', content: 'New', version: 3 });
		});

		it('should not replace the content of a page through another project', async () => {
			const otherProject = await createTeamProject();
			const created = await pageService.createPage(project.id, owner, { title: 'Report' });

			await expect(
				pageService.replacePageContent(otherProject.id, created.id, 'New'),
			).rejects.toThrow(PageNotFoundError);
		});
	});

	describe('searchProjectPages', () => {
		it('should list only the pages of the project that match the title query', async () => {
			const otherProject = await createTeamProject();
			await pageService.createPage(project.id, owner, { title: 'Daily sales report' });
			await pageService.createPage(project.id, owner, { title: 'Runbook' });
			await pageService.createPage(otherProject.id, owner, { title: 'Sales of the other team' });

			const found = await pageService.searchProjectPages(project.id, 'SALES');
			const all = await pageService.searchProjectPages(project.id);

			expect(found.map(({ title }) => title)).toEqual(['Daily sales report']);
			expect(all.map(({ title }) => title).sort()).toEqual(['Daily sales report', 'Runbook']);
		});
	});

	describe('PageProxyService', () => {
		const pageNode = { name: 'Page', type: 'n8n-nodes-base.page' } as INode;

		const proxyOfWorkflowIn = async (workflowProject: Project) => {
			const workflow = await createWorkflow({ name: 'Report' }, workflowProject);
			return await Container.get(PageProxyService).getPageProxy(
				{ id: workflow.id } as Workflow,
				pageNode,
			);
		};

		it('should read and write the pages of the project that owns the workflow', async () => {
			const created = await pageService.createPage(project.id, owner, {
				title: 'Report',
				content: 'Hello',
			});
			const proxy = await proxyOfWorkflowIn(project);

			const appended = await proxy.appendToPage(created.id, 'Total: 3');
			const replaced = await proxy.replacePageContent(created.id, 'New');

			expect(proxy.getProjectId()).toBe(project.id);
			expect(appended).toEqual({
				id: created.id,
				title: 'Report',
				content: 'Hello\n\nTotal: 3',
				version: 2,
				updatedAt: expect.any(String),
				url: `/page/${created.id}`,
			});
			expect(replaced).toMatchObject({ content: 'New', version: 3 });
			expect(await proxy.getPage(created.id)).toEqual(replaced);
		});

		it('should hide the pages of another project', async () => {
			const otherProject = await createTeamProject();
			const foreign = await pageService.createPage(otherProject.id, owner, { title: 'Foreign' });
			const own = await pageService.createPage(project.id, owner, { title: 'Own' });
			const proxy = await proxyOfWorkflowIn(project);

			expect(await proxy.listPages()).toEqual([
				{
					id: own.id,
					title: 'Own',
					version: 1,
					updatedAt: own.updatedAt,
					url: `/page/${own.id}`,
				},
			]);
			await expect(proxy.getPage(foreign.id)).rejects.toThrow(PageNotFoundError);
			await expect(proxy.appendToPage(foreign.id, 'Text')).rejects.toThrow(PageNotFoundError);
			await expect(proxy.replacePageContent(foreign.id, 'Text')).rejects.toThrow(PageNotFoundError);
			expect(await pageService.getPage(otherProject.id, foreign.id)).toMatchObject({
				content: '',
				version: 1,
			});
		});

		it('should use the given project in place of the project of the workflow', async () => {
			const otherProject = await createTeamProject();
			const page = await pageService.createPage(otherProject.id, owner, { title: 'Other' });

			const proxy = await Container.get(PageProxyService).getPageProxy(
				{ id: 'unsaved' } as Workflow,
				pageNode,
				otherProject.id,
			);

			expect((await proxy.listPages({ titleQuery: 'oth' })).map(({ id }) => id)).toEqual([page.id]);
		});

		it('should refuse a node that is not a Page node', async () => {
			await expect(
				Container.get(PageProxyService).getPageProxy(
					{ id: 'workflow-1' } as Workflow,
					{ name: 'Code', type: 'n8n-nodes-base.code' } as INode,
					project.id,
				),
			).rejects.toThrow('This proxy is only available for Page nodes');
		});
	});

	describe('deletePage', () => {
		it('should delete the page and its references', async () => {
			const created = await pageService.createPage(project.id, owner, {
				title: 'Runbook',
				content: '[Sync](/workflow/wf1)',
			});

			await pageService.deletePage(project.id, created.id);

			await expect(pageService.getPage(project.id, created.id)).rejects.toThrow(PageNotFoundError);
			expect(await storedReferences(created.id)).toEqual([]);
		});

		it('should not delete a page through another project', async () => {
			const otherProject = await createTeamProject();
			const created = await pageService.createPage(project.id, owner, { title: 'Runbook' });

			await expect(pageService.deletePage(otherProject.id, created.id)).rejects.toThrow(
				PageNotFoundError,
			);
			expect(await pageRows().countBy({ id: created.id })).toBe(1);
		});

		it('should delete the pages and the references of a deleted project', async () => {
			const created = await pageService.createPage(project.id, owner, {
				title: 'Runbook',
				content: '[Sync](/workflow/wf1)',
			});

			await Container.get(ProjectRepository).delete({ id: project.id });

			expect(await pageRows().countBy({ id: created.id })).toBe(0);
			expect(await storedReferences(created.id)).toEqual([]);
		});
	});

	describe('getReadablePage', () => {
		it('should return the page to a member who can read its project', async () => {
			const viewer = await createUser();
			await linkUserToProject(viewer, project, 'project:viewer');
			const created = await pageService.createPage(project.id, owner, { title: 'Runbook' });

			expect(await pageService.getReadablePage(viewer, created.id)).toEqual(created);
		});

		it('should return the page of any project to a global owner', async () => {
			const created = await pageService.createPage(project.id, owner, { title: 'Runbook' });

			expect(await pageService.getReadablePage(owner, created.id)).toEqual(created);
		});

		it('should hide the page from a user without access to its project', async () => {
			const outsider = await createUser();
			const created = await pageService.createPage(project.id, owner, { title: 'Runbook' });

			await expect(pageService.getReadablePage(outsider, created.id)).rejects.toThrow(
				PageNotFoundError,
			);
		});

		it('should answer the same for a page that does not exist', async () => {
			await expect(pageService.getReadablePage(owner, 'missing-page')).rejects.toThrow(
				PageNotFoundError,
			);
		});
	});

	describe('listReferencingPages', () => {
		it('should list the pages that link to the resource', async () => {
			await pageService.createPage(project.id, owner, {
				title: 'Links wf1',
				content: '[Sync](/workflow/wf1)',
			});
			await pageService.createPage(project.id, owner, {
				title: 'Links wf2',
				content: '[Other](/workflow/wf2)',
			});

			expect(await referencingTitles(owner, 'workflow', 'wf1')).toEqual(['Links wf1']);
		});

		it('should return summaries without content', async () => {
			await pageService.createPage(project.id, owner, {
				title: 'Links wf1',
				content: '[Sync](/workflow/wf1)',
			});

			const [summary] = await pageService.listReferencingPages(owner, {
				resourceType: 'workflow',
				resourceId: 'wf1',
			});

			expect(summary).toMatchObject({ title: 'Links wf1', projectId: project.id, version: 1 });
			expect(summary).not.toHaveProperty('content');
		});

		it('should include the pages that link to a node of the workflow', async () => {
			await pageService.createPage(project.id, owner, {
				title: 'Links the workflow',
				content: '[Sync](/workflow/wf1)',
			});
			await pageService.createPage(project.id, owner, {
				title: 'Links a node',
				content: '[Node](/workflow/wf1/node1)',
			});
			await pageService.createPage(project.id, owner, {
				title: 'Links both',
				content: '[Sync](/workflow/wf1) [Node](/workflow/wf1/node1)',
			});
			await pageService.createPage(project.id, owner, {
				title: 'Links a node of another workflow',
				content: '[Node](/workflow/wf2/node2)',
			});

			expect(await referencingTitles(owner, 'workflow', 'wf1')).toEqual([
				'Links a node',
				'Links both',
				'Links the workflow',
			]);
		});

		it('should list the pages that link to one node', async () => {
			await pageService.createPage(project.id, owner, {
				title: 'Links a node',
				content: '[Node](/workflow/wf1/node1)',
			});
			await pageService.createPage(project.id, owner, {
				title: 'Links the workflow',
				content: '[Sync](/workflow/wf1)',
			});

			expect(await referencingTitles(owner, 'node', 'node1')).toEqual(['Links a node']);
		});

		it('should not match a resource of another type with the same id', async () => {
			await pageService.createPage(project.id, owner, {
				title: 'Links a credential',
				content: '[Key](/home/credentials/same-id)',
			});

			expect(await referencingTitles(owner, 'workflow', 'same-id')).toEqual([]);
		});

		it('should list only the pages of the projects that the user can read', async () => {
			const member = await createUser();
			const hiddenProject = await createTeamProject();
			await linkUserToProject(member, project, 'project:viewer');
			await pageService.createPage(project.id, owner, {
				title: 'Visible',
				content: '[Sync](/workflow/wf1)',
			});
			await pageService.createPage(hiddenProject.id, owner, {
				title: 'Hidden',
				content: '[Sync](/workflow/wf1)',
			});

			expect(await referencingTitles(member, 'workflow', 'wf1')).toEqual(['Visible']);
			expect(await referencingTitles(owner, 'workflow', 'wf1')).toEqual(['Hidden', 'Visible']);
		});

		it('should return no page when nothing links to the resource', async () => {
			expect(await referencingTitles(owner, 'workflow', 'unlinked')).toEqual([]);
		});

		it('should stop listing a page after its content drops the link', async () => {
			const created = await pageService.createPage(project.id, owner, {
				title: 'Links wf1',
				content: '[Sync](/workflow/wf1)',
			});

			await pageService.updatePage(project.id, created.id, { content: 'No link', baseVersion: 1 });

			expect(await referencingTitles(owner, 'workflow', 'wf1')).toEqual([]);
		});
	});

	describe('listAllPages', () => {
		it('should list the pages of every project with the project name, the newest update first', async () => {
			const otherProject = await createTeamProject('Operations');
			const first = await pageService.createPage(project.id, owner, {
				title: 'First',
				content: 'Text',
			});
			await pageService.createPage(otherProject.id, owner, { title: 'Second' });
			await setUpdatedAt(first.id, 1);

			const pages = await pageService.listAllPages(owner, {});

			expect(pages.map((page) => page.title)).toEqual(['First', 'Second']);
			expect(pages[1]).toEqual({
				id: expect.any(String),
				projectId: otherProject.id,
				projectName: 'Operations',
				title: 'Second',
				version: 1,
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			});
			expect(pages[0]).toMatchObject({ projectId: project.id, projectName: project.name });
		});

		it('should list only the pages of the projects that the user can read', async () => {
			const member = await createUser();
			const hiddenProject = await createTeamProject();
			await linkUserToProject(member, project, 'project:viewer');
			await pageService.createPage(project.id, owner, { title: 'Visible' });
			await pageService.createPage(hiddenProject.id, owner, { title: 'Hidden' });

			const pages = await pageService.listAllPages(member, {});

			expect(pages.map((page) => page.title)).toEqual(['Visible']);
		});

		it('should keep the titles that contain the query in any case', async () => {
			await pageService.createPage(project.id, owner, { title: 'Deploy Runbook' });
			await pageService.createPage(project.id, owner, { title: 'RUNBOOK for alerts' });
			await pageService.createPage(project.id, owner, { title: 'Meeting notes' });

			const pages = await pageService.listAllPages(owner, { query: 'runBook' });

			expect(pages.map((page) => page.title).sort()).toEqual([
				'Deploy Runbook',
				'RUNBOOK for alerts',
			]);
		});

		it('should read the wildcard characters of the query as plain text', async () => {
			await pageService.createPage(project.id, owner, { title: '100% done' });
			await pageService.createPage(project.id, owner, { title: '100 percent done' });
			await pageService.createPage(project.id, owner, { title: 'snake_case' });
			await pageService.createPage(project.id, owner, { title: 'snakeXcase' });

			const titlesFor = async (query: string) =>
				(await pageService.listAllPages(owner, { query })).map((page) => page.title);

			expect(await titlesFor('0% d')).toEqual(['100% done']);
			expect(await titlesFor('e_c')).toEqual(['snake_case']);
		});

		it('should return at most 200 pages, the newest first', async () => {
			const now = Date.now();
			await pageRows().insert(
				Array.from({ length: 201 }, (_, index) => ({
					id: `bulk-page-${index}`,
					projectId: project.id,
					title: `Page ${index}`,
					updatedAt: new Date(now - index * 1000),
				})),
			);

			const pages = await pageService.listAllPages(owner, {});

			expect(pages).toHaveLength(200);
			expect(pages[0].title).toBe('Page 0');
			expect(pages.map((page) => page.title)).not.toContain('Page 200');
		});
	});

	describe('listNodeReferences', () => {
		it('should group the pages by the node of the workflow that they link to', async () => {
			const older = await pageService.createPage(project.id, owner, {
				title: 'Older, links node1',
				content: '[Node](/workflow/wf1/node1)',
			});
			const newer = await pageService.createPage(project.id, owner, {
				title: 'Newer, links node1 and node2',
				content: '[Node](/workflow/wf1/node1) [Other](/workflow/wf1/node2)',
			});
			await pageService.createPage(project.id, owner, {
				title: 'Links the workflow only',
				content: '[Sync](/workflow/wf1)',
			});
			await pageService.createPage(project.id, owner, {
				title: 'Links a node of another workflow',
				content: '[Node](/workflow/wf2/node1)',
			});
			await setUpdatedAt(older.id, 1);
			await setUpdatedAt(newer.id, 2);

			const references = await pageService.listNodeReferences(owner, 'wf1');

			const titlesByNodeId = Object.fromEntries(
				references.map(({ nodeId, pages }) => [nodeId, pages.map((page) => page.title)]),
			);
			expect(titlesByNodeId).toEqual({
				node1: ['Newer, links node1 and node2', 'Older, links node1'],
				node2: ['Newer, links node1 and node2'],
			});
			expect(references[0].pages[0]).not.toHaveProperty('content');
		});

		it('should count only the pages that the user can read', async () => {
			const member = await createUser();
			const hiddenProject = await createTeamProject();
			await linkUserToProject(member, project, 'project:viewer');
			await pageService.createPage(project.id, owner, {
				title: 'Visible',
				content: '[Node](/workflow/wf1/node1)',
			});
			await pageService.createPage(hiddenProject.id, owner, {
				title: 'Hidden',
				content: '[Node](/workflow/wf1/node1) [Other](/workflow/wf1/node2)',
			});

			const references = await pageService.listNodeReferences(member, 'wf1');

			expect(references).toEqual([
				{ nodeId: 'node1', pages: [expect.objectContaining({ title: 'Visible' })] },
			]);
		});

		it('should return no entry for a workflow that no page links to', async () => {
			expect(await pageService.listNodeReferences(owner, 'unlinked')).toEqual([]);
		});
	});

	describe('getBacklinks', () => {
		it('should list the other pages that link to the page', async () => {
			const target = await pageService.createPage(project.id, owner, { title: 'Target' });
			await pageService.updatePage(project.id, target.id, {
				content: `[Myself](/page/${target.id})`,
				baseVersion: 1,
			});
			await pageService.createPage(project.id, owner, {
				title: 'Short link',
				content: `[Target](/page/${target.id})`,
			});
			await pageService.createPage(project.id, owner, {
				title: 'Project link',
				content: `[Target](/projects/${project.id}/pages/${target.id})`,
			});
			await pageService.createPage(project.id, owner, { title: 'No link' });

			const backlinks = await pageService.getBacklinks(owner, target.id);

			expect(backlinks.pages.map((page) => page.title).sort()).toEqual([
				'Project link',
				'Short link',
			]);
			expect(backlinks.pages[0]).not.toHaveProperty('content');
			expect(backlinks.workflows).toEqual([]);
		});

		it('should list only the linking pages that the user can read', async () => {
			const member = await createUser();
			const hiddenProject = await createTeamProject();
			await linkUserToProject(member, project, 'project:viewer');
			const target = await pageService.createPage(project.id, owner, { title: 'Target' });
			await pageService.createPage(project.id, owner, {
				title: 'Visible',
				content: `[Target](/page/${target.id})`,
			});
			await pageService.createPage(hiddenProject.id, owner, {
				title: 'Hidden',
				content: `[Target](/page/${target.id})`,
			});

			const backlinks = await pageService.getBacklinks(member, target.id);

			expect(backlinks.pages.map((page) => page.title)).toEqual(['Visible']);
		});

		it('should hide the backlinks of a page that the user cannot read', async () => {
			const outsider = await createUser();
			const target = await pageService.createPage(project.id, owner, { title: 'Target' });

			await expect(pageService.getBacklinks(outsider, target.id)).rejects.toThrow(
				PageNotFoundError,
			);
		});

		it('should answer the same for a page that does not exist', async () => {
			await expect(pageService.getBacklinks(owner, 'missing-page')).rejects.toThrow(
				PageNotFoundError,
			);
		});

		it.each([
			['the short path', (pageId: string) => `/page/${pageId}`],
			['the short path with spaces around it', (pageId: string) => `  /page/${pageId}\n`],
			['the project path', (pageId: string) => `/projects/some-project/pages/${pageId}`],
			['an absolute URL', (pageId: string) => `https://n8n.example.com/page/${pageId}`],
			[
				'an absolute URL of the project path',
				(pageId: string) => `https://n8n.example.com/projects/some-project/pages/${pageId}`,
			],
			['a markdown link to the path', (pageId: string) => `[Runbook](/page/${pageId})`],
			[
				'a markdown link to an absolute URL',
				(pageId: string) => `[Runbook](https://n8n.example.com/page/${pageId})`,
			],
		])('should list a sticky note whose content is %s', async (_form, toContent) => {
			const target = await pageService.createPage(project.id, owner, { title: 'Target' });
			const workflow = await createWorkflow(
				{ name: 'Sync', nodes: [stickyNote(toContent(target.id), 'Docs')] },
				project,
			);

			const backlinks = await pageService.getBacklinks(owner, target.id);

			expect(backlinks.workflows).toEqual([
				{
					workflowId: workflow.id,
					workflowName: 'Sync',
					nodeId: 'id-of-Docs',
					nodeName: 'Docs',
				},
			]);
		});

		it('should list each sticky note that shows the page, by workflow name', async () => {
			const target = await pageService.createPage(project.id, owner, { title: 'Target' });
			await createWorkflow(
				{
					name: 'B workflow',
					nodes: [stickyNote(`/page/${target.id}`, 'One'), stickyNote(`/page/${target.id}`, 'Two')],
				},
				project,
			);
			await createWorkflow(
				{ name: 'A workflow', nodes: [stickyNote(`/page/${target.id}`, 'Only')] },
				project,
			);

			const backlinks = await pageService.getBacklinks(owner, target.id);

			expect(
				backlinks.workflows.map(({ workflowName, nodeName }) => [workflowName, nodeName]),
			).toEqual([
				['A workflow', 'Only'],
				['B workflow', 'One'],
				['B workflow', 'Two'],
			]);
		});

		it('should not list a node that contains the page id but does not show the page', async () => {
			const target = await pageService.createPage(project.id, owner, { title: 'Target' });
			const other = await pageService.createPage(project.id, owner, { title: 'Other' });
			await createWorkflow(
				{
					name: 'Sync',
					nodes: [
						setNode(`/page/${target.id}`),
						stickyNote(`See /page/${target.id} for details`, 'Sentence'),
						stickyNote(`[Runbook](/page/${target.id}) and more`, 'Link in a text'),
						stickyNote(`/workflow/${target.id}`, 'Workflow path'),
						stickyNote(`/page/${other.id}?from=${target.id}`, 'Other page'),
					],
				},
				project,
			);

			const backlinks = await pageService.getBacklinks(owner, target.id);

			expect(backlinks.workflows).toEqual([]);
		});

		it('should not list an archived workflow', async () => {
			const target = await pageService.createPage(project.id, owner, { title: 'Target' });
			await createWorkflow(
				{ name: 'Archived', isArchived: true, nodes: [stickyNote(`/page/${target.id}`)] },
				project,
			);

			const backlinks = await pageService.getBacklinks(owner, target.id);

			expect(backlinks.workflows).toEqual([]);
		});

		it('should list only the workflows that the user can read', async () => {
			const member = await createUser();
			const hiddenProject = await createTeamProject();
			await linkUserToProject(member, project, 'project:viewer');
			const target = await pageService.createPage(project.id, owner, { title: 'Target' });
			await createWorkflow({ name: 'Visible', nodes: [stickyNote(`/page/${target.id}`)] }, project);
			await createWorkflow(
				{ name: 'Hidden', nodes: [stickyNote(`/page/${target.id}`)] },
				hiddenProject,
			);

			const forMember = await pageService.getBacklinks(member, target.id);
			const forOwner = await pageService.getBacklinks(owner, target.id);

			expect(forMember.workflows.map(({ workflowName }) => workflowName)).toEqual(['Visible']);
			expect(forOwner.workflows.map(({ workflowName }) => workflowName)).toEqual([
				'Hidden',
				'Visible',
			]);
		});
	});
});
