import { createPinia, setActivePinia } from 'pinia';
import { usePostHog, waitForFeatureFlagsWithTimeout } from '@/app/stores/posthog.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { MCP_DISCOVERY_EXPERIMENT_KEY, type FrontendSettings } from '@n8n/api-types';
import {
	LOCAL_STORAGE_EXPERIMENT_OVERRIDES,
	SURFACE_ASSISTANT_ON_WORKFLOW_ERROR_EXPERIMENT, // Experiment cleanup (119_surface_assistant_on_workflow_error)
} from '@/app/constants';
import { nextTick } from 'vue';
import { defaultSettings } from '@n8n/frontend-test-utils';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry'; // Experiment cleanup (119_surface_assistant_on_workflow_error)
import { useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
import type { FeatureFlags } from 'n8n-workflow';
import postHogInitStub from '../../../public/static/posthog.init.js?raw';

export const DEFAULT_POSTHOG_SETTINGS: FrontendSettings['posthog'] = {
	enabled: true,
	apiHost: 'host',
	apiKey: 'key',
	autocapture: false,
	disableSessionRecording: true,
	debug: false,
	proxy: 'proxy',
};
const CURRENT_USER_ID = '1';
const CURRENT_INSTANCE_ID = '456';
const CURRENT_VERSION_CLI = '1.100.0';
let onFeatureFlagsCallback: ((keys: string[], map: FeatureFlags) => void) | undefined;
let postHogLoadedCallback: (() => void) | undefined;

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
	const localStorageItems = new Map<string, string>();
	Object.defineProperty(window, 'localStorage', {
		configurable: true,
		value: {
			getItem: (key: string) => localStorageItems.get(key) ?? null,
			setItem: (key: string, value: string) => {
				localStorageItems.set(key, value);
			},
			removeItem: (key: string) => {
				localStorageItems.delete(key);
			},
			clear: () => localStorageItems.clear(),
		},
	});
	window.featureFlags = undefined;
	postHogLoadedCallback = undefined;
	window.posthog = {
		init: (_key, options) => {
			postHogLoadedCallback = (options as { loaded?: () => void } | undefined)?.loaded;
		},
		identify: () => {},
		group: () => {},
		capture: () => {},
		onFeatureFlags: (callback) => {
			onFeatureFlagsCallback = callback;
		},
	};

	const telemetry = useTelemetry();

	vi.spyOn(window.posthog, 'init');
	vi.spyOn(window.posthog, 'identify');
	vi.spyOn(window.posthog, 'group');
	vi.spyOn(window.posthog, 'capture');
	vi.spyOn(telemetry, 'track');
}

