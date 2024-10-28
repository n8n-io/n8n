import { toError } from '@/utils';
import * as ResponseHelper from '@/ResponseHelper';
import { Pagination } from './dtos/pagination.dto';
import type { ListQuery } from '@/requests';
import type { RequestHandler } from 'express';
import { ApplicationError } from 'n8n-workflow';

export const paginationListQueryMiddleware: RequestHandler = (
	req: ListQuery.Request,
	res,
	next,
) => {
	const { take: rawTake, skip: rawSkip = '0' } = req.query;

	try {
		if (!rawTake && req.query.skip) {
			throw new ApplicationError('Please specify `take` when using `skip`');
		}

		if (!rawTake) return next();

		const { take, skip } = Pagination.fromString(rawTake, rawSkip);

		req.listQueryOptions = { ...req.listQueryOptions, skip, take };

		next();
	} catch (maybeError) {
		ResponseHelper.sendErrorResponse(res, toError(maybeError));
	}
};
