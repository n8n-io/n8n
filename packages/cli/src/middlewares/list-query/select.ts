import type { RequestHandler } from 'express';

import { appendListQueryOptions } from '@/requests';
import * as ResponseHelper from '@/response-helper';
import { toError } from '@/utils';

import { CredentialsSelect } from './dtos/credentials.select.dto';
import { UserSelect } from './dtos/user.select.dto';
import { WorkflowSelect } from './dtos/workflow.select.dto';

export const selectListQueryMiddleware: RequestHandler = (req, res, next) => {
	const { select: rawSelect } = req.query;

	if (!rawSelect || typeof rawSelect !== 'string') return next();

	let Select;

	if (req.baseUrl.endsWith('workflows') || req.path.endsWith('workflows')) {
		Select = WorkflowSelect;
	} else if (req.baseUrl.endsWith('credentials')) {
		Select = CredentialsSelect;
	} else if (req.baseUrl.endsWith('users')) {
		Select = UserSelect;
	} else {
		return next();
	}

	try {
		const select = Select.fromString(rawSelect);

		if (Object.keys(select).length === 0) return next();

		appendListQueryOptions(req, { select });

		next();
	} catch (maybeError) {
		ResponseHelper.sendErrorResponse(res, toError(maybeError));
	}
};
