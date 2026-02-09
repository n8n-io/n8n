import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export interface ExecutionQuotaConfigResponse {
	id: number;
	projectId: string | null;
	workflowId: string | null;
	period: 'hourly' | 'daily' | 'weekly' | 'monthly';
	limit: number;
	enforcementMode: 'block' | 'warn' | 'workflow';
	quotaWorkflowId: string | null;
	enabled: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface ExecutionQuotaDashboardItem {
	id: number;
	projectId: string | null;
	workflowId: string | null;
	period: string;
	limit: number;
	currentCount: number;
	percentage: number;
	enforcementMode: string;
	enabled: boolean;
}

export interface CreateExecutionQuotaPayload {
	projectId?: string;
	workflowId?: string;
	period: string;
	limit: number;
	enforcementMode: string;
	quotaWorkflowId?: string;
	enabled?: boolean;
}

export interface UpdateExecutionQuotaPayload {
	period?: string;
	limit?: number;
	enforcementMode?: string;
	quotaWorkflowId?: string | null;
	enabled?: boolean;
}

export const getExecutionQuotas = async (
	context: IRestApiContext,
	params?: { projectId?: string },
): Promise<ExecutionQuotaConfigResponse[]> => {
	const queryParams = params?.projectId ? `?projectId=${params.projectId}` : '';
	return await makeRestApiRequest(context, 'GET', `/execution-quotas${queryParams}`);
};

export const getExecutionQuota = async (
	context: IRestApiContext,
	id: number,
): Promise<ExecutionQuotaConfigResponse> => {
	return await makeRestApiRequest(context, 'GET', `/execution-quotas/${id}`);
};

export const createExecutionQuota = async (
	context: IRestApiContext,
	data: CreateExecutionQuotaPayload,
): Promise<ExecutionQuotaConfigResponse> => {
	return await makeRestApiRequest(context, 'POST', '/execution-quotas', data);
};

export const updateExecutionQuota = async (
	context: IRestApiContext,
	id: number,
	data: UpdateExecutionQuotaPayload,
): Promise<ExecutionQuotaConfigResponse> => {
	return await makeRestApiRequest(context, 'PATCH', `/execution-quotas/${id}`, data);
};

export const deleteExecutionQuota = async (
	context: IRestApiContext,
	id: number,
): Promise<{ success: boolean }> => {
	return await makeRestApiRequest(context, 'DELETE', `/execution-quotas/${id}`);
};

export const getExecutionQuotaDashboard = async (
	context: IRestApiContext,
): Promise<ExecutionQuotaDashboardItem[]> => {
	return await makeRestApiRequest(context, 'GET', '/execution-quotas/usage/dashboard');
};
