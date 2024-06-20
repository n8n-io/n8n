import * as ResponseHelper from '@/ResponseHelper';
import { WorkflowFilter } from './dtos/workflow.filter.dto';
import { CredentialsFilter } from './dtos/credentials.filter.dto';
import { UserFilter } from './dtos/user.filter.dto';
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

	let Filter;

	if (req.baseUrl.endsWith('workflows')) {
		Filter = WorkflowFilter;
	} else if (req.baseUrl.endsWith('credentials')) {
		Filter = CredentialsFilter;
	} else if (req.baseUrl.endsWith('users')) {
		Filter = UserFilter;
	} else {
		return next();
	}

	try {
		const filter = await Filter.fromString(rawFilter);

		if (Object.keys(filter).length === 0) return next();

		req.listQueryOptions = { ...req.listQueryOptions, filter };

		next();
	} catch (maybeError) {
		ResponseHelper.sendErrorResponse(res, toError(maybeError));
	}
};
