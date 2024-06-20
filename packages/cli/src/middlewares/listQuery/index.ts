import { filterListQueryMiddleware } from './filter';
import { selectListQueryMiddleware } from './select';
import { paginationListQueryMiddleware } from './pagination';

export const listQueryMiddleware = [
	filterListQueryMiddleware,
	selectListQueryMiddleware,
	paginationListQueryMiddleware,
];
