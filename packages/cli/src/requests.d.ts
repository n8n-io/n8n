/* eslint-disable import/no-cycle */
import express = require('express');
import { IExecutionDeleteFilter } from '.';
import { IConnections, INode, IWorkflowSettings } from '../../workflow/dist/src';
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

type CreateWorkflowPayload = Partial<{
	id: string; // delete if sent
	name: string;
	nodes: INode[];
	connections: object;
	active: boolean;
	settings: object;
	tags: string[];
}>;

type UpdateWorkflowPayload = Partial<{
	id: string;
	name: string;
	nodes: INode[];
	connections: IConnections;
	settings: IWorkflowSettings;
	active: boolean;
	tags: string[];
}>;

export declare namespace WorkflowRequest {
	type Payload = Partial<{
		id: string; // delete if sent in body
		name: string;
		nodes: INode[];
		connections: IConnections;
		settings: IWorkflowSettings;
		active: boolean;
		tags: string[];
	}>;

	type Create = AuthenticatedRequest<{}, {}, Payload>;

	type Get = AuthenticatedRequest<{ id: string }>;

	type Delete = Get;

	type Update = AuthenticatedRequest<{ id: string }, {}, Payload>;

	type NewName = express.Request<{}, {}, {}, { name?: string }>;

	type GetAll = AuthenticatedRequest<{}, {}, {}, { filter: string }>;

	type GetAllActive = AuthenticatedRequest;

	type GetAllActivationErrors = Get;
}
