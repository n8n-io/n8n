import {
	featureMaturityForPlan,
	showsFeatureMaturityBadges,
	type FeatureMaturityCatalog,
	type FeatureMaturityEntry,
} from './featureMaturityState';

const assistant: FeatureMaturityEntry = {
	preview: false,
	limitedEnterpriseSupport: true,
	docsUrl: 'https://docs.n8n.io/deploy/host-n8n/configure-n8n/set-up-n8n-assistant',
};
const agents: FeatureMaturityEntry = {
	preview: true,
	limitedEnterpriseSupport: true,
	docsUrl: 'https://docs.n8n.io/build/build-and-manage-agents',
};
const openTelemetry: FeatureMaturityEntry = {
	preview: true,
	limitedEnterpriseSupport: false,
	docsUrl: 'https://docs.n8n.io/hosting/logging-monitoring/opentelemetry/',
};
const roles: FeatureMaturityEntry = { preview: false, limitedEnterpriseSupport: false };

const catalog: FeatureMaturityCatalog = { assistant, agents, openTelemetry, roles };

describe('featureMaturityForPlan', () => {
	it('hides limited enterprise readiness unless the plan is Enterprise', () => {
		expect(featureMaturityForPlan(catalog, true)).toBe(catalog);
		expect(featureMaturityForPlan(catalog, false).assistant).toEqual({
			preview: false,
			limitedEnterpriseSupport: false,
			docsUrl: 'https://docs.n8n.io/deploy/host-n8n/configure-n8n/set-up-n8n-assistant',
		});
		expect(featureMaturityForPlan(catalog, false).agents).toEqual({
			preview: true,
			limitedEnterpriseSupport: false,
			docsUrl: 'https://docs.n8n.io/build/build-and-manage-agents',
		});
		expect(featureMaturityForPlan(catalog, false).openTelemetry).toEqual(openTelemetry);
	});
});

describe('showsFeatureMaturityBadges', () => {
	it('shows a badge when the entry is preview or has limited enterprise support', () => {
		expect(showsFeatureMaturityBadges(assistant)).toBe(true);
		expect(showsFeatureMaturityBadges(agents)).toBe(true);
		expect(showsFeatureMaturityBadges(openTelemetry)).toBe(true);
		expect(showsFeatureMaturityBadges(roles)).toBe(false);
	});
});
