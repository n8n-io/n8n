/** Short previews of row values and filters for approval cards. */
import type { z } from 'zod';

import type { filterSchema } from './schemas';

const MAX_DESCRIBED_COLUMNS = 5;
export const MAX_DESCRIBED_ROWS = 3;

export type RowFilter = z.infer<typeof filterSchema>;

/** The noun in the singular for 1, otherwise in the plural ("row", "rows"). */
export function pluralize(count: number, noun: string): string {
	return count === 1 ? noun : `${noun}s`;
}

export function describeRowFilter(filter: RowFilter): string {
	const conditions = {
		eq: 'is',
		neq: 'is not',
		like: 'matches the text pattern',
		ilike: 'matches the text pattern (ignoring case)',
		gt: 'is greater than',
		gte: 'is greater than or equal to',
		lt: 'is less than',
		lte: 'is less than or equal to',
	};
	return filter.filters
		.map(({ columnName, condition, value }) => {
			if (value === null && (condition === 'eq' || condition === 'neq')) {
				return `"${columnName}" ${condition === 'eq' ? 'has no value' : 'has a value'}`;
			}
			if (
				(condition === 'like' || condition === 'ilike') &&
				typeof value === 'string' &&
				!value.includes('%')
			) {
				return `"${columnName}" contains ${JSON.stringify(value)}${condition === 'ilike' ? ' (ignoring case)' : ' (matching case)'}`;
			}
			return `"${columnName}" ${conditions[condition]} ${JSON.stringify(value)}`;
		})
		.join(` ${filter.type} `);
}

export function previewRow(data: Record<string, unknown>) {
	const entries = Object.entries(data);
	return {
		values: entries.slice(0, MAX_DESCRIBED_COLUMNS).map(([column, value]) => {
			const text = value === null || value === undefined ? null : JSON.stringify(value);
			return { column, value: text && text.length > 100 ? `${text.slice(0, 100)}…` : text };
		}),
		remainingColumns: Math.max(0, entries.length - MAX_DESCRIBED_COLUMNS),
	};
}
