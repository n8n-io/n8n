import { useSettingsStore } from '@/stores/settings.store';
import { isEnterpriseFeatureEnabled } from '@/utils/rbac/checks/isEnterpriseFeatureEnabled';
import { EnterpriseEditionFeature } from '@/constants';

vi.mock('@/stores/settings.store', () => ({
	useSettingsStore: vi.fn(),
}));

describe('Checks', () => {
	describe('isEnterpriseFeatureEnabled()', () => {
		it('should return true if no feature is provided', () => {
			expect(isEnterpriseFeatureEnabled({})).toBe(true);
		});

		it('should return true if feature is enabled', () => {
			vi.mocked(useSettingsStore).mockReturnValue({
				isEnterpriseFeatureEnabled: vi
					.fn()
					.mockImplementation((feature) => feature !== EnterpriseEditionFeature.Variables),
			} as unknown as ReturnType<typeof useSettingsStore>);

			expect(
				isEnterpriseFeatureEnabled({
					feature: EnterpriseEditionFeature.Saml,
				}),
			).toBe(true);
		});

		it('should return true if all features are enabled in allOf mode', () => {
			vi.mocked(useSettingsStore).mockReturnValue({
				isEnterpriseFeatureEnabled: vi
					.fn()
					.mockImplementation((feature) => feature !== EnterpriseEditionFeature.Variables),
			} as unknown as ReturnType<typeof useSettingsStore>);

			expect(
				isEnterpriseFeatureEnabled({
					feature: [EnterpriseEditionFeature.Ldap, EnterpriseEditionFeature.Saml],
					mode: 'allOf',
				}),
			).toBe(true);
		});

		it('should return false if any feature is not enabled in allOf mode', () => {
			vi.mocked(useSettingsStore).mockReturnValue({
				isEnterpriseFeatureEnabled: vi
					.fn()
					.mockImplementation((feature) => feature !== EnterpriseEditionFeature.Saml),
			} as unknown as ReturnType<typeof useSettingsStore>);

			expect(
				isEnterpriseFeatureEnabled({
					feature: [EnterpriseEditionFeature.Ldap, EnterpriseEditionFeature.Saml],
					mode: 'allOf',
				}),
			).toBe(false);
		});

		it('should return true if any feature is enabled in oneOf mode', () => {
			vi.mocked(useSettingsStore).mockReturnValue({
				isEnterpriseFeatureEnabled: vi
					.fn()
					.mockImplementation((feature) => feature === EnterpriseEditionFeature.Ldap),
			} as unknown as ReturnType<typeof useSettingsStore>);

			expect(
				isEnterpriseFeatureEnabled({
					feature: [EnterpriseEditionFeature.Ldap, EnterpriseEditionFeature.Saml],
					mode: 'oneOf',
				}),
			).toBe(true);
		});

		it('should return false if no features are enabled in anyOf mode', () => {
			vi.mocked(useSettingsStore).mockReturnValue({
				isEnterpriseFeatureEnabled: vi.fn().mockReturnValue(false),
			} as unknown as ReturnType<typeof useSettingsStore>);

			expect(
				isEnterpriseFeatureEnabled({
					feature: [EnterpriseEditionFeature.Ldap, EnterpriseEditionFeature.Saml],
					mode: 'oneOf',
				}),
			).toBe(false);
		});
	});
});
