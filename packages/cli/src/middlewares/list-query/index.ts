import { type NextFunction, type Response } from 'express';

import type { ListQuery } from '@/types-db';

import { filterListQueryMiddleware } from './filter';
import { paginationListQueryMiddleware } from './pagination';
import { selectListQueryMiddleware } from './select';
import { sortByQueryMiddleware } from './sort-by';

export type ListQueryMiddleware = (
	req: ListQuery.Request,
	res: Response,
	next: NextFunction,
) => void;

/**
 * @deprecated Please create Zod validators in `@n8n/api-types` instead.
 */
export const listQueryMiddleware: ListQueryMiddleware[] = [
	filterListQueryMiddleware,
	selectListQueryMiddleware,
	paginationListQueryMiddleware,
	sortByQueryMiddleware,
];
