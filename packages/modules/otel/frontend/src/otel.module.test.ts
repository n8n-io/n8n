import type { Scope } from '@n8n/permissions';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { createPinia, setActivePinia } from 'pinia';

import { OTEL_SETTINGS_VIEW } from './otel.constants';
import { OtelModule } from './otel.module';

/**
 * Guards the descriptor half of the shell-to-descriptor move of the otel settings
 * sidebar item.
 *
 * The old gate lived in the shell's `useSettingsItems.ts` as
 * `isModuleActive('otel') && hasPermission(['rbac'], { rbac: { scope: 'otel:manage' } })`.
 * It is now split: the descriptor's `available` getter owns the scope half, which is
 * what this file covers, and `ui.store`'s `settingsSidebarItems` owns the
 * module-active half, covered by `ui.store.settingsPages.test.ts` in the shell.
 */
describe('OtelModule', () => {
	const settingsPage = () =>
		OtelModule.settingsPages?.find((item) => item.id === 'settings-opentelemetry');

	const withScopes = (scopes: Scope[]) => {
		useRBACStore().setGlobalScopes(scopes);
		return settingsPage();
	};

	beforeEach(() => {
		setActivePinia(createPinia());
	});

	describe('settings sidebar item', () => {
		it('should hide the item from a user without the otel:manage scope', () => {
			expect(withScopes([])?.available).toBe(false);
		});

		it('should hide the item from a user holding only an unrelated scope', () => {
			expect(withScopes(['workflow:read'])?.available).toBe(false);
		});

		it('should show the item to a user with the otel:manage scope', () => {
			expect(withScopes(['otel:manage'])?.available).toBe(true);
		});

		it('should re-evaluate availability when scopes change after registration', () => {
			const item = withScopes([]);
			expect(item?.available).toBe(false);

			useRBACStore().addGlobalScope('otel:manage');

			expect(item?.available).toBe(true);
		});
	});

	describe('route', () => {
		it('should keep routing to the unchanged SettingsOpenTelemetryView route name', () => {
			expect(OTEL_SETTINGS_VIEW).toBe('SettingsOpenTelemetryView');
			expect(settingsPage()?.route).toEqual({ to: { name: 'SettingsOpenTelemetryView' } });
			expect(OtelModule.routes?.[0]).toMatchObject({
				path: 'opentelemetry',
				name: 'SettingsOpenTelemetryView',
			});
		});

		it('should keep the route rbac middleware, which gates direct URL access', () => {
			expect(OtelModule.routes?.[0].meta).toMatchObject({
				middleware: ['authenticated', 'rbac', 'custom'],
				middlewareOptions: { rbac: { scope: 'otel:manage' } },
			});
		});

		it('should load the view lazily, so the shell does not pull it in at boot', () => {
			expect(typeof OtelModule.routes?.[0].component).toBe('function');
		});
	});
});
