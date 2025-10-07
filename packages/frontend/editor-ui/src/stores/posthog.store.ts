import type { Ref } from 'vue';
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useStorage } from '@/composables/useStorage';
import { useUsersStore } from '@/stores/users.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@/stores/settings.store';
import type { FeatureFlags, IDataObject } from 'n8n-workflow';
import { EXPERIMENTS_TO_TRACK, LOCAL_STORAGE_EXPERIMENT_OVERRIDES } from '@/constants';
import { useDebounce } from '@/composables/useDebounce';
import { useTelemetry } from '@/composables/useTelemetry';

const EVENTS = {
	IS_PART_OF_EXPERIMENT: 'User is part of experiment',
};

export type PosthogStore = ReturnType<typeof usePostHog>;

export const usePostHog = defineStore('posthog', () => {
	const usersStore = useUsersStore();
	const settingsStore = useSettingsStore();
	const telemetry = useTelemetry();
	const rootStore = useRootStore();
	const { debounce } = useDebounce();

	const featureFlags: Ref<FeatureFlags | null> = ref(null);
	const trackedDemoExp: Ref<FeatureFlags> = ref({});

	const overrides: Ref<Record<string, string | boolean>> = ref({});

	const reset = () => {
		window.posthog?.reset?.();
		featureFlags.value = null;
		trackedDemoExp.value = {};
	};

	const getVariant = (experiment: keyof FeatureFlags): FeatureFlags[keyof FeatureFlags] => {
		return overrides.value[experiment] ?? featureFlags.value?.[experiment];
	};

	const isVariantEnabled = (experiment: string, variant: string) => {
		return getVariant(experiment) === variant;
	};

	/**
	 * Checks if the given feature flag is enabled. Should only be used for boolean flags
	 */
	const isFeatureEnabled = (experiment: keyof FeatureFlags) => {
		return getVariant(experiment) === true;
	};

	if (!window.featureFlags) {
		// for testing
		const cachedOverrides = useStorage(LOCAL_STORAGE_EXPERIMENT_OVERRIDES).value;
		if (cachedOverrides) {
			try {
				console.log('Overriding feature flags', cachedOverrides);
				const parsedOverrides = JSON.parse(cachedOverrides);
				if (typeof parsedOverrides === 'object') {
					overrides.value = JSON.parse(cachedOverrides);
				}
			} catch (e) {
				console.log('Could not override experiment', e);
			}
		}

		window.featureFlags = {
			// since features are evaluated serverside, regular posthog mechanism to override clientside does not work
			override: (name: string, value: string | boolean) => {
				overrides.value[name] = value;
				try {
					useStorage(LOCAL_STORAGE_EXPERIMENT_OVERRIDES).value = JSON.stringify(overrides.value);
				} catch (e) {}
			},

			getVariant,
			getAll: () => featureFlags.value ?? {},
		};
	}

	const identify = () => {
		const instanceId = rootStore.instanceId;
		const user = usersStore.currentUser;
		const versionCli = rootStore.versionCli;
		const traits: Record<string, string | number> = {
			instance_id: instanceId,
			version_cli: versionCli,
		};

		if (user && typeof user.createdAt === 'string') {
			traits.created_at_timestamp = new Date(user.createdAt).getTime();
		}

		// For PostHog, main ID _cannot_ be `undefined` as done for RudderStack.
		const id = user ? `${instanceId}#${user.id}` : instanceId;
		window.posthog?.identify?.(id, traits);
	};

	const trackExperiment = (featFlags: FeatureFlags, name: string) => {
		const variant = featFlags[name];
		if (!variant || trackedDemoExp.value[name] === variant) {
			return;
		}

		telemetry.track(EVENTS.IS_PART_OF_EXPERIMENT, {
			name,
			variant,
		});

		trackedDemoExp.value[name] = variant;
	};

	const trackExperiments = (featFlags: FeatureFlags) => {
		EXPERIMENTS_TO_TRACK.forEach((name) => trackExperiment(featFlags, name));
	};
	const trackExperimentsDebounced = debounce(trackExperiments, {
		debounceTime: 2000,
	});

	const init = (evaluatedFeatureFlags?: FeatureFlags) => {
		if (!window.posthog) {
			return;
		}

		const config = settingsStore.settings.posthog;
		if (!config.enabled) {
			return;
		}

		const userId = usersStore.currentUserId;
		if (!userId) {
			return;
		}

		const instanceId = rootStore.instanceId;
		const distinctId = `${instanceId}#${userId}`;

		const options: Parameters<typeof window.posthog.init>[1] = {
			api_host: config.apiHost,
			autocapture: config.autocapture,
			disable_session_recording: config.disableSessionRecording,
			debug: config.debug,
			session_recording: {
				maskAllInputs: false,
			},
		};

		window.posthog?.init(config.apiKey, options);
		identify();

		if (evaluatedFeatureFlags && Object.keys(evaluatedFeatureFlags).length) {
			featureFlags.value = evaluatedFeatureFlags;
			options.bootstrap = {
				distinctId,
				featureFlags: evaluatedFeatureFlags,
			};

			// does not need to be debounced really, but tracking does not fire without delay on page load
			trackExperimentsDebounced(featureFlags.value);
		} else {
			// depend on client side evaluation if serverside evaluation fails
			window.posthog?.onFeatureFlags?.((_, map: FeatureFlags) => {
				featureFlags.value = map;

				// must be debounced because it is called multiple times by posthog
				trackExperimentsDebounced(featureFlags.value);
			});
		}
	};

	const setMetadata = (metadata: IDataObject, target: 'user' | 'events') => {
		if (typeof window.posthog?.people?.set !== 'function') return;
		if (typeof window.posthog?.register !== 'function') return;

		if (target === 'user') {
			window.posthog?.people?.set(metadata);
		} else if (target === 'events') {
			window.posthog?.register(metadata);
		}
	};

	return {
		init,
		isFeatureEnabled,
		isVariantEnabled,
		getVariant,
		reset,
		identify,
		setMetadata,
		overrides,
	};
});
