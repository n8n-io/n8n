import { computed, toValue, type MaybeRefOrGetter } from 'vue';

import type { PagesResource } from '../resourcePages';
import { useIsPageModuleActive } from './useIsPageModuleActive';

type SavedResource = { id: string; projectId: string | undefined };

/**
 * Describes a saved resource of a project for the pages button.
 * `pagesResource` is `undefined` when the page module is off and when no resource is saved.
 * `pagesProjectId` is the project that gets a new page.
 */
function useProjectResourcePages(
	resourceType: 'credential' | 'dataTable',
	resource: () => SavedResource | undefined,
) {
	const isPageModuleActive = useIsPageModuleActive();
	const pagesProjectId = computed(() => resource()?.projectId);

	const pagesResource = computed<PagesResource | undefined>(() => {
		const saved = isPageModuleActive.value ? resource() : undefined;
		return saved === undefined
			? undefined
			: { resourceType, resourceId: saved.id, projectId: saved.projectId };
	});

	return { pagesResource, pagesProjectId };
}

type CredentialIdentity = { id: string; homeProject?: { id: string } };

/** Describes a saved credential for the pages button. A new page goes to its home project. */
export function useCredentialPages(
	credential: MaybeRefOrGetter<CredentialIdentity | null | undefined>,
) {
	return useProjectResourcePages('credential', () => {
		const saved = toValue(credential);
		return saved ? { id: saved.id, projectId: saved.homeProject?.id } : undefined;
	});
}

type DataTableIdentity = { id: string; projectId: string };

/** Describes a loaded data table for the pages button. A new page goes to its project. */
export function useDataTablePages(
	dataTable: MaybeRefOrGetter<DataTableIdentity | null | undefined>,
) {
	return useProjectResourcePages('dataTable', () => {
		const loaded = toValue(dataTable);
		return loaded ? { id: loaded.id, projectId: loaded.projectId } : undefined;
	});
}
