/* eslint-disable @typescript-eslint/naming-convention */

import { jsonParse } from 'n8n-workflow';
import * as ResponseHelper from '@/ResponseHelper';
import { WorkflowFilter } from './dtos/workflow.filter.dto';
import { toError } from '@/utils';

import type { NextFunction, Response } from 'express';
import type { ListQuery } from '@/requests';

export const filterListQueryMiddleware = async (
	req: ListQuery.Request,
	res: Response,
	next: NextFunction,
) => {
	const { filter: rawFilter } = req.query;

	if (!rawFilter) return next();

	let FilterClass;

	if (req.baseUrl.endsWith('workflows')) {
		FilterClass = WorkflowFilter;
	} else {
		return next();
	}

	try {
		const dto = jsonParse(rawFilter, { errorMessage: 'Failed to parse filter JSON' });

		const filter = new FilterClass(dto);

		const validFilter = await filter.validate();

		if (Object.keys(validFilter).length === 0) return next();

		req.listQueryOptions = { ...req.listQueryOptions, filter: validFilter };

		next();
	} catch (maybeError) {
		ResponseHelper.sendErrorResponse(res, toError(maybeError));
	}
};
