import type {
	PullWorkFolderRequestDto,
	PushWorkFolderRequestDto,
	SourceControlledFile,
} from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type {
	SourceControlPreferences,
	SourceControlStatus,
	SshKeyTypes,
} from './sourceControl.types';
import type { IWorkflowDb } from '@/Interface';

import { makeRestApiRequest } from '@n8n/rest-api-client';
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
	data: PushWorkFolderRequestDto,
): Promise<void> => {
	return await makeRestApiRequest(context, 'POST', `${sourceControlApiRoot}/push-workfolder`, data);
};

export const pullWorkfolder = async (
	context: IRestApiContext,
	data: PullWorkFolderRequestDto,
): Promise<SourceControlledFile[]> => {
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

export const getRemoteWorkflow = async (
	context: IRestApiContext,
	workflowId: string,
): Promise<{ content: IWorkflowDb; type: 'workflow' }> => {
	return await makeRestApiRequest(
		context,
		'GET',
		`${sourceControlApiRoot}/remote-content/workflow/${workflowId}`,
	);
};

export const getAggregatedStatus = async (
	context: IRestApiContext,
	options: {
		direction: 'push' | 'pull';
		preferLocalVersion: boolean;
		verbose: boolean;
	} = { direction: 'push', preferLocalVersion: true, verbose: false },
): Promise<SourceControlledFile[]> => {
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
