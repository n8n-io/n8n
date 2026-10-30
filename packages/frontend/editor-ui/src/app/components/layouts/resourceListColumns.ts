import dateformat from 'dateformat';
import { useI18n } from '@n8n/i18n';
import type { ComputedRef, InjectionKey } from 'vue';

export interface ResourceListColumn {
	/** Matches the `column` prop of the row cells */
	key: string;
	/** Header text. Leave it empty for a column without a heading, such as row actions */
	label?: string;
	/** Fixed width as a CSS length. Omit it to let the column fill the remaining space */
	width?: string;
	align?: 'start' | 'end';
	/** A column with a higher priority hides first when the list gets narrow */
	priority?: 1 | 2 | 3;
}

export const ResourceListColumnsKey: InjectionKey<ComputedRef<ResourceListColumn[] | undefined>> =
	Symbol('ResourceListColumns');

/** Formats a creation date for a list column, for example "13 October" or "5 December, 2025" */
export function formatResourceListDate(date: string | number | Date): string {
	const currentYear = new Date().getFullYear().toString();

	return dateformat(date, `d mmmm${String(date).startsWith(currentYear) ? '' : ', yyyy'}`);
}

/** Column widths, so the same column has the same width on every list page */
export const RESOURCE_LIST_COLUMN_WIDTH = {
	narrow: 'var(--spacing--3xl)',
	medium: 'var(--spacing--4xl)',
	wide: 'calc(var(--spacing--4xl) + var(--spacing--3xl))',
} as const;

/** Builds the columns that most resource lists share */
export function useResourceListColumns() {
	const i18n = useI18n();

	return {
		name: (): ResourceListColumn => ({
			key: 'name',
			label: i18n.baseText('resourcesList.column.name'),
		}),
		location: (): ResourceListColumn => ({
			key: 'location',
			label: i18n.baseText('resourcesList.column.project'),
			width: RESOURCE_LIST_COLUMN_WIDTH.wide,
			priority: 2,
		}),
		updated: (): ResourceListColumn => ({
			key: 'updated',
			label: i18n.baseText('resourcesList.column.updated'),
			width: RESOURCE_LIST_COLUMN_WIDTH.medium,
			priority: 1,
		}),
		created: (): ResourceListColumn => ({
			key: 'created',
			label: i18n.baseText('resourcesList.column.created'),
			width: RESOURCE_LIST_COLUMN_WIDTH.medium,
			priority: 3,
		}),
		/** Dependency count pill, without a heading */
		dependencies: (): ResourceListColumn => ({
			key: 'dependencies',
			width: RESOURCE_LIST_COLUMN_WIDTH.narrow,
			align: 'end',
			priority: 2,
		}),
		/** Row actions, sized for the given number of icon buttons */
		actions: (buttons = 1): ResourceListColumn => ({
			key: 'actions',
			width: `calc(${buttons} * var(--spacing--xl) + ${buttons - 1} * var(--spacing--2xs))`,
			align: 'end',
		}),
	};
}
