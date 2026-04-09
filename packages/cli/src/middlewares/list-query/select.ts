import type { RequestHandler } from 'express';

import { isListQueryRequest } from '@/requests';
import * as ResponseHelper from '@/response-helper';
import { toError } from '@/utils';

import { CredentialsSelect } from './dtos/credentials.select.dto';
import { UserSelect } from './dtos/user.select.dto';
import { WorkflowSelect } from './dtos/workflow.select.dto';

export const selectListQueryMiddleware: RequestHandler = (req, res, next) => {
	const listQueryReq = req;
	const { select: rawSelect } = listQueryReq.query;

	if (!rawSelect || typeof rawSelect !== 'string') return next();

	let Select;

	if (listQueryReq.baseUrl.endsWith('workflows') || listQueryReq.path.endsWith('workflows')) {
		Select = WorkflowSelect;
	} else if (listQueryReq.baseUrl.endsWith('credentials')) {
		Select = CredentialsSelect;
	} else if (listQueryReq.baseUrl.endsWith('users')) {
		Select = UserSelect;
	} else {
		return next();
	}

	try {
		const select = Select.fromString(rawSelect);

		if (Object.keys(select).length === 0) return next();

		if (isListQueryRequest(listQueryReq)) {
			listQueryReq.listQueryOptions = { ...listQueryReq.listQueryOptions, select };
		}

		next();
	} catch (maybeError) {
		ResponseHelper.sendErrorResponse(res, toError(maybeError));
	}
};
