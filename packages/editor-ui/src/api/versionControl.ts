import type {
	IRestApiContext,
	VersionControlAggregatedFile,
	VersionControlPreferences,
	VersionControlStatus,
} from '@/Interface';
import { makeRestApiRequest } from '@/utils';
import type { IDataObject } from 'n8n-workflow';

const versionControlApiRoot = '/version-control';

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

export const setBranch = async (
	context: IRestApiContext,
	branch: string,
): Promise<{ branches: string[]; currentBranch: string }> => {
	return makeRestApiRequest(context, 'POST', `${versionControlApiRoot}/set-branch`, { branch });
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

export const setBranchReadonly = async (
	context: IRestApiContext,
	branchReadOnly: boolean,
): Promise<string> => {
	return makeRestApiRequest(context, 'POST', `${versionControlApiRoot}/set-read-only`, {
		branchReadOnly,
	});
};

export const generateKeyPair = async (context: IRestApiContext): Promise<string> => {
	return makeRestApiRequest(context, 'POST', `${versionControlApiRoot}/generate-key-pair`);
};
