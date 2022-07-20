import {IActiveDirectoryConfig, IRestApiContext} from "@/Interface";
import {makeRestApiRequest} from "@/api/helpers";
import { IDataObject } from "n8n-workflow";

export function getADConfig(context: IRestApiContext): Promise<{ data: IDataObject }> {
	return makeRestApiRequest(context, 'GET', '/active-directory/config');
}

export function testADConnection(context: IRestApiContext): Promise<{ data: IDataObject }> {
	return makeRestApiRequest(context, 'POST', '/active-directory/test-connection');
}

export function updateADConfig(context: IRestApiContext, adConfig: IActiveDirectoryConfig): Promise<{ data: IDataObject }> {
	return makeRestApiRequest(context, 'PUT', '/active-directory/config', adConfig as unknown as IDataObject);
}

export function runADSync(context: IRestApiContext, data: IDataObject): Promise<{ data: IDataObject }> {
	return makeRestApiRequest(context, 'POST', '/active-directory/sync', data as unknown as IDataObject);
}

export function getADSyncronizations(context: IRestApiContext): Promise<{ data: IDataObject }> {
	return makeRestApiRequest(context, 'GET', '/active-directory/sync');
}
