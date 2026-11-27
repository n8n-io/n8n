import { createPinia, setActivePinia } from 'pinia';

import { landOnCanvasOnce } from './landing';

const { store, markLandedOnCanvas } = vi.hoisted(() => {
	const markLandedOnCanvas = vi.fn();
	return { store: { shouldLandOnCanvas: false, markLandedOnCanvas }, markLandedOnCanvas };
});

vi.mock('./stores/buildManuallyByDefault.store', () => ({
	useBuildManuallyByDefaultStore: () => store,
}));

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({}),
	waitForFeatureFlagsWithTimeout: vi.fn(async () => {}),
}));

describe('landOnCanvasOnce', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it('lands on the canvas and records the landing', async () => {
		store.shouldLandOnCanvas = true;

		expect(await landOnCanvasOnce()).toBe(true);
		expect(markLandedOnCanvas).toHaveBeenCalledTimes(1);
	});

	it('keeps the landing and records nothing when the user must not land on the canvas', async () => {
		store.shouldLandOnCanvas = false;

		expect(await landOnCanvasOnce()).toBe(false);
		expect(markLandedOnCanvas).not.toHaveBeenCalled();
	});
});
