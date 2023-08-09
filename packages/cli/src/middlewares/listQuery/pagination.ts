import type { ListQueryRequest } from '@/requests';
import { isIntegerString } from '@/utils';
import type { RequestHandler } from 'express';

function toPaginationOptions(rawTake: string, rawSkip: string) {
	const MAX_ITEMS = 50;

	if ([rawTake, rawSkip].some((i) => !isIntegerString(i))) {
		throw new Error('Parameter take or skip is not an integer string');
	}

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
