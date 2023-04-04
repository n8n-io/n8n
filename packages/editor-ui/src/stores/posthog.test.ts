import { createPinia, setActivePinia } from 'pinia';
import { usePostHog } from './posthog';
import { useUsersStore } from './users';
import { useSettingsStore } from './settings';
import { IN8nUISettings } from '@/Interface';
import { useRootStore } from './n8nRootStore';
import { useTelemetryStore } from './telemetry';

const DEFAULT_POSTHOG_SETTINGS: IN8nUISettings['posthog'] = {
	enabled: true,
	apiHost: 'host',
	apiKey: 'key',
	autocapture: false,
	disableSessionRecording: true,
	debug: false,
};
const CURRENT_USER_ID = '1';
const CURRENT_INSTANCE_ID = '456';

function setSettings(overrides?: Partial<IN8nUISettings>) {
	useSettingsStore().setSettings({
		posthog: DEFAULT_POSTHOG_SETTINGS,
		instanceId: CURRENT_INSTANCE_ID,
		...overrides,
	} as IN8nUISettings);

	useRootStore().setInstanceId(CURRENT_INSTANCE_ID);
}

function setCurrentUser() {
	useUsersStore().addUsers([
		{
			id: CURRENT_USER_ID,
			isPending: false,
			createdAt: '2023-03-17T14:01:36.432Z',
		},
	]);

	useUsersStore().currentUserId = CURRENT_USER_ID;
}

function resetStores() {
	useSettingsStore().$reset();
	useUsersStore().$reset();
}

function setup() {
	setActivePinia(createPinia());
	window.posthog = {
		init: () => {},
		identify: () => {},
	};

	const telemetryStore = useTelemetryStore();

	vi.spyOn(window.posthog, 'init');
	vi.spyOn(window.posthog, 'identify');
	vi.spyOn(window.Storage.prototype, 'setItem');
	vi.spyOn(telemetryStore, 'track');
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
				created_at_timestamp: 1679061696432,
				instance_id: CURRENT_INSTANCE_ID,
			});
		});

		it('sets override feature flags', () => {
			const TEST = 'test';
			const flags = {
				[TEST]: 'variant',
			};
			const posthog = usePostHog();
			posthog.init(flags);

			window.featureFlags?.override(TEST, 'override');

			expect(posthog.getVariant('test')).toEqual('override');
			expect(window.posthog?.init).toHaveBeenCalled();
			expect(window.localStorage.setItem).toHaveBeenCalledWith(
				'N8N_EXPERIMENT_OVERRIDES',
				JSON.stringify({ test: 'override' }),
			);

			window.featureFlags?.override('other_test', 'override');
			expect(window.localStorage.setItem).toHaveBeenCalledWith(
				'N8N_EXPERIMENT_OVERRIDES',
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
