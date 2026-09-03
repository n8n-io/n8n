import { OtelModule } from '@n8n/frontend-module-otel';
import { i18n, setLanguage, loadLanguage } from '@n8n/i18n';
import type { Scope } from '@n8n/permissions';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createPinia, setActivePinia } from 'pinia';

import { useUIStore } from '@/app/stores/ui.store';

/**
 * Guards the shell half of the module settings-sidebar contract: a descriptor declares
 * the label as a translation key and the gate as a list of scopes, and
 * `settingsSidebarItems` resolves both.
 *
 * Driven with a real module descriptor rather than a fixture, because the gate only
 * holds if the descriptor's `id` is the same id `/rest/module-settings` reports.
 */
describe('uiStore.settingsSidebarItems', () => {
	const registerOtel = ({
		moduleActive = true,
		scopes = ['otel:manage'] as Scope[],
	}: { moduleActive?: boolean; scopes?: Scope[] } = {}) => {
		const settingsStore = useSettingsStore();
		settingsStore.settings = {
			...settingsStore.settings,
			activeModules: moduleActive ? [OtelModule.id] : [],
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

	describe('module gate', () => {
		it('should list the pages of an active module', () => {
			expect(otelItem(registerOtel())?.available).toBe(true);
		});

		it('should drop the pages of an inactive module, even when the user holds the scope', () => {
			expect(otelItem(registerOtel({ moduleActive: false }))).toBeUndefined();
		});
	});

	describe('scope gate', () => {
		it('should hide the page from a user without any required scope', () => {
			expect(otelItem(registerOtel({ scopes: [] }))?.available).toBe(false);
		});

		it('should hide the page from a user holding only an unrelated scope', () => {
			expect(otelItem(registerOtel({ scopes: ['workflow:read'] }))?.available).toBe(false);
		});

		it('should re-evaluate the scopes after registration', () => {
			const uiStore = registerOtel({ scopes: [] });
			expect(otelItem(uiStore)?.available).toBe(false);

			useRBACStore().addGlobalScope('otel:manage');

			expect(otelItem(uiStore)?.available).toBe(true);
		});

		it('should keep a page without declared scopes available', () => {
			const uiStore = useUIStore();
			const settingsStore = useSettingsStore();
			settingsStore.settings = { ...settingsStore.settings, activeModules: ['scopeless'] };
			useRBACStore().setGlobalScopes([]);

			uiStore.registerSettingsPages('scopeless', [
				{ id: 'settings-scopeless', label: 'Scopeless', route: { to: { name: 'Scopeless' } } },
			]);

			expect(
				uiStore.settingsSidebarItems.find((item) => item.id === 'settings-scopeless')?.available,
			).toBe(true);
		});
	});

	describe('label', () => {
		afterEach(() => {
			setLanguage('en');
		});

		it('should resolve the declared translation key', () => {
			expect(otelItem(registerOtel())?.label).toBe(i18n.baseText('settings.opentelemetry'));
		});

		it('should re-resolve the label after a locale change', () => {
			const uiStore = registerOtel();
			const english = otelItem(uiStore)?.label;

			loadLanguage('de', {
				'settings.opentelemetry': 'OpenTelemetrie',
			} as unknown as Parameters<typeof loadLanguage>[1]);

			expect(otelItem(uiStore)?.label).toBe('OpenTelemetrie');
			expect(otelItem(uiStore)?.label).not.toBe(english);
		});
	});
});
