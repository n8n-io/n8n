import { isIntegerString, toError } from '@/utils';
import * as ResponseHelper from '@/ResponseHelper';
import type { ListQuery } from '@/requests';
import type { RequestHandler } from 'express';

export const paginationListQueryMiddleware: RequestHandler = (
	req: ListQuery.Request,
	res,
	next,
) => {
	const { take: rawTake, skip: rawSkip = '0' } = req.query;

	if (!rawTake) return next();

	try {
		const MAX_ITEMS = 50;

		if ([rawTake, rawSkip].some((i) => !isIntegerString(i))) {
			throw new Error('Parameter take or skip is not an integer string');
		}

		const [take, skip] = [rawTake, rawSkip].map((o) => parseInt(o, 10));

		const paginationOptions = { skip, take: Math.min(take, MAX_ITEMS) };

		req.listQueryOptions = { ...req.listQueryOptions, ...paginationOptions };

		next();
	} catch (maybeError) {
		ResponseHelper.sendErrorResponse(res, toError(maybeError));
	}
};
