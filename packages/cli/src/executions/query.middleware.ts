import * as ResponseHelper from '@/ResponseHelper';
import type { NextFunction, Response } from 'express';
import type { ExecutionRequest } from './execution.types';
import type { JsonObject } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';
import {
	allowedExecutionsQueryFilterFields as ALLOWED_FIELDS,
	schemaGetExecutionsQueryFilter as SCHEMA,
} from './execution.service';
import { validate as jsonSchemaValidate } from 'jsonschema';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

/**
 * Middleware to parse the query string for a request to retrieve many executions.
 */
export const parseGetManyQuery = (
	req: ExecutionRequest.GetMany,
	res: Response,
	next: NextFunction,
) => {
	try {
		req.getManyQuery = {};

		if (req.query.filter) {
			const jsonFilter = jsonParse<JsonObject>(req.query.filter);

			Object.keys(jsonFilter).forEach((key) => {
				if (!ALLOWED_FIELDS.includes(key)) delete jsonFilter[key];
			});

			if (jsonSchemaValidate(jsonFilter, SCHEMA).valid) req.getManyQuery = jsonFilter;
		}

		const { limit, firstId, lastId } = req.query;

		req.getManyQuery.limit = limit ? parseInt(limit, 10) : 20;

		if (firstId) req.getManyQuery.firstId = firstId;
		if (lastId) req.getManyQuery.lastId = lastId;

		next();
	} catch {
		const error = new BadRequestError('Failed to parse get many query string');
		ResponseHelper.sendErrorResponse(res, error);
	}
};
