import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { reactive } from 'vue';
import {
	AGENT_BUILDER_EXPERIMENT_COHORT as COHORT,
	AGENT_BUILDER_CHAT_WIDTH_EXPERIMENT as WIDTH,
	AGENT_BUILDER_TEST_TOGGLE_EXPERIMENT as TOGGLE,
	EXPERIMENTS_TO_TRACK,
} from '@/app/constants/experiments';
import { useAgentBuilderExperimentStore } from './agentBuilder.store';

const flags = reactive<Record<string, string | boolean | undefined>>({});
const trackExposure = vi.fn();
vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: () => ({ getVariant: (key: string) => flags[key], trackExposure }),
}));

describe('Agent builder experiments', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		for (const key of Object.keys(flags)) delete flags[key];
		trackExposure.mockClear();
	});
	it.each([
		[COHORT.chatWidth, WIDTH.control, 'current', 'dock'],
		[COHORT.chatWidth, WIDTH.wide, 'wide', 'dock'],
		[COHORT.testToggle, TOGGLE.control, 'current', 'dock'],
		[COHORT.testToggle, TOGGLE.wide, 'wide', 'inline'],
		[COHORT.testToggle, TOGGLE.current, 'current', 'inline'],
	] as const)('maps %s / %s to its layout and exposure', (cohort, variant, chatWidth, testChat) => {
		flags[COHORT.name] = cohort;
		const key = cohort === COHORT.chatWidth ? WIDTH.name : TOGGLE.name;
		flags[key] = variant;
		const store = useAgentBuilderExperimentStore();
		expect(store.isEnabled).toBe(true);
		expect(store.layout).toEqual({ chatWidth, testChat });
		store.trackExposure();
		expect(trackExposure).toHaveBeenCalledExactlyOnceWith(key);
	});
	it.each([undefined, false, true, 'unknown', COHORT.outside])(
		'keeps %s outside both experiments',
		(cohort) => {
			flags[COHORT.name] = cohort;
			flags[WIDTH.name] = WIDTH.wide;
			flags[TOGGLE.name] = TOGGLE.wide;
			const store = useAgentBuilderExperimentStore();
			expect(store.isEnabled).toBe(false);
			expect(store.layout).toEqual({ chatWidth: 'current', testChat: 'dock' });
			store.trackExposure();
			expect(trackExposure).not.toHaveBeenCalled();
		},
	);
	it.each([COHORT.chatWidth, COHORT.testToggle])(
		'enrolls only the allocated experiment when both flags are set: %s',
		(cohort) => {
			flags[COHORT.name] = cohort;
			flags[WIDTH.name] = WIDTH.wide;
			flags[TOGGLE.name] = TOGGLE.current;
			const store = useAgentBuilderExperimentStore();
			expect(store.enrollment?.name).toBe(cohort === COHORT.chatWidth ? WIDTH.name : TOGGLE.name);
			flags[store.enrollment!.name] = false;
			expect(store.isEnabled).toBe(false);
			expect(store.layout).toEqual({ chatWidth: 'current', testChat: 'dock' });
		},
	);
	it.each([true, 'unknown', 'outside', undefined])(
		'rejects an invalid experiment variant: %s',
		(variant) => {
			flags[COHORT.name] = COHORT.testToggle;
			flags[TOGGLE.name] = variant;
			expect(useAgentBuilderExperimentStore().isEnabled).toBe(false);
		},
	);
	it('registers both experiments for centralized enrollment tracking', () => {
		expect(EXPERIMENTS_TO_TRACK).toContain(WIDTH.name);
		expect(EXPERIMENTS_TO_TRACK).toContain(TOGGLE.name);
	});
});
