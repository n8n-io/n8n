/**
 * Which features show Preview and Limited enterprise support.
 * Pass an id to `N8nSettingsPageHeader`, `N8nSettingsEnableRow`, or `N8nFeatureMaturityBadges`.
 * Set `show-badges` on the page title or on the enable row. The badges stay on that part.
 * The page title uses the larger badge. The enable row uses the smaller badge.
 *
 * Some entries have no settings title yet: OAuth JWE, token exchange, node policies,
 * and the Microsoft Agent 365 trigger. Pass the id when that title exists.
 */
export type FeatureMaturity = {
	/** Show the Preview badge. */
	preview: boolean;
	/** Show Limited enterprise support on an enterprise plan. */
	limitedEnterpriseSupport: boolean;
	/** Documentation page for the enterprise badge tooltip. */
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
	n8nPackages: { preview: true, limitedEnterpriseSupport: false },
	workflowReviews: { preview: true, limitedEnterpriseSupport: false },
	oauthJwe: { preview: true, limitedEnterpriseSupport: false },
	tokenExchange: { preview: true, limitedEnterpriseSupport: false },
	openTelemetry: { preview: true, limitedEnterpriseSupport: false },
	microsoftAgent365: { preview: true, limitedEnterpriseSupport: false },
	context: { preview: true, limitedEnterpriseSupport: true },
	roles: { preview: false, limitedEnterpriseSupport: false },
	nodePolicies: { preview: true, limitedEnterpriseSupport: false },
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
