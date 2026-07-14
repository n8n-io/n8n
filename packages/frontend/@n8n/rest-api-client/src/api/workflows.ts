import type { WorkflowReviewRequiredStatus } from '@n8n/api-types';
import type {
	IWorkflowSettings,
	IConnections,
	INode,
	IPinData,
	IWorkflowGroup,
} from 'n8n-workflow';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';
import type { ITag } from './tags';

export interface WorkflowMetadata {
	onboardingId?: string;
	templateId?: string;
	instanceId?: string;
	templateCredsSetupCompleted?: boolean;
}

// Simple version of n8n-workflow.Workflow
export interface WorkflowData {
	id?: string;
	name?: string;
	active?: boolean;
	nodes: INode[];
	connections: IConnections;
	settings?: IWorkflowSettings;
	tags?: string[];
	pinData?: IPinData;
	versionId?: string;
	activeVersionId?: string | null;
	meta?: WorkflowMetadata;
	nodeGroups?: IWorkflowGroup[];
}

export interface WorkflowDataUpdate {
	id?: string;
	name?: string;
	description?: string | null;
	nodes?: INode[];
	connections?: IConnections;
	settings?: IWorkflowSettings;
	active?: boolean;
	tags?: ITag[] | string[]; // string[] when store or requested, ITag[] from API response
	pinData?: IPinData;
	versionId?: string;
	meta?: WorkflowMetadata;
	nodeGroups?: IWorkflowGroup[];
	parentFolderId?: string;
	uiContext?: string;
	// checksum of workflow snapshot for conflict detection
	expectedChecksum?: string;
	aiBuilderAssisted?: boolean;
	autosaved?: boolean;
}

export interface WorkflowDataCreate extends WorkflowDataUpdate {
	projectId?: string;
}

export async function fetchWorkflowReviewRequiredStatus(
	context: IRestApiContext,
	workflowId: string,
): Promise<WorkflowReviewRequiredStatus> {
	return await makeRestApiRequest<WorkflowReviewRequiredStatus>(
		context,
		'GET',
		`/workflows/${encodeURIComponent(workflowId)}/review-required`,
	);
}

export async function updateWorkflowReviewRequired(
	context: IRestApiContext,
	workflowId: string,
	reviewRequired: boolean,
): Promise<WorkflowReviewRequiredStatus> {
	return await makeRestApiRequest<WorkflowReviewRequiredStatus>(
		context,
		'PATCH',
		`/workflows/${encodeURIComponent(workflowId)}/review-required`,
		{ reviewRequired },
	);
}
