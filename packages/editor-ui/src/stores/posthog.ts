import { watch, ref, Ref } from 'vue';
import { Telemetry } from '@/plugins/telemetry';
import { ASSUMPTION_EXPERIMENT } from '@/constants';
import { defineStore } from 'pinia';

export const usePostHog = defineStore('posthog', () => {
	const telemetry: Ref<Telemetry | null> = ref(null);
	const featureFlags: Ref<Record<string, boolean | string>> = ref({});

	const getVariant = (experiment: string): string | boolean | undefined => {
		return featureFlags.value[experiment];
	};

	const isVariantEnabled = (experiment: string, variant: string) => {
		return getVariant(experiment) === variant;
	};

	const init = (tracking: Telemetry) => {
		telemetry.value = tracking;

		window.posthog?.onFeatureFlags((flags: string[], map: Record<string, string | boolean>) => {
			featureFlags.value = map;
		});
	};

	const trackAssumptionExperiment = () => {
		const variant = getVariant(ASSUMPTION_EXPERIMENT.name);
		if (typeof variant !== 'string') {
			return;
		}

		const isDemo = variant === ASSUMPTION_EXPERIMENT.demo;
		const isVideo = variant === ASSUMPTION_EXPERIMENT.video;

		telemetry.value?.track('User is part of experiment', {
			name: 'edu_001',
			variant: isDemo ? 'demo' : isVideo ? 'video' : 'control',
		});
	};

	watch(
		() => featureFlags.value[ASSUMPTION_EXPERIMENT.name],
		(curr, prev) => {
			if (curr && !prev) {
				trackAssumptionExperiment();
			}
		},
	);

	return {
		init,
		isVariantEnabled,
		getVariant,
	};
});
