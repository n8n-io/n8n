/* eslint-disable @typescript-eslint/naming-convention */
import type express from 'express';
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
	type verify = AuthenticatedRequest<{}, {}, { token: string }, {}>;
	type activate = AuthenticatedRequest<{}, {}, { token: string }, {}>;
	type config = AuthenticatedRequest<{}, {}, { login: { enabled: boolean } }, {}>;
	type validateRecoveryCode = AuthenticatedRequest<
		{},
		{},
		{ recoveryCode: { enabled: boolean } },
		{}
	>;
}
