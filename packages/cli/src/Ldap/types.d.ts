/* eslint-disable @typescript-eslint/naming-convention */
import express from 'express';
import type { User } from '../databases/entities/User';
import { RunningMode, SyncStatus } from './constants';

export interface LdapConfig {
	login: {
		enabled: boolean;
		label: string;
	};
	connection: {
		url: string;
		useSsl: boolean;
		allowUnauthorizedCerts: boolean;
		startTLS: boolean;
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
		ldapId: string;
	};
	filter: {
		user: string;
	};
	syncronization: {
		enabled: boolean;
		interval: number; // minutes
	};
}

export type AuthenticatedRequest<
	RouteParams = {},
	ResponseBody = {},
	RequestBody = {},
	RequestQuery = {},
> = express.Request<RouteParams, ResponseBody, RequestBody, RequestQuery> & {
	user: User;
};

export declare namespace LdapConfig {
	type Update = AuthenticatedRequest<{}, {}, LdapConfig, {}>;
	type Sync = AuthenticatedRequest<{}, {}, { type: RunningMode }, {}>;
}

export interface SyncronizationList {
	id: number;
	runTime: string;
	scanned: number;
	status: SyncStatus;
	startedAt: string;
	errorMessage: string;
}

export interface LdapDbColumns {
	email: string;
	firstName: string;
	lastName: string;
	ldapId: string;
}
