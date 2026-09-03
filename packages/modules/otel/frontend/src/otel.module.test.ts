import { OTEL_SETTINGS_VIEW } from './otel.constants';
import { OtelModule } from './otel.module';

/**
 * Guards the descriptor half of the shell-to-descriptor move of the otel settings
 * sidebar item.
 *
 * The descriptor declares the label and the scope gate as data; the shell resolves
 * both in `ui.store`'s `settingsSidebarItems`, covered by
 * `ui.store.settingsPages.test.ts`. So this file asserts the declaration, not the
 * resolved value — a descriptor that resolves either itself has to import `@n8n/i18n`
 * or an RBAC store, which is what the declarative form removes.
 */
describe('OtelModule', () => {
	const settingsPage = () =>
		OtelModule.settingsPages?.find((item) => item.id === 'settings-opentelemetry');

	describe('settings sidebar item', () => {
		it('should declare the label as a translation key, not a translated string', () => {
			expect(settingsPage()?.labelKey).toBe('settings.opentelemetry');
			expect(settingsPage()?.label).toBeUndefined();
		});

		it('should declare the same scope the route middleware gates on', () => {
			expect(settingsPage()?.requiredScopes).toBe('otel:manage');
		});

		it('should leave availability to the shell, which knows the current scopes', () => {
			expect(settingsPage()?.available).toBeUndefined();
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
