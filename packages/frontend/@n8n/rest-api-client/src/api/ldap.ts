import type { IDataObject } from 'n8n-workflow';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export interface LdapSyncData {
	id: number;
	startedAt: string;
	endedAt: string;
	created: number;
	updated: number;
	disabled: number;
	scanned: number;
	status: string;
	error: string;
	runMode: string;
}

export interface LdapSyncTable {
	status: string;
	endedAt: string;
	runTime: string;
	runMode: string;
	details: string;
}

export interface LdapConfig {
	loginEnabled: boolean;
	loginLabel: string;
	connectionUrl: string;
	allowUnauthorizedCerts: boolean;
	connectionSecurity: string;
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

export async function getLdapConfig(context: IRestApiContext): Promise<LdapConfig> {
	return await makeRestApiRequest(context, 'GET', '/ldap/config');
}

export async function testLdapConnection(context: IRestApiContext): Promise<{}> {
	return await makeRestApiRequest(context, 'POST', '/ldap/test-connection');
}

export async function updateLdapConfig(
	context: IRestApiContext,
	adConfig: LdapConfig,
): Promise<LdapConfig> {
	return await makeRestApiRequest(
		context,
		'PUT',
		'/ldap/config',
		adConfig as unknown as IDataObject,
	);
}

export async function runLdapSync(context: IRestApiContext, data: IDataObject): Promise<{}> {
	return await makeRestApiRequest(context, 'POST', '/ldap/sync', data as unknown as IDataObject);
}

export async function getLdapSynchronizations(
	context: IRestApiContext,
	pagination: { page: number },
): Promise<LdapSyncData[]> {
	return await makeRestApiRequest(context, 'GET', '/ldap/sync', pagination);
}
