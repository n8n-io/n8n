/* eslint-disable @typescript-eslint/naming-convention */
import express from 'express';
import type { User } from '../databases/entities/User';

export interface ActiveDirectoryConfig {
	activeDirectoryLoginEnabled: boolean;
	connection: {
		url: string;
	};
	binding: {
		baseDn: string;
		adminDn: string;
		adminPassword: string;
	};
	attributeMapping: {
		firstName: string;
		lastName: string;
		email: string;
		loginId: string;
		username: string;
	};
}

export enum SignInType {
	LDAP = 'ldap',
	EMAIL = 'email',
}

export type AuthenticatedRequest<
	RouteParams = {},
	ResponseBody = {},
	RequestBody = {},
	RequestQuery = {},
> = express.Request<RouteParams, ResponseBody, RequestBody, RequestQuery> & {
	user: User;
};

export declare namespace ActiveDirectoryConfig {
	type Update = AuthenticatedRequest<{}, {}, ActiveDirectoryConfig, {}>;
}
