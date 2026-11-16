import { featureMaturity, showsFeatureMaturityBadges } from './feature-maturity';

describe('featureMaturity', () => {
	it('matches the feature list', () => {
		expect(featureMaturity).toEqual({
			endUserCredentials: { preview: true, limitedEnterpriseSupport: false },
			assistant: {
				preview: false,
				limitedEnterpriseSupport: true,
				testId: 'n8n-agent',
			},
			agents: { preview: true, limitedEnterpriseSupport: true },
			n8nPackages: { preview: true, limitedEnterpriseSupport: true },
			workflowReviews: {
				preview: true,
				limitedEnterpriseSupport: false,
				testId: 'security-workflow-reviews',
			},
			oauthJwe: { preview: true, limitedEnterpriseSupport: false },
			tokenExchange: { preview: true, limitedEnterpriseSupport: false },
			openTelemetry: { preview: true, limitedEnterpriseSupport: false },
			microsoftAgent365: { preview: true, limitedEnterpriseSupport: false },
			context: { preview: true, limitedEnterpriseSupport: true, testId: 'settings-context' },
			roles: { preview: false, limitedEnterpriseSupport: false },
			nodePolicies: { preview: true, limitedEnterpriseSupport: false },
			selfHealing: { preview: true, limitedEnterpriseSupport: true },
			chat: {
				preview: true,
				limitedEnterpriseSupport: true,
				testId: 'chat-hub',
			},
		});
	});

	it('hides Limited enterprise support off an enterprise plan', () => {
		expect(showsFeatureMaturityBadges(featureMaturity.assistant, false)).toBe(false);
		expect(showsFeatureMaturityBadges(featureMaturity.assistant, true)).toBe(true);
		expect(showsFeatureMaturityBadges(featureMaturity.agents, false)).toBe(true);
		expect(showsFeatureMaturityBadges(featureMaturity.roles, true)).toBe(false);
	});
});
