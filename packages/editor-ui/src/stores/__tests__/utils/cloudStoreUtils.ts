import type { Cloud } from '@/Interface';

// Mocks cloud plan API responses with different trial expiration dates
function getUserPlanData(trialExpirationDate: Date): Cloud.PlanData {
	return {
		planId: 0,
		monthlyExecutionsLimit: 1000,
		activeWorkflowsLimit: 10,
		credentialsLimit: 100,
		isActive: true,
		displayName: 'Trial',
		metadata: {
			group: 'trial',
			slug: 'trial-1',
			trial: {
				gracePeriod: 3,
				length: 7,
			},
			version: 'v1',
		},
		expirationDate: trialExpirationDate.toISOString(),
	};
}

// Mocks cloud user API responses with different confirmed states
export function getUserCloudInfo(confirmed: boolean): Cloud.UserAccount {
	return {
		confirmed,
		email: 'test@test.com',
		username: 'test',
	};
}

export function getTrialingUserResponse(): Cloud.PlanData {
	const dateInThePast = new Date();
	dateInThePast.setDate(dateInThePast.getDate() + 3);
	return getUserPlanData(dateInThePast);
}

export function getTrialExpiredUserResponse(): Cloud.PlanData {
	const dateInThePast = new Date();
	dateInThePast.setDate(dateInThePast.getDate() - 3);
	return getUserPlanData(dateInThePast);
}
