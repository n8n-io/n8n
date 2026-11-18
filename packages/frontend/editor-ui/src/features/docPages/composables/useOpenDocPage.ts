import { ref } from 'vue';
import { useRouter } from 'vue-router';
import type { DocPageResourceType } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';

import { DOC_PAGE_VIEW } from '../constants';
import { useDocPagesStore } from '../docPages.store';

/** Makes sure the resource has a page, then opens it. */
export function useOpenDocPage() {
	const router = useRouter();
	const i18n = useI18n();
	const toast = useToast();
	const docPagesStore = useDocPagesStore();
	const opening = ref(false);

	async function openDocPage(resourceType: DocPageResourceType, resourceId: string) {
		if (opening.value) return;
		opening.value = true;
		try {
			const page = await docPagesStore.ensurePage(resourceType, resourceId);
			await router.push({
				name: DOC_PAGE_VIEW,
				params: { projectId: page.projectId, pageId: page.id },
			});
		} catch (error) {
			toast.showError(error, i18n.baseText('docPages.open.error'));
		} finally {
			opening.value = false;
		}
	}

	return { openDocPage, opening };
}
