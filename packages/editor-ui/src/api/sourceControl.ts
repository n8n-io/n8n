import type { IDataObject } from 'n8n-workflow';
import type {
	IRestApiContext,
	SourceControlAggregatedFile,
	SourceControlPreferences,
	SourceControlStatus,
	SshKeyTypes,
} from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';
import type { TupleToUnion } from '@/utils/typeHelpers';

const sourceControlApiRoot = '/source-control';

const createPreferencesRequestFn =
	(method: 'POST' | 'PATCH') =>
	async (
		context: IRestApiContext,
		preferences: Partial<SourceControlPreferences>,
	): Promise<SourceControlPreferences> =>
		await makeRestApiRequest(context, method, `${sourceControlApiRoot}/preferences`, preferences);

export const pushWorkfolder = async (
	context: IRestApiContext,
	data: IDataObject,
): Promise<void> => {
	return await makeRestApiRequest(context, 'POST', `${sourceControlApiRoot}/push-workfolder`, data);
};

export const pullWorkfolder = async (
	context: IRestApiContext,
	data: IDataObject,
): Promise<void> => {
	return await makeRestApiRequest(context, 'POST', `${sourceControlApiRoot}/pull-workfolder`, data);
};

export const getBranches = async (
	context: IRestApiContext,
): Promise<{ branches: string[]; currentBranch: string }> => {
	return await makeRestApiRequest(context, 'GET', `${sourceControlApiRoot}/get-branches`);
};

export const savePreferences = createPreferencesRequestFn('POST');
export const updatePreferences = createPreferencesRequestFn('PATCH');

export const getPreferences = async (
	context: IRestApiContext,
): Promise<SourceControlPreferences> => {
	return await makeRestApiRequest(context, 'GET', `${sourceControlApiRoot}/preferences`);
};

export const getStatus = async (context: IRestApiContext): Promise<SourceControlStatus> => {
	return await makeRestApiRequest(context, 'GET', `${sourceControlApiRoot}/status`);
};

export const getAggregatedStatus = async (
	context: IRestApiContext,
	options: {
		direction: 'push' | 'pull';
		preferLocalVersion: boolean;
		verbose: boolean;
	} = { direction: 'push', preferLocalVersion: true, verbose: false },
): Promise<SourceControlAggregatedFile[]> => {
	return await makeRestApiRequest(context, 'GET', `${sourceControlApiRoot}/get-status`, options);
};

export const disconnect = async (
	context: IRestApiContext,
	keepKeyPair: boolean,
): Promise<string> => {
	return await makeRestApiRequest(context, 'POST', `${sourceControlApiRoot}/disconnect`, {
		keepKeyPair,
	});
};

export const generateKeyPair = async (
	context: IRestApiContext,
	keyGeneratorType?: TupleToUnion<SshKeyTypes>,
): Promise<string> => {
	return await makeRestApiRequest(context, 'POST', `${sourceControlApiRoot}/generate-key-pair`, {
		keyGeneratorType,
	});
};
