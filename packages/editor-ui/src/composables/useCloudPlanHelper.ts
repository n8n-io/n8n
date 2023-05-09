import type { Cloud } from '@/Interface';

export function useCloudPlanHelper() {
	return {
		userIsTrialing: (metadata: Cloud.PlanMetadata) =>
			metadata?.trial && metadata?.group === 'opt-in',
	};
}
