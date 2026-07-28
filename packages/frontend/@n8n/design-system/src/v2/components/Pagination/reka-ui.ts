/**
 * Local re-export shim for reka-ui.
 *
 * Pagination.vue imports reka-ui through this shim. Storybook's vue-docgen-plugin
 * resolves package imports from this folder to a broken relative path:
 *
 *   src/v2/components/Pagination/ → ../../../node_modules/reka-ui/dist/index.js
 *   (resolves to src/node_modules/…, which does not exist)
 *
 * Types are re-exported here so .vue files in this folder never import
 * 'reka-ui' directly.
 */
export {
	PaginationEllipsis,
	PaginationList,
	PaginationListItem,
	PaginationNext,
	PaginationPrev,
	PaginationRoot,
	useForwardProps,
} from 'reka-ui';

export type { PaginationRootEmits, PaginationRootProps } from 'reka-ui';
