import type { Cloud, IRestApiContext, InstanceUsage } from '@/Interface';
import { get } from '@/utils';

export async function getCurrentPlan(
	context: IRestApiContext,
	cloudUserId: string,
): Promise<Cloud.PlanData> {
	return get(context.baseUrl, `/user/${cloudUserId}/plan`);
}

export async function getCurrentUsage(context: IRestApiContext): Promise<InstanceUsage> {
	return get(context.baseUrl, '/limits');
}
