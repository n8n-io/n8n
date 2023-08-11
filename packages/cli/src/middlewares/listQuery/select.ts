/* eslint-disable @typescript-eslint/naming-convention */

import { jsonParse } from 'n8n-workflow';
import { WorkflowSelect } from './dtos/workflow.select.dto';
import * as ResponseHelper from '@/ResponseHelper';
import { toError } from '@/utils';

import type { RequestHandler } from 'express';
import type { ListQuery } from '@/requests';

export const selectListQueryMiddleware: RequestHandler = (req: ListQuery.Request, res, next) => {
	const { select: rawSelect } = req.query;

	if (!rawSelect) return next();

	let SelectClass;

	if (req.baseUrl.endsWith('workflows')) {
		SelectClass = WorkflowSelect;
	} else {
		return next();
	}

	try {
		const dto = jsonParse(rawSelect, { errorMessage: 'Failed to parse select JSON' });

		const select = new SelectClass(dto);

		const validSelect = select.validate();

		if (Object.keys(validSelect).length === 0) return next();

		req.listQueryOptions = { ...req.listQueryOptions, select: validSelect };

		next();
	} catch (maybeError) {
		ResponseHelper.sendErrorResponse(res, toError(maybeError));
	}
};
