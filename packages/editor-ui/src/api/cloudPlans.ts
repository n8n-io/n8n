import type { Cloud, IRestApiContext, InstanceUsage } from '@/Interface';
import { get, post } from '@/utils';

const expired = false; // change this to true to test expired plan
const ranOutOfExecutions = false; // change this to true to test running out of executions

export async function getCurrentPlan(context: IRestApiContext): Promise<Cloud.PlanData> {
	const data = {
		planId: 1,
		monthlyExecutionsLimit: 1000,
		activeWorkflowsLimit: 5,
		credentialsLimit: 100,
		displayName: 'Trial',
		metadata: {
			version: 'v1',
			group: 'trial',
			slug: 'trial-1',
			trial: {
				length: 14,
				gracePeriod: 3,
			},
		},
		expirationDate: '2023-11-08T10:24:00.416Z',
		isActive: true,
	};

	if (expired) {
		data.expirationDate = '2021-11-08T10:24:00.416Z';
	}

	return data;
}

export async function getCurrentUsage(context: IRestApiContext): Promise<InstanceUsage> {
	if (ranOutOfExecutions) {
		return { timeframe: '2023-10', executions: 1000000, activeWorkflows: 0 };
	}
	return { timeframe: '2023-10', executions: 10, activeWorkflows: 0 };
}

// export async function getCurrentPlan(context: IRestApiContext): Promise<Cloud.PlanData> {
// 	return get(context.baseUrl, '/admin/cloud-plan');
// }

// export async function getCurrentUsage(context: IRestApiContext): Promise<InstanceUsage> {
// 	return get(context.baseUrl, '/cloud/limits');
// }

export async function getCloudUserInfo(context: IRestApiContext): Promise<Cloud.UserAccount> {
	return get(context.baseUrl, '/cloud/proxy/user/me');
}

export async function confirmEmail(context: IRestApiContext): Promise<Cloud.UserAccount> {
	return post(context.baseUrl, '/cloud/proxy/user/resend-confirmation-email');
}

export async function getAdminPanelLoginCode(context: IRestApiContext): Promise<{ code: string }> {
	return get(context.baseUrl, '/cloud/proxy/login/code');
}
