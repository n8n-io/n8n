import type { InjectionKey } from 'vue';

/**
 * A page header that shows a tab row provides a place for the list toolbar (search, sort and
 * filters) at the end of that row. The list layout calls this function with that element.
 */
export const ResourceListToolbarTargetKey: InjectionKey<(element: HTMLElement | null) => void> =
	Symbol('ResourceListToolbarTarget');
