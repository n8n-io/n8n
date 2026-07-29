import type { PaginationRootEmits, PaginationRootProps } from './reka-ui';

export type PaginationSizes = 'small' | 'medium';

export type PaginationProps = Omit<
	PaginationRootProps,
	'dir' | 'asChild' | 'as' | 'itemsPerPage'
> & {
	/** Number of items per page. Supports `v-model:items-per-page`. */
	itemsPerPage?: number;
	/**
	 * Default number of items per page when `itemsPerPage` is uncontrolled.
	 * @defaultValue 10
	 */
	defaultItemsPerPage?: number;
	/**
	 * Options for the page size selector.
	 * @defaultValue [10, 20, 30, 40, 50, 100]
	 */
	pageSizes?: number[];
	/** Total number of pages. Takes precedence over `total` when set. */
	pageCount?: number;
	/**
	 * Show the total item count.
	 * @defaultValue true
	 */
	showTotal?: boolean;
	/**
	 * Show the page size selector.
	 * @defaultValue true
	 */
	showSizes?: boolean;
	/**
	 * Show the go-to-page jumper.
	 * @defaultValue true
	 */
	showJumper?: boolean;
	/**
	 * Hide the component when there is only one page.
	 * @defaultValue false
	 */
	hideOnSinglePage?: boolean;
	/**
	 * Size variant.
	 * @defaultValue 'medium'
	 */
	size?: PaginationSizes;
};

export type PaginationEmits = PaginationRootEmits & {
	'update:itemsPerPage': [value: number];
};

export type PaginationSlots = {
	prev?: (props: { disabled: boolean }) => unknown;
	next?: (props: { disabled: boolean }) => unknown;
};
