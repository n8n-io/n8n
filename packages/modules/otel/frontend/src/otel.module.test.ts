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

		it('should declare both fields as plain data, with no accessor and no i18n read', () => {
			// The shell manifest imports this descriptor at boot, before `App.vue` calls
			// `setLanguage`. The earlier fix for that was a `label` getter; the declarative
			// form removes the read altogether, so neither field may become an accessor
			// again — a getter is what puts an i18n or store read back in the descriptor.
			const page = settingsPage();

			for (const field of ['labelKey', 'requiredScopes'] as const) {
				const descriptor = Object.getOwnPropertyDescriptor(page, field);
				expect(descriptor?.get).toBeUndefined();
				expect(typeof descriptor?.value).toBe('string');
			}
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
