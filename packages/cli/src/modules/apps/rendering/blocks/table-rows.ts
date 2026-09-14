import type { TableBlock } from '@n8n/api-types';

import { interpolate } from '../interpolate';
import type { BlockRenderContext } from '../types';

import type {
	AppDataTableFilter,
	AppDataTableHandle,
	AppDataTableRowResult,
} from '../../runtime/page-context.factory';

const interpolateFilter = (
	filter: AppDataTableFilter | undefined,
	ctx: BlockRenderContext,
): AppDataTableFilter | undefined => {
	if (!filter) return undefined;
	return {
		...filter,
		filters: filter.filters.map((f) => ({
			...f,
			value: typeof f.value === 'string' ? interpolate(f.value, ctx) : f.value,
		})),
	};
};

/**
 * The rows a table block shows on the rendered page: its filter with the
 * page's params resolved, its sort and its limit. Row actions accept only
 * rows this query returns, so a visitor can change what they can see.
 */
export const visibleRows = async (
	handle: AppDataTableHandle,
	block: TableBlock,
	ctx: BlockRenderContext,
): Promise<AppDataTableRowResult[]> => {
	const { data } = await handle.getManyRowsAndCount({
		filter: interpolateFilter(block.data.filter, ctx),
		sortBy: block.data.sortBy,
		take: block.data.limit,
	});
	return data;
};
