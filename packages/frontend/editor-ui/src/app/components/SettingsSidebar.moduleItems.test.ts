import { OtelModule } from '@n8n/frontend-module-otel';
import { i18nInstance, setLanguage } from '@n8n/i18n';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick, ref } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import { registerModuleRoutes } from '@/app/moduleInitializer/moduleInitializer';
import router from '@/app/router';
import { useUIStore } from '@/app/stores/ui.store';

import SettingsSidebar from './SettingsSidebar.vue';

/**
 * Renders the sidebar a user actually sees, with the real descriptor, router and stores —
 * the only layer that covers the whole chain from `OtelModule.settingsPages` to the DOM.
 *
 * `SettingsSidebar.test.ts` mocks `useSettingsItems`, and both descriptor- and store-level
 * suites stop short of a render, so no test asserted that a module's label reaches the
 * screen or repaints on a language change.
 */
vi.mock('../composables/useAiGateway', () => ({
	useAiGateway: () => ({ fetchWallet: vi.fn(), isEnabled: ref(false), balance: ref(0) }),
}));
vi.mock('../composables/useAiGatewayTopUp', () => ({
	useAiGatewayTopUp: () => ({ openTopUp: vi.fn() }),
}));

// The module routes the shell manifest registers at boot, so `canUserAccessRouteByName`
// resolves every sidebar item the way it does in the app.
registerModuleRoutes(router);

describe('SettingsSidebar module pages', () => {
	const OTEL_LABEL_KEY = 'settings.opentelemetry';

	let pinia: ReturnType<typeof createPinia>;

	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);

		const settingsStore = useSettingsStore();
		settingsStore.settings = {
			...settingsStore.settings,
			activeModules: [OtelModule.id],
		};
		useRBACStore().setGlobalScopes(['otel:manage']);
		useUIStore().registerSettingsPages(OtelModule.id, OtelModule.settingsPages ?? []);
	});

	afterEach(() => {
		setLanguage('en');
	});

	const renderSidebar = () =>
		createComponentRenderer(SettingsSidebar, { pinia, global: { plugins: [router] } })();

	it('should render the translated label of a module settings page', () => {
		const { getByText } = renderSidebar();

		expect(getByText('OpenTelemetry')).toBeVisible();
	});

	it('should repaint the label after a language change', async () => {
		const { getByText, queryByText } = renderSidebar();
		expect(getByText('OpenTelemetry')).toBeVisible();

		// `Object.fromEntries`, because a dotted i18n key is not a lintable
		// object-literal property name.
		i18nInstance.global.mergeLocaleMessage(
			'de',
			Object.fromEntries([[OTEL_LABEL_KEY, 'OpenTelemetrie']]),
		);
		setLanguage('de');
		await nextTick();

		expect(getByText('OpenTelemetrie')).toBeVisible();
		expect(queryByText('OpenTelemetry')).toBeNull();
	});
});
