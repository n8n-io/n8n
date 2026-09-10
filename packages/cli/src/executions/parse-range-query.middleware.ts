import type { ExecutionSummaries } from '@n8n/db';
import type { NextFunction, Request, Response } from 'express';
import { validate } from 'jsonschema';
import type { JsonObject } from 'n8n-workflow';
import { jsonParse, UnexpectedError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import * as ResponseHelper from '@/response-helper';

import { parseExecutionCursor } from './execution-cursor';
import {
	allowedExecutionsQueryFilterFields as ALLOWED_FILTER_FIELDS,
	schemaGetExecutionsQueryFilter as SCHEMA,
} from './execution.service';

const isValid = (arg: JsonObject) => validate(arg, SCHEMA).valid;

/** Parse and validate the `filter` query param, applied on top of `rangeQuery`. */
function parseFilter(rawFilter: unknown, rangeQuery: ExecutionSummaries.RangeQuery) {
	if (typeof rawFilter !== 'string') return rangeQuery;

	const jsonFilter = jsonParse<JsonObject>(rawFilter, {
		errorMessage: 'Failed to parse query string',
	});

	for (const key of Object.keys(jsonFilter)) {
		if (!ALLOWED_FILTER_FIELDS.includes(key)) delete jsonFilter[key];
	}

	if (!isValid(jsonFilter)) throw new UnexpectedError('Query does not match schema');

	return { ...rangeQuery, ...jsonFilter };
}

/**
 * Middleware to parse the query string in a request to retrieve a range of execution summaries.
 */
export const parseRangeQuery = (req: Request, res: Response, next: NextFunction) => {
	const { limit, firstId, lastId } = req.query;

	try {
		if (firstId !== undefined || lastId !== undefined)
			throw new BadRequestError(
				'Use cursor to load execution pages. Your n8n instance has most likely updated. Please refresh the page.',
			);

		if (req.query.cursor !== undefined && typeof req.query.cursor !== 'string')
			throw new BadRequestError('Invalid execution cursor');

		const cursor =
			req.query.cursor === undefined ? undefined : parseExecutionCursor(req.query.cursor);

		const pageLimit = limit === undefined ? 20 : Number(limit);
		if (!Number.isInteger(pageLimit) || pageLimit < 1 || pageLimit > 100)
			throw new BadRequestError('Execution limit must be between 1 and 100');

		const rangeQuery: ExecutionSummaries.RangeQuery = parseFilter(req.query.filter, {
			kind: 'range',
			range: {
				limit: pageLimit,
			},
		});

		Object.assign(req, { rangeQuery, cursor });
		next();
	} catch (error) {
		if (error instanceof Error) {
			ResponseHelper.sendErrorResponse(res, new BadRequestError(error.message));
		}
	}
};
