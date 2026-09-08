import type { ExecutionSummaries } from '@n8n/db';
import type { NextFunction, Request, Response } from 'express';
import { validate } from 'jsonschema';
import type { JsonObject } from 'n8n-workflow';
import { jsonParse, UnexpectedError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import * as ResponseHelper from '@/response-helper';

import { parseExecutionCursor } from './execution-cursor';
import { isExecutionIdV2 } from './execution-id';
import {
	allowedExecutionsQueryFilterFields as ALLOWED_FILTER_FIELDS,
	schemaGetExecutionsQueryFilter as SCHEMA,
} from './execution.service';

const isValid = (arg: JsonObject) => validate(arg, SCHEMA).valid;

/**
 * Middleware to parse the query string in a request to retrieve a range of execution summaries.
 */
export const parseRangeQuery = (req: Request, res: Response, next: NextFunction) => {
	const { limit, firstId, lastId } = req.query;

	try {
		if (firstId !== undefined || lastId !== undefined)
			throw new BadRequestError('Use cursor to load execution pages');
		if (req.query.cursor !== undefined && typeof req.query.cursor !== 'string')
			throw new BadRequestError('Invalid execution cursor');
		parseExecutionCursor(req.query.cursor);
		const pageLimit = limit === undefined ? 20 : Number(limit);
		if (!Number.isInteger(pageLimit) || pageLimit < 1 || pageLimit > 100)
			throw new BadRequestError('Execution limit must be between 1 and 100');
		let rangeQuery: ExecutionSummaries.RangeQuery = {
			kind: 'range',
			range: {
				limit: pageLimit,
			},
		};

		if (typeof req.query.filter === 'string') {
			const jsonFilter = jsonParse<JsonObject>(req.query.filter, {
				errorMessage: 'Failed to parse query string',
			});

			for (const key of Object.keys(jsonFilter)) {
				if (!ALLOWED_FILTER_FIELDS.includes(key)) delete jsonFilter[key];
			}

			if (jsonFilter.waitTill) jsonFilter.waitTill = Boolean(jsonFilter.waitTill);

			if (!isValid(jsonFilter)) throw new UnexpectedError('Query does not match schema');
			if (
				typeof jsonFilter.id === 'string' &&
				!isExecutionIdV2(jsonFilter.id) &&
				(!/^[1-9]\d*$/.test(jsonFilter.id) || Number(jsonFilter.id) > 2147483647)
			)
				throw new BadRequestError('Invalid execution ID');

			rangeQuery = { ...rangeQuery, ...jsonFilter };
		}

		Object.assign(req, { rangeQuery });
		next();
	} catch (error) {
		if (error instanceof Error) {
			ResponseHelper.sendErrorResponse(res, new BadRequestError(error.message));
		}
	}
};