describe('Posthog store', () => {
	it('queues group calls in the PostHog bootstrap stub', () => {
		const [, queuedMethods = ''] = postHogInitStub.match(/o\s*=\s*'([^']+)'\.split/s) ?? [];

		expect(queuedMethods.split(/\s+/)).toContain('group');
	});

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

		it('should keep serverside flags and payloads if posthog is not enabled', async () => {
			setSettings({ posthog: { ...DEFAULT_POSTHOG_SETTINGS, enabled: false } });
			setCurrentUser();
			const posthog = usePostHog();
			posthog.init({ test: 'variant', enabled_flag: true }, { test: 'payload' });

			expect(window.posthog?.init).not.toHaveBeenCalled();
			expect(posthog.getVariant('test')).toBe('variant');
			expect(posthog.isFeatureEnabled('enabled_flag')).toBe(true);
			expect(posthog.getFeatureFlagPayload('test')).toBe('payload');
			expect(posthog.hasPendingFeatureFlags()).toBe(false);
			expect(await posthog.waitForFeatureFlags()).toEqual({
				test: 'variant',
				enabled_flag: true,
			});
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
			onFeatureFlagsCallback = undefined;
			postHogLoadedCallback = undefined;
		});

		it('should init store with serverside flags', () => {
			const TEST = 'test';
			const flags = {
				[TEST]: 'variant',
			};
			const posthog = usePostHog();
			posthog.init(flags);

			expect(posthog.getVariant('test')).toEqual(flags[TEST]);
			expect(window.posthog?.init).toHaveBeenCalledWith(
				DEFAULT_POSTHOG_SETTINGS.apiKey,
				expect.objectContaining({
					bootstrap: {
						distinctID: `${CURRENT_INSTANCE_ID}#${CURRENT_USER_ID}`,
						isIdentifiedID: true,
						featureFlags: flags,
					},
				}),
			);
		});

		it('bootstraps remote config payloads and clears them on reset', () => {
			const flags = { 'config-form-url': true };
			const payloads = { 'config-form-url': 'https://example.com/form' };
			const posthog = usePostHog();

			posthog.init(flags, payloads);

			expect(posthog.getFeatureFlagPayload('config-form-url')).toBe(payloads['config-form-url']);
			expect(window.posthog?.init).toHaveBeenCalledWith(
				DEFAULT_POSTHOG_SETTINGS.apiKey,
				expect.objectContaining({
					bootstrap: {
						distinctID: `${CURRENT_INSTANCE_ID}#${CURRENT_USER_ID}`,
						isIdentifiedID: true,
						featureFlags: flags,
						featureFlagPayloads: payloads,
					},
				}),
			);

			posthog.reset();
			expect(posthog.getFeatureFlagPayload('config-form-url')).toBeUndefined();
		});

		it('disables client-side flag refetch when flags are bootstrapped', () => {
			const posthog = usePostHog();
			posthog.init({ test: 'variant' });

			expect(window.posthog?.init).toHaveBeenCalledWith(
				DEFAULT_POSTHOG_SETTINGS.apiKey,
				expect.objectContaining({
					advanced_disable_feature_flags: true,
				}),
			);
		});

		it('keeps client-side flag refetch when flags are not bootstrapped', () => {
			const posthog = usePostHog();
			posthog.init();

			expect(window.posthog?.init).toHaveBeenCalledWith(
				DEFAULT_POSTHOG_SETTINGS.apiKey,
				expect.not.objectContaining({
					advanced_disable_feature_flags: expect.anything(),
				}),
			);
		});

		it('does not request tracing headers when session recording is disabled', () => {
			const posthog = usePostHog();
			posthog.init();

			expect(window.posthog?.init).toHaveBeenCalledWith(
				DEFAULT_POSTHOG_SETTINGS.apiKey,
				expect.not.objectContaining({
					tracing_headers: expect.anything(),
				}),
			);
		});

		it('requests tracing headers for the REST host when session recording is enabled', () => {
			setSettings({
				posthog: { ...DEFAULT_POSTHOG_SETTINGS, disableSessionRecording: false },
			});

			const posthog = usePostHog();
			posthog.init();

			expect(window.posthog?.init).toHaveBeenCalledWith(
				DEFAULT_POSTHOG_SETTINGS.apiKey,
				expect.objectContaining({
					tracing_headers: [window.location.hostname],
				}),
			);
		});

		it('should identify user', () => {
			const posthog = usePostHog();
			posthog.init();

			expect(window.posthog?.identify).not.toHaveBeenCalled();

			postHogLoadedCallback?.();

			const userId = `${CURRENT_INSTANCE_ID}#${CURRENT_USER_ID}`;
			expect(window.posthog?.identify).toHaveBeenCalledWith(userId, {
				instance_id: CURRENT_INSTANCE_ID,
				version_cli: CURRENT_VERSION_CLI,
			});
		});

		it('re-identifies without re-initializing when the SDK is already loaded', () => {
			const posthog = usePostHog();
			posthog.init();
			postHogLoadedCallback?.();

			// logout → a different user logs in, without a page reload
			posthog.reset();
			vi.mocked(window.posthog!.init!).mockClear();
			vi.mocked(window.posthog!.identify!).mockClear();
			vi.mocked(window.posthog!.group!).mockClear();
			window.posthog!.__loaded = true;

			const OTHER_USER_ID = '2';
			useUsersStore().addUsers([{ id: OTHER_USER_ID, isPending: false }]);
			useUsersStore().currentUserId = OTHER_USER_ID;

			posthog.init();

			expect(window.posthog?.init).not.toHaveBeenCalled();
			expect(window.posthog?.identify).toHaveBeenCalledWith(
				`${CURRENT_INSTANCE_ID}#${OTHER_USER_ID}`,
				expect.objectContaining({ instance_id: CURRENT_INSTANCE_ID }),
			);
			expect(window.posthog?.group).toHaveBeenCalledWith('company', CURRENT_INSTANCE_ID);
		});

		it('identifies the instance group', () => {
			const posthog = usePostHog();
			posthog.init();

			expect(window.posthog?.group).not.toHaveBeenCalled();

			postHogLoadedCallback?.();

			expect(window.posthog?.group).toHaveBeenCalledWith('company', CURRENT_INSTANCE_ID);
		});

		it('captures events with the provided properties', () => {
			const posthog = usePostHog();

			posthog.capture('Test event', { test: 'value' });

			expect(window.posthog?.capture).toHaveBeenCalledWith('Test event', {
				test: 'value',
			});
		});

		it('preserves existing captured event groups', () => {
			const posthog = usePostHog();

			posthog.capture('Test event', {
				test: 'value',
				$groups: {
					organization: 'n8n',
				},
			});

			expect(window.posthog?.capture).toHaveBeenCalledWith('Test event', {
				test: 'value',
				$groups: {
					organization: 'n8n',
				},
			});
		});

		it('overrides feature flag values and payloads', async () => {
			const flags = {
				test: 'variant',
				'value-only': 'variant',
			};
			const payloads = {
				test: 'server-payload',
				'value-only': 'server-payload',
			};
			const posthog = usePostHog();
			posthog.init(flags, payloads);

			window.featureFlags?.override('test', 'override', 'override-payload');
			await nextTick();
			window.featureFlags?.override('value-only', 'variant');
			await nextTick();

			expect(posthog.getVariant('test')).toEqual('override');
			expect(posthog.getFeatureFlagPayload('test')).toEqual('override-payload');
			expect(posthog.getFeatureFlagPayload('value-only')).toBeUndefined();
			expect(window.posthog?.init).toHaveBeenCalled();
			expect(window.localStorage.getItem(LOCAL_STORAGE_EXPERIMENT_OVERRIDES)).toEqual(
				JSON.stringify({
					test: { value: 'override', payload: 'override-payload' },
					'value-only': { value: 'variant' },
				}),
			);
		});

		it('loads legacy value-only overrides', () => {
			window.localStorage.setItem(
				LOCAL_STORAGE_EXPERIMENT_OVERRIDES,
				JSON.stringify({ test: 'override' }),
			);

			const posthog = usePostHog();
			posthog.init({ test: 'variant' }, { test: 'server-payload' });

			expect(posthog.getVariant('test')).toEqual('override');
			expect(posthog.getFeatureFlagPayload('test')).toBeUndefined();
		});

		it('loads flags and payloads from client-side evaluation when server flags are unavailable', async () => {
			const remoteConfigKey = 'config-form-url';
			const remoteUrl = 'https://example.com/form';
			window.posthog!.getFeatureFlagPayload = vi.fn((key) =>
				key === remoteConfigKey ? remoteUrl : null,
			);
			const posthog = usePostHog();
			posthog.init();

			expect(posthog.hasPendingFeatureFlags()).toBe(true);
			expect(onFeatureFlagsCallback).toBeDefined();

			let resolved = false;
			const waitForFlags = posthog.waitForFeatureFlags().then(() => {
				resolved = true;
			});

			await Promise.resolve();
			expect(resolved).toBe(false);

			onFeatureFlagsCallback?.([], {
				test: 'variant',
				[remoteConfigKey]: true,
				'flag-without-payload': true,
			});
			await waitForFlags;

			expect(posthog.hasPendingFeatureFlags()).toBe(false);
			expect(posthog.getVariant('test')).toEqual('variant');
			expect(posthog.getFeatureFlagPayload(remoteConfigKey)).toBe(remoteUrl);
			expect(posthog.getFeatureFlagPayload('flag-without-payload')).toBeUndefined();
		});

		describe('trackExposure', () => {
			it('fires the native exposure event for a resolved variant', () => {
				const posthog = usePostHog();
				posthog.init({ test: 'variant' });

				posthog.trackExposure('test');

				expect(window.posthog?.capture).toHaveBeenCalledWith('$feature_flag_called', {
					$feature_flag: 'test',
					$feature_flag_response: 'variant',
				});
			});

			it('does not fire the exposure event twice for the same variant', () => {
				const posthog = usePostHog();
				posthog.init({ test: 'variant' });

				posthog.trackExposure('test');
				posthog.trackExposure('test');

				expect(window.posthog?.capture).toHaveBeenCalledTimes(1);
			});

			it('re-fires the exposure event when the variant changes', () => {
				const posthog = usePostHog();
				posthog.init({ test: 'variant' });

				posthog.trackExposure('test');
				posthog.overrides.test = { value: 'variant-2' };
				posthog.trackExposure('test');

				expect(window.posthog?.capture).toHaveBeenCalledTimes(2);
				expect(window.posthog?.capture).toHaveBeenLastCalledWith('$feature_flag_called', {
					$feature_flag: 'test',
					$feature_flag_response: 'variant-2',
				});
			});

			it('skips flags with no variant or a disabled boolean flag', () => {
				const posthog = usePostHog();
				posthog.init({ enabled_flag: false });

				posthog.trackExposure('missing_flag');
				posthog.trackExposure('enabled_flag');

				expect(window.posthog?.capture).not.toHaveBeenCalled();
			});

			it('re-fires the exposure event after reset clears the dedupe cache', () => {
				const posthog = usePostHog();
				posthog.overrides.test = { value: 'variant' };

				posthog.trackExposure('test');
				posthog.trackExposure('test');
				expect(window.posthog?.capture).toHaveBeenCalledTimes(1);

				posthog.reset();
				posthog.trackExposure('test');

				expect(window.posthog?.capture).toHaveBeenCalledTimes(2);
			});
		});

		describe('MCP discovery assignment', () => {
			const key = MCP_DISCOVERY_EXPERIMENT_KEY;
			const participationEvent = TELEMETRY_EVENT.PLATFORM.USER_IS_PART_OF_EXPERIMENT;

			beforeEach(() => {
				vi.useFakeTimers();
			});

			afterEach(() => {
				vi.useRealTimers();
			});

			it('ignores raw flags until the visit assigns the experiment', () => {
				const posthog = usePostHog();
				posthog.init({ [key]: 'variant' });
				posthog.trackExposure(key);

				expect(posthog.getVariant(key)).toBeUndefined();
				expect(useTelemetry().track).not.toHaveBeenCalledWith(
					participationEvent,
					expect.objectContaining({ name: key }),
				);
				expect(window.posthog?.capture).not.toHaveBeenCalled();
			});

			it.each(['control', 'variant'] as const)(
				'uses the durable %s assignment instead of the raw flag',
				(variant) => {
					const posthog = usePostHog();
					posthog.init({ [key]: variant === 'control' ? 'variant' : 'control' });
					posthog.setMcpDiscoveryAssignment(variant);

					expect(posthog.getVariant(key)).toBe(variant);
					expect(posthog.isVariantEnabled(key, variant)).toBe(true);
				},
			);

			it('tracks an assignment immediately after init and only once', () => {
				const posthog = usePostHog();
				posthog.init({ [key]: 'variant' });
				vi.advanceTimersByTime(100);

				posthog.setMcpDiscoveryAssignment('variant');

				expect(useTelemetry().track).toHaveBeenCalledExactlyOnceWith(participationEvent, {
					name: key,
					variant: 'variant',
				});

				posthog.setMcpDiscoveryAssignment('variant');
				posthog.init({ [key]: 'control' });
				vi.advanceTimersByTime(2000);

				expect(useTelemetry().track).toHaveBeenCalledTimes(1);
			});

			it('uses an override for exposure without changing the assigned participation variant', () => {
				const posthog = usePostHog();
				posthog.overrides[key] = { value: 'control' };
				posthog.setMcpDiscoveryAssignment('variant');
				posthog.trackExposure(key);
				posthog.trackExposure(key);

				expect(posthog.getVariant(key)).toBe('control');
				expect(useTelemetry().track).toHaveBeenCalledExactlyOnceWith(participationEvent, {
					name: key,
					variant: 'variant',
				});
				expect(window.posthog?.capture).toHaveBeenCalledExactlyOnceWith('$feature_flag_called', {
					$feature_flag: key,
					$feature_flag_response: 'control',
				});
			});

			it('clears the assignment without exposing the raw flag', () => {
				const posthog = usePostHog();
				posthog.init({ [key]: 'variant' });
				posthog.setMcpDiscoveryAssignment('control');
				posthog.setMcpDiscoveryAssignment(null);
				posthog.trackExposure(key);

				expect(posthog.getVariant(key)).toBeUndefined();
				expect(window.posthog?.capture).not.toHaveBeenCalled();
			});

			it('clears the assignment and tracking deduplication on reset', () => {
				const posthog = usePostHog();
				posthog.setMcpDiscoveryAssignment('variant');
				posthog.trackExposure(key);

				posthog.reset();
				expect(posthog.getVariant(key)).toBeUndefined();
				posthog.trackExposure(key);
				expect(window.posthog?.capture).toHaveBeenCalledTimes(1);

				posthog.setMcpDiscoveryAssignment('variant');
				posthog.trackExposure(key);
				expect(useTelemetry().track).toHaveBeenCalledTimes(2);
				expect(window.posthog?.capture).toHaveBeenCalledTimes(2);
			});
		});

		// Experiment cleanup (119_surface_assistant_on_workflow_error)
		describe('cloud-only experiment tracking', () => {
			const flags = { [SURFACE_ASSISTANT_ON_WORKFLOW_ERROR_EXPERIMENT.name]: 'variant' };

			beforeEach(() => {
				vi.useFakeTimers();
			});

			afterEach(() => {
				vi.useRealTimers();
			});

			it('does not track the experiment on a self-hosted instance', () => {
				usePostHog().init(flags);
				vi.advanceTimersByTime(2000);

				expect(useTelemetry().track).not.toHaveBeenCalledWith(
					TELEMETRY_EVENT.PLATFORM.USER_IS_PART_OF_EXPERIMENT,
					expect.objectContaining({ name: SURFACE_ASSISTANT_ON_WORKFLOW_ERROR_EXPERIMENT.name }),
				);
			});

			it('tracks the experiment on a cloud instance', () => {
				setSettings({ deployment: { type: 'cloud' } });
				usePostHog().init(flags);
				vi.advanceTimersByTime(2000);

				expect(useTelemetry().track).toHaveBeenCalledWith(
					TELEMETRY_EVENT.PLATFORM.USER_IS_PART_OF_EXPERIMENT,
					{ name: SURFACE_ASSISTANT_ON_WORKFLOW_ERROR_EXPERIMENT.name, variant: 'variant' },
				);
			});
		});
		// EOF Experiment cleanup

		afterEach(() => {
			resetStores();
			window.localStorage.clear();
			window.featureFlags = undefined;
		});
	});

	describe('waitForFeatureFlagsWithTimeout', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('resolves once the flags settle, and clears its own timeout', async () => {
			const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
			const store = {
				waitForFeatureFlags: vi.fn().mockResolvedValue(undefined),
			} as unknown as ReturnType<typeof usePostHog>;

			const promise = waitForFeatureFlagsWithTimeout(store, 3000);
			await vi.advanceTimersByTimeAsync(0);
			await promise;

			expect(store.waitForFeatureFlags).toHaveBeenCalled();
			expect(clearTimeoutSpy).toHaveBeenCalled();
		});

		it('resolves after timeoutMs when the flags never settle', async () => {
			const store = {
				waitForFeatureFlags: vi.fn(async () => await new Promise<void>(() => {})),
			} as unknown as ReturnType<typeof usePostHog>;

			let resolved = false;
			void waitForFeatureFlagsWithTimeout(store, 3000).then(() => {
				resolved = true;
			});

			await vi.advanceTimersByTimeAsync(2999);
			expect(resolved).toBe(false);

			await vi.advanceTimersByTimeAsync(1);
			expect(resolved).toBe(true);
		});
	});
});
