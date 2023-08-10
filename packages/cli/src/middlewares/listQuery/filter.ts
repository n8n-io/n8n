/* eslint-disable @typescript-eslint/naming-convention */

import { jsonParse } from 'n8n-workflow';
import { handleListQueryError } from './error';
import { WorkflowFilterDtoValidator as Validator } from './dtos/workflow.filter.dto';
import { isObjectLiteral } from '@/utils';

import type { RequestHandler } from 'express';
import type { ListQuery } from '@/requests';

function toQueryFilter(rawFilter: string, DtoValidator: typeof Validator) {
	const objDto = jsonParse(rawFilter, { errorMessage: 'Failed to parse filter JSON' });

	if (!isObjectLiteral(objDto)) throw new Error('Filter must be an object literal');

	const filter = DtoValidator.validate(objDto);

	if (!filter.tags) return filter;

	return { ...filter, tags: filter.tags.map((tag) => ({ name: tag })) };
}

export const filterListQueryMiddleware: RequestHandler = (req: ListQuery.Request, _, next) => {
	const { filter: rawFilter } = req.query;

	if (!rawFilter) return next();

	let DtoValidator;

	if (req.baseUrl.endsWith('workflows')) {
		DtoValidator = Validator;
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
