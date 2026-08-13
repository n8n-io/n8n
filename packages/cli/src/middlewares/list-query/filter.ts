import type { RequestHandler } from 'express';

import { appendListQueryOptions } from '@/requests';
import * as ResponseHelper from '@/response-helper';
import { toError } from '@/utils';

import { CredentialsFilter } from './dtos/credentials.filter.dto';
import { UserFilter } from './dtos/user.filter.dto';
import { WorkflowFilter } from './dtos/workflow.filter.dto';

export const filterListQueryMiddleware: RequestHandler = async (req, res, next) => {
	const { filter: rawFilter } = req.query;

	if (!rawFilter || typeof rawFilter !== 'string') return next();

	let Filter;

	if (req.baseUrl.endsWith('workflows') || req.path.endsWith('workflows')) {
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

		appendListQueryOptions(req, { filter });

		next();
	} catch (maybeError) {
		ResponseHelper.sendErrorResponse(res, toError(maybeError));
	}
};
