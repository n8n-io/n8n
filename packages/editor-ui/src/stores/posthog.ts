import { ref, Ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { useUsersStore } from '@/stores/users';
import { useRootStore } from '@/stores/n8nRootStore';
import { useSettingsStore } from './settings';
import { FeatureFlags } from 'n8n-workflow';
import { EXPERIMENTS_TO_TRACK } from '@/constants';
import { useTelemetryStore } from './telemetry';

export const usePostHogStore = defineStore('posthog', () => {
	const usersStore = useUsersStore();
	const settingsStore = useSettingsStore();
	const telemetryStore = useTelemetryStore();
	const rootStore = useRootStore();

	const featureFlags: Ref<FeatureFlags | null> = ref(null);
	const initialized: Ref<boolean> = ref(false);
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

		if (evaluatedFeatureFlags) {
			featureFlags.value = evaluatedFeatureFlags;
			options.bootstrap = {
				distinctId,
				featureFlags: evaluatedFeatureFlags,
			};
		}

		window.posthog?.init(config.apiKey, options);

		identify();

		initialized.value = true;
	};

	const trackExperiment = (name: string) => {
		const curr = featureFlags.value;
		const prev = trackedDemoExp.value;

		if (!curr || curr[name] === undefined) {
			return;
		}

		if (curr[name] === prev[name]) {
			return;
		}

		const variant = curr[name];
		telemetryStore.track('User is part of experiment', {
			name,
			variant,
		});

		trackedDemoExp.value[name] = variant;
	};

	watch(
		() => featureFlags.value,
		() => {
			setTimeout(() => {
				EXPERIMENTS_TO_TRACK.forEach(trackExperiment);
			}, 0);
		},
	);

	return {
		init,
		isVariantEnabled,
		getVariant,
		reset,
	};
});
