import { PAGE_TOUR_QUERY_PARAMETER, extractTourSteps, toResourcePath } from '@n8n/api-types';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { useRouter, type RouteLocationRaw } from 'vue-router';

import { usePageStore } from '../page.store';

/** Builds the address that opens a workflow and starts the tour of a page on its canvas. */
export function toPageTourRoute(workflowId: string, pageId: string): RouteLocationRaw {
	return {
		path: toResourcePath({ resourceType: 'workflow', resourceId: workflowId }),
		query: { [PAGE_TOUR_QUERY_PARAMETER]: pageId },
	};
}

/**
 * Gives the "Start tour" action of a page.
 * `canStartTour` is true when the last version of the page that this client holds links to a node.
 * `startTour` opens the workflow of the first node link with a request to start the tour.
 * It does nothing when the page has no tour.
 */
export function usePageTourStart(pageId: MaybeRefOrGetter<string | undefined>) {
	const router = useRouter();
	const pageStore = usePageStore();

	const tourWorkflowId = computed(() => {
		const id = toValue(pageId);
		const page = id === undefined ? undefined : pageStore.pagesById[id];
		return page === undefined ? undefined : extractTourSteps(page.content)?.workflowId;
	});

	const canStartTour = computed(() => tourWorkflowId.value !== undefined);

	async function startTour(): Promise<void> {
		const id = toValue(pageId);
		if (id !== undefined && tourWorkflowId.value !== undefined) {
			await router.push(toPageTourRoute(tourWorkflowId.value, id));
		}
	}

	return { canStartTour, startTour };
}
