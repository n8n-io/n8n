import { OtelModule } from '@n8n/frontend-module-otel';
import { i18nInstance, setLanguage } from '@n8n/i18n';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createPinia, setActivePinia } from 'pinia';

import { useUIStore } from '@/app/stores/ui.store';

/**
 * Guards the shell half of the settings-sidebar gate: `settingsSidebarItems` drops
 * the pages of a module the instance has not activated.
 *
 * Driven with a real module descriptor rather than a fixture, because the gate only
 * holds if the descriptor's `id` is the same id `/rest/module-settings` reports.
 * The scope half of the old gate lives in the descriptor's `available` getter and is
 * covered by `otel.module.test.ts` in the module package.
 */
describe('uiStore.settingsSidebarItems', () => {
	const registerOtel = ({ moduleActive }: { moduleActive: boolean }) => {
		const settingsStore = useSettingsStore();
		settingsStore.settings = {
			...settingsStore.settings,
			activeModules: moduleActive ? [OtelModule.id] : [],
		};

		useRBACStore().setGlobalScopes(['otel:manage']);

		const uiStore = useUIStore();
		uiStore.registerSettingsPages(OtelModule.id, OtelModule.settingsPages ?? []);

		return uiStore;
	};

	const otelItem = (uiStore: ReturnType<typeof useUIStore>) =>
		uiStore.settingsSidebarItems.find((item) => item.id === 'settings-opentelemetry');

	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('should list the pages of an active module', () => {
		const uiStore = registerOtel({ moduleActive: true });

		expect(otelItem(uiStore)?.available).toBe(true);
	});

	it('should drop the pages of an inactive module, even when the user holds the scope', () => {
		const uiStore = registerOtel({ moduleActive: false });

		expect(otelItem(uiStore)).toBeUndefined();
	});

	/**
	 * `settingsSidebarItems` spreads each page into `{ available: true, ...item }`, which
	 * resolves the descriptor's `label` and `available` getters into plain values. That only
	 * keeps following i18n and rbac because the spread runs inside this computed, so the
	 * getters' reactive reads become the computed's own dependencies.
	 *
	 * `otel.module.test.ts` reads the descriptor directly and so cannot see that: it passes
	 * either way. Moving the spread out of the computed, or resolving pages once in
	 * `registerSettingsPages`, re-freezes the label with every descriptor-level test green.
	 */
	describe('reactivity through the spread', () => {
		const OTEL_LABEL_KEY = 'settings.opentelemetry';

		afterEach(() => {
			setLanguage('en');
		});

		it('should expose the translated label of a module page', () => {
			const uiStore = registerOtel({ moduleActive: true });

			expect(otelItem(uiStore)?.label).toBe('OpenTelemetry');
		});

		it('should follow a language change', () => {
			const uiStore = registerOtel({ moduleActive: true });
			expect(otelItem(uiStore)?.label).toBe('OpenTelemetry');

			// `Object.fromEntries`, because a dotted i18n key is not a lintable
			// object-literal property name.
			i18nInstance.global.mergeLocaleMessage(
				'de',
				Object.fromEntries([[OTEL_LABEL_KEY, 'OpenTelemetrie']]),
			);
			setLanguage('de');

			expect(otelItem(uiStore)?.label).toBe('OpenTelemetrie');
		});

		it('should follow a scope change', () => {
			const uiStore = registerOtel({ moduleActive: true });
			expect(otelItem(uiStore)?.available).toBe(true);

			useRBACStore().setGlobalScopes([]);

			expect(otelItem(uiStore)?.available).toBe(false);
		});
	});
});
