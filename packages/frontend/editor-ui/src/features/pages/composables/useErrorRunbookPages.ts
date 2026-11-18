import type { PageSummary } from '@n8n/api-types';
import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';

import type { PagesResource } from '../resourcePages';
import { useIsPageModuleActive } from './useIsPageModuleActive';
import { usePagesReferencingResource } from './usePagesReferencingResource';

/** The most pages that a failure shows as its runbook. */
export const MAX_RUNBOOK_PAGES = 3;

/** The place of a failure. Without a `nodeId`, only the pages of the workflow count. */
export interface FailureLocation {
	workflowId?: string;
	nodeId?: string;
}

function isKnownId(id: string | undefined): id is string {
	return id !== undefined && id !== '';
}

/** Gives the workflow as a resource that pages link to. An unknown workflow gives `undefined`. */
function toWorkflowResource({ workflowId }: FailureLocation): PagesResource | undefined {
	return isKnownId(workflowId) ? { resourceType: 'workflow', resourceId: workflowId } : undefined;
}

/** Gives the node as a resource that pages link to. An unknown node or workflow gives `undefined`. */
function toNodeResource({ workflowId, nodeId }: FailureLocation): PagesResource | undefined {
	return isKnownId(workflowId) && isKnownId(nodeId)
		? { resourceType: 'node', resourceId: nodeId, workflowId }
		: undefined;
}

/**
 * Orders the runbook pages of a failure: the pages of the node first, then the pages of the workflow.
 * A page shows one time. The result holds `MAX_RUNBOOK_PAGES` pages at most.
 */
export function toRunbookPages(
	nodePages: PageSummary[],
	workflowPages: PageSummary[],
): PageSummary[] {
	const pages = [...nodePages, ...workflowPages];
	const isFirstOccurrence = (page: PageSummary, index: number) =>
		pages.findIndex((candidate) => candidate.id === page.id) === index;
	return pages.filter(isFirstOccurrence).slice(0, MAX_RUNBOOK_PAGES);
}

/**
 * Lists the runbook pages of a failure, in the order of `toRunbookPages`.
 * The list is empty when the page module is off, and until the pages load.
 */
export function useErrorRunbookPages(
	failure: MaybeRefOrGetter<FailureLocation>,
): ComputedRef<PageSummary[]> {
	const isPageModuleActive = useIsPageModuleActive();
	const location = computed<FailureLocation>(() =>
		isPageModuleActive.value ? toValue(failure) : {},
	);
	const { pages: nodePages } = usePagesReferencingResource(() => toNodeResource(location.value));
	const { pages: workflowPages } = usePagesReferencingResource(() =>
		toWorkflowResource(location.value),
	);

	return computed(() => toRunbookPages(nodePages.value, workflowPages.value));
}
