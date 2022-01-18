/* eslint-disable import/no-cycle */
import express = require('express');
import { IExecutionDeleteFilter } from '.';
import { User } from './databases/entities/User';

export type AuthenticatedRequest<
	RouteParams = {},
	ResponseBody = {},
	RequestBody = {},
	RequestQuery = {},
> = express.Request<RouteParams, ResponseBody, RequestBody, RequestQuery> & { user: User };

export declare namespace ExecutionRequest {
	type GetAllQsParam = {
		filter: string; // '{ waitTill: string; finished: boolean, [other: string]: string }'
		limit: string;
		lastId: string;
		firstId: string;
	};

	type GetAll = AuthenticatedRequest<{}, {}, {}, GetAllQsParam>;
	type Get = AuthenticatedRequest<{ id: string }, {}, {}, { unflattedResponse: 'true' | 'false' }>;
	type Delete = AuthenticatedRequest<{}, {}, IExecutionDeleteFilter>;
}
