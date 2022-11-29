/* eslint-disable @typescript-eslint/naming-convention */
import express from 'express';
import type { User } from '../databases/entities/User';

export type AuthenticatedRequest<
	RouteParams = {},
	ResponseBody = {},
	RequestBody = {},
	RequestQuery = {},
> = express.Request<RouteParams, ResponseBody, RequestBody, RequestQuery> & {
	user: User;
};

export declare namespace MFA {
	type activate = AuthenticatedRequest<{}, {}, { code: string }, {}>;
	type config = AuthenticatedRequest<{}, {}, { login: { enabled: boolean } }, {}>;
}
