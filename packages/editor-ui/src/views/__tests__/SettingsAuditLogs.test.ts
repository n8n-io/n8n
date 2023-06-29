import { vi } from 'vitest';
import { render } from '@testing-library/vue';
import { createPinia, setActivePinia, PiniaVuePlugin } from 'pinia';
import { merge } from 'lodash-es';
import { i18nInstance } from '@/plugins/i18n';
import { useAuditLogsStore, useSettingsStore } from '@/stores';
import SettingsAuditLogs from '@/views/SettingsAuditLogs.vue';

let pinia: ReturnType<typeof createPinia>;
let settingsStore: ReturnType<typeof useSettingsStore>;
let auditLogsStore: ReturnType<typeof useAuditLogsStore>;

const renderComponent = (renderOptions: Parameters<typeof render>[1] = {}) =>
	render(
		SettingsAuditLogs,
		merge(
			{
				pinia,
				i18n: i18nInstance,
			},
			renderOptions,
		),
		(vue) => {
			vue.use(PiniaVuePlugin);
		},
	);

describe('SettingsAuditLogs', () => {
	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
		settingsStore = useSettingsStore();
		auditLogsStore = useAuditLogsStore();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render paywall state when there is no license', () => {
		vi.spyOn(settingsStore, 'isEnterpriseFeatureEnabled').mockReturnValue(false);

		const { getByTestId, queryByTestId } = renderComponent();

		expect(queryByTestId('audit-logs-content-licensed')).not.toBeInTheDocument();
		expect(getByTestId('audit-logs-content-unlicensed')).toBeInTheDocument();
	});

	it('should render licensed content', () => {
		vi.spyOn(settingsStore, 'isEnterpriseFeatureEnabled').mockReturnValue(true);

		const { getByTestId, queryByTestId } = renderComponent();

		expect(getByTestId('audit-logs-content-licensed')).toBeInTheDocument();
		expect(queryByTestId('audit-logs-content-unlicensed')).not.toBeInTheDocument();
	});
});
