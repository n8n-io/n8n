import { toResourcePath, type Page, type PageSummary } from '@n8n/api-types';
import { WorkflowProjectService } from '@n8n/backend-services';
import { Service } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';
import type {
	INode,
	IPageProjectService,
	PageProxyProvider,
	ProjectPage,
	ProjectPageSummary,
	Workflow,
} from 'n8n-workflow';

import { PageService } from './page.service';

const PAGE_NODE_TYPES = ['n8n-nodes-base.page'];

function toProjectPageSummary({ id, title, version, updatedAt }: PageSummary): ProjectPageSummary {
	return {
		id,
		title,
		version,
		updatedAt,
		url: toResourcePath({ resourceType: 'page', resourceId: id }),
	};
}

function toProjectPage(page: Page): ProjectPage {
	return { ...toProjectPageSummary(page), content: page.content };
}

/** @throws {UnexpectedError} when the node is not a Page node */
function assertPageNode(node: INode): void {
	if (!PAGE_NODE_TYPES.includes(node.type)) {
		throw new UnexpectedError('This proxy is only available for Page nodes');
	}
}

/** Gives the Page node access to the pages of the project that owns its workflow. */
@Service()
export class PageProxyService implements PageProxyProvider {
	constructor(
		private readonly pageService: PageService,
		private readonly workflowProjectService: WorkflowProjectService,
	) {}

	/**
	 * `projectId` overrides the project that owns the workflow.
	 * @throws {UnexpectedError} when the node is not a Page node
	 */
	async getPageProxy(
		workflow: Workflow,
		node: INode,
		projectId?: string,
	): Promise<IPageProjectService> {
		assertPageNode(node);
		return this.makePageOperations(projectId ?? (await this.getOwningProjectId(workflow)));
	}

	private async getOwningProjectId(workflow: Workflow): Promise<string> {
		const project = await this.workflowProjectService.getWorkflowProjectCached(workflow.id);
		return project.id;
	}

	private makePageOperations(projectId: string): IPageProjectService {
		const { pageService } = this;
		return {
			getProjectId: () => projectId,
			listPages: async (options = {}) =>
				(await pageService.searchProjectPages(projectId, options.titleQuery)).map(
					toProjectPageSummary,
				),
			getPage: async (pageId) => toProjectPage(await pageService.getPage(projectId, pageId)),
			appendToPage: async (pageId, text) =>
				toProjectPage(await pageService.appendToPage(projectId, pageId, text)),
			updatePageSection: async (pageId, sectionTitle, text) =>
				toProjectPage(await pageService.updatePageSection(projectId, pageId, sectionTitle, text)),
			replacePageContent: async (pageId, content) =>
				toProjectPage(await pageService.replacePageContent(projectId, pageId, content)),
		};
	}
}
