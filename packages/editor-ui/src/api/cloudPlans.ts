import type { Cloud, IRestApiContext, InstanceUsage } from '@/Interface';
import { get } from '@/utils';

export async function getCurrentPlan(context: IRestApiContext): Promise<Cloud.PlanData> {
	return get(context.baseUrl, '/admin/cloud-plan');
}

export async function getCurrentUsage(context: IRestApiContext): Promise<InstanceUsage> {
	return get(context.baseUrl, '/cloud/limits');
}

export async function getCloudUserInfo(context: IRestApiContext): Promise<Cloud.UserAccount> {
	return get(context.baseUrl, '/cloud/proxy/admin/user/me');
}

export async function confirmEmail(context: IRestApiContext): Promise<Cloud.UserAccount> {
	return get(context.baseUrl, '/cloud/proxy/admin/user/confirm-email');
}
