import * as ResponseHelper from '@/ResponseHelper';
import type { NextFunction, Response } from 'express';
import type { ExecutionRequest } from './execution.types';
import type { JsonObject } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
import {
	allowedExecutionsQueryFilterFields as ALLOWED_FILTER_FIELDS,
	schemaGetExecutionsQueryFilter as SCHEMA,
} from './execution.service';
import { validate } from 'jsonschema';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

const isValid = (arg: JsonObject) => validate(arg, SCHEMA).valid;

/**
 * Middleware to parse the query string in a request to retrieve many executions.
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
			range: { limit: limit ? parseInt(limit, 10) : 20 },
		};

		if (firstId) req.rangeQuery.range.firstId = firstId;
		if (lastId) req.rangeQuery.range.lastId = lastId;

		if (req.query.filter) {
			const jsonFilter = jsonParse<JsonObject>(req.query.filter);

			for (const key of Object.keys(jsonFilter)) {
				if (!ALLOWED_FILTER_FIELDS.includes(key)) delete jsonFilter[key];
			}

			if (!isValid(jsonFilter)) next();

			req.rangeQuery = { ...req.rangeQuery, ...jsonFilter };
		}

		next();
	} catch {
		const error = new BadRequestError(`Failed to parse query string: ${JSON.stringify(req.query)}`);
		ResponseHelper.sendErrorResponse(res, error);
	}
};
