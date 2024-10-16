import type { NextFunction, Response } from 'express';

import type { ListQuery } from '@/requests';

import { filterListQueryMiddleware } from './filter';
import { paginationListQueryMiddleware } from './pagination';
import { selectListQueryMiddleware } from './select';

export type ListQueryMiddleware = (
	req: ListQuery.Request,
	res: Response,
	next: NextFunction,
) => void;

export const listQueryMiddleware: ListQueryMiddleware[] = [
	filterListQueryMiddleware,
	selectListQueryMiddleware,
	paginationListQueryMiddleware,
];
