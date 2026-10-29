import { configure } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { flushPromises } from '@vue/test-utils';
import type { AgentOnlineRubric } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import AgentOnlineRubricReview from '../components/AgentOnlineRubricReview.vue';

configure({ testIdAttribute: 'data-testid' });
const { updateMock } = vi.hoisted(() => ({ updateMock: vi.fn() }));
vi.mock('../agentEvals.api', () => ({ updateOnlineCheck: updateMock }));
const rubric: AgentOnlineRubric = {
	generatedAt: '2026-10-29T12:00:00Z',
	checks: [
		{
			id: 'tool:reply',
			kind: 'tool',
			question: 'Did every message get a reply?',
			reason: 'Execution health',
			source: { field: 'tools' },
		},
		{
			id: 'promise:1',
			kind: 'promise',
			question: 'Was the tone playful?',
			reason: 'Use the requested tone',
			appliesWhen: 'The agent replies',
			source: { field: 'instructions', quote: 'Keep it playful' },
		},
	],
};
const activity = [
	{
		caseId: 1,
		title: 'Recorded session',
		result: {
			id: 10,
			caseId: 1,
			checkedAt: '2026-10-29T13:00:00Z',
			rubric,
			configHash: 'hash',
			verdicts: [{ checkId: 'promise:1', status: 'fail' as const, reason: 'The reply was formal' }],
		},
	},
];
const renderComponent = createComponentRenderer(AgentOnlineRubricReview, {
	props: { projectId: 'project', agentId: 'agent', rubric, activity: [] },
});
beforeEach(() => {
	vi.resetAllMocks();
});
it('separates built-in and agent-specific rules without showing results before checks run', async () => {
	const { getByTestId, getByText, queryByRole } = renderComponent({ pinia: createTestingPinia() });
	expect(getByText('Always checked · 1')).toBeVisible();
	expect(getByText('For this agent · 1')).toBeVisible();
	expect(getByTestId('agent-online-rubric-rule')).toHaveTextContent('Not checked yet');
	expect(queryByRole('button', { name: /Recorded session/ })).not.toBeInTheDocument();
	expect(updateMock).not.toHaveBeenCalled();
});
it('opens the assessment behind a rule history dot', async () => {
	const { getByRole, emitted } = renderComponent({
		pinia: createTestingPinia(),
		props: { activity },
	});
	await userEvent.click(getByRole('button', { name: /Recorded session/ }));
	expect(emitted().assessment).toEqual([[activity[0]]]);
});
it('does not show prior verdicts for changed rule wording', async () => {
	const changed = {
		...rubric,
		checks: rubric.checks.map((check) =>
			check.kind === 'promise' ? { ...check, question: 'Was the tone friendly?' } : check,
		),
	};
	const { getByTestId, queryByRole } = renderComponent({
		pinia: createTestingPinia(),
		props: { activity, rubric: changed },
	});
	expect(getByTestId('agent-online-rubric-rule')).toHaveTextContent('Not checked yet');
	expect(queryByRole('button', { name: /Recorded session/ })).not.toBeInTheDocument();
});
it('saves edited check wording and keeps the source instruction visible', async () => {
	updateMock.mockResolvedValue({ ...rubric, updatedAt: '2026-10-29T14:00:00Z' });
	const { getByText, getByRole, getByLabelText, emitted } = renderComponent({
		pinia: createTestingPinia(),
	});
	await userEvent.click(getByText('Was the tone playful?'));
	await userEvent.click(getByRole('button', { name: 'Edit rule', exact: true }));
	await userEvent.clear(getByLabelText('Check question'));
	await userEvent.type(getByLabelText('Check question'), 'Was the tone friendly?');
	await userEvent.click(getByRole('button', { name: 'Save rule', exact: true }));
	await flushPromises();
	expect(updateMock).toHaveBeenCalledExactlyOnceWith(
		expect.anything(),
		'project',
		'agent',
		'promise:1',
		{
			question: 'Was the tone friendly?',
			reason: 'Use the requested tone',
			appliesWhen: 'The agent replies',
		},
	);
	expect(getByText('Keep it playful')).toBeVisible();
	expect(emitted().updated).toHaveLength(1);
});
