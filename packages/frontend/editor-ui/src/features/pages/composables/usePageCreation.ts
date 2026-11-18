import type { Page } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { usePageStore } from '@n8n/frontend-module-page';
import { useI18n } from '@n8n/i18n';
import { ref } from 'vue';

import { toResourceMarkdownLink } from '../pageLink';
import { toResourcePagesTextKeys, type PagesResource } from '../resourcePages';

/**
 * Gives functions that create a page in a project.
 * A failure shows an error toast and resolves with `undefined`.
 * A call during another creation creates nothing and resolves with `undefined`.
 */
export function usePageCreation() {
	const i18n = useI18n();
	const toast = useToast();
	const pageStore = usePageStore();
	const isCreating = ref(false);

	async function createPage(
		projectId: string,
		page: { title: string; content?: string },
	): Promise<Page | undefined> {
		let created: Page | undefined;
		if (!isCreating.value) {
			isCreating.value = true;
			try {
				created = await pageStore.createPage(projectId, page);
			} catch (error) {
				toast.showError(error, i18n.baseText('page.create.error'));
			} finally {
				isCreating.value = false;
			}
		}
		return created;
	}

	/** A first line that links to the resource, then an empty paragraph to write in. */
	function toLinkingPageContent(resource: PagesResource, resourceName: string): string {
		const firstLine = i18n.baseText(toResourcePagesTextKeys(resource.resourceType).newPageContent, {
			interpolate: { link: toResourceMarkdownLink(resource, resourceName) },
		});
		return `${firstLine}\n\n`;
	}

	function toPageTitle(resourceName: string): string {
		return resourceName.trim() || i18n.baseText('page.untitled');
	}

	/** Creates a page titled after the resource. Its content links to the resource. */
	async function createPageLinkingResource(
		projectId: string,
		resource: PagesResource,
		resourceName: string,
	): Promise<Page | undefined> {
		return await createPage(projectId, {
			title: toPageTitle(resourceName),
			content: toLinkingPageContent(resource, resourceName),
		});
	}

	/** Creates an empty page titled after the workflow. */
	async function createPageNamedAfterWorkflow(
		projectId: string,
		workflowName: string,
	): Promise<Page | undefined> {
		return await createPage(projectId, { title: toPageTitle(workflowName) });
	}

	async function createUntitledPage(projectId: string): Promise<Page | undefined> {
		return await createPage(projectId, { title: i18n.baseText('page.untitled') });
	}

	return {
		isCreating,
		createPageLinkingResource,
		createPageNamedAfterWorkflow,
		createUntitledPage,
	};
}
