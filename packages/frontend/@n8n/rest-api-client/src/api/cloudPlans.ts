import type { IRestApiContext } from '../types';
import { get, post } from '../utils';

export declare namespace Cloud {
	export interface PlanData {
		planId: number;
		monthlyExecutionsLimit: number;
		activeWorkflowsLimit: number;
		credentialsLimit: number;
		isActive: boolean;
		displayName: string;
		expirationDate: string;
		metadata: PlanMetadata;
	}

	export interface PlanMetadata {
		version: 'v1';
		group: 'opt-out' | 'opt-in' | 'trial';
		slug: 'pro-1' | 'pro-2' | 'starter' | 'trial-1';
		trial?: Trial;
	}

	interface Trial {
		length: number;
		gracePeriod: number;
	}

	export type UserAccount = {
		confirmed: boolean;
		username: string;
		email: string;
		hasEarlyAccess?: boolean;
		role?: string;
		selectedApps?: string;
		information?: {
			[key: string]: string | string[];
		};
	};
}

export interface InstanceUsage {
	timeframe?: string;
	executions: number;
	activeWorkflows: number;
}

export async function getCurrentPlan(context: IRestApiContext): Promise<Cloud.PlanData> {
	return await get(context.baseUrl, '/admin/cloud-plan');
}

export async function getCurrentUsage(context: IRestApiContext): Promise<InstanceUsage> {
	return await get(context.baseUrl, '/cloud/limits');
}

export async function getCloudUserInfo(context: IRestApiContext): Promise<Cloud.UserAccount> {
	return await get(context.baseUrl, '/cloud/proxy/user/me');
}

export async function sendConfirmationEmail(context: IRestApiContext): Promise<Cloud.UserAccount> {
	return await post(context.baseUrl, '/cloud/proxy/user/resend-confirmation-email');
}

export async function getAdminPanelLoginCode(context: IRestApiContext): Promise<{ code: string }> {
	return await get(context.baseUrl, '/cloud/proxy/login/code');
}
