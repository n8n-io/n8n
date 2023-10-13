import { vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAuditLogsStore } from '@/stores/auditLogs.store';
import { useSettingsStore } from '@/stores/settings.store';
import SettingsAuditLogs from '@/views/SettingsAuditLogs.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { EnterpriseEditionFeature } from '@/constants';
import { nextTick } from 'vue';
import { setupServer } from '@/__tests__/server';

let pinia: ReturnType<typeof createPinia>;
let settingsStore: ReturnType<typeof useSettingsStore>;
let auditLogsStore: ReturnType<typeof useAuditLogsStore>;
let server: ReturnType<typeof setupServer>;

const renderComponent = createComponentRenderer(SettingsAuditLogs);

describe('SettingsAuditLogs', () => {
	beforeAll(() => {
		server = setupServer();
	});

	beforeEach(async () => {
		pinia = createPinia();
		setActivePinia(pinia);
		settingsStore = useSettingsStore();
		auditLogsStore = useAuditLogsStore();

		await settingsStore.getSettings();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	afterAll(() => {
		server.shutdown();
	});

	it('should render paywall state when there is no license', async () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.AuditLogs] = false;
		await nextTick();

		const { getByTestId, queryByTestId } = renderComponent({ pinia });

		expect(queryByTestId('audit-logs-content-licensed')).not.toBeInTheDocument();
		expect(getByTestId('audit-logs-content-unlicensed')).toBeInTheDocument();
	});

	it('should render licensed content', async () => {
		settingsStore.settings.enterprise[EnterpriseEditionFeature.AuditLogs] = true;
		await nextTick();

		const { getByTestId, queryByTestId } = renderComponent({ pinia });

		expect(getByTestId('audit-logs-content-licensed')).toBeInTheDocument();
		expect(queryByTestId('audit-logs-content-unlicensed')).not.toBeInTheDocument();
	});
});
