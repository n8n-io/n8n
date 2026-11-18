import type { PageResourceLocation, PageResourceType } from '@n8n/api-types';
import type { BaseTextKey } from '@n8n/i18n';

/** The kinds of resource that show the pages that link to them. */
export type PagesResourceKind = Exclude<PageResourceType, 'page'>;

/**
 * A resource that pages can link to.
 * A node carries its `workflowId`. A credential or a data table carries its `projectId`.
 */
export type PagesResource = PageResourceLocation & { resourceType: PagesResourceKind };

type ResourcePagesTextKeys = {
	/** A plural text that takes the number of pages. */
	buttonTitle: BaseTextKey;
	emptyList: BaseTextKey;
	createPage: BaseTextKey;
	/** The first line of a new page. It takes the markdown `link` to the resource. */
	newPageContent: BaseTextKey;
};

const TEXT_KEYS_BY_KIND: Record<PagesResourceKind, ResourcePagesTextKeys> = {
	workflow: {
		buttonTitle: 'page.workflow.button.title',
		emptyList: 'page.workflow.popover.empty',
		createPage: 'page.workflow.popover.create',
		newPageContent: 'page.workflow.newPage.content',
	},
	node: {
		buttonTitle: 'page.node.button.title',
		emptyList: 'page.node.popover.empty',
		createPage: 'page.node.popover.create',
		newPageContent: 'page.node.newPage.content',
	},
	credential: {
		buttonTitle: 'page.credential.button.title',
		emptyList: 'page.credential.popover.empty',
		createPage: 'page.credential.popover.create',
		newPageContent: 'page.credential.newPage.content',
	},
	dataTable: {
		buttonTitle: 'page.dataTable.button.title',
		emptyList: 'page.dataTable.popover.empty',
		createPage: 'page.dataTable.popover.create',
		newPageContent: 'page.dataTable.newPage.content',
	},
};

/** Gives the i18n keys of the texts that name a kind of resource. */
export function toResourcePagesTextKeys(kind: PagesResourceKind): ResourcePagesTextKeys {
	return TEXT_KEYS_BY_KIND[kind];
}
