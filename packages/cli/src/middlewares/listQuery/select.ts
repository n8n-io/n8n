/* eslint-disable @typescript-eslint/naming-convention */

import { handleListQueryError } from './error';
import { jsonParse } from 'n8n-workflow';
import { isStringArray } from '@/utils';
import { WorkflowSelectDtoValidator as Validator } from './dtos/workflow.select.dto';

import type { ListQuery } from '@/requests';
import type { RequestHandler } from 'express';

function toQuerySelect(rawSelect: string, DtoValidator: typeof Validator) {
	const arrDto = jsonParse(rawSelect, { errorMessage: 'Failed to parse select JSON' });

	if (!isStringArray(arrDto)) throw new Error('Parsed select is not a string array');

	return DtoValidator.validate(arrDto).reduce<Record<string, true>>((acc, field) => {
		return (acc[field] = true), acc;
	}, {});
}

export const selectListQueryMiddleware: RequestHandler = (req: ListQuery.Request, _, next) => {
	const { select: rawSelect } = req.query;

	if (!rawSelect) return next();

	let DtoValidator;

	if (req.baseUrl.endsWith('workflows')) {
		DtoValidator = Validator;
	} else {
		return next();
	}

	try {
		const select = toQuerySelect(rawSelect, DtoValidator);

		if (Object.keys(select).length === 0) return next();

		req.listQueryOptions = { ...req.listQueryOptions, select };

		next();
	} catch (error) {
		handleListQueryError('select', rawSelect, error);
	}
};
