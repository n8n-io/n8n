import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { INSTANCE_AI_FREE_NUDGE_EXPERIMENT } from '@/app/constants/experiments';

const { track, useStorage, getVariant } = vi.hoisted(() => ({
	track: vi.fn(),
	useStorage: vi.fn(),
	getVariant: vi.fn(),
}));

// Mirrors useStorage's real Ref<string | null> so the isDismissed computed tracks writes.
const storageRef = ref<string | null>(null);
useStorage.mockReturnValue(storageRef);

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track }),
}));

vi.mock('@n8n/composables/useStorage', () => ({ useStorage }));

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ getVariant }),
}));

import { useInstanceAiFreeNudgeStore } from './instanceAiFreeNudge.store';

const featureFlagProperty = `$feature/${INSTANCE_AI_FREE_NUDGE_EXPERIMENT.name}`;

describe('instanceAiFreeNudge store', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		track.mockClear();
		getVariant.mockReset();
		useStorage.mockClear();
		storageRef.value = null;
	});

	it.each([
		{
			variant: INSTANCE_AI_FREE_NUDGE_EXPERIMENT.control,
			treatmentVariant: null,
			shouldShowNudge: false,
			shouldTrackExposure: true,
		},
		{
			variant: INSTANCE_AI_FREE_NUDGE_EXPERIMENT.variant1,
			treatmentVariant: INSTANCE_AI_FREE_NUDGE_EXPERIMENT.variant1,
			shouldShowNudge: true,
			shouldTrackExposure: true,
		},
		{
			variant: INSTANCE_AI_FREE_NUDGE_EXPERIMENT.variant2,
			treatmentVariant: INSTANCE_AI_FREE_NUDGE_EXPERIMENT.variant2,
			shouldShowNudge: true,
			shouldTrackExposure: true,
		},
		{
			variant: undefined,
			treatmentVariant: null,
			shouldShowNudge: false,
			shouldTrackExposure: false,
		},
	])(
		'derives display and exposure state for $variant',
		({ variant, treatmentVariant, shouldShowNudge, shouldTrackExposure }) => {
			getVariant.mockReturnValue(variant);
			const store = useInstanceAiFreeNudgeStore();

			expect(store.currentVariant).toBe(variant);
			expect(store.treatmentVariant).toBe(treatmentVariant);
			expect(store.shouldShowNudge).toBe(shouldShowNudge);
			expect(store.shouldTrackExposure).toBe(shouldTrackExposure);
			expect(useStorage).toHaveBeenCalledWith('N8N_INSTANCE_AI_FREE_NUDGE_DISMISSED');
		},
	);

	it.each([
		INSTANCE_AI_FREE_NUDGE_EXPERIMENT.control,
		INSTANCE_AI_FREE_NUDGE_EXPERIMENT.variant1,
		INSTANCE_AI_FREE_NUDGE_EXPERIMENT.variant2,
	])('tracks exposure for %s', (variant) => {
		getVariant.mockReturnValue(variant);
		const store = useInstanceAiFreeNudgeStore();

		store.trackExposure();

		expect(track).toHaveBeenCalledWith(TELEMETRY_EVENT.INSTANCE_AI.FREE_NUDGE_EXPOSED, {
			variant,
			[featureFlagProperty]: variant,
		});
	});

	it.each([
		INSTANCE_AI_FREE_NUDGE_EXPERIMENT.control,
		INSTANCE_AI_FREE_NUDGE_EXPERIMENT.variant1,
		INSTANCE_AI_FREE_NUDGE_EXPERIMENT.variant2,
	])('still exposes %s when a dismissal is stored', (variant) => {
		storageRef.value = 'true';
		getVariant.mockReturnValue(variant);
		const store = useInstanceAiFreeNudgeStore();

		expect(store.isDismissed).toBe(true);
		expect(store.shouldShowNudge).toBe(false);
		expect(store.shouldTrackExposure).toBe(true);

		store.trackExposure();

		expect(track).toHaveBeenCalledWith(TELEMETRY_EVENT.INSTANCE_AI.FREE_NUDGE_EXPOSED, {
			variant,
			[featureFlagProperty]: variant,
		});
	});

	it('does not expose a user outside the experiment', () => {
		getVariant.mockReturnValue(undefined);
		const store = useInstanceAiFreeNudgeStore();

		store.trackExposure();

		expect(track).not.toHaveBeenCalled();
	});

	it.each([INSTANCE_AI_FREE_NUDGE_EXPERIMENT.variant1, INSTANCE_AI_FREE_NUDGE_EXPERIMENT.variant2])(
		'persists and tracks dismissal for %s',
		(variant) => {
			getVariant.mockReturnValue(variant);
			const store = useInstanceAiFreeNudgeStore();

			expect(store.shouldShowNudge).toBe(true);

			store.dismiss();

			expect(storageRef.value).toBe('true');
			expect(store.isDismissed).toBe(true);
			expect(store.shouldShowNudge).toBe(false);
			expect(track).toHaveBeenCalledWith(TELEMETRY_EVENT.INSTANCE_AI.FREE_NUDGE_DISMISSED, {
				variant,
				[featureFlagProperty]: variant,
			});

			setActivePinia(createPinia());
			expect(useInstanceAiFreeNudgeStore().isDismissed).toBe(true);
		},
	);

	it.each([INSTANCE_AI_FREE_NUDGE_EXPERIMENT.control, undefined])(
		'does not dismiss %s',
		(variant) => {
			getVariant.mockReturnValue(variant);
			const store = useInstanceAiFreeNudgeStore();

			store.dismiss();

			expect(storageRef.value).toBeNull();
			expect(track).not.toHaveBeenCalled();
		},
	);
});
