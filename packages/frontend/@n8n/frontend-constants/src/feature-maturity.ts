/**
 * Which features show Preview and Limited enterprise readiness.
 * The app provides this list to `N8nFeatureMaturityBadges`.
 * Pass an id to `N8nFeatureMaturityBadges` or `N8nSettingsPageHeader`.
 * The entry decides which badges render.
 * The page title shows those badges. Pass `hide-preview` or `hide-enterprise` to hide one.
 * Only the Enterprise plan shows Limited enterprise readiness.
 * Call `featureMaturityForPlan` before providing the list.
 *
 * The feature id sets the badge test ids.
 * A camelCase id becomes kebab-case.
 * `endUserCredentials` renders `end-user-credentials-preview-badge`.
 * The enterprise badge uses the same prefix and `-enterprise-readiness-badge`.
 * A badge with no feature id has no test id.
 *
 * Some entries have no settings title yet: OAuth JWE, token exchange, node policies,
 * and the Microsoft Agent 365 trigger. Pass the id when that title exists.
 */
export type FeatureMaturity = {
	/** Show the Preview badge. */
	preview: boolean;
	/**
	 * The feature has limited enterprise support.
	 * Show that badge only on the Enterprise plan. Use `featureMaturityForPlan`.
	 */
	limitedEnterpriseSupport: boolean;
};

export const featureMaturity = {
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
} as const satisfies Record<string, FeatureMaturity>;

export type FeatureMaturityId = keyof typeof featureMaturity;

/**
 * The list the app provides to the badges.
 * An Enterprise plan keeps every entry.
 * Any other plan keeps Preview and hides Limited enterprise readiness.
 */
export function featureMaturityForPlan(isEnterprisePlan: boolean): {
	readonly [id: string]: FeatureMaturity | undefined;
} {
	if (isEnterprisePlan) return featureMaturity;

	const catalog: { [id: string]: FeatureMaturity } = {};
	for (const [id, entry] of Object.entries(featureMaturity)) {
		catalog[id] = { preview: entry.preview, limitedEnterpriseSupport: false };
	}
	return catalog;
}

/** True when the entry renders at least one badge. */
export function showsFeatureMaturityBadges(feature: FeatureMaturity): boolean {
	return feature.preview || feature.limitedEnterpriseSupport;
}
