import type { PaginationRootEmits, PaginationRootProps } from 'reka-ui';

export type PaginationSizes = 'small' | 'medium';

export type PaginationProps = Omit<
	PaginationRootProps,
	'dir' | 'asChild' | 'as' | 'itemsPerPage'
> & {
	/** Alias for `page` (Element+ compatibility). Supports `v-model:current-page`. */
	currentPage?: number;
	/** Alias for `itemsPerPage`. */
	pageSize?: number;
	/** Total number of pages. Takes precedence over `total` when set. */
	pageCount?: number;
	/** Alias for `pageSize` (Reka prop name). */
	itemsPerPage?: number;
	/** Odd number of page buttons to show (Element+). Mapped to Reka `siblingCount`. */
	pagerCount?: number;
	/** Hide the component when there is only one page. */
	hideOnSinglePage?: boolean;
	/** Custom text for the previous button (chevron icon used when omitted). */
	prevText?: string;
	/** Custom text for the next button (chevron icon used when omitted). */
	nextText?: string;
	/** Initial page size in uncontrolled mode. */
	defaultPageSize?: number;
	/** Initial page in uncontrolled mode (alias for Reka `defaultPage`). */
	defaultCurrentPage?: number;
	/** Size variant. */
	size?: PaginationSizes;
	/** Total number of items. Optional so `pageCount` can be used alone. */
	total?: number;
};

export type PaginationEmits = PaginationRootEmits & {
	'update:currentPage': [value: number];
	'current-change': [value: number];
	'prev-click': [value: number];
	'next-click': [value: number];
};

export type PaginationSlots = {
	prev?: (props?: { disabled?: boolean }) => unknown;
	next?: (props?: { disabled?: boolean }) => unknown;
};
