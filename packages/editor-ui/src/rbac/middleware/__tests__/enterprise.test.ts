import { useSettingsStore } from '@/stores/settings.store';
import { VIEWS, EnterpriseEditionFeature } from '@/constants';
import { enterpriseMiddleware } from '@/rbac/middleware/enterprise';

vi.mock('@/stores/settings.store', () => ({
	useSettingsStore: vi.fn(),
}));

describe('Middleware', () => {
	describe('enterprise', () => {
		it('should redirect to homepage if none of the required features are enabled in allOf mode', async () => {
			vi.mocked(useSettingsStore).mockReturnValue({
				isEnterpriseFeatureEnabled: vi.fn().mockReturnValue(false),
			});

			const nextMock = vi.fn();
			const options = {
				features: [EnterpriseEditionFeature.Saml, EnterpriseEditionFeature.Ldap],
				mode: 'allOf',
			};

			await enterpriseMiddleware({}, {}, nextMock, options);

			expect(nextMock).toHaveBeenCalledWith({ name: VIEWS.HOMEPAGE });
		});

		it('should allow navigation if all of the required features are enabled in allOf mode', async () => {
			vi.mocked(useSettingsStore).mockReturnValue({
				isEnterpriseFeatureEnabled: vi.fn((feature) =>
					[EnterpriseEditionFeature.Saml, EnterpriseEditionFeature.Ldap].includes(feature),
				),
			});

			const nextMock = vi.fn();
			const options = {
				features: [EnterpriseEditionFeature.Saml, EnterpriseEditionFeature.Ldap],
				mode: 'allOf',
			};

			await enterpriseMiddleware({}, {}, nextMock, options);

			expect(nextMock).toHaveBeenCalledTimes(0);
		});

		it('should redirect to homepage if none of the required features are enabled in oneOf mode', async () => {
			vi.mocked(useSettingsStore).mockReturnValue({
				isEnterpriseFeatureEnabled: vi.fn().mockReturnValue(false),
			});

			const nextMock = vi.fn();
			const options = { features: [EnterpriseEditionFeature.Saml], mode: 'oneOf' };

			await enterpriseMiddleware({}, {}, nextMock, options);

			expect(nextMock).toHaveBeenCalledWith({ name: VIEWS.HOMEPAGE });
		});

		it('should allow navigation if at least one of the required features is enabled in oneOf mode', async () => {
			vi.mocked(useSettingsStore).mockReturnValue({
				isEnterpriseFeatureEnabled: vi.fn((feature) => feature === EnterpriseEditionFeature.Saml),
			});

			const nextMock = vi.fn();
			const options = {
				features: [EnterpriseEditionFeature.Saml, EnterpriseEditionFeature.Ldap],
				mode: 'oneOf',
			};

			await enterpriseMiddleware({}, {}, nextMock, options);

			expect(nextMock).toHaveBeenCalledTimes(0);
		});
	});
});
