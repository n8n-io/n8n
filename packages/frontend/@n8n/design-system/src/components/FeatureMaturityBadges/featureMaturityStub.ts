import { FeatureMaturityKey, type FeatureMaturityCatalog } from './featureMaturityState';

/** Design-system tests use this list. The app provides the real list. Storybook has its own stub. */
export const featureMaturityStub: FeatureMaturityCatalog = {
	workflowReviews: {
		preview: true,
		limitedEnterpriseSupport: false,
		testId: 'security-workflow-reviews',
	},
	assistant: {
		preview: false,
		limitedEnterpriseSupport: true,
		docsUrl: 'https://docs.n8n.io/deploy/host-n8n/configure-n8n/set-up-n8n-assistant',
		testId: 'n8n-agent',
	},
	agents: {
		preview: true,
		limitedEnterpriseSupport: true,
		docsUrl: 'https://docs.n8n.io/build/build-and-manage-agents',
	},
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
