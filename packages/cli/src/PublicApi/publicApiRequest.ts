/* eslint-disable import/no-cycle */
import express from 'express';

import type { User } from '../databases/entities/User';

import type { WorkflowEntity } from '../databases/entities/WorkflowEntity';

export type ExecutionStatus = 'error' | 'running' | 'success' | 'waiting' | null;

export type Role = 'owner' | 'member';

export type AuthlessRequest<
	RouteParams = {},
	ResponseBody = {},
	RequestBody = {},
	RequestQuery = {},
> = express.Request<RouteParams, ResponseBody, RequestBody, RequestQuery>;

export type AuthenticatedRequest<
	RouteParams = {},
	ResponseBody = {},
	RequestBody = {},
	RequestQuery = {},
> = express.Request<RouteParams, ResponseBody, RequestBody, RequestQuery> & {
	user: User;
};

export type PaginatatedRequest = AuthenticatedRequest<
	{},
	{},
	{},
	{
		limit?: number;
		cursor?: string;
		offset?: number;
		lastId?: number;
	}
>;
export declare namespace ExecutionRequest {
	type GetAll = AuthenticatedRequest<
		{},
		{},
		{},
		{
			status?: ExecutionStatus;
			limit?: number;
			cursor?: string;
			offset?: number;
			workflowId?: number;
			lastId?: number;
		}
	>;

	type Get = AuthenticatedRequest<{ executionId: number }, {}, {}, {}>;
	type Delete = Get;
}

export declare namespace WorkflowRequest {
	type Create = AuthenticatedRequest<{}, {}, WorkflowEntity, {}>;
	type Get = AuthenticatedRequest<{ workflowId: number }, {}, {}, {}>;
	type Delete = Get;
	type Activate = Get;
}
