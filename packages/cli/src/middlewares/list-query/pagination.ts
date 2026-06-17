import type { RequestHandler } from 'express';
import { UnexpectedError } from 'n8n-workflow';

import { appendListQueryOptions } from '@/requests';
import * as ResponseHelper from '@/response-helper';
import { toError } from '@/utils';

import { Pagination } from './dtos/pagination.dto';

export const paginationListQueryMiddleware: RequestHandler = (req, res, next) => {
	const { take: rawTake } = req.query;
	let { skip: rawSkip = '0' } = req.query;

	try {
		if (!rawTake && req.query.skip) {
			throw new UnexpectedError('Please specify `take` when using `skip`');
		}

		if (!rawTake || typeof rawTake !== 'string') return next();

		if (typeof rawSkip !== 'string') {
			rawSkip = '0';
		}

		const { take, skip } = Pagination.fromString(rawTake, rawSkip);

		appendListQueryOptions(req, { skip, take });

		next();
	} catch (maybeError) {
		ResponseHelper.sendErrorResponse(res, toError(maybeError));
	}
};
