import type { RequestHandler } from 'express';
import { UnexpectedError } from 'n8n-workflow';

import type { ListQuery } from '@/requests';
import * as ResponseHelper from '@/response-helper';
import { toError } from '@/utils';

import { Pagination } from './dtos/pagination.dto';

export const paginationListQueryMiddleware: RequestHandler = (req, res, next) => {
	const listQueryReq = req as ListQuery.Request;
	const { take: rawTake, skip: rawSkip = '0' } = listQueryReq.query;

	try {
		if (!rawTake && listQueryReq.query.skip) {
			throw new UnexpectedError('Please specify `take` when using `skip`');
		}

		if (!rawTake) return next();

		const { take, skip } = Pagination.fromString(rawTake, rawSkip);

		listQueryReq.listQueryOptions = { ...listQueryReq.listQueryOptions, skip, take };

		next();
	} catch (maybeError) {
		ResponseHelper.sendErrorResponse(res, toError(maybeError));
	}
};
