import type {
	CreatePageDto,
	ListAllPagesQueryDto,
	ListReferencingPagesQueryDto,
	Page,
	PageBacklinks,
	PageListItem,
	PageNodeReferences,
	PageOverview,
	PageSummary,
	PageWorkflowPlacement,
	UpdatePageDto,
} from '@n8n/api-types';
import { PAGE_CONTENT_MAX_LENGTH } from '@n8n/api-types';
import { ProjectScopeService, WorkflowSharingService } from '@n8n/backend-services';
import { OperationContext, ProjectRepository, TransactionRunner, type User } from '@n8n/db';
import { Service } from '@n8n/di';

import { PageAppendConflictError } from './errors/page-append-conflict.error';
import { PageContentTooLongError } from './errors/page-content-too-long.error';
import { PageNotFoundError } from './errors/page-not-found.error';
import { PageProjectNotFoundError } from './errors/page-project-not-found.error';
import { PageVersionConflictError } from './errors/page-version-conflict.error';
import { appendMarkdownBlock } from './page-append';
import { replaceMarkdownSection } from './page-section';
import { PageExecutionRepository } from './page-execution.repository';
import {
	toMainPageIds,
	toOverviewSummary,
	toPageOverview,
	toWorkflowDocumentations,
	withoutSummaryLinks,
} from './page-overview';
import { toWorkflowPlacements } from './page-placements';
import { PageReferenceRepository } from './page-reference.repository';
import { toReferenceRows } from './page-references';
import { PageWorkflowRepository, type ProjectWorkflowRow } from './page-workflow.repository';
import type { PageEntity } from './page.entity';
import { toNodeReferences, toPage, toPageListItem, toPageSummary } from './page.mapper';
import { PageRepository, type PageRowChanges, type ProjectSummaryRow } from './page.repository';

/** The most pages that the list across projects returns. */
const ALL_PAGES_LIST_LIMIT = 200;

/** The title of a new page that sums up a project. */
const PROJECT_SUMMARY_TITLE = 'About this project';

/** How many times an append reads the page and tries to save, before it fails. */
const APPEND_MAX_ATTEMPTS = 3;

/** Keeps only the fields that the client sent. */
function toRowChanges({ title, content }: UpdatePageDto): PageRowChanges {
	return {
		...(title !== undefined ? { title } : {}),
		...(content !== undefined ? { content } : {}),
	};
}

@Service()
export class PageService {
	constructor(
		private readonly pageRepository: PageRepository,
		private readonly pageReferenceRepository: PageReferenceRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly projectScopeService: ProjectScopeService,
		private readonly pageWorkflowRepository: PageWorkflowRepository,
		private readonly pageExecutionRepository: PageExecutionRepository,
		private readonly workflowSharingService: WorkflowSharingService,
		private readonly transactionRunner: TransactionRunner,
	) {}

	/** Lists the pages of a project, the most recently updated first. */
	async listPages(projectId: string): Promise<PageSummary[]> {
		const rows = await this.pageRepository.listSummariesByProject(projectId, {});
		return rows.map(toPageSummary);
	}

	/**
	 * Lists the pages of one project, the most recently updated first.
	 * Returns at most 200 pages. `titleQuery` keeps the titles that contain it. The case does not count.
	 */
	async searchProjectPages(projectId: string, titleQuery?: string): Promise<PageSummary[]> {
		const rows = await this.pageRepository.listRecentWithProjectName(
			{ projectIds: [projectId], titleQuery, limit: ALL_PAGES_LIST_LIMIT },
			{},
		);
		return rows.map(toPageSummary);
	}

	/** @throws {PageProjectNotFoundError} when the project does not exist */
	async createPage(projectId: string, user: User, dto: CreatePageDto): Promise<Page> {
		await this.assertProjectExists(projectId);
		const content = dto.content ?? '';

		return await this.transactionRunner.run({}, async (ctx) => {
			const page = await this.pageRepository.insertPage(
				{ projectId, title: dto.title, content, createdById: user.id },
				ctx,
			);
			await this.pageReferenceRepository.replaceReferences(page.id, toReferenceRows(content), ctx);
			return toPage(page);
		});
	}

