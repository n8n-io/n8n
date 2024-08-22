import { filterListQueryMiddleware } from './filter';
import { selectListQueryMiddleware } from './select';
import { paginationListQueryMiddleware } from './pagination';
import type { ListQuery } from '@/requests';
import type { NextFunction, Response } from 'express';

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
