import { featureMaturity, showsFeatureMaturityBadges } from './feature-maturity';

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
			n8nPackages: { preview: true, limitedEnterpriseSupport: false },
			workflowReviews: { preview: true, limitedEnterpriseSupport: false },
			oauthJwe: { preview: true, limitedEnterpriseSupport: false },
			tokenExchange: { preview: true, limitedEnterpriseSupport: false },
			openTelemetry: { preview: true, limitedEnterpriseSupport: false },
			microsoftAgent365: { preview: true, limitedEnterpriseSupport: false },
			context: { preview: true, limitedEnterpriseSupport: true },
			roles: { preview: false, limitedEnterpriseSupport: false },
			nodePolicies: { preview: true, limitedEnterpriseSupport: false },
			chat: {
				preview: true,
				limitedEnterpriseSupport: true,
				docsUrl: 'https://docs.n8n.io/advanced-ai/chat-hub/',
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
