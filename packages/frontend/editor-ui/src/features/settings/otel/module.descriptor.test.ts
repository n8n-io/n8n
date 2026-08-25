import { createPinia, setActivePinia } from 'pinia';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { Scope } from '@n8n/permissions';

import { useUIStore } from '@/app/stores/ui.store';
import { OtelModule } from './module.descriptor';
import { OTEL_SETTINGS_VIEW } from './otel.constants';

/**
 * Guards the shell-to-descriptor move of the otel settings sidebar item.
 *
 * The old gate lived in `useSettingsItems.ts` as
 * `isModuleActive('otel') && hasPermission(['rbac'], { rbac: { scope: 'otel:manage' } })`.
 * It is now split: `ui.store`'s `settingsSidebarItems` owns the module-active
 * half, and the descriptor's `available` getter owns the scope half. These tests
 * exercise the real stores so the two halves together still equal the old gate.
 */
describe('OtelModule settings sidebar item', () => {
	const registerOtel = ({
		moduleActive,
		scopes,
	}: {
		moduleActive: boolean;
		scopes: Scope[];
	}) => {
		const settingsStore = useSettingsStore();
		settingsStore.settings = {
			...settingsStore.settings,
			activeModules: moduleActive ? ['otel'] : [],
		};

		useRBACStore().setGlobalScopes(scopes);

		const uiStore = useUIStore();
		uiStore.registerSettingsPages(OtelModule.id, OtelModule.settingsPages ?? []);

		return uiStore;
	};

	const otelItem = (uiStore: ReturnType<typeof useUIStore>) =>
		uiStore.settingsSidebarItems.find((item) => item.id === 'settings-opentelemetry');

	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('should hide the item from a user without the otel:manage scope', () => {
		const uiStore = registerOtel({ moduleActive: true, scopes: [] });

		expect(otelItem(uiStore)?.available).toBe(false);
	});

	it('should hide the item from a user holding only an unrelated scope', () => {
		const uiStore = registerOtel({ moduleActive: true, scopes: ['workflow:read'] });

		expect(otelItem(uiStore)?.available).toBe(false);
	});

	it('should show the item to a user with the otel:manage scope', () => {
		const uiStore = registerOtel({ moduleActive: true, scopes: ['otel:manage'] });

		expect(otelItem(uiStore)?.available).toBe(true);
	});

	it('should hide the item when the otel module is inactive, even with the scope', () => {
		const uiStore = registerOtel({ moduleActive: false, scopes: ['otel:manage'] });

		expect(otelItem(uiStore)).toBeUndefined();
	});

	it('should re-evaluate availability when scopes change after registration', () => {
		const uiStore = registerOtel({ moduleActive: true, scopes: [] });
		expect(otelItem(uiStore)?.available).toBe(false);

		useRBACStore().addGlobalScope('otel:manage');

		expect(otelItem(uiStore)?.available).toBe(true);
	});

	it('should keep routing to the unchanged SettingsOpenTelemetryView route name', () => {
		const uiStore = registerOtel({ moduleActive: true, scopes: ['otel:manage'] });

		expect(OTEL_SETTINGS_VIEW).toBe('SettingsOpenTelemetryView');
		expect(otelItem(uiStore)?.route).toEqual({ to: { name: 'SettingsOpenTelemetryView' } });
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
});
