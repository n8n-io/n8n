import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { usePracticeRunBannerDismissal } from '../usePracticeRunBannerDismissal';

const STORAGE_KEY = 'N8N_AGENT_EVAL_PRACTICE_BANNER_DISMISSED';

function mountDismissal() {
	let api!: ReturnType<typeof usePracticeRunBannerDismissal>;
	const wrapper = mount(
		defineComponent({
			setup() {
				api = usePracticeRunBannerDismissal();
				return () => null;
			},
		}),
	);
	return { wrapper, api };
}

describe('usePracticeRunBannerDismissal', () => {
	beforeEach(() => {
		sessionStorage.removeItem(STORAGE_KEY);
	});

	it('reads as not dismissed by default', () => {
		const { api } = mountDismissal();

		expect(api.dismissed.value).toBe(false);
	});

	it('flips to dismissed, and persists it, once dismiss is called', () => {
		const { api } = mountDismissal();

		api.dismiss();

		expect(api.dismissed.value).toBe(true);
		expect(sessionStorage.getItem(STORAGE_KEY)).toBe('true');
	});

	// The whole point: one row's dismissal hides the banner on every other
	// row too, not just the one that was clicked.
	it('is shared across every instance, not scoped to the one that dismissed it', () => {
		const { api: rowOne } = mountDismissal();
		const { api: rowTwo } = mountDismissal();
		// Read before dismissing, so the computed is already live and must be
		// invalidated by the dismissal rather than first evaluated after it.
		expect(rowTwo.dismissed.value).toBe(false);

		rowOne.dismiss();

		expect(rowTwo.dismissed.value).toBe(true);
	});

	it('starts dismissed for a fresh instance when storage already has it set', () => {
		sessionStorage.setItem(STORAGE_KEY, 'true');

		const { api } = mountDismissal();

		expect(api.dismissed.value).toBe(true);
	});
});
