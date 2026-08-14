import { computed, nextTick, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAgentBuilderMainTabs } from './useAgentBuilderMainTabs';
import { EXECUTIONS_SECTION_KEY } from '../constants';

const route = { query: {} as Record<string, string | undefined> };
const replace = vi.fn(async (to: { query: Record<string, string | undefined> }) => {
	// Mirror the router: `replace` is what makes the query the source of truth,
	// so the composable's own watcher has to see the new value.
	route.query = to.query;
	await nextTick();
});

vi.mock('vue-router', () => ({
	useRoute: () => route,
	useRouter: () => ({ replace }),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({ baseText: (key: string) => `mocked-${key}` }),
}));

const evalsFlag = ref(false);
vi.mock('@/features/ai/evaluation.ee/composables/useAgentEvalsFlag', () => ({
	useAgentEvalsFlag: () => evalsFlag,
}));

const setup = () => useAgentBuilderMainTabs({ executionsCount: computed(() => 0) });

const tabValues = () => setup().mainTabOptions.value.map((tab) => tab.value);

describe('useAgentBuilderMainTabs', () => {
	beforeEach(() => {
		route.query = {};
		evalsFlag.value = false;
		replace.mockClear();
	});

	describe('flag gating', () => {
		it('omits the evals tab entirely when the flag is off', () => {
			expect(tabValues()).toEqual(['agent', 'knowledge', 'sessions', 'settings']);
		});

		it('appends the evals tab after settings when the flag is on', () => {
			evalsFlag.value = true;

			expect(tabValues()).toEqual(['agent', 'knowledge', 'sessions', 'settings', 'evals']);
		});

		it('reacts to the flag resolving after the first frame', async () => {
			const { mainTabOptions } = setup();
			expect(mainTabOptions.value.map((tab) => tab.value)).not.toContain('evals');

			// PostHog resolves asynchronously, so the tab row has to pick it up
			// rather than being computed once at setup.
			evalsFlag.value = true;
			await nextTick();

			expect(mainTabOptions.value.map((tab) => tab.value)).toContain('evals');
		});
	});

	describe('section query param', () => {
		it('round-trips evals through the query param like the sibling tabs', async () => {
			evalsFlag.value = true;
			const { activeMainTab } = setup();

			activeMainTab.value = 'evals';
			await nextTick();

			expect(replace).toHaveBeenCalledWith({ query: { section: 'evals' } });
			expect(activeMainTab.value).toBe('evals');
		});

		it('selects the evals tab from a deep link when the flag is on', () => {
			evalsFlag.value = true;
			route.query = { section: 'evals' };

			expect(setup().activeMainTab.value).toBe('evals');
		});

		it('falls back to the agent tab for an evals deep link while the flag is off', () => {
			route.query = { section: 'evals' };

			// Selecting a tab that is absent from the row would leave the row with
			// nothing highlighted, so an unreachable deep link collapses to default.
			expect(setup().activeMainTab.value).toBe('agent');
		});

		it('honours an evals deep link once a late-resolving flag turns on', async () => {
			route.query = { section: 'evals' };
			const { activeMainTab } = setup();
			expect(activeMainTab.value).toBe('agent');

			evalsFlag.value = true;
			await nextTick();

			expect(activeMainTab.value).toBe('evals');
		});

		it('leaves the sibling tabs unaffected by the flag', () => {
			route.query = { section: EXECUTIONS_SECTION_KEY };

			expect(setup().activeMainTab.value).toBe('sessions');
		});
	});
});
