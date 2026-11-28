import { createPinia, setActivePinia } from 'pinia';

import { landOnCanvasOnce } from './landing';

const { store, markLandedOnCanvas } = vi.hoisted(() => {
	const markLandedOnCanvas = vi.fn();
	return { store: { shouldLandOnCanvas: false, markLandedOnCanvas }, markLandedOnCanvas };
});

vi.mock('./stores/buildManuallyByDefault.store', () => ({
	useBuildManuallyByDefaultStore: () => store,
}));

const { waitForFeatureFlagsWithTimeout } = vi.hoisted(() => ({
	waitForFeatureFlagsWithTimeout: vi.fn(async () => {}),
}));

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({}),
	waitForFeatureFlagsWithTimeout,
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

	it('decides only after the feature flags load', async () => {
		let resolveFlags = () => {};
		waitForFeatureFlagsWithTimeout.mockReturnValueOnce(
			new Promise<void>((resolve) => {
				resolveFlags = resolve;
			}),
		);
		store.shouldLandOnCanvas = false;

		const landing = landOnCanvasOnce();
		// The arm arrives with the flags.
		store.shouldLandOnCanvas = true;
		resolveFlags();

		expect(await landing).toBe(true);
		expect(waitForFeatureFlagsWithTimeout).toHaveBeenCalledWith(expect.anything(), 2000);
	});
});
