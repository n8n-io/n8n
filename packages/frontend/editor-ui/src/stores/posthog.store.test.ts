import { createPinia, setActivePinia } from 'pinia';
import { usePostHog } from '@/stores/posthog.store';
import { useUsersStore } from '@/stores/users.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { FrontendSettings } from '@n8n/api-types';
import { LOCAL_STORAGE_EXPERIMENT_OVERRIDES } from '@/constants';
import { nextTick } from 'vue';
import { defaultSettings } from '../__tests__/defaults';
import { useTelemetry } from '@/composables/useTelemetry';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';

export const DEFAULT_POSTHOG_SETTINGS: FrontendSettings['posthog'] = {
	enabled: true,
	apiHost: 'host',
	apiKey: 'key',
	autocapture: false,
	disableSessionRecording: true,
	debug: false,
};
const CURRENT_USER_ID = '1';
const CURRENT_INSTANCE_ID = '456';
const CURRENT_VERSION_CLI = '1.100.0';

function setSettings(overrides?: Partial<FrontendSettings>) {
	useSettingsStore().setSettings({
		...defaultSettings,
		posthog: DEFAULT_POSTHOG_SETTINGS,
		instanceId: CURRENT_INSTANCE_ID,
		...overrides,
	} as FrontendSettings);

	useRootStore().setInstanceId(CURRENT_INSTANCE_ID);
	useRootStore().setVersionCli(CURRENT_VERSION_CLI);
}

function setCurrentUser() {
	useUsersStore().addUsers([
		{
			id: CURRENT_USER_ID,
			isPending: false,
		},
	]);

	useUsersStore().currentUserId = CURRENT_USER_ID;
}

function resetStores() {
	useSettingsStore().reset();

	const usersStore = useUsersStore();
	usersStore.initialized = false;
	usersStore.currentUserId = null;
	usersStore.usersById = {};

	const cloudPlanStore = useCloudPlanStore();
	cloudPlanStore.currentUserCloudInfo = null;
}

function setup() {
	setActivePinia(createPinia());
	window.posthog = {
		init: () => {},
		identify: () => {},
	};

	const telemetry = useTelemetry();

	vi.spyOn(window.posthog, 'init');
	vi.spyOn(window.posthog, 'identify');
	vi.spyOn(telemetry, 'track');
}

describe('Posthog store', () => {
	describe('should not init', () => {
		beforeEach(() => {
			setup();
		});

		it('should not init if posthog is not enabled', () => {
			setSettings({ posthog: { ...DEFAULT_POSTHOG_SETTINGS, enabled: false } });
			setCurrentUser();
			const posthog = usePostHog();
			posthog.init();

			expect(window.posthog?.init).not.toHaveBeenCalled();
		});

		it('should not init if user is not logged in', () => {
			setSettings();
			const posthog = usePostHog();
			posthog.init();

			expect(window.posthog?.init).not.toHaveBeenCalled();
		});

		afterEach(() => {
			resetStores();
		});
	});

	describe('should init posthog', () => {
		beforeEach(() => {
			setup();
			setSettings();
			setCurrentUser();
		});

		it('should init store with serverside flags', () => {
			const TEST = 'test';
			const flags = {
				[TEST]: 'variant',
			};
			const posthog = usePostHog();
			posthog.init(flags);

			expect(posthog.getVariant('test')).toEqual(flags[TEST]);
			expect(window.posthog?.init).toHaveBeenCalled();
		});

		it('should identify user', () => {
			const posthog = usePostHog();
			posthog.init();

			const userId = `${CURRENT_INSTANCE_ID}#${CURRENT_USER_ID}`;
			expect(window.posthog?.identify).toHaveBeenCalledWith(userId, {
				instance_id: CURRENT_INSTANCE_ID,
				version_cli: CURRENT_VERSION_CLI,
			});
		});

		it('sets override feature flags', async () => {
			const TEST = 'test';
			const flags = {
				[TEST]: 'variant',
			};
			const posthog = usePostHog();
			posthog.init(flags);

			window.featureFlags?.override(TEST, 'override');
			await nextTick();

			expect(posthog.getVariant('test')).toEqual('override');
			expect(window.posthog?.init).toHaveBeenCalled();
			expect(window.localStorage.getItem(LOCAL_STORAGE_EXPERIMENT_OVERRIDES)).toEqual(
				JSON.stringify({ test: 'override' }),
			);

			window.featureFlags?.override('other_test', 'override');
			await nextTick();
			expect(window.localStorage.getItem(LOCAL_STORAGE_EXPERIMENT_OVERRIDES)).toEqual(
				JSON.stringify({ test: 'override', other_test: 'override' }),
			);
		});

		afterEach(() => {
			resetStores();
			window.localStorage.clear();
			window.featureFlags = undefined;
		});
	});
});
