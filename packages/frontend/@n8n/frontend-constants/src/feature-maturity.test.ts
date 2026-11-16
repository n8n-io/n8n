import {
	featureMaturity,
	featureMaturityForPlan,
	showsFeatureMaturityBadges,
} from './feature-maturity';

describe('featureMaturity', () => {
	it('matches the feature list', () => {
		expect(featureMaturity).toEqual({
			endUserCredentials: { preview: true, limitedEnterpriseSupport: false },
			assistant: {
				preview: false,
				limitedEnterpriseSupport: true,
				docsUrl: 'https://docs.n8n.io/deploy/host-n8n/configure-n8n/set-up-n8n-assistant',
			},
			agents: {
				preview: true,
				limitedEnterpriseSupport: true,
				docsUrl: 'https://docs.n8n.io/build/build-and-manage-agents',
			},
			n8nPackages: {
				preview: true,
				limitedEnterpriseSupport: true,
				docsUrl: 'https://docs.n8n.io/administer/environments/plan-your-environments',
			},
			workflowReviews: { preview: true, limitedEnterpriseSupport: false },
			oauthJwe: { preview: true, limitedEnterpriseSupport: false },
			tokenExchange: { preview: true, limitedEnterpriseSupport: false },
			openTelemetry: {
				preview: true,
				limitedEnterpriseSupport: false,
				docsUrl: 'https://docs.n8n.io/hosting/logging-monitoring/opentelemetry/',
			},
			microsoftAgent365: { preview: true, limitedEnterpriseSupport: false },
			context: { preview: true, limitedEnterpriseSupport: true },
			roles: { preview: false, limitedEnterpriseSupport: false },
			nodePolicies: { preview: true, limitedEnterpriseSupport: false },
			selfHealing: { preview: true, limitedEnterpriseSupport: true },
			chat: { preview: true, limitedEnterpriseSupport: true },
		});
	});

	it('hides limited enterprise readiness unless the plan is Enterprise', () => {
		expect(featureMaturityForPlan(true)).toBe(featureMaturity);
		expect(featureMaturityForPlan(false).assistant).toEqual({
			preview: false,
			limitedEnterpriseSupport: false,
			docsUrl: 'https://docs.n8n.io/deploy/host-n8n/configure-n8n/set-up-n8n-assistant',
		});
		expect(featureMaturityForPlan(false).agents).toEqual({
			preview: true,
			limitedEnterpriseSupport: false,
			docsUrl: 'https://docs.n8n.io/build/build-and-manage-agents',
		});
		expect(featureMaturityForPlan(false).openTelemetry).toEqual(featureMaturity.openTelemetry);
	});

	it('shows a badge when the entry is preview or has limited enterprise support', () => {
		expect(showsFeatureMaturityBadges(featureMaturity.assistant)).toBe(true);
		expect(showsFeatureMaturityBadges(featureMaturity.agents)).toBe(true);
		expect(showsFeatureMaturityBadges(featureMaturity.openTelemetry)).toBe(true);
		expect(showsFeatureMaturityBadges(featureMaturity.roles)).toBe(false);
	});
});
