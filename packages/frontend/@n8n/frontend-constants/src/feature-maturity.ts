/**
 * Which features show Preview and Limited enterprise support.
 * Pass an id to `N8nFeatureMaturityBadges`, `N8nSettingsPageHeader`, or `N8nSettingsEnableRow`.
 * The entry decides which badges render. Pass `hide-preview` or `hide-enterprise` to hide one.
 * Set `show-badges` on the page title or on the enable row. The badges stay on that part.
 *
 * Some entries have no settings title yet: OAuth JWE, token exchange, node policies,
 * and the Microsoft Agent 365 trigger. Pass the id when that title exists.
 */
export type FeatureMaturity = {
	/** Show the Preview badge. */
	preview: boolean;
	/** Show Limited enterprise support on an enterprise plan. */
	limitedEnterpriseSupport: boolean;
	/** Documentation page for the settings header link. */
	docsUrl?: string;
};

const ASSISTANT_DOCS_URL = 'https://docs.n8n.io/deploy/host-n8n/configure-n8n/set-up-n8n-assistant';
const AGENTS_DOCS_URL = 'https://docs.n8n.io/build/build-and-manage-agents';
const CHAT_DOCS_URL = 'https://docs.n8n.io/advanced-ai/chat-hub/';

export const featureMaturity = {
	endUserCredentials: { preview: true, limitedEnterpriseSupport: false },
	assistant: {
		preview: false,
		limitedEnterpriseSupport: true,
		docsUrl: ASSISTANT_DOCS_URL,
	},
	agents: { preview: true, limitedEnterpriseSupport: true, docsUrl: AGENTS_DOCS_URL },
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
	chat: { preview: true, limitedEnterpriseSupport: true, docsUrl: CHAT_DOCS_URL },
} as const satisfies Record<string, FeatureMaturity>;

export type FeatureMaturityId = keyof typeof featureMaturity;

/** True when the entry renders at least one badge for this plan. */
export function showsFeatureMaturityBadges(
	feature: FeatureMaturity,
	enterprisePlan: boolean,
): boolean {
	return feature.preview || (feature.limitedEnterpriseSupport && enterprisePlan);
}
