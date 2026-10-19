import { VIEWS } from '@n8n/frontend-constants/views';
import type { RouteRecordRaw } from 'vue-router';

import { OTEL_SETTINGS_VIEW } from './otel.constants';
import { OtelModule } from './otel.module';

/**
 * The page has no sidebar link of its own. The shell's Observability overview lists it
 * and gates the link on the module being active and on the `otel:manage` scope, which
 * `useSettingsItems.test.ts` in the shell covers.
 */
describe('OtelModule', () => {
	// Widened: `defineFrontendModule` keeps the literal tuple, whose members differ in shape.
	const routes: RouteRecordRaw[] = OtelModule.routes;
	const pageRoute = () => routes.find((route) => route.name === OTEL_SETTINGS_VIEW);
	const redirectRoute = () => routes.find((route) => 'redirect' in route);

	it('should not register a settings sidebar item', () => {
		expect(OtelModule).not.toHaveProperty('settingsPages');
	});

	describe('route', () => {
		it('should keep routing to the unchanged SettingsOpenTelemetryView route name', () => {
			expect(OTEL_SETTINGS_VIEW).toBe('SettingsOpenTelemetryView');
			expect(pageRoute()).toMatchObject({
				path: 'opentelemetry',
				name: 'SettingsOpenTelemetryView',
			});
		});

		it('should nest under the Observability overview, so its sidebar link stays active', () => {
			expect(pageRoute()?.meta?.parentRouteName).toBe(VIEWS.OBSERVABILITY_SETTINGS_ROOT);
		});

		it('should keep the route rbac middleware, which gates direct URL access', () => {
			expect(pageRoute()?.meta).toMatchObject({
				middleware: ['authenticated', 'rbac', 'custom'],
				middlewareOptions: { rbac: { scope: 'otel:manage' } },
			});
		});

		it('should load the view lazily, so the shell does not pull it in at boot', () => {
			expect(typeof pageRoute()?.component).toBe('function');
		});

		it('should redirect the old flat settings path to the nested page', () => {
			expect(redirectRoute()).toMatchObject({
				path: 'opentelemetry',
				redirect: { name: OTEL_SETTINGS_VIEW },
				meta: { telemetry: { pageCategory: 'settings' } },
			});
		});
	});
});
