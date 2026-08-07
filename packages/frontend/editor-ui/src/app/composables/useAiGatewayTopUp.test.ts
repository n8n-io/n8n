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

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackMock }),
}));

describe('useAiGatewayTopUp', () => {
	const windowOpen = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia({ stubActions: false }));
		vi.stubGlobal('open', windowOpen);
	});

	it('opens the Cloud Admin Panel for paid Cloud owners', async () => {
		const usersStore = mockedStore(useUsersStore);
		const cloudPlanStore = mockedStore(useCloudPlanStore);
		const settingsStore = mockedStore(useSettingsStore);
		const uiStore = mockedStore(useUIStore);

		usersStore.isInstanceOwner = true;
		cloudPlanStore.userIsTrialing = false;
		settingsStore.isCloudDeployment = true;
		cloudPlanStore.generateCloudDashboardAutoLoginLink = vi
			.fn()
			.mockResolvedValue('https://app.n8n.cloud/login?code=abc&returnPath=%2Fn8n-connect');
		uiStore.openModalWithData = vi.fn();

		const { openTopUp } = useAiGatewayTopUp();
		await openTopUp({ source: 'settings_page' });

		expect(trackMock).toHaveBeenCalledWith('User clicked ai gateway top up', {
			source: 'settings_page',
			credential_type: undefined,
		});
		expect(cloudPlanStore.generateCloudDashboardAutoLoginLink).toHaveBeenCalledWith({
			redirectionPath: CLOUD_N8N_CONNECT_TOP_UP_PATH,
		});
		expect(windowOpen).toHaveBeenCalledWith(
			'https://app.n8n.cloud/login?code=abc&returnPath=%2Fn8n-connect',
			'_blank',
			'noopener',
		);
		expect(uiStore.openModalWithData).not.toHaveBeenCalled();
	});

	it('opens the modal for members', async () => {
		const usersStore = mockedStore(useUsersStore);
		const cloudPlanStore = mockedStore(useCloudPlanStore);
		const settingsStore = mockedStore(useSettingsStore);
		const uiStore = mockedStore(useUIStore);

		usersStore.isInstanceOwner = false;
		cloudPlanStore.userIsTrialing = false;
		settingsStore.isCloudDeployment = true;
		uiStore.openModalWithData = vi.fn();

		const { openTopUp } = useAiGatewayTopUp();
		await openTopUp({ source: 'credential_selector', credentialType: 'openAiApi' });

		expect(uiStore.openModalWithData).toHaveBeenCalledWith({
			name: AI_GATEWAY_TOP_UP_MODAL_KEY,
			data: { credentialType: 'openAiApi', source: 'credential_selector' },
		});
		expect(windowOpen).not.toHaveBeenCalled();
	});

	it('opens the modal for owners on trial', async () => {
		const usersStore = mockedStore(useUsersStore);
		const cloudPlanStore = mockedStore(useCloudPlanStore);
		const settingsStore = mockedStore(useSettingsStore);
		const uiStore = mockedStore(useUIStore);

		usersStore.isInstanceOwner = true;
		cloudPlanStore.userIsTrialing = true;
		settingsStore.isCloudDeployment = true;
		uiStore.openModalWithData = vi.fn();

		const { openTopUp } = useAiGatewayTopUp();
		await openTopUp({ source: 'settings_page' });

		expect(uiStore.openModalWithData).toHaveBeenCalledWith({
			name: AI_GATEWAY_TOP_UP_MODAL_KEY,
			data: { credentialType: undefined, source: 'settings_page' },
		});
		expect(windowOpen).not.toHaveBeenCalled();
	});

	it('opens the modal for owners on local (non-cloud) deployments', async () => {
		const usersStore = mockedStore(useUsersStore);
		const cloudPlanStore = mockedStore(useCloudPlanStore);
		const settingsStore = mockedStore(useSettingsStore);
		const uiStore = mockedStore(useUIStore);

		usersStore.isInstanceOwner = true;
		cloudPlanStore.userIsTrialing = false;
		settingsStore.isCloudDeployment = false;
		uiStore.openModalWithData = vi.fn();

		const { openTopUp } = useAiGatewayTopUp();
		await openTopUp({ source: 'settings_page' });

		expect(uiStore.openModalWithData).toHaveBeenCalled();
		expect(windowOpen).not.toHaveBeenCalled();
	});
});
