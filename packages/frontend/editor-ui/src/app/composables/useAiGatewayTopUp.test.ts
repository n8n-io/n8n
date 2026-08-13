import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { mockedStore } from '@/__tests__/utils';
import { useUsersStore } from '@n8n/stores/users.store';
import { useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import { AI_GATEWAY_TOP_UP_MODAL_KEY, CLOUD_N8N_CONNECT_TOP_UP_PATH } from '@/app/constants';
import { useAiGatewayTopUp } from './useAiGatewayTopUp';

const trackMock = vi.fn();
const showErrorMock = vi.fn();

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackMock }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorMock }),
}));

describe('useAiGatewayTopUp', () => {
	const ADMIN_PANEL_LINK = 'https://app.n8n.cloud/login?code=abc&returnPath=%2Fmanage%2Fconnect';
	const windowOpen = vi.fn();
	const reservedTab = { close: vi.fn(), location: { href: '' }, opener: {} as Window | null };

	beforeEach(() => {
		vi.clearAllMocks();
		reservedTab.location.href = '';
		reservedTab.opener = {} as Window;
		setActivePinia(createTestingPinia({ stubActions: false }));
		windowOpen.mockReturnValue(reservedTab);
		vi.stubGlobal('open', windowOpen);
	});

	function mockPaidCloudOwner() {
		const usersStore = mockedStore(useUsersStore);
		const cloudPlanStore = mockedStore(useCloudPlanStore);
		const settingsStore = mockedStore(useSettingsStore);
		const uiStore = mockedStore(useUIStore);

		usersStore.isInstanceOwner = true;
		cloudPlanStore.userIsTrialing = false;
		settingsStore.isCloudDeployment = true;
		uiStore.openModal = vi.fn();
		cloudPlanStore.generateCloudDashboardAutoLoginLink = vi
			.fn()
			.mockResolvedValue(ADMIN_PANEL_LINK);

		return { usersStore, cloudPlanStore, settingsStore, uiStore };
	}

	it('opens the modal and tracks the click', () => {
		const uiStore = mockedStore(useUIStore);
		uiStore.openModal = vi.fn();

		const { openTopUp } = useAiGatewayTopUp();
		openTopUp({ source: 'credential_selector', credentialType: 'openAiApi' });

		expect(trackMock).toHaveBeenCalledWith('User clicked ai gateway top up', {
			source: 'credential_selector',
			credential_type: 'openAiApi',
		});
		expect(uiStore.openModal).toHaveBeenCalledWith(AI_GATEWAY_TOP_UP_MODAL_KEY);
	});

	it('sends paid Cloud owners straight to the Cloud Admin Panel', async () => {
		const { cloudPlanStore, uiStore } = mockPaidCloudOwner();

		const { openTopUp } = useAiGatewayTopUp();
		openTopUp({ source: 'settings_page' });

		expect(windowOpen).toHaveBeenCalledWith('', '_blank');
		expect(reservedTab.opener).toBeNull();
		expect(uiStore.openModal).not.toHaveBeenCalled();
		await vi.waitFor(() => {
			expect(cloudPlanStore.generateCloudDashboardAutoLoginLink).toHaveBeenCalledWith({
				redirectionPath: CLOUD_N8N_CONNECT_TOP_UP_PATH,
			});
		});
		expect(reservedTab.location.href).toBe(ADMIN_PANEL_LINK);
	});

	it('opens the modal for paid owners on non-cloud instances', () => {
		const { cloudPlanStore, settingsStore, uiStore } = mockPaidCloudOwner();
		settingsStore.isCloudDeployment = false;

		const { openTopUp } = useAiGatewayTopUp();
		openTopUp({ source: 'settings_page' });

		expect(uiStore.openModal).toHaveBeenCalledWith(AI_GATEWAY_TOP_UP_MODAL_KEY);
		expect(cloudPlanStore.generateCloudDashboardAutoLoginLink).not.toHaveBeenCalled();
		expect(windowOpen).not.toHaveBeenCalled();
	});

	it('reports the error when the Admin Panel link fails', async () => {
		const { cloudPlanStore, uiStore } = mockPaidCloudOwner();
		cloudPlanStore.generateCloudDashboardAutoLoginLink = vi
			.fn()
			.mockRejectedValue(new Error('no auto-login code'));

		const { openTopUp } = useAiGatewayTopUp();
		openTopUp({ source: 'settings_page' });

		expect(windowOpen).toHaveBeenCalledWith('', '_blank');
		await vi.waitFor(() => {
			expect(showErrorMock).toHaveBeenCalled();
		});
		expect(reservedTab.close).toHaveBeenCalled();
		expect(uiStore.openModal).not.toHaveBeenCalled();
	});

	it('opens the upgrade dialog for trial owners', () => {
		const usersStore = mockedStore(useUsersStore);
		const cloudPlanStore = mockedStore(useCloudPlanStore);
		const uiStore = mockedStore(useUIStore);

		usersStore.isInstanceOwner = true;
		cloudPlanStore.userIsTrialing = true;
		uiStore.openModal = vi.fn();

		const { openTopUp } = useAiGatewayTopUp();
		openTopUp({ source: 'settings_page' });

		expect(uiStore.openModal).toHaveBeenCalledWith(AI_GATEWAY_TOP_UP_MODAL_KEY);
		expect(windowOpen).not.toHaveBeenCalled();
	});
});
