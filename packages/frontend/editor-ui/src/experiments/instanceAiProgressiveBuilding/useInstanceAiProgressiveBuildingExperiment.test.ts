import { ref } from 'vue';

import {
	EXPERIMENTS_TO_TRACK,
	INSTANCE_AI_PROGRESSIVE_BUILDING_EXPERIMENT,
} from '@/app/constants/experiments';
import { useInstanceAiProgressiveBuildingExperiment } from './useInstanceAiProgressiveBuildingExperiment';

const variant = ref<string | boolean>();
vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({
		isVariantEnabled: (key: string, expected: string) =>
			key === INSTANCE_AI_PROGRESSIVE_BUILDING_EXPERIMENT.name && variant.value === expected,
	}),
}));

describe('progressive building enrollment', () => {
	it.each([undefined, false, 'control', 'unexpected'])('keeps default behavior for %s', (value) => {
		variant.value = value;
		expect(useInstanceAiProgressiveBuildingExperiment().isEnabled.value).toBe(false);
	});

	it('uses the treatment when flags arrive and updates when it is removed', () => {
		variant.value = undefined;
		const { isEnabled } = useInstanceAiProgressiveBuildingExperiment();
		expect(isEnabled.value).toBe(false);
		variant.value = 'variant';
		expect(isEnabled.value).toBe(true);
		variant.value = 'control';
		expect(isEnabled.value).toBe(false);
	});

	it('uses centralized enrollment tracking', () => {
		expect(EXPERIMENTS_TO_TRACK).toContain(INSTANCE_AI_PROGRESSIVE_BUILDING_EXPERIMENT.name);
	});
});
