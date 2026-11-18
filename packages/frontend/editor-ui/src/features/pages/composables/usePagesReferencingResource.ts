import type { PageSummary } from '@n8n/api-types';
import { usePageStore } from '@n8n/frontend-module-page';
import { ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

import { byNewestUpdate } from '../pageSearch';
import type { PagesResource } from '../resourcePages';

type ResourceIdentity = Pick<PagesResource, 'resourceType' | 'resourceId'>;

function toKey(resource: ResourceIdentity | undefined): string | undefined {
	return resource === undefined ? undefined : `${resource.resourceType}:${resource.resourceId}`;
}

function isKnown(resource: ResourceIdentity | undefined): resource is ResourceIdentity {
	return resource !== undefined && resource.resourceId !== '';
}

/**
 * Lists the pages that link to a resource, newest first.
 * The pages of a workflow include the pages that link to one of its nodes.
 * The list loads when the resource is known and again on each `refresh`.
 * A failed load keeps the last list.
 */
export function usePagesReferencingResource(
	resource: MaybeRefOrGetter<ResourceIdentity | undefined>,
) {
	const pageStore = usePageStore();
	const pages = ref<PageSummary[]>([]);
	const isLoading = ref(false);

	async function refresh(): Promise<void> {
		const requested = toValue(resource);
		if (isKnown(requested)) {
			isLoading.value = true;
			try {
				const found = await pageStore.listReferencing({
					resourceType: requested.resourceType,
					resourceId: requested.resourceId,
				});
				// A slow answer for the previous resource must not replace the list of this one.
				if (toKey(toValue(resource)) === toKey(requested)) {
					pages.value = [...found].sort(byNewestUpdate);
				}
			} catch {
				// The list is a secondary element of its host. A failure must not disturb the host.
			} finally {
				isLoading.value = false;
			}
		}
	}

	async function resetAndLoad(): Promise<void> {
		pages.value = [];
		await refresh();
	}

	watch(() => toKey(toValue(resource)), resetAndLoad, { immediate: true });

	return { pages, isLoading, refresh };
}
