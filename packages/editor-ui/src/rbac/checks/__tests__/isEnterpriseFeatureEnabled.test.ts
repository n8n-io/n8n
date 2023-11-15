import { useSettingsStore } from '@/stores/settings.store';
import { isEnterpriseFeatureEnabled } from '@/rbac/checks/isEnterpriseFeatureEnabled';

vi.mock('@/stores/settings.store', () => ({
	useSettingsStore: vi.fn(),
}));

describe('Checks', () => {
	describe('isEnterpriseFeatureEnabled()', () => {
		it('should return true if no feature is provided', () => {
			expect(isEnterpriseFeatureEnabled({})).toBe(true);
		});

		it('should return true if all features are enabled in allOf mode', () => {
			vi.mocked(useSettingsStore).mockReturnValue({
				isEnterpriseFeatureEnabled: vi
					.fn()
					.mockImplementation((feature) => feature !== 'disabledFeature'),
			} as ReturnType<typeof useSettingsStore>);

			expect(
				isEnterpriseFeatureEnabled({
					feature: ['enabledFeature1', 'enabledFeature2'],
					mode: 'allOf',
				}),
			).toBe(true);
		});

		it('should return false if any feature is not enabled in allOf mode', () => {
			vi.mocked(useSettingsStore).mockReturnValue({
				isEnterpriseFeatureEnabled: vi
					.fn()
					.mockImplementation((feature) => feature !== 'disabledFeature'),
			} as ReturnType<typeof useSettingsStore>);

			expect(
				isEnterpriseFeatureEnabled({
					feature: ['enabledFeature', 'disabledFeature'],
					mode: 'allOf',
				}),
			).toBe(false);
		});

		it('should return true if any feature is enabled in anyOf mode', () => {
			vi.mocked(useSettingsStore).mockReturnValue({
				isEnterpriseFeatureEnabled: vi
					.fn()
					.mockImplementation((feature) => feature === 'enabledFeature'),
			} as ReturnType<typeof useSettingsStore>);

			expect(
				isEnterpriseFeatureEnabled({
					feature: ['enabledFeature', 'disabledFeature'],
					mode: 'anyOf',
				}),
			).toBe(true);
		});

		it('should return false if no features are enabled in anyOf mode', () => {
			vi.mocked(useSettingsStore).mockReturnValue({
				isEnterpriseFeatureEnabled: vi.fn().mockReturnValue(false),
			} as ReturnType<typeof useSettingsStore>);

			expect(
				isEnterpriseFeatureEnabled({
					feature: ['disabledFeature1', 'disabledFeature2'],
					mode: 'anyOf',
				}),
			).toBe(false);
		});
	});
});
