import type { IRestApiContext, VersionControlPreferences } from '@/Interface';
import { makeRestApiRequest } from '@/utils';
import type { IDataObject } from 'n8n-workflow';

const versionControlApiRoot = '/version-control';

export const initSsh = async (context: IRestApiContext, data: IDataObject): Promise<string> => {
	return makeRestApiRequest(context, 'POST', `${versionControlApiRoot}/init-ssh`, data);
};

export const initRepository = async (
	context: IRestApiContext,
): Promise<{ branches: string[]; currentBranch: string }> => {
	return makeRestApiRequest(context, 'POST', `${versionControlApiRoot}/init-repository`);
};

export const sync = async (context: IRestApiContext, data: IDataObject): Promise<void> => {
	return makeRestApiRequest(context, 'POST', `${versionControlApiRoot}/push`, data);
};

export const getConfig = async (
	context: IRestApiContext,
): Promise<{ remoteRepository: string; name: string; email: string; currentBranch: string }> => {
	return makeRestApiRequest(context, 'GET', `${versionControlApiRoot}/config`);
};

export const setPreferences = async (
	context: IRestApiContext,
	preferences: Partial<VersionControlPreferences>,
): Promise<VersionControlPreferences> => {
	return makeRestApiRequest(context, 'POST', `${versionControlApiRoot}/preferences`, preferences);
};

export const getPreferences = async (
	context: IRestApiContext,
): Promise<VersionControlPreferences> => {
	return makeRestApiRequest(context, 'GET', `${versionControlApiRoot}/preferences`);
};
