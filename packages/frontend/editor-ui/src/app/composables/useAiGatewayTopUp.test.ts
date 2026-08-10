import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { mockedStore } from '@/__tests__/utils';
import { useUsersStore } from '@n8n/stores/users.store';
import { useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import { AI_GATEWAY_TOP_UP_MODAL_KEY } from '@/app/constants';
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

	it('explains credits in the modal before sending paid Cloud owners to the Admin Panel', () => {
		const usersStore = mockedStore(useUsersStore);
		const cloudPlanStore = mockedStore(useCloudPlanStore);
		const settingsStore = mockedStore(useSettingsStore);
		const uiStore = mockedStore(useUIStore);

		usersStore.isInstanceOwner = true;
		cloudPlanStore.userIsTrialing = false;
		settingsStore.isCloudDeployment = true;
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
