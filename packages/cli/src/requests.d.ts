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

	type GetAllCurrentQsParam = {
		filter: string; // '{ workflowId: string }'
	};

	type GetAll = AuthenticatedRequest<{}, {}, {}, GetAllQsParam>;
	type Get = AuthenticatedRequest<{ id: string }, {}, {}, { unflattedResponse: 'true' | 'false' }>;
	type Delete = AuthenticatedRequest<{}, {}, IExecutionDeleteFilter>;
	type Retry = AuthenticatedRequest<{ id: string }, {}, { loadWorkflow: boolean }, {}>;
	type Stop = AuthenticatedRequest<{ id: string }>;
	type GetAllCurrent = AuthenticatedRequest<{}, {}, {}, GetAllCurrentQsParam>;
}

// ----------------------------------
//      requests to /workflows
// ----------------------------------

type Node = {
	parameters: object;
	name: string;
	type: string;
	typeVersion: number;
	position: [number, number];
};

type CreateWorkflowPayload = Partial<{
	id: string; // delete if sent
	name: string;
	nodes: Node[];
	connections: object;
	active: boolean;
	settings: object;
	tags: string[];
}>;

export declare namespace WorkflowRequest {
	type Create = express.Request<{}, {}, CreateWorkflowPayload> & { user: User };

	type Get = express.Request<{ id: string }> & { user: User };
}