	/**
	 * Gives the page that sums up the project. A project without one gets an empty one.
	 * @throws {PageProjectNotFoundError} when the project does not exist
	 */
	async ensureProjectSummary(projectId: string, user: User): Promise<Page> {
		await this.assertProjectExists(projectId);
		const [summary] = await this.pageRepository.listProjectSummaries([projectId], {});
		const page = summary
			? await this.findInProjectOrFail(summary.id, projectId, {})
			: await this.pageRepository.insertPage(
					{
						projectId,
						title: PROJECT_SUMMARY_TITLE,
						content: '',
						createdById: user.id,
						isProjectSummary: true,
					},
					{},
				);
		return toPage(page);
	}

	/** @throws {PageNotFoundError} when the page is not in the project */
	async getPage(projectId: string, pageId: string): Promise<Page> {
		return toPage(await this.findInProjectOrFail(pageId, projectId, {}));
	}

	/**
	 * Reads a page from its id only.
	 * @throws {PageNotFoundError} when the page does not exist, or when the user cannot read its project
	 */
	async getReadablePage(user: User, pageId: string): Promise<Page> {
		const page = await this.pageRepository.findById(pageId, {});
		const isReadable =
			page !== null &&
			(await this.projectScopeService.hasScopes(user, page.projectId, ['page:read']));
		if (!isReadable) {
			throw new PageNotFoundError();
		}
		return toPage(page);
	}

	/**
	 * Saves the changes as the next version of the page, and derives its references again.
	 * @throws {PageNotFoundError} when the page is not in the project
	 * @throws {PageVersionConflictError} when `baseVersion` is not the stored version
	 */
	async updatePage(projectId: string, pageId: string, dto: UpdatePageDto): Promise<Page> {
		return await this.transactionRunner.run({}, async (ctx) => {
			const isSaved = await this.pageRepository.saveNextVersion(
				pageId,
				projectId,
				dto.baseVersion,
				toRowChanges(dto),
				ctx,
			);
			if (!isSaved) {
				await this.rejectSave(pageId, projectId, dto.baseVersion, ctx);
			}

			const page = await this.findInProjectOrFail(pageId, projectId, ctx);
			await this.pageReferenceRepository.replaceReferences(
				pageId,
				toReferenceRows(page.content),
				ctx,
			);
			return toPage(page);
		});
	}

	/**
	 * Adds the text as a new markdown block after the latest content of the page.
	 * Reads the page again when another writer saves first, at most 3 attempts.
	 * @throws {PageNotFoundError} when the page is not in the project
	 * @throws {PageContentTooLongError} when the new content is longer than a page can hold
	 * @throws {PageAppendConflictError} when another writer saved first on each attempt
	 */
	async appendToPage(projectId: string, pageId: string, text: string): Promise<Page> {
		return await this.editWithAttempts(
			projectId,
			pageId,
			(content) => appendMarkdownBlock(content, text),
			APPEND_MAX_ATTEMPTS,
		);
	}

	/**
	 * Replaces the text under a heading of the latest content of the page.
	 * A page with no such heading gets a new section at its end.
	 * Reads the page again when another writer saves first, at most 3 attempts.
	 * @throws {PageNotFoundError} when the page is not in the project
	 * @throws {PageContentTooLongError} when the new content is longer than a page can hold
	 * @throws {PageAppendConflictError} when another writer saved first on each attempt
	 */
	async updatePageSection(
		projectId: string,
		pageId: string,
		sectionTitle: string,
		text: string,
	): Promise<Page> {
		return await this.editWithAttempts(
			projectId,
			pageId,
			(content) => replaceMarkdownSection(content, sectionTitle, text),
			APPEND_MAX_ATTEMPTS,
		);
	}

	/**
	 * Saves the content as the next version of the page, whatever the stored version is.
	 * @throws {PageNotFoundError} when the page is not in the project
	 * @throws {PageContentTooLongError} when the content is longer than a page can hold
	 */
	async replacePageContent(projectId: string, pageId: string, content: string): Promise<Page> {
		this.assertContentFits(content);
		const latest = await this.getPage(projectId, pageId);
		return await this.updatePage(projectId, pageId, { baseVersion: latest.version, content });
	}

