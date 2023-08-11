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
		if (!isIntegerString(rawTake)) {
			throw new Error('Parameter take is not an integer string');
		}

		if (!isIntegerString(rawSkip)) {
			throw new Error('Parameter skip is not an integer string');
		}

		const [take, skip] = [rawTake, rawSkip].map((o) => parseInt(o, 10));

		const MAX_ITEMS_PER_PAGE = 50;

		req.listQueryOptions = {
			...req.listQueryOptions,
			skip,
			take: Math.min(take, MAX_ITEMS_PER_PAGE),
		};

		next();
	} catch (maybeError) {
		ResponseHelper.sendErrorResponse(res, toError(maybeError));
	}
};
