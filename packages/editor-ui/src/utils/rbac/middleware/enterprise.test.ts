import { useSettingsStore } from '@/stores/settings.store';
import { VIEWS, EnterpriseEditionFeature } from '@/constants';
import { enterpriseMiddleware } from '@/utils/rbac/middleware/enterprise';
import { type RouteLocationNormalized } from 'vue-router';
import type { EnterprisePermissionOptions } from '@/types/rbac';
import { createPinia, setActivePinia } from 'pinia';

describe('Middleware', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	describe('enterprise', () => {
		it('should redirect to homepage if none of the required features are enabled in allOf mode', async () => {
			//@ts-expect-error
			useSettingsStore().settings.enterprise = {
				[EnterpriseEditionFeature.Saml]: false,
				[EnterpriseEditionFeature.Ldap]: false,
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
			//@ts-expect-error
			useSettingsStore().settings.enterprise = {
				[EnterpriseEditionFeature.Saml]: true,
				[EnterpriseEditionFeature.Ldap]: true,
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
			//@ts-expect-error
			useSettingsStore().settings.enterprise = {
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
			//@ts-expect-error
			useSettingsStore().settings.enterprise = {
				[EnterpriseEditionFeature.Saml]: false,
				[EnterpriseEditionFeature.Ldap]: true,
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
