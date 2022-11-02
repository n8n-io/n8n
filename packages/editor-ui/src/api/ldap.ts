import {ILdapConfig, IRestApiContext} from "@/Interface";
import {makeRestApiRequest} from "@/api/helpers";
import { IDataObject } from "n8n-workflow";

export function getLdapConfig(context: IRestApiContext): Promise<{ data: IDataObject }> {
	return makeRestApiRequest(context, 'GET', '/ldap/config');
}

export function testLdapConnection(context: IRestApiContext): Promise<{ data: IDataObject }> {
	return makeRestApiRequest(context, 'POST', '/ldap/test-connection');
}

export function updateLdapConfig(context: IRestApiContext, adConfig: ILdapConfig): Promise<{ data: IDataObject }> {
	return makeRestApiRequest(context, 'PUT', '/ldap/config', adConfig as unknown as IDataObject);
}

export function runLdapSync(context: IRestApiContext, data: IDataObject): Promise<{ data: IDataObject }> {
	return makeRestApiRequest(context, 'POST', '/ldap/sync', data as unknown as IDataObject);
}

export function getLdapSyncronizations(context: IRestApiContext, pagination: { page: number }): Promise<{ data: IDataObject }> {
	return makeRestApiRequest(context, 'GET', '/ldap/sync', pagination);
}
