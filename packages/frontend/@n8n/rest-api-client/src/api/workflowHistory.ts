import type { IConnections, INode } from 'n8n-workflow';

import type { IRestApiContext } from '../types';
import { get } from '../utils';

export type WorkflowHistory = {
	versionId: string;
	authors: string;
	createdAt: string;
	updatedAt: string;
};

export type WorkflowVersionId = WorkflowHistory['versionId'];

export type WorkflowVersion = WorkflowHistory & {
	workflowId: string;
	nodes: INode[];
	connections: IConnections;
};

export type WorkflowHistoryActionTypes = ['restore', 'clone', 'open', 'download'];

export type WorkflowHistoryRequestParams = { take: number; skip?: number };

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
