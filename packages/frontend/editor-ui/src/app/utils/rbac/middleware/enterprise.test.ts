import { useSettingsStore } from '@/app/stores/settings.store';
import { VIEWS, EnterpriseEditionFeature } from '@/app/constants';
import { enterpriseMiddleware } from '@/app/utils/rbac/middleware/enterprise';
import { type RouteLocationNormalized } from 'vue-router';
import type { EnterprisePermissionOptions } from '@/app/types/rbac';
import { createPinia, setActivePinia } from 'pinia';
import { defaultSettings } from '@/__tests__/defaults';

describe('Middleware', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	describe('enterprise', () => {
		it('should redirect to homepage if none of the required features are enabled in allOf mode', async () => {
			useSettingsStore().settings.enterprise = {
				...defaultSettings.enterprise,
				[EnterpriseEditionFeature.Ldap]: false,
				[EnterpriseEditionFeature.Saml]: false,
			};

			const nextMock = vi.fn();
			const options: EnterprisePermissionOptions = {
				feature: [EnterpriseEditionFeature.Saml, EnterpriseEditionFeature.Ldap],
				mode: 'allOf',
			};

			await enterpriseMiddleware(
				{} as RouteLocationNormalized,
				{} as RouteLocationNormalized,
				nextMock,
				options,
			);

			expect(nextMock).toHaveBeenCalledWith({ name: VIEWS.HOMEPAGE });
		});

		it('should allow navigation if all of the required features are enabled in allOf mode', async () => {
			useSettingsStore().settings.enterprise = {
				...defaultSettings.enterprise,
				[EnterpriseEditionFeature.Ldap]: true,
				[EnterpriseEditionFeature.Saml]: true,
			};

			const nextMock = vi.fn();
			const options: EnterprisePermissionOptions = {
				feature: [EnterpriseEditionFeature.Saml, EnterpriseEditionFeature.Ldap],
				mode: 'allOf',
			};

			await enterpriseMiddleware(
				{} as RouteLocationNormalized,
				{} as RouteLocationNormalized,
				nextMock,
				options,
			);

			expect(nextMock).toHaveBeenCalledTimes(0);
		});

		it('should redirect to homepage if none of the required features are enabled in oneOf mode', async () => {
			useSettingsStore().settings.enterprise = {
				...defaultSettings.enterprise,
				[EnterpriseEditionFeature.Saml]: false,
			};

			const nextMock = vi.fn();
			const options: EnterprisePermissionOptions = {
				feature: [EnterpriseEditionFeature.Saml],
				mode: 'oneOf',
			};

			await enterpriseMiddleware(
				{} as RouteLocationNormalized,
				{} as RouteLocationNormalized,
				nextMock,
				options,
			);

			expect(nextMock).toHaveBeenCalledWith({ name: VIEWS.HOMEPAGE });
		});

		it('should allow navigation if at least one of the required features is enabled in oneOf mode', async () => {
			useSettingsStore().settings.enterprise = {
				...defaultSettings.enterprise,
				[EnterpriseEditionFeature.Ldap]: true,
				[EnterpriseEditionFeature.Saml]: false,
			};

			const nextMock = vi.fn();
			const options: EnterprisePermissionOptions = {
				feature: [EnterpriseEditionFeature.Saml, EnterpriseEditionFeature.Ldap],
				mode: 'oneOf',
			};

			await enterpriseMiddleware(
				{} as RouteLocationNormalized,
				{} as RouteLocationNormalized,
				nextMock,
				options,
			);

			expect(nextMock).toHaveBeenCalledTimes(0);
		});
	});
});
