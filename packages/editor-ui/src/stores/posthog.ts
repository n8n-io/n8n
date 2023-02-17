import { watch } from 'vue';
import { defineStore } from 'pinia';
import { useUsersStore } from '@/stores/users';
import { useRootStore } from '@/stores/n8nRootStore';
import { useSettingsStore } from './settings';
import { FeatureFlags } from 'n8n-workflow';

export const usePostHogStore = defineStore('posthog', () => {
	const usersStore = useUsersStore();
	const settingsStore = useSettingsStore();
	const rootStore = useRootStore();

	const onLogout = () => {
		window.posthog?.reset();
	};

	const getVariant = (experiment: string): string | boolean | undefined => {
		return window.posthog?.getFeatureFlag(experiment);
	};

	const isVariantEnabled = (experiment: string, variant: string) => {
		return getVariant(experiment) === variant;
	};

	const identify = () => {
		try {
			const instanceId = rootStore.instanceId;
			const user = usersStore.currentUser;
			const traits: Record<string, string> = { instance_id: instanceId };

			// todo check why Date is used there
			if (user && user.createdAt instanceof Date) {
				traits.created_at = user.createdAt.toISOString();
			} else if (user && typeof user.createdAt === 'string') {
				traits.created_at = user.createdAt;
			}

			// For PostHog, main ID _cannot_ be `undefined` as done for RudderStack.
			let id = user ? `${instanceId}#${user.id}` : instanceId;
			window.posthog?.identify(id, traits);
		} catch (e) { }
	};

	const init = (featureFlags: FeatureFlags) => {
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

		window.posthog?.init(config.apiKey, {
			api_host: config.apiHost,
			autocapture: config.autocapture,
			disable_session_recording: config.disableSessionRecording,
			debug: config.debug,
			bootstrap: {
				distinctId,
				featureFlags,
			},
		});

		identify();

		window.posthog?.onFeatureFlags((flags: string[], map: Record<string, string | boolean>) => {
			console.log('resolved flags', JSON.stringify(map));
		});
	};

	// window.addEventListener('beforeunload', (e) => {
	// 	const variant = getVariant(ASSUMPTION_EXPERIMENT.name);
	// 	if (typeof variant !== 'string') {
	// 		return;
	// 	}

	// 	const isDemo = variant === ASSUMPTION_EXPERIMENT.demo;
	// 	const isVideo = variant === ASSUMPTION_EXPERIMENT.video;

	// 	console.log(`track ${variant}`);
	// 	telemetry.value?.track('User is part of experiment', {
	// 		name: 'edu_001',
	// 		variant: isDemo ? 'demo' : isVideo ? 'video' : 'control',
	// 	});
	// });

	watch(
		() => usersStore.currentUserId,
		(userId, prevId) => {
			if (!userId && prevId) {
				onLogout();
			}
		},
	);

	return {
		init,
		isVariantEnabled,
		getVariant,
	};
});
