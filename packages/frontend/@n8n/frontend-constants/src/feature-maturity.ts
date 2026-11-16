/**
 * Which features show Preview and Limited enterprise support.
 * The app provides this list to `N8nFeatureMaturityBadges`.
 * Pass an id to `N8nFeatureMaturityBadges` or `N8nSettingsPageHeader`.
 * The entry decides which badges render.
 * The page title shows those badges. Pass `hide-preview` or `hide-enterprise` to hide one.
 *
 * Some entries have no settings title yet: OAuth JWE, token exchange, node policies,
 * and the Microsoft Agent 365 trigger. Pass the id when that title exists.
 */
export type FeatureMaturity = {
	/** Show the Preview badge. */
	preview: boolean;
	/** Show Limited enterprise support on an enterprise plan. */
	limitedEnterpriseSupport: boolean;
	/** Test id prefix when the feature id is not the prefix pages already use. */
	testId?: string;
};

export const featureMaturity = {
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
} as const satisfies Record<string, FeatureMaturity>;

export type FeatureMaturityId = keyof typeof featureMaturity;

/** True when the entry renders at least one badge for this plan. */
export function showsFeatureMaturityBadges(
	feature: FeatureMaturity,
	enterprisePlan: boolean,
): boolean {
	return feature.preview || (feature.limitedEnterpriseSupport && enterprisePlan);
}
