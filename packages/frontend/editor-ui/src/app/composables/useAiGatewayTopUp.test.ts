import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { mockedStore } from '@/__tests__/utils';
import { useUsersStore } from '@n8n/stores/users.store';
import { useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
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
	const windowOpen = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia({ stubActions: false }));
		vi.stubGlobal('open', windowOpen);
	});

	it('opens the modal and tracks the click', () => {
		const uiStore = mockedStore(useUIStore);
		uiStore.openModalWithData = vi.fn();

		const { openTopUp } = useAiGatewayTopUp();
		openTopUp({ source: 'credential_selector', credentialType: 'openAiApi' });

		expect(trackMock).toHaveBeenCalledWith('User clicked ai gateway top up', {
			source: 'credential_selector',
			credential_type: 'openAiApi',
		});
		expect(uiStore.openModalWithData).toHaveBeenCalledWith({
			name: AI_GATEWAY_TOP_UP_MODAL_KEY,
			data: { credentialType: 'openAiApi', source: 'credential_selector' },
		});
	});

	it('sends paid owners straight to the Cloud Admin Panel', async () => {
		const usersStore = mockedStore(useUsersStore);
		const cloudPlanStore = mockedStore(useCloudPlanStore);
		const uiStore = mockedStore(useUIStore);

		usersStore.isInstanceOwner = true;
		cloudPlanStore.userIsTrialing = false;
		uiStore.openModalWithData = vi.fn();
		cloudPlanStore.generateCloudDashboardAutoLoginLink = vi
			.fn()
			.mockResolvedValue('https://app.n8n.cloud/login?code=abc&returnPath=%2Fmanage%2Fconnect');

		const { openTopUp } = useAiGatewayTopUp();
		openTopUp({ source: 'settings_page' });

		expect(uiStore.openModalWithData).not.toHaveBeenCalled();
		await vi.waitFor(() => {
			expect(cloudPlanStore.generateCloudDashboardAutoLoginLink).toHaveBeenCalledWith({
				redirectionPath: CLOUD_N8N_CONNECT_TOP_UP_PATH,
			});
		});
		expect(windowOpen).toHaveBeenCalledWith(
			'https://app.n8n.cloud/login?code=abc&returnPath=%2Fmanage%2Fconnect',
			'_blank',
			'noopener',
		);
	});

	it('reports the error when the Admin Panel link fails', async () => {
		const usersStore = mockedStore(useUsersStore);
		const cloudPlanStore = mockedStore(useCloudPlanStore);
		const uiStore = mockedStore(useUIStore);

		usersStore.isInstanceOwner = true;
		cloudPlanStore.userIsTrialing = false;
		uiStore.openModalWithData = vi.fn();
		cloudPlanStore.generateCloudDashboardAutoLoginLink = vi
			.fn()
			.mockRejectedValue(new Error('no auto-login code'));

		const { openTopUp } = useAiGatewayTopUp();
		openTopUp({ source: 'settings_page' });

		await vi.waitFor(() => {
			expect(showErrorMock).toHaveBeenCalled();
		});
		expect(windowOpen).not.toHaveBeenCalled();
		expect(uiStore.openModalWithData).not.toHaveBeenCalled();
	});

	it('opens the upgrade dialog for trial owners', () => {
		const usersStore = mockedStore(useUsersStore);
		const cloudPlanStore = mockedStore(useCloudPlanStore);
		const uiStore = mockedStore(useUIStore);

		usersStore.isInstanceOwner = true;
		cloudPlanStore.userIsTrialing = true;
		uiStore.openModalWithData = vi.fn();

		const { openTopUp } = useAiGatewayTopUp();
		openTopUp({ source: 'settings_page' });

		expect(uiStore.openModalWithData).toHaveBeenCalledWith({
			name: AI_GATEWAY_TOP_UP_MODAL_KEY,
			data: { credentialType: undefined, source: 'settings_page' },
		});
		expect(windowOpen).not.toHaveBeenCalled();
	});
});
