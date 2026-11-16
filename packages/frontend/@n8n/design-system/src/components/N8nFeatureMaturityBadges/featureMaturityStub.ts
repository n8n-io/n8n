import { FeatureMaturityKey, type FeatureMaturityCatalog } from './featureMaturityState';

/** Unit tests use this list. The app provides the real list. Storybook keeps its own list in preview. */
export const featureMaturityStub: FeatureMaturityCatalog = {
	workflowReviews: {
		preview: true,
		limitedEnterpriseSupport: false,
		testId: 'security-workflow-reviews',
	},
	assistant: {
		preview: false,
		limitedEnterpriseSupport: true,
		testId: 'n8n-agent',
	},
	agents: { preview: true, limitedEnterpriseSupport: true },
	context: { preview: true, limitedEnterpriseSupport: true, testId: 'settings-context' },
	roles: { preview: false, limitedEnterpriseSupport: false },
};

export function provideFeatureMaturity(extra: Record<symbol, unknown> = {}): {
	global: { provide: Record<symbol, unknown> };
} {
	return {
		global: {
			provide: {
				[FeatureMaturityKey as symbol]: featureMaturityStub,
				...extra,
			},
		},
	};
}
