import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { useBudgetCoverageCalloutDismissal } from '../useBudgetCoverageCalloutDismissal';

const STORAGE_KEY = 'N8N_AGENT_BUDGET_COVERAGE_CALLOUT_DISMISSED';

function mountDismissal() {
	let api!: ReturnType<typeof useBudgetCoverageCalloutDismissal>;
	const wrapper = mount(
		defineComponent({
			setup() {
				api = useBudgetCoverageCalloutDismissal();
				return () => null;
			},
		}),
	);
	return { wrapper, api };
}

describe('useBudgetCoverageCalloutDismissal', () => {
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

	it('starts dismissed for a fresh instance when storage already has it set', () => {
		sessionStorage.setItem(STORAGE_KEY, 'true');

		const { api } = mountDismissal();

		expect(api.dismissed.value).toBe(true);
	});
});
