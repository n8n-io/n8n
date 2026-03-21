import type { IConnections, INode } from 'n8n-workflow';

import type { IRestApiContext } from '../types';
import { get, patch, post } from '../utils';

export type WorkflowHistory = {
	versionId: string;
	authors: string;
	createdAt: string;
	updatedAt: string;
	workflowPublishHistory: WorkflowPublishHistory[];
	name: string | null;
	description: string | null;
};

export type WorkflowVersionData = Pick<WorkflowHistory, 'versionId' | 'name' | 'description'>;

export type WorkflowPublishHistory = {
	createdAt: string;
	id: number;
	event: 'activated' | 'deactivated';
	userId: string | null;
	versionId: string;
	workflowId: string;
};

export type WorkflowVersionId = WorkflowHistory['versionId'];

export type WorkflowVersion = WorkflowHistory & {
	workflowId: string;
	nodes: INode[];
	connections: IConnections;
};

export type WorkflowHistoryActionTypes = Array<
	'restore' | 'publish' | 'unpublish' | 'clone' | 'open' | 'download' | 'name'
>;

export type WorkflowHistoryRequestParams = { take: number; skip?: number };

export type UpdateWorkflowHistoryVersion = {
	nodes?: INode[];
	connections?: IConnections;
	authors?: string;
	name?: string | null;
	description?: string | null;
};

export const getWorkflowHistory = async (
	context: IRestApiContext,
	workflowId: string,
	queryParams: WorkflowHistoryRequestParams,
): Promise<WorkflowHistory[]> => {
	const { data } = await get(
		context.baseUrl,
		`/workflow-history/workflow/${workflowId}`,
		queryParams,
	);
	return data;
};

export const getWorkflowVersion = async (
	context: IRestApiContext,
	workflowId: string,
	versionId: string,
): Promise<WorkflowVersion> => {
	const { data } = await get(
		context.baseUrl,
		`/workflow-history/workflow/${workflowId}/version/${versionId}`,
	);
	return data;
};

export const getWorkflowVersionsByIds = async (
	context: IRestApiContext,
	workflowId: string,
	versionIds: string[],
): Promise<{ versions: Array<{ versionId: string; createdAt: string }> }> => {
	const { data } = await post(
		context.baseUrl,
		`/workflow-history/workflow/${workflowId}/versions`,
		{ versionIds },
	);
	return data;
};

export const updateWorkflowHistoryVersion = async (
	context: IRestApiContext,
	workflowId: string,
	versionId: string,
	data: UpdateWorkflowHistoryVersion,
): Promise<void> => {
	await patch(
		context.baseUrl,
		`/workflow-history/workflow/${workflowId}/versions/${versionId}`,
		data,
	);
};
