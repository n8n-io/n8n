import { ref, Ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { useUsersStore } from '@/stores/users';
import { useRootStore } from '@/stores/n8nRootStore';
import { useSettingsStore } from '@/stores/settings';
import { FeatureFlags } from 'n8n-workflow';
import { EXPERIMENTS_TO_TRACK, ONBOARDING_EXPERIMENT } from '@/constants';
import { useTelemetryStore } from './telemetry';
import { useSegment } from './segment';
import { debounce } from 'lodash-es';

const EVENTS = {
	IS_PART_OF_EXPERIMENT: 'User is part of experiment',
};

export const usePostHog = defineStore('posthog', () => {
	const usersStore = useUsersStore();
	const settingsStore = useSettingsStore();
	const telemetryStore = useTelemetryStore();
	const rootStore = useRootStore();
	const segmentStore = useSegment();

	const featureFlags: Ref<FeatureFlags | null> = ref(null);
	const trackedDemoExp: Ref<FeatureFlags> = ref({});

	const reset = () => {
		window.posthog?.reset?.();
		featureFlags.value = null;
		trackedDemoExp.value = {};
	};

	const getVariant = (experiment: keyof FeatureFlags): FeatureFlags[keyof FeatureFlags] => {
		return featureFlags.value?.[experiment];
	};

	const isVariantEnabled = (experiment: string, variant: string) => {
		return getVariant(experiment) === variant;
	};

	const identify = () => {
		const instanceId = rootStore.instanceId;
		const user = usersStore.currentUser;
		const traits: Record<string, string | number> = { instance_id: instanceId };

		if (user && typeof user.createdAt === 'string') {
			traits.created_at_timestamp = new Date(user.createdAt).getTime();
		}

		// For PostHog, main ID _cannot_ be `undefined` as done for RudderStack.
		const id = user ? `${instanceId}#${user.id}` : instanceId;
		window.posthog?.identify?.(id, traits);
	};

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
		};

		window.posthog?.init(config.apiKey, options);
		identify();

		if (evaluatedFeatureFlags && Object.keys(evaluatedFeatureFlags).length) {
			featureFlags.value = evaluatedFeatureFlags;
			options.bootstrap = {
				distinctId,
				featureFlags: evaluatedFeatureFlags,
			};
			trackExperiments(evaluatedFeatureFlags);
		} else {
			// depend on client side evaluation if serverside evaluation fails
			window.posthog?.onFeatureFlags?.((keys: string[], map: FeatureFlags) => {
				featureFlags.value = map;
				trackExperiments(map);
			});
		}
	};

	const trackExperiments = debounce((featureFlags: FeatureFlags) => {
		EXPERIMENTS_TO_TRACK.forEach((name) => trackExperiment(featureFlags, name));
	}, 2000);

	const trackExperiment = (featureFlags: FeatureFlags, name: string) => {
		const variant = featureFlags[name];
		telemetryStore.track(EVENTS.IS_PART_OF_EXPERIMENT, {
			name,
			variant,
		});

		trackedDemoExp.value[name] = variant;

		if (name === ONBOARDING_EXPERIMENT.name && variant === ONBOARDING_EXPERIMENT.variant) {
			segmentStore.showAppCuesChecklist();
		}
	};

	return {
		init,
		isVariantEnabled,
		getVariant,
		reset,
	};
});
