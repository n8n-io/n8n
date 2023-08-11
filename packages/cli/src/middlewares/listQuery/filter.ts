/* eslint-disable @typescript-eslint/naming-convention */

import { jsonParse } from 'n8n-workflow';
import { handleListQueryError } from './error';
import { WorkflowFilterDtoValidator } from './dtos/workflow.filter.dto';

import type { RequestHandler } from 'express';
import type { ListQuery } from '@/requests';
import { ExecutionFilterDtoValidator } from './dtos/execution.filter.dto';

type FilterDtoValidator = typeof WorkflowFilterDtoValidator | typeof ExecutionFilterDtoValidator;

function toQueryFilter(rawFilter: string, DtoValidator: FilterDtoValidator) {
	const dto = jsonParse(rawFilter, { errorMessage: 'Failed to parse filter JSON' });

	return DtoValidator.validate(dto);
}

export const filterListQueryMiddleware: RequestHandler = (req: ListQuery.Request, _, next) => {
	const { filter: rawFilter } = req.query;

	if (!rawFilter) return next();

	let DtoValidator;

	if (req.baseUrl.endsWith('workflows')) {
		DtoValidator = WorkflowFilterDtoValidator;
	} else if (req.baseUrl.endsWith('executions')) {
		DtoValidator = ExecutionFilterDtoValidator;
	} else {
		return next();
	}

	try {
		const filter = toQueryFilter(rawFilter, DtoValidator);

		if (Object.keys(filter).length === 0) return next();

		req.listQueryOptions = { ...req.listQueryOptions, filter };

		next();
	} catch (error) {
		handleListQueryError('filter', rawFilter, error);
	}
};
