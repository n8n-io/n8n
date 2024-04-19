import * as ResponseHelper from '@/ResponseHelper';
import type { NextFunction, Response } from 'express';
import type { ExecutionRequest } from './execution.types';
import type { JsonObject } from 'n8n-workflow';
import { ApplicationError, jsonParse } from 'n8n-workflow';
import {
	allowedExecutionsQueryFilterFields as ALLOWED_FILTER_FIELDS,
	schemaGetExecutionsQueryFilter as SCHEMA,
} from './execution.service';
import { validate } from 'jsonschema';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

const isValid = (arg: JsonObject) => validate(arg, SCHEMA).valid;

/**
 * Middleware to parse the query string in a request to retrieve a range of execution summaries.
 */
export const parseRangeQuery = (
	req: ExecutionRequest.GetMany,
	res: Response,
	next: NextFunction,
) => {
	const { limit, firstId, lastId } = req.query;

	try {
		req.rangeQuery = {
			kind: 'range',
			range: { limit: limit ? Math.min(parseInt(limit, 10), 100) : 20 },
		};

		if (firstId) req.rangeQuery.range.firstId = firstId;
		if (lastId) req.rangeQuery.range.lastId = lastId;

		if (req.query.filter) {
			const jsonFilter = jsonParse<JsonObject>(req.query.filter, {
				errorMessage: 'Failed to parse query string',
			});

			for (const key of Object.keys(jsonFilter)) {
				if (!ALLOWED_FILTER_FIELDS.includes(key)) delete jsonFilter[key];
			}

			if (jsonFilter.waitTill) jsonFilter.waitTill = Boolean(jsonFilter.waitTill);

			if (!isValid(jsonFilter)) throw new ApplicationError('Query does not match schema');

			req.rangeQuery = { ...req.rangeQuery, ...jsonFilter };
		}

		next();
	} catch (error) {
		if (error instanceof Error) {
			ResponseHelper.sendErrorResponse(res, new BadRequestError(error.message));
		}
	}
};
