import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { InstanceAiUserPreferencesResponse } from '@n8n/api-types';

// ---------------------------------------------------------------------------
// Mocks — must be declared before the store import
// ---------------------------------------------------------------------------

const moduleSettingsRef = { value: {} as Record<string, unknown> };

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn().mockReturnValue({
		restApiContext: { baseUrl: 'http://localhost:5678/api' },
	}),
}));

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: vi.fn().mockReturnValue({
		get moduleSettings() {
			return moduleSettingsRef.value;
		},
	}),
}));

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: vi.fn().mockReturnValue({
		addEventListener: vi.fn().mockReturnValue(() => {}),
		isConnected: false,
	}),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn().mockReturnValue({
		showError: vi.fn(),
	}),
}));

vi.mock('@/app/utils/rbac/permissions', () => ({
	hasPermission: vi.fn().mockReturnValue(false),
}));

vi.mock('@n8n/i18n', () => ({
	i18n: { baseText: (key: string) => key },
}));

const mockGetGatewayStatus = vi.fn();
vi.mock('../instanceAi.api', () => ({
	createGatewayLink: vi.fn(),
	disconnectGatewaySession: vi.fn(),
	getGatewayStatus: (...args: unknown[]) => mockGetGatewayStatus(...args),
}));

vi.mock('../instanceAi.settings.api', () => ({
	fetchSettings: vi.fn(),
	updateSettings: vi.fn(),
	fetchPreferences: vi.fn(),
	updatePreferences: vi.fn(),
	fetchModelCredentials: vi.fn(),
	fetchServiceCredentials: vi.fn(),
}));

import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setAdminLocalGatewayDisabled(disabled: boolean) {
	moduleSettingsRef.value = { 'instance-ai': { localGatewayDisabled: disabled } };
}

function setUserPreference(
	store: ReturnType<typeof useInstanceAiSettingsStore>,
	prefs: Partial<InstanceAiUserPreferencesResponse> | null,
) {
	// preferences is a reactive ref; in the store it's not part of the public
	// return surface, but tests can drive the computed by going through the
	// normal user-pref path if exposed. Here we use the preferencesDraft to
	// influence state — but isLocalGatewayDisabledForUser reads `preferences`
	// directly, so we simulate it by calling persist flow. Instead, we directly
	// set the ref via the store's `$state`.
	(store as unknown as { preferences: typeof prefs }).preferences = prefs;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
	setActivePinia(createPinia());
	moduleSettingsRef.value = {};
	vi.clearAllMocks();
});

describe('instanceAiSettings store — isLocalGatewayDisabledForUser', () => {
	it('is true when admin has globally disabled the gateway', () => {
		setAdminLocalGatewayDisabled(true);
		const store = useInstanceAiSettingsStore();
		setUserPreference(store, { localGatewayDisabled: false });

		expect(store.isLocalGatewayDisabled).toBe(true);
		expect(store.isLocalGatewayDisabledForUser).toBe(true);
	});

	it('is true when admin allows but the user has opted out', () => {
		setAdminLocalGatewayDisabled(false);
		const store = useInstanceAiSettingsStore();
		setUserPreference(store, { localGatewayDisabled: true });

		expect(store.isLocalGatewayDisabled).toBe(false);
		expect(store.isLocalGatewayDisabledForUser).toBe(true);
	});

	it('is false when admin allows and the user has opted in', () => {
		setAdminLocalGatewayDisabled(false);
		const store = useInstanceAiSettingsStore();
		setUserPreference(store, { localGatewayDisabled: false });

		expect(store.isLocalGatewayDisabledForUser).toBe(false);
	});

	it('defaults to false when preferences have not loaded yet (admin allows)', () => {
		setAdminLocalGatewayDisabled(false);
		const store = useInstanceAiSettingsStore();

		expect(store.isLocalGatewayDisabledForUser).toBe(false);
	});
});

describe('instanceAiSettings store — connections', () => {
	it('is empty when the gateway is disabled for the user', () => {
		setAdminLocalGatewayDisabled(true);
		const store = useInstanceAiSettingsStore();

		expect(store.connections).toEqual([]);
	});

	it('shows a disconnected Computer Use row when enabled but not paired', () => {
		setAdminLocalGatewayDisabled(false);
		const store = useInstanceAiSettingsStore();
		setUserPreference(store, { localGatewayDisabled: false });

		expect(store.connections).toHaveLength(1);
		expect(store.connections[0]).toMatchObject({
			type: 'computer-use',
			status: 'disconnected',
		});
	});

	it('shows Computer Use as connected and adds Browser Use row when browser category is present', async () => {
		setAdminLocalGatewayDisabled(false);
		mockGetGatewayStatus.mockResolvedValue({
			connected: true,
			directory: '/Users/test/project',
			hostIdentifier: 'host-1',
			toolCategories: [{ name: 'browser', enabled: true }],
		});
		const store = useInstanceAiSettingsStore();
		setUserPreference(store, { localGatewayDisabled: false });
		await store.fetchGatewayStatus();

		expect(store.connections).toHaveLength(2);
		expect(store.connections[0]).toMatchObject({
			type: 'computer-use',
			name: '/Users/test/project',
			status: 'connected',
		});
		expect(store.connections[1]).toMatchObject({
			type: 'browser-use',
			status: 'connected',
		});
	});

	it('omits the Browser Use row when connected without a browser tool category', async () => {
		setAdminLocalGatewayDisabled(false);
		mockGetGatewayStatus.mockResolvedValue({
			connected: true,
			directory: '/Users/test/project',
			hostIdentifier: 'host-1',
			toolCategories: [{ name: 'filesystem', enabled: true }],
		});
		const store = useInstanceAiSettingsStore();
		setUserPreference(store, { localGatewayDisabled: false });
		await store.fetchGatewayStatus();

		expect(store.connections).toHaveLength(1);
		expect(store.connections[0].type).toBe('computer-use');
	});
});
