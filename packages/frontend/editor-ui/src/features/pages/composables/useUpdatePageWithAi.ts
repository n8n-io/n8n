import { toResourcePath } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import { useInstanceAiAvailable } from '@/features/ai/instanceAi/composables/useInstanceAiAvailability';
import { useInstanceAiHandoff } from '@/features/ai/instanceAi/composables/useInstanceAiHandoff';

import { useIsPageModuleActive } from './useIsPageModuleActive';

/** The page that the assistant brings up to date. */
export interface PageToUpdate {
	id: string;
	title: string;
	projectId: string;
}

/**
 * Gives the "Update with AI" action of a page.
 * `isAvailable` is true when this user can reach the assistant and the instance has pages.
 * `updatePage` opens an assistant thread in the project of the page and sends a request to correct the page.
 * It resolves with `true` only when the thread opened. An assistant that is not set up opens its setup instead.
 */
export function useUpdatePageWithAi() {
	const i18n = useI18n();
	const isAssistantAvailable = useInstanceAiAvailable();
	const isPageModuleActive = useIsPageModuleActive();
	const { startThread } = useInstanceAiHandoff();
	const isStarting = ref(false);

	const isAvailable = computed(() => isAssistantAvailable.value && isPageModuleActive.value);

	function toUpdateRequest(page: PageToUpdate): string {
		return i18n.baseText('page.updateWithAi.prompt', {
			interpolate: {
				pageTitle: page.title,
				pagePath: toResourcePath({ resourceType: 'page', resourceId: page.id }),
			},
		});
	}

	async function updatePage(page: PageToUpdate): Promise<boolean> {
		isStarting.value = true;
		try {
			const outcome = await startThread(
				page.projectId,
				toUpdateRequest(page),
				{ kind: 'prefill', prefillType: 'handoff_update_page' },
				{ source: 'page_update_button', origin: 'internal', sourceContext: { pageId: page.id } },
			);
			return outcome === 'started';
		} finally {
			isStarting.value = false;
		}
	}

	return { isAvailable, isStarting, updatePage };
}
