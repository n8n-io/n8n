/* eslint-disable @typescript-eslint/naming-convention */
import express from 'express';
import type { User } from '@db/entities/User';
import { ConnectionSecurity, RunningMode, SyncStatus } from './constants';

export interface LdapConfig {
	loginEnabled: boolean;
	loginLabel: string;
	connectionUrl: string;
	allowUnauthorizedCerts: boolean;
	connectionSecurity: ConnectionSecurity;
	connectionPort: number;
	baseDn: string;
	bindingAdminDn: string;
	bindingAdminPassword: string;
	firstNameAttribute: string;
	lastNameAttribute: string;
	emailAttribute: string;
	loginIdAttribute: string;
	ldapIdAttribute: string;
	userFilter: string;
	synchronizationEnabled: boolean;
	synchronizationInterval: number; // minutes
	searchPageSize: number;
	searchTimeout: number;
}

export type AuthenticatedRequest<
	RouteParams = {},
	ResponseBody = {},
	RequestBody = {},
	RequestQuery = {},
> = express.Request<RouteParams, ResponseBody, RequestBody, RequestQuery> & {
	user: User;
};

export declare namespace LdapConfiguration {
	type Update = AuthenticatedRequest<{}, {}, LdapConfig, {}>;
	type Sync = AuthenticatedRequest<{}, {}, { type: RunningMode }, {}>;
	type GetSync = AuthenticatedRequest<{}, {}, {}, { page?: string; perPage?: string }>;
}

export interface SynchronizationList {
	id: number;
	runTime: string;
	scanned: number;
	status: SyncStatus;
	startedAt: string;
	errorMessage: string;
}
