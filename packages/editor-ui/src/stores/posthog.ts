import { ref, Ref, watch } from 'vue';
import { Telemetry } from '@/plugins/telemetry';
import { ASSUMPTION_EXPERIMENT } from '@/constants';
import { defineStore } from 'pinia';
import { useUsersStore } from '@/stores/users';
import { useRootStore } from '@/stores/n8nRootStore';

export const usePostHog = defineStore('posthog', () => {
	const usersStore = useUsersStore();
	const rootStore = useRootStore();

	const telemetry: Ref<Telemetry | null> = ref(null);
	const featureFlags: Ref<Record<string, boolean | string>> = ref({});

	const onLogout = () => {
		window.posthog?.reset();
	};

	const reloadFeatureFlags = () => {
		try {
			console.log('reload');
			window.posthog?.reloadFeatureFlags();
		} catch (e) {}
	};

	const getVariant = (experiment: string): string | boolean | undefined => {
		return featureFlags.value[experiment];
	};

	const isVariantEnabled = (experiment: string, variant: string) => {
		return getVariant(experiment) === variant;
	};

	const identify = () => {
		try {
			const instanceId = rootStore.instanceId;
			const user = usersStore.currentUser;
			const traits: Record<string, string> = { instance_id: instanceId };
			if (user && user.createdAt instanceof Date) {
				traits.joined_at = user.createdAt.toISOString();
			} else if (user && typeof user.createdAt === 'string') {
				traits.joined_at = user.createdAt;
			}

			// For PostHog, main ID _cannot_ be `undefined` as done for RudderStack.
			let id = user ? `${instanceId}#${user.id}` : instanceId;
			const cachedId = localStorage.getItem('posthog-test-id');
			if (cachedId) {
				id = cachedId;
			}
			console.log('identify', id, traits);
			window.posthog?.identify(id, traits);
		} catch (e) {}
	};

	const init = (tracking: Telemetry) => {
		telemetry.value = tracking;
		identify();
		reloadFeatureFlags();

		window.posthog?.onFeatureFlags((flags: string[], map: Record<string, string | boolean>) => {
			featureFlags.value = map;
			console.log('resolved flags', JSON.stringify(map));
		});
	};

	window.addEventListener('beforeunload', (e) => {
		const variant = getVariant(ASSUMPTION_EXPERIMENT.name);
		if (typeof variant !== 'string') {
			return;
		}

		const isDemo = variant === ASSUMPTION_EXPERIMENT.demo;
		const isVideo = variant === ASSUMPTION_EXPERIMENT.video;

		console.log(`track ${variant}`);
		telemetry.value?.track('User is part of experiment', {
			name: 'edu_001',
			variant: isDemo ? 'demo' : isVideo ? 'video' : 'control',
		});
	});

	watch(
		() => usersStore.currentUserId,
		(userId, prevId) => {
			if (!userId && prevId) {
				onLogout();
			}
			identify();
			reloadFeatureFlags();
		},
	);

	return {
		init,
		isVariantEnabled,
		getVariant,
	};
});
