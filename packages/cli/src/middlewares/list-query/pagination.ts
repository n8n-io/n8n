import type { RequestHandler } from 'express';
import { UnexpectedError } from 'n8n-workflow';

import { isListQueryRequest } from '@/requests';
import * as ResponseHelper from '@/response-helper';
import { toError } from '@/utils';

import { Pagination } from './dtos/pagination.dto';

export const paginationListQueryMiddleware: RequestHandler = (req, res, next) => {
	const listQueryReq = req;
	const { take: rawTake } = listQueryReq.query;
	let { skip: rawSkip = '0' } = listQueryReq.query;

	try {
		if (!rawTake && listQueryReq.query.skip) {
			throw new UnexpectedError('Please specify `take` when using `skip`');
		}

		if (!rawTake || typeof rawTake !== 'string') return next();

		if (typeof rawSkip !== 'string') {
			rawSkip = '0';
		}

		const { take, skip } = Pagination.fromString(rawTake, rawSkip);

		if (isListQueryRequest(listQueryReq)) {
			listQueryReq.listQueryOptions = { ...listQueryReq.listQueryOptions, skip, take };
		}

		next();
	} catch (maybeError) {
		ResponseHelper.sendErrorResponse(res, toError(maybeError));
	}
};
