import type { PaginationRootEmits, PaginationRootProps } from 'reka-ui';

import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';

export type PaginationSizes = 'small' | 'medium';
export type PaginationVariants = 'default' | 'ghost';

export type PaginationProps = Omit<
	PaginationRootProps,
	'dir' | 'asChild' | 'as' | 'itemsPerPage'
> & {
	// Backward compatibility props (Element+ aliases)
	currentPage?: number; // Alias for page
	pageSize?: number; // Alias for itemsPerPage
	pageCount?: number; // Total number of pages (alternative to total)
	itemsPerPage?: number; // Optional, can be inferred from pageSize
	pagerCount?: number; // Alias for siblingCount (Element+ shows odd number, e.g., 7 means 3 siblings)
	background?: boolean; // For styling (default variant)
	layout?: string; // Controls which elements to show: 'prev, pager, next, sizes, jumper, total'
	pageSizes?: number[]; // For page size selector dropdown
	hideOnSinglePage?: boolean; // Hide when total pages === 1
	prevText?: string; // Custom text for prev button
	nextText?: string; // Custom text for next button
	prevIcon?: IconName; // Custom icon for prev button
	nextIcon?: IconName; // Custom icon for next button
	popperClass?: string; // Custom class for page sizes dropdown
	teleported?: boolean; // Whether to teleport dropdown (not used in Reka UI)
	defaultPageSize?: number; // Default page size for uncontrolled mode
	defaultCurrentPage?: number; // Default current page for uncontrolled mode

	// UI props
	size?: PaginationSizes;
	variant?: PaginationVariants;

	// Override to make total optional (Element+ allows omitting it)
	total?: number;
};

export type PaginationEmits = PaginationRootEmits & {
	'update:currentPage': [value: number];
	'update:pageSize': [value: number];
	'size-change': [value: number]; // Legacy Element+ event
	'current-change': [value: number]; // Legacy Element+ event
	'prev-click': [value: number]; // Element+ event
	'next-click': [value: number]; // Element+ event
};

export type PaginationSlots = {
	default?: (props?: Record<string, never>) => unknown;
	prev?: (props?: { disabled?: boolean }) => unknown;
	next?: (props?: { disabled?: boolean }) => unknown;
	first?: (props?: { disabled?: boolean }) => unknown;
	last?: (props?: { disabled?: boolean }) => unknown;
};
