import type { ListQueryRequest } from '@/requests';
import type { RequestHandler } from 'express';

function toPaginationOptions(rawTake: string, rawSkip: string) {
	const MAX_ITEMS = 50;

	const [take, skip] = [rawTake, rawSkip].map((o) => parseInt(o, 10));

	return { skip, take: Math.min(take, MAX_ITEMS) };
}

export const paginationListQueryMiddleware: RequestHandler = (req: ListQueryRequest, res, next) => {
	const { take: rawTake, skip: rawSkip = '0' } = req.query;

	if (!rawTake) return next();

	const { take, skip } = toPaginationOptions(rawTake, rawSkip);

	req.listQueryOptions = { ...req.listQueryOptions, take, skip };

	next();
};
