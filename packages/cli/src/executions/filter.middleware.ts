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

export const parseGetManyQueryString = (
	req: ExecutionRequest.GetMany,
	_res: Response,
	next: NextFunction,
) => {
	try {
		const jsonFilter = jsonParse<JsonObject>(req.query.filter);

		Object.keys(jsonFilter).forEach((key) => {
			if (!ALLOWED_FIELDS.includes(key)) delete jsonFilter[key];
		});

		req.getManyFilter = jsonSchemaValidate(jsonFilter, SCHEMA).valid ? jsonFilter : {};

		const { limit, firstId, lastId } = req.query;

		req.getManyFilter.limit = limit ? parseInt(limit, 10) : 20;

		if (firstId) req.getManyFilter.firstId = firstId;
		if (lastId) req.getManyFilter.lastId = lastId;

		next();
	} catch (error) {
		next(new BadRequestError('Failed to parse get many query string'));
	}
};
