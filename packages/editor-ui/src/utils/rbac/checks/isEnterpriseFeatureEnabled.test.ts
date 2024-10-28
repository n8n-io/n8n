import { useSettingsStore } from '@/stores/settings.store';
import { isEnterpriseFeatureEnabled } from '@/utils/rbac/checks/isEnterpriseFeatureEnabled';
import { EnterpriseEditionFeature } from '@/constants';
import { createPinia, setActivePinia } from 'pinia';
import { defaultSettings } from '@/__tests__/defaults';

describe('Checks', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	describe('isEnterpriseFeatureEnabled()', () => {
		it('should return true if no feature is provided', () => {
			expect(isEnterpriseFeatureEnabled({})).toBe(true);
		});

		it('should return true if feature is enabled', () => {
			useSettingsStore().settings.enterprise = {
				...defaultSettings.enterprise,
				[EnterpriseEditionFeature.Saml]: true,
			};

			expect(
				isEnterpriseFeatureEnabled({
					feature: EnterpriseEditionFeature.Saml,
				}),
			).toBe(true);
		});

		it('should return true if all features are enabled in allOf mode', () => {
			useSettingsStore().settings.enterprise = {
				...defaultSettings.enterprise,
				[EnterpriseEditionFeature.Ldap]: true,
				[EnterpriseEditionFeature.Saml]: true,
			};

			expect(
				isEnterpriseFeatureEnabled({
					feature: [EnterpriseEditionFeature.Ldap, EnterpriseEditionFeature.Saml],
					mode: 'allOf',
				}),
			).toBe(true);
		});

		it('should return false if any feature is not enabled in allOf mode', () => {
			useSettingsStore().settings.enterprise = {
				...defaultSettings.enterprise,
				[EnterpriseEditionFeature.Ldap]: true,
				[EnterpriseEditionFeature.Saml]: false,
			};

			expect(
				isEnterpriseFeatureEnabled({
					feature: [EnterpriseEditionFeature.Ldap, EnterpriseEditionFeature.Saml],
					mode: 'allOf',
				}),
			).toBe(false);
		});

		it('should return true if any feature is enabled in oneOf mode', () => {
			useSettingsStore().settings.enterprise = {
				...defaultSettings.enterprise,
				[EnterpriseEditionFeature.Ldap]: true,
				[EnterpriseEditionFeature.Saml]: false,
			};

			expect(
				isEnterpriseFeatureEnabled({
					feature: [EnterpriseEditionFeature.Ldap, EnterpriseEditionFeature.Saml],
					mode: 'oneOf',
				}),
			).toBe(true);
		});

		it('should return false if no features are enabled in anyOf mode', () => {
			useSettingsStore().settings.enterprise = {
				...defaultSettings.enterprise,
				[EnterpriseEditionFeature.Ldap]: false,
				[EnterpriseEditionFeature.Saml]: false,
			};

			expect(
				isEnterpriseFeatureEnabled({
					feature: [EnterpriseEditionFeature.Ldap, EnterpriseEditionFeature.Saml],
					mode: 'oneOf',
				}),
			).toBe(false);
		});
	});
});
