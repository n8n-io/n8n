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

		// Wireframe: the tab stays hidden even with the flag on while eval cases are
		// surfaced in the preview instead.
		it('keeps the evals tab hidden when the flag is on', () => {
			evalsFlag.value = true;

			expect(tabValues()).toEqual(['agent', 'knowledge', 'sessions', 'settings']);
		});

		it('stays hidden when the flag resolves after the first frame', async () => {
			const { mainTabOptions } = setup();
			expect(mainTabOptions.value.map((tab) => tab.value)).not.toContain('evals');

			evalsFlag.value = true;
			await nextTick();

			expect(mainTabOptions.value.map((tab) => tab.value)).not.toContain('evals');
		});
	});

	describe('section query param', () => {
		it('falls back to the agent tab for an evals deep link while the tab is hidden', () => {
			evalsFlag.value = true;
			route.query = { section: 'evals' };

			expect(setup().activeMainTab.value).toBe('agent');
		});

		it('falls back to the agent tab for an evals deep link while the flag is off', () => {
			route.query = { section: 'evals' };

			// Selecting a tab that is absent from the row would leave the row with
			// nothing highlighted, so an unreachable deep link collapses to default.
			expect(setup().activeMainTab.value).toBe('agent');
		});

		it('keeps an evals deep link on the agent tab even once a late flag turns on', async () => {
			route.query = { section: 'evals' };
			const { activeMainTab } = setup();
			expect(activeMainTab.value).toBe('agent');

			evalsFlag.value = true;
			await nextTick();

			expect(activeMainTab.value).toBe('agent');
		});

		it('leaves the sibling tabs unaffected by the flag', () => {
			route.query = { section: EXECUTIONS_SECTION_KEY };

			expect(setup().activeMainTab.value).toBe('sessions');
		});
	});
});
