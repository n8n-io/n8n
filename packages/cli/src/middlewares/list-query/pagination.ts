import type { RequestHandler } from 'express';
import { UnexpectedError } from 'n8n-workflow';

import { appendListQueryOptions } from '@/requests.js';
import * as ResponseHelper from '@/response-helper.js';
import { toError } from '@/utils.js';

import { Pagination } from './dtos/pagination.dto.js';

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