	/** @throws {PageNotFoundError} when the page is not in the project */
	async deletePage(projectId: string, pageId: string): Promise<void> {
		const isDeleted = await this.pageRepository.deleteInProject(pageId, projectId, {});
		if (!isDeleted) {
			throw new PageNotFoundError();
		}
	}

	/**
	 * Lists the pages that link to a resource, in the projects where the user can read pages.
	 * A page that links to a node of a workflow also counts for that workflow.
	 */
	async listReferencingPages(
		user: User,
		{ resourceType, resourceId }: ListReferencingPagesQueryDto,
	): Promise<PageSummary[]> {
		const pageIds = await this.pageReferenceRepository.findReferencingPageIds(
			resourceType,
			resourceId,
			{},
		);
		return await this.listReadableSummaries(user, pageIds);
	}

	/**
	 * Lists the pages of every project where the user can read pages, the most recently updated first.
	 * Returns at most 200 pages. `query` keeps the titles that contain it. The case does not count.
	 */
	async listAllPages(user: User, { query }: ListAllPagesQueryDto): Promise<PageListItem[]> {
		const rows = await this.pageRepository.listRecentWithProjectName(
			{
				projectIds: await this.getReadableProjectIds(user),
				titleQuery: query,
				limit: ALL_PAGES_LIST_LIMIT,
			},
			{},
		);
		return rows.map(toPageListItem);
	}

	/**
	 * Lists the nodes of a workflow that a page links to, each with its pages.
	 * Only the pages that the user can read count. The pages are the most recently updated first.
	 */
	async listNodeReferences(user: User, workflowId: string): Promise<PageNodeReferences[]> {
		const links = await this.pageReferenceRepository.listNodeLinksOfWorkflow(workflowId, {});
		const pages = await this.listReadableSummaries(
			user,
			links.map((link) => link.pageId),
		);
		return toNodeReferences(links, pages);
	}

	/**
	 * Lists where a page is used: the readable pages that link to it,
	 * and the sticky notes that show it in the workflows that the user can read.
	 * @throws {PageNotFoundError} when the page does not exist, or when the user cannot read its project
	 */
	async getBacklinks(user: User, pageId: string): Promise<PageBacklinks> {
		await this.getReadablePage(user, pageId);
		const [pages, workflows] = await Promise.all([
			this.listLinkingPages(user, pageId),
			this.listWorkflowPlacements(user, pageId),
		]);
		return { pages, workflows };
	}

	/**
	 * Sums up the documentation of every project where the user can list pages.
	 * Gives each workflow that is not archived and that the user can read, with the page that documents it.
	 */
	async getOverview(user: User): Promise<PageOverview> {
		const { overview } = await this.buildOverview(
			user,
			await this.projectScopeService.getProjectIds(user, ['page:list']),
		);
		return overview;
	}

	/** Sums up the documentation of one project. The caller checks that the user can list its pages. */
	async getProjectOverview(user: User, projectId: string): Promise<PageOverview> {
		const { overview, summaries } = await this.buildOverview(user, [projectId]);
		const [summary] = summaries;
		return { ...overview, ...(summary ? { summary: toOverviewSummary(summary) } : {}) };
	}

	/** `projectIds` restricts the overview to these projects. `null` means every project. */
	private async buildOverview(
		user: User,
		projectIds: string[] | null,
	): Promise<{ overview: PageOverview; summaries: ProjectSummaryRow[] }> {
		const [workflows, links, summaries] = await Promise.all([
			this.listReadableWorkflows(user, projectIds),
			this.pageReferenceRepository.listWorkflowLinks(projectIds, {}),
			this.pageRepository.listProjectSummaries(projectIds, {}),
		]);
		const documentations = toWorkflowDocumentations(
			workflows,
			withoutSummaryLinks(links, summaries),
		);
		const [mainPages, lastExecutions] = await Promise.all([
			this.pageRepository.listByIds(toMainPageIds(documentations), {}),
			this.pageExecutionRepository.findLastFinishedByWorkflow(
				workflows.map((workflow) => workflow.id),
				{},
			),
		]);
		return { overview: toPageOverview(documentations, mainPages, lastExecutions), summaries };
	}

