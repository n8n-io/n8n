import type {
	CreateSourceControlReviewCommentRequest,
	CreateSourceControlReviewRequest,
	CreateSourceControlSubmitReviewRequest,
	GitCommitInfo,
	PullWorkFolderRequestDto,
	PushWorkFolderRequestDto,
	SourceControlledFile,
	SourceControlReviewComment,
	SourceControlReviewDeployResult,
	SourceControlReviewDetail,
	SourceControlReviewSubmission,
	SourceControlReviewSummary,
} from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type {
	SourceControlPreferences,
	SourceControlProjectPreferences,
	SourceControlPublicPreferences,
	SourceControlStatus,
	SshKeyTypes,
} from './sourceControl.types';
import type { IWorkflowDb } from '@/Interface';

import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { TupleToUnion } from '@/app/utils/typeHelpers';

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
): Promise<{ files: SourceControlledFile[]; commit: GitCommitInfo | null }> => {
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
): Promise<
	SourceControlPublicPreferences | SourceControlProjectPreferences | SourceControlPreferences
> => {
	return await makeRestApiRequest(context, 'GET', `${sourceControlApiRoot}/preferences`);
};

export const getStatus = async (context: IRestApiContext): Promise<SourceControlStatus> => {
	return await makeRestApiRequest(context, 'GET', `${sourceControlApiRoot}/status`);
};

export const getReviews = async (
	context: IRestApiContext,
): Promise<SourceControlReviewSummary[]> => {
	return await makeRestApiRequest(context, 'GET', `${sourceControlApiRoot}/reviews`);
};

export const getReviewCandidates = async (
	context: IRestApiContext,
): Promise<SourceControlledFile[]> => {
	return await makeRestApiRequest(context, 'GET', `${sourceControlApiRoot}/reviews/candidates`);
};

export const createReviewRequest = async (
	context: IRestApiContext,
	payload: CreateSourceControlReviewRequest,
): Promise<SourceControlReviewSummary> => {
	return await makeRestApiRequest(context, 'POST', `${sourceControlApiRoot}/reviews`, payload);
};

export const getReview = async (
	context: IRestApiContext,
	prNumber: number,
): Promise<SourceControlReviewDetail> => {
	return await makeRestApiRequest(context, 'GET', `${sourceControlApiRoot}/reviews/${prNumber}`);
};

export const getReviewComments = async (
	context: IRestApiContext,
	prNumber: number,
	filePath?: string,
): Promise<SourceControlReviewComment[]> => {
	const query = filePath ? `?path=${encodeURIComponent(filePath)}` : '';
	return await makeRestApiRequest(
		context,
		'GET',
		`${sourceControlApiRoot}/reviews/${prNumber}/comments${query}`,
	);
};

export const createReviewComment = async (
	context: IRestApiContext,
	prNumber: number,
	payload: CreateSourceControlReviewCommentRequest,
): Promise<SourceControlReviewComment> => {
	return await makeRestApiRequest(
		context,
		'POST',
		`${sourceControlApiRoot}/reviews/${prNumber}/comments`,
		payload,
	);
};

export const deleteReviewComment = async (
	context: IRestApiContext,
	prNumber: number,
	commentId: number,
): Promise<{ deletedCommentIds: number[] }> => {
	return await makeRestApiRequest(
		context,
		'DELETE',
		`${sourceControlApiRoot}/reviews/${prNumber}/comments/${commentId}`,
	);
};

export const submitReview = async (
	context: IRestApiContext,
	prNumber: number,
	payload: CreateSourceControlSubmitReviewRequest,
): Promise<SourceControlReviewSubmission> => {
	return await makeRestApiRequest(
		context,
		'POST',
		`${sourceControlApiRoot}/reviews/${prNumber}/submit`,
		payload,
	);
};

export const deployReview = async (
	context: IRestApiContext,
	prNumber: number,
): Promise<SourceControlReviewDeployResult> => {
	return await makeRestApiRequest(
		context,
		'POST',
		`${sourceControlApiRoot}/reviews/${prNumber}/deploy`,
	);
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
