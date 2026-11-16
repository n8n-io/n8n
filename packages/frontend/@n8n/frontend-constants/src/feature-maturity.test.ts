import { featureMaturity } from './feature-maturity';

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
			openTelemetry: {
				preview: true,
				limitedEnterpriseSupport: false,
				docsUrl: 'https://docs.n8n.io/hosting/logging-monitoring/opentelemetry/',
			},
			context: { preview: true, limitedEnterpriseSupport: true },
			selfHealing: { preview: true, limitedEnterpriseSupport: true },
			chat: { preview: true, limitedEnterpriseSupport: true },
			authentication: {
				preview: false,
				limitedEnterpriseSupport: false,
				docsUrl: 'https://docs.n8n.io/administer/manage-users-and-access/verify-user-identity',
			},
			sso: {
				preview: false,
				limitedEnterpriseSupport: false,
				docsUrl: 'https://docs.n8n.io/user-management/saml/',
			},
			scim: { preview: true, limitedEnterpriseSupport: false },
			security: {
				preview: false,
				limitedEnterpriseSupport: false,
				docsUrl:
					'https://docs.n8n.io/deploy/host-n8n/configure-n8n/security/manage-security-policies',
			},
			mcp: {
				preview: false,
				limitedEnterpriseSupport: false,
				docsUrl: 'https://docs.n8n.io/connect/connect-to-n8n-mcp-server',
			},
			migrationReport: {
				preview: false,
				limitedEnterpriseSupport: false,
				docsUrl: 'https://docs.n8n.io/changelog/v30-breaking-changes',
			},
		});
	});
});
