import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { RequestHandler } from 'express';
import { UnexpectedError } from 'n8n-workflow';

import { isListQueryRequest } from '@/requests';
import * as ResponseHelper from '@/response-helper';
import { toError } from '@/utils';

import { WorkflowSorting } from './dtos/workflow.sort-by.dto';

export const sortByQueryMiddleware: RequestHandler = (req, res, next) => {
	const listQueryReq = req;
	const { sortBy } = listQueryReq.query;

	if (!sortBy || typeof sortBy !== 'string') return next();

	let SortBy;

	try {
		if (listQueryReq.baseUrl.endsWith('workflows') || listQueryReq.path.endsWith('workflows')) {
			SortBy = WorkflowSorting;
		} else {
			return next();
		}

		const validationResponse = validateSync(plainToInstance(SortBy, { sortBy }));

		if (validationResponse.length) {
			const validationError = validationResponse[0];
			throw new UnexpectedError(validationError.constraints?.workflowSortBy ?? '');
		}

		if (isListQueryRequest(listQueryReq)) {
			listQueryReq.listQueryOptions = { ...listQueryReq.listQueryOptions, sortBy };
		}

		next();
	} catch (maybeError) {
		ResponseHelper.sendErrorResponse(res, toError(maybeError));
	}
};
