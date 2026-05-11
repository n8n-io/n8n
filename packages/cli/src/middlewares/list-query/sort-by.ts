import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { RequestHandler } from 'express';
import { UnexpectedError } from 'n8n-workflow';

import { appendListQueryOptions } from '@/requests';
import * as ResponseHelper from '@/response-helper';
import { toError } from '@/utils';

import { WorkflowSorting } from './dtos/workflow.sort-by.dto';

export const sortByQueryMiddleware: RequestHandler = (req, res, next) => {
	const { sortBy } = req.query;

	if (!sortBy || typeof sortBy !== 'string') return next();

	let SortBy;

	try {
		if (req.baseUrl.endsWith('workflows') || req.path.endsWith('workflows')) {
			SortBy = WorkflowSorting;
		} else {
			return next();
		}

		const validationResponse = validateSync(plainToInstance(SortBy, { sortBy }));

		if (validationResponse.length) {
			const validationError = validationResponse[0];
			throw new UnexpectedError(validationError.constraints?.workflowSortBy ?? '');
		}

		appendListQueryOptions(req, { sortBy });

		next();
	} catch (maybeError) {
		ResponseHelper.sendErrorResponse(res, toError(maybeError));
	}
};