	/** Lists the workflows of the projects that are not archived and that the user can read, by name. */
	private async listReadableWorkflows(
		user: User,
		projectIds: string[] | null,
	): Promise<ProjectWorkflowRow[]> {
		const [workflows, readableWorkflowIds] = await Promise.all([
			this.pageWorkflowRepository.listNotArchivedOfProjects(projectIds, {}),
			this.workflowSharingService.getSharedWorkflowIdsForScopes(user, ['workflow:read']),
		]);
		const readableIds = new Set(readableWorkflowIds);
		return workflows.filter((workflow) => readableIds.has(workflow.id));
	}

	/** `null` means that the user can read the pages of every project. */
	private async getReadableProjectIds(user: User): Promise<string[] | null> {
		return await this.projectScopeService.getProjectIds(user, ['page:read']);
	}

	/** Lists the given pages that the user can read, the most recently updated first. */
	private async listReadableSummaries(user: User, pageIds: string[]): Promise<PageSummary[]> {
		const rows = await this.pageRepository.listSummariesByIds(
			pageIds,
			await this.getReadableProjectIds(user),
			{},
		);
		return rows.map(toPageSummary);
	}

	/** Lists the other readable pages that link to the page. */
	private async listLinkingPages(user: User, pageId: string): Promise<PageSummary[]> {
		const linkingPageIds = await this.pageReferenceRepository.findReferencingPageIds(
			'page',
			pageId,
			{},
		);
		return await this.listReadableSummaries(
			user,
			linkingPageIds.filter((linkingPageId) => linkingPageId !== pageId),
		);
	}

	/** Lists the sticky notes that show the page, in the workflows that the user can read. */
	private async listWorkflowPlacements(
		user: User,
		pageId: string,
	): Promise<PageWorkflowPlacement[]> {
		const [candidates, readableWorkflowIds] = await Promise.all([
			this.pageWorkflowRepository.findActiveWithNodesContaining(pageId, {}),
			this.workflowSharingService.getSharedWorkflowIdsForScopes(user, ['workflow:read']),
		]);
		const readableIds = new Set(readableWorkflowIds);
		return toWorkflowPlacements(
			candidates.filter((workflow) => readableIds.has(workflow.id)),
			pageId,
		);
	}

	/** Applies `edit` to the latest content and saves the result. A version conflict uses one attempt. */
	private async editWithAttempts(
		projectId: string,
		pageId: string,
		edit: (content: string) => string,
		attemptsLeft: number,
	): Promise<Page> {
		const latest = await this.getPage(projectId, pageId);
		const content = edit(latest.content);
		this.assertContentFits(content);
		try {
			return await this.updatePage(projectId, pageId, { baseVersion: latest.version, content });
		} catch (error) {
			const isConflict = error instanceof PageVersionConflictError;
			if (isConflict && attemptsLeft > 1) {
				return await this.editWithAttempts(projectId, pageId, edit, attemptsLeft - 1);
			}
			throw isConflict
				? new PageAppendConflictError({ pageId, attempts: APPEND_MAX_ATTEMPTS })
				: error;
		}
	}

	private assertContentFits(content: string): void {
		if (content.length > PAGE_CONTENT_MAX_LENGTH) {
			throw new PageContentTooLongError();
		}
	}

	private async assertProjectExists(projectId: string): Promise<void> {
		const existingIds = await this.projectRepository.findExistingIds([projectId]);
		if (existingIds.length === 0) {
			throw new PageProjectNotFoundError();
		}
	}

	private async findInProjectOrFail(
		pageId: string,
		projectId: string,
		ctx: OperationContext,
	): Promise<PageEntity> {
		const page = await this.pageRepository.findInProject(pageId, projectId, ctx);
		if (!page) {
			throw new PageNotFoundError();
		}
		return page;
	}

	/** Explains why a save matched no row: the page is missing, or it holds another version. */
	private async rejectSave(
		pageId: string,
		projectId: string,
		baseVersion: number,
		ctx: OperationContext,
	): Promise<never> {
		const page = await this.findInProjectOrFail(pageId, projectId, ctx);
		throw new PageVersionConflictError({ pageId, baseVersion, currentVersion: page.version });
	}
}
