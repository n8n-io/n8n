import { createComponentRenderer } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChatHubModuleSettings } from './__test__/data';
import SettingsChatHubView from './SettingsChatHubView.vue';

const { settingsState, setChatEnabledMock } = vi.hoisted(() => ({
	settingsState: {
		enabled: true as boolean | undefined,
		isChatFeatureEnabled: true,
	},
	setChatEnabledMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: () => ({
		get moduleSettings() {
			return { 'chat-hub': createChatHubModuleSettings({ enabled: settingsState.enabled }) };
		},
		get isChatFeatureEnabled() {
			return settingsState.isChatFeatureEnabled;
		},
		getModuleSettings: vi.fn().mockResolvedValue(undefined),
	}),
}));

vi.mock('./chat.store', () => ({
	useChatStore: () => ({
		settings: null,
		settingsLoading: false,
		fetchAllChatSettings: vi.fn().mockResolvedValue(undefined),
		setChatEnabled: setChatEnabledMock,
	}),
}));

vi.mock('@/features/settings/users/users.store', () => ({
	useUsersStore: () => ({ isInstanceOwner: true, isAdmin: true }),
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		fetchAllCredentials: vi.fn().mockResolvedValue(undefined),
		fetchCredentialTypes: vi.fn().mockResolvedValue(undefined),
	}),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({ openModalWithData: vi.fn(), openNewCredential: vi.fn() }),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn(), showMessage: vi.fn() }),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: () => ({ set: vi.fn() }),
}));

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ isVariantEnabled: vi.fn().mockReturnValue(false) }),
}));

const renderComponent = createComponentRenderer(SettingsChatHubView, {
	global: {
		stubs: {
			ChatProvidersTable: { template: '<div data-test-id="chat-providers-table" />' },
			ChatSemanticSearchSettings: true,
		},
	},
});

describe('SettingsChatHubView', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		settingsState.enabled = true;
		settingsState.isChatFeatureEnabled = true;
	});

	it('renders the enable toggle and providers when Chat is enabled', () => {
		const { getByTestId, queryByTestId } = renderComponent();

		expect(getByTestId('chat-hub-enabled-switch')).toBeInTheDocument();
		expect(getByTestId('chat-providers-table')).toBeInTheDocument();
		expect(queryByTestId('chat-hub-disabled-notice')).not.toBeInTheDocument();
	});

	it('renders the toggle and a disabled notice but no providers when Chat is disabled', () => {
		settingsState.enabled = false;
		settingsState.isChatFeatureEnabled = false;

		const { getByTestId, queryByTestId } = renderComponent();

		expect(getByTestId('chat-hub-enabled-switch')).toBeInTheDocument();
		expect(getByTestId('chat-hub-disabled-notice')).toBeInTheDocument();
		expect(queryByTestId('chat-providers-table')).not.toBeInTheDocument();
	});

	it('calls setChatEnabled when the toggle is flipped', async () => {
		const { getByTestId } = renderComponent();

		await userEvent.click(getByTestId('chat-hub-enabled-switch'));

		expect(setChatEnabledMock).toHaveBeenCalledWith(false);
	});

	it('treats an unset enabled value as off (fail closed)', async () => {
		settingsState.enabled = undefined;
		settingsState.isChatFeatureEnabled = false;

		const { getByTestId } = renderComponent();

		// Toggle starts off, so flipping it turns Chat on.
		await userEvent.click(getByTestId('chat-hub-enabled-switch'));

		expect(setChatEnabledMock).toHaveBeenCalledWith(true);
	});
});
