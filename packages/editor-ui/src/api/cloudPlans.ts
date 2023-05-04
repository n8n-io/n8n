import type { CloudPlanData, IRestApiContext } from '@/Interface';

export function getCurrentPlan(
	context: IRestApiContext,
	cloudUserId: string,
): Promise<CloudPlanData> {
	return Promise.resolve({
		planId: 43039,
		monthlyExecutionsLimit: 200,
		activeWorkflowsLimit: 10,
		credentialsLimit: 100,
		isActive: false,
		displayName: 'Trial',
		expirationDate: '2023-04-06T01:47:47Z',
		metadata: {
			version: 'v1',
			group: 'opt-in',
			slug: 'trial-1',
			trial: {
				length: 7,
				gracePeriod: 3,
			},
		},
		usage: {
			executions: 100,
			activeWorkflows: 10,
		},
	});
}
