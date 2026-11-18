import { PROJECT_PAGES_VIEW } from '@n8n/frontend-module-page';
import { useRouter } from 'vue-router';

import { usePageCreation } from './usePageCreation';

/**
 * Gives the "New page" action of a project.
 * It creates an untitled page in the project and opens it in the pages view.
 * A failed creation shows an error toast and opens nothing.
 */
export function useNewPageAction() {
	const router = useRouter();
	const { isCreating, createUntitledPage } = usePageCreation();

	async function createUntitledPageAndOpenIt(projectId: string): Promise<void> {
		const page = await createUntitledPage(projectId);
		if (page !== undefined) {
			await router.push({
				name: PROJECT_PAGES_VIEW,
				params: { projectId, pageId: page.id },
			});
		}
	}

	return { isCreating, createUntitledPageAndOpenIt };
}
