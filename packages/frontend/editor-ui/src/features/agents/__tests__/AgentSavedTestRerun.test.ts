import { configure } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import AgentSavedTestRerun from '../components/AgentSavedTestRerun.vue';
import type { SavedTestRerun } from '../utils/agent-eval-saved-test';

configure({ testIdAttribute: 'data-test-id' });

const changed: SavedTestRerun = {
	kind: 'answer',
	outcome: 'fail',
	runs: 3,
	failedRuns: 3,
	toolChanges: [{ tool: 'send_email', saved: 1, now: 2 }],
	reasoning: 'The delivery date is different.',
	offScriptTools: [],
};

const renderComponent = createComponentRenderer(AgentSavedTestRerun);

const render = (rerun: SavedTestRerun, extra: Record<string, unknown> = {}) =>
	renderComponent({ pinia: createTestingPinia(), props: { rerun, ...extra } });

describe('AgentSavedTestRerun', () => {
	it('says a changed answer changed in every run, with the tool change and the reason', () => {
		const { getByTestId, getByText } = render(changed);

		expect(getByTestId('agent-saved-test-rerun-summary')).toHaveTextContent(
			'Changed in 3 of 3 runs',
		);
		expect(getByText('Calls send_email 2 times. The saved run called it 1 times.')).toBeVisible();
		expect(getByTestId('agent-saved-test-rerun-reasoning')).toHaveTextContent(
			'The delivery date is different.',
		);
	});

	it('offers both choices for a changed answer and reports which one was picked', async () => {
		const { getByTestId, emitted } = render(changed);

		await userEvent.click(getByTestId('agent-saved-test-accept'));
		await userEvent.click(getByTestId('agent-saved-test-keep'));

		expect(emitted('accept')).toHaveLength(1);
		expect(emitted('keep')).toHaveLength(1);
	});

	it('shows the kept line in place of the choices once the saved answer was kept', () => {
		const { getByTestId, queryByTestId } = render(changed, { kept: true });

		expect(getByTestId('agent-saved-test-kept')).toBeVisible();
		expect(queryByTestId('agent-saved-test-accept')).toBeNull();
	});

	it('offers no choice for a flaky test', () => {
		const { getByTestId, queryByTestId } = render({
			...changed,
			outcome: 'flaky',
			failedRuns: 1,
			runs: 2,
		});

		expect(getByTestId('agent-saved-test-rerun-summary')).toHaveTextContent(
			'Different in 1 of 2 runs. Not counted as a pass or a fail.',
		);
		expect(queryByTestId('agent-saved-test-accept')).toBeNull();
		expect(queryByTestId('agent-saved-test-keep')).toBeNull();
	});

	it("names the tools it had no data for when it couldn't check", () => {
		const { getByTestId, queryByTestId } = render({
			...changed,
			outcome: 'couldnt_check',
			toolChanges: [],
			reasoning: null,
			offScriptTools: ['search_faq'],
		});

		expect(getByTestId('agent-saved-test-rerun-summary')).toHaveTextContent(
			"Couldn't check: the agent asked search_faq for data this test didn't save.",
		);
		expect(queryByTestId('agent-saved-test-accept')).toBeNull();
	});

	it('offers to use the reply as the saved answer once a note test meets its note', () => {
		const { getByTestId, queryByTestId } = render({
			...changed,
			kind: 'note',
			outcome: 'pass',
			failedRuns: 0,
			runs: 1,
		});

		expect(getByTestId('agent-saved-test-rerun-summary')).toHaveTextContent('Meets your note now');
		expect(getByTestId('agent-saved-test-accept')).toHaveTextContent('Use as saved answer');
		expect(queryByTestId('agent-saved-test-keep')).toBeNull();
	});
});
