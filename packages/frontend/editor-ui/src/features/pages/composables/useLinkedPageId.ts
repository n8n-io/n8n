import { useInstanceLocation } from '@n8n/frontend-module-page';
import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';

import { readLinkedPageId } from '../pageLink';
import { useIsPageModuleActive } from './useIsPageModuleActive';

/**
 * Reads the id of the page that a sticky note content links to.
 * The id is `undefined` when the content is more than one link to a page,
 * and when the page module is off.
 */
export function useLinkedPageId(
	content: MaybeRefOrGetter<string | undefined>,
): ComputedRef<string | undefined> {
	const isPageModuleActive = useIsPageModuleActive();
	const getInstanceLocation = useInstanceLocation();

	return computed(() =>
		isPageModuleActive.value
			? readLinkedPageId(toValue(content) ?? '', getInstanceLocation())
			: undefined,
	);
}
