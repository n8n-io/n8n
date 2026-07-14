import type { RequestHandler, NextFunction, Response } from 'express';

import type { ListQuery } from '@/requests.js';

import { filterListQueryMiddleware } from './filter.js';
import { paginationListQueryMiddleware } from './pagination.js';
import { selectListQueryMiddleware } from './select.js';
import { sortByQueryMiddleware } from './sort-by.js';

export type ListQueryMiddleware = (
	req: ListQuery.Request,
	res: Response,
	next: NextFunction,
) => void;

/**
 * @deprecated Please create Zod validators in `@n8n/api-types` instead.
 */
export const listQueryMiddleware: RequestHandler[] = [
	filterListQueryMiddleware,
	selectListQueryMiddleware,
	paginationListQueryMiddleware,
	sortByQueryMiddleware,
];
