import { Experiment, IUser } from '@/Interface';
import { useUsersStore } from '@/stores/users';
import { useRootStore } from '@/stores/n8nRootStore';
import { watch, onMounted, ref, Ref } from 'vue';
import { Telemetry } from '@/plugins/telemetry';
import { EXPERIMENTS } from '@/constants';

export function usePostHog() {
	const usersStore = useUsersStore();
	const rootStore = useRootStore();
	const telemetry: Ref<Telemetry | null> = ref(null);

	const onLogout = () => {
		window.posthog?.reset();
	};

	const getVariant = (experiment: string): string | boolean | undefined => {
		return window.posthog?.getFeatureFlag(experiment);
	};

	const trackAssumptionExperiment = () => {
		const variant = getVariant(EXPERIMENTS.assumptions.name);
		const isDemo = variant === EXPERIMENTS.assumptions.variant.demo;
		const isVideo = variant === EXPERIMENTS.assumptions.variant.video;

		if (typeof variant === 'string') {
			telemetry.value?.track('User is part of experiment', {
				name: 'edu_001',
				variant: isDemo ? 'demo' : isVideo ? 'video' : 'control',
			});
		}
	};

	const isVariantEnabled = (experiment: string, variant: string) => {
		return getVariant(experiment) === variant;
	};

	const identify = (instanceId: string, user?: IUser | null, versionCli?: string) => {
		const traits: Record<string, string> = { instance_id: instanceId };
		if (versionCli) {
			traits.version_cli = versionCli;
		}
		if (user && user.createdAt instanceof Date) {
			traits.joined_at = user.createdAt.toISOString();
		} else if (user && typeof user.createdAt === 'string') {
			traits.joined_at = user.createdAt;
		}

		const id = user ? `${instanceId}#${user.id}` : instanceId;
		window.posthog?.identify(id, traits);

		setTimeout(() => {
			window.posthog?.reloadFeatureFlags();
			trackAssumptionExperiment();
		}, 0);
	};

	const init = (tracking: Telemetry) => {
		telemetry.value = tracking;
		identify(rootStore.instanceId, usersStore.currentUser, rootStore.versionCli);
	};

	watch(
		() => usersStore.currentUserId,
		(userId, prevId) => {
			if (!userId && prevId) {
				onLogout();
			}
			identify(rootStore.instanceId, usersStore.currentUser, rootStore.versionCli);
		},
	);

	return {
		init,
		isVariantEnabled,
	};
}
