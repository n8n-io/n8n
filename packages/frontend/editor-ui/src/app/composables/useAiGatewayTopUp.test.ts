import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { mockedStore } from '@/__tests__/utils';
import { useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useUIStore } from '@/app/stores/ui.store';
import { AI_GATEWAY_TOP_UP_MODAL_KEY, CLOUD_N8N_CONNECT_TOP_UP_PATH } from '@/app/constants';
import { useAiGatewayTopUp } from './useAiGatewayTopUp';

const trackMock = vi.fn();
const showErrorMock = vi.fn();
const goToCloudDashboardMock = vi.hoisted(() => vi.fn());

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackMock }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorMock }),
}));

vi.mock('@/app/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: () => ({
		goToCloudDashboard: goToCloudDashboardMock,
	}),
}));

describe('useAiGatewayTopUp', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia({ stubActions: false }));
		goToCloudDashboardMock.mockResolvedValue(false);
		mockedStore(useUIStore).openModalWithData = vi.fn();
	});

	it('opens the modal and tracks the click', async () => {
		const uiStore = mockedStore(useUIStore);

		const { openTopUp } = useAiGatewayTopUp();
		await openTopUp({ source: 'credential_selector', credentialType: 'openAiApi' });

		expect(trackMock).toHaveBeenCalledWith('User clicked ai gateway top up', {
			source: 'credential_selector',
			credential_type: 'openAiApi',
		});
		expect(goToCloudDashboardMock).not.toHaveBeenCalled();
		expect(uiStore.openModalWithData).toHaveBeenCalledWith({
			name: AI_GATEWAY_TOP_UP_MODAL_KEY,
			data: { variant: 'member' },
		});
	});

	it('sends non-trial owners to the Cloud Admin Panel', async () => {
		const usersStore = mockedStore(useUsersStore);
		const uiStore = mockedStore(useUIStore);
		usersStore.isInstanceOwner = true;
		goToCloudDashboardMock.mockResolvedValue(true);

		const { openTopUp } = useAiGatewayTopUp();
		await openTopUp({ source: 'settings_page' });

		expect(goToCloudDashboardMock).toHaveBeenCalledWith({
			redirectionPath: CLOUD_N8N_CONNECT_TOP_UP_PATH,
			mode: 'open',
		});
		expect(uiStore.openModalWithData).not.toHaveBeenCalled();
	});

	it('reports the error when the Admin Panel link fails', async () => {
		const usersStore = mockedStore(useUsersStore);
		const uiStore = mockedStore(useUIStore);
		usersStore.isInstanceOwner = true;
		goToCloudDashboardMock.mockRejectedValue(new Error('no auto-login code'));

		const { openTopUp } = useAiGatewayTopUp();
		await openTopUp({ source: 'settings_page' });

		expect(showErrorMock).toHaveBeenCalled();
		expect(uiStore.openModalWithData).not.toHaveBeenCalled();
	});

	it('does not open a modal when Admin Panel navigation does not happen', async () => {
		const usersStore = mockedStore(useUsersStore);
		const uiStore = mockedStore(useUIStore);
		usersStore.isInstanceOwner = true;
		goToCloudDashboardMock.mockResolvedValue(false);

		const { openTopUp } = useAiGatewayTopUp();
		await openTopUp({ source: 'settings_page' });

		expect(goToCloudDashboardMock).toHaveBeenCalled();
		expect(uiStore.openModalWithData).not.toHaveBeenCalled();
	});

	it('opens the upgrade dialog for trial owners', async () => {
		const usersStore = mockedStore(useUsersStore);
		const cloudPlanStore = mockedStore(useCloudPlanStore);
		const uiStore = mockedStore(useUIStore);
		usersStore.isInstanceOwner = true;
		cloudPlanStore.userIsTrialing = true;

		const { openTopUp } = useAiGatewayTopUp();
		await openTopUp({ source: 'settings_page' });

		expect(uiStore.openModalWithData).toHaveBeenCalledWith({
			name: AI_GATEWAY_TOP_UP_MODAL_KEY,
			data: { variant: 'ownerTrial' },
		});
		expect(goToCloudDashboardMock).not.toHaveBeenCalled();
	});

	it('opens the contact-admin dialog for trial members', async () => {
		const cloudPlanStore = mockedStore(useCloudPlanStore);
		const uiStore = mockedStore(useUIStore);
		cloudPlanStore.userIsTrialing = true;

		const { openTopUp } = useAiGatewayTopUp();
		await openTopUp({ source: 'settings_page' });

		expect(uiStore.openModalWithData).toHaveBeenCalledWith({
			name: AI_GATEWAY_TOP_UP_MODAL_KEY,
			data: { variant: 'memberTrial' },
		});
		expect(goToCloudDashboardMock).not.toHaveBeenCalled();
	});
});
