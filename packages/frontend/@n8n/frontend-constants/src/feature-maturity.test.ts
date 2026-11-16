import { featureMaturity, showsFeatureMaturityBadges } from './feature-maturity';

describe('featureMaturity', () => {
	it('matches the feature list', () => {
		expect(featureMaturity).toEqual({
			endUserCredentials: { preview: true, limitedEnterpriseSupport: false },
			assistant: { preview: false, limitedEnterpriseSupport: true },
			agents: { preview: true, limitedEnterpriseSupport: true },
			n8nPackages: { preview: true, limitedEnterpriseSupport: true },
			workflowReviews: { preview: true, limitedEnterpriseSupport: false },
			oauthJwe: { preview: true, limitedEnterpriseSupport: false },
			tokenExchange: { preview: true, limitedEnterpriseSupport: false },
			openTelemetry: { preview: true, limitedEnterpriseSupport: false },
			microsoftAgent365: { preview: true, limitedEnterpriseSupport: false },
			context: { preview: true, limitedEnterpriseSupport: true },
			roles: { preview: false, limitedEnterpriseSupport: false },
			nodePolicies: { preview: true, limitedEnterpriseSupport: false },
			selfHealing: { preview: true, limitedEnterpriseSupport: true },
			chat: { preview: true, limitedEnterpriseSupport: true },
		});
	});

	it('shows a badge when the entry is preview or has limited enterprise support', () => {
		expect(showsFeatureMaturityBadges(featureMaturity.assistant)).toBe(true);
		expect(showsFeatureMaturityBadges(featureMaturity.agents)).toBe(true);
		expect(showsFeatureMaturityBadges(featureMaturity.openTelemetry)).toBe(true);
		expect(showsFeatureMaturityBadges(featureMaturity.roles)).toBe(false);
	});
});
