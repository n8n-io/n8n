/* eslint-disable @typescript-eslint/naming-convention */

import { WorkflowSelect } from './dtos/workflow.select.dto';
import * as ResponseHelper from '@/ResponseHelper';
import { toError } from '@/utils';

import type { RequestHandler } from 'express';
import type { ListQuery } from '@/requests';

export const selectListQueryMiddleware: RequestHandler = (req: ListQuery.Request, res, next) => {
	const { select: rawSelect } = req.query;

	if (!rawSelect) return next();

	let Select;

	if (req.baseUrl.endsWith('workflows')) {
		Select = WorkflowSelect;
	} else {
		return next();
	}

	try {
		const select = Select.fromString(rawSelect);

		if (Object.keys(select).length === 0) return next();

		req.listQueryOptions = { ...req.listQueryOptions, select };

		next();
	} catch (maybeError) {
		ResponseHelper.sendErrorResponse(res, toError(maybeError));
	}
};
