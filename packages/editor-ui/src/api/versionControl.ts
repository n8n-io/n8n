import type {
	IRestApiContext,
	VersionControlAggregatedFile,
	VersionControlPreferences,
	VersionControlStatus,
} from '@/Interface';
import { makeRestApiRequest } from '@/utils';
import type { IDataObject } from 'n8n-workflow';

const versionControlApiRoot = '/version-control';

const createPreferencesRequestFn =
	(method: 'POST' | 'PATCH') =>
	async (
		context: IRestApiContext,
		preferences: Partial<VersionControlPreferences>,
	): Promise<VersionControlPreferences> =>
		makeRestApiRequest(context, method, `${versionControlApiRoot}/preferences`, preferences);

export const pushWorkfolder = async (
	context: IRestApiContext,
	data: IDataObject,
): Promise<void> => {
	return makeRestApiRequest(context, 'POST', `${versionControlApiRoot}/push-workfolder`, data);
};

export const pullWorkfolder = async (
	context: IRestApiContext,
	data: IDataObject,
): Promise<void> => {
	return makeRestApiRequest(context, 'POST', `${versionControlApiRoot}/pull-workfolder`, data);
};

export const getBranches = async (
	context: IRestApiContext,
): Promise<{ branches: string[]; currentBranch: string }> => {
	return makeRestApiRequest(context, 'GET', `${versionControlApiRoot}/get-branches`);
};

export const savePreferences = createPreferencesRequestFn('POST');
export const updatePreferences = createPreferencesRequestFn('PATCH');

export const getPreferences = async (
	context: IRestApiContext,
): Promise<VersionControlPreferences> => {
	return makeRestApiRequest(context, 'GET', `${versionControlApiRoot}/preferences`);
};

export const getStatus = async (context: IRestApiContext): Promise<VersionControlStatus> => {
	return makeRestApiRequest(context, 'GET', `${versionControlApiRoot}/status`);
};

export const getAggregatedStatus = async (
	context: IRestApiContext,
): Promise<VersionControlAggregatedFile[]> => {
	return makeRestApiRequest(context, 'GET', `${versionControlApiRoot}/get-status`);
};

export const disconnect = async (
	context: IRestApiContext,
	keepKeyPair: boolean,
): Promise<string> => {
	return makeRestApiRequest(context, 'POST', `${versionControlApiRoot}/disconnect`, {
		keepKeyPair,
	});
};

export const generateKeyPair = async (context: IRestApiContext): Promise<string> => {
	return makeRestApiRequest(context, 'POST', `${versionControlApiRoot}/generate-key-pair`);
};
