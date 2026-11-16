/**
 * Which features show Preview and Limited enterprise readiness.
 * The app provides this list to `N8nFeatureMaturityBadges`.
 * Pass an id from this list to `N8nFeatureMaturityBadges` or `N8nSettingsPageHeader`.
 * `docsUrl` is the documentation page. The settings header reads that URL.
 * A page does not pass the URL.
 * Limited enterprise readiness shows only on the Enterprise plan.
 * The app filters this list before it provides the badges.
 *
 * An entry can name a documentation page and show no badges.
 * Some entries have no settings title yet: OAuth JWE, token exchange, node policies,
 * and the Microsoft Agent 365 trigger. Pass the id when that title exists.
 */
export const featureMaturity = {
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
	security: {
		preview: false,
		limitedEnterpriseSupport: false,
		docsUrl: 'https://docs.n8n.io/deploy/host-n8n/configure-n8n/security/manage-security-policies',
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
} as const satisfies Record<
	string,
	{ preview: boolean; limitedEnterpriseSupport: boolean; docsUrl?: string }
>;

export type FeatureMaturityId = keyof typeof featureMaturity;
