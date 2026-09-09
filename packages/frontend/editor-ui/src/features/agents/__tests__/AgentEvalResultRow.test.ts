import { configure } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import {
	AGENT_EVAL_MAX_COMMENT_CHARS,
	AGENT_EVAL_MAX_CORRECTION_TEXT_CHARS,
} from '../agentEvals.types';
import type { AgentEvalResultRecord } from '../agentEvals.types';
import type { ReviewRowView } from '../utils/agent-eval-review';
import AgentEvalResultRow from '../components/AgentEvalResultRow.vue';

configure({ testIdAttribute: 'data-testid' });

const result = (overrides: Partial<AgentEvalResultRecord> = {}): AgentEvalResultRecord => ({
	id: 'c1',
	runId: 'run-1',
	sourceRowId: 'row-1',
	runIndex: 0,
	status: 'success',
	input: { input: 'Find me a hotel in Tokyo.' },
	output: { finalText: 'Here are three options in Shinjuku.' },
	toolCalls: null,
	metrics: null,
	runAt: '2026-01-01T00:00:00.000Z',
	completedAt: '2026-01-01T00:00:30.000Z',
	errorCode: null,
	errorDetails: null,
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:30.000Z',
	...overrides,
});

const editing = (overrides: Partial<Extract<ReviewRowView, { kind: 'editing' }>> = {}) =>
	({
		kind: 'editing',
		vote: 'down',
		comment: '',
		correction: '',
		showReason: true,
		showAnswerEditor: false,
		canSave: false,
		...overrides,
	}) as ReviewRowView;

const settled = (overrides: Partial<Extract<ReviewRowView, { kind: 'settled' }>> = {}) =>
	({
		kind: 'settled',
		vote: 'up',
		comment: null,
		correction: null,
		saving: false,
		...overrides,
	}) as ReviewRowView;

// The tool-call disclosure renders the chat component, which fetches sub-agent
// names; the row's own behaviour is what these tests are about.
vi.mock('../components/AgentEvalToolCalls.vue', () => ({
	default: { name: 'AgentEvalToolCalls', template: '<div data-testid="agent-eval-tool-calls" />' },
}));

const renderComponent = createComponentRenderer(AgentEvalResultRow, {
	pinia: createTestingPinia(),
});

const render = (view: ReviewRowView, resultOverrides: Partial<AgentEvalResultRecord> = {}) =>
	renderComponent({ props: { result: result(resultOverrides), view } });

describe('AgentEvalResultRow', () => {
	it('shows the request and the agent answer', () => {
		const { getByText } = render({ kind: 'unrated' });

		expect(getByText('Find me a hotel in Tokyo.')).toBeInTheDocument();
		expect(getByText('Here are three options in Shinjuku.')).toBeInTheDocument();
	});

	it('shows neither pill nor reason field on an unrated case', () => {
		const { queryByTestId } = render({ kind: 'unrated' });

		expect(queryByTestId('agent-eval-saved-pill')).not.toBeInTheDocument();
		expect(queryByTestId('agent-eval-unsaved-pill')).not.toBeInTheDocument();
		expect(queryByTestId('agent-eval-reason-input')).not.toBeInTheDocument();
	});

	it('falls back to a placeholder when the run recorded no answer', () => {
		const { getByText } = render({ kind: 'unrated' }, { output: { finalText: '' } });

		expect(getByText("The agent didn't return an answer.")).toBeInTheDocument();
	});

	// A case that hasn't finished has no answer *yet* — reporting one as missing
	// announces a failure that hasn't happened.
	it.each([['new'], ['running']])('says it is waiting, not empty, while %s', (status) => {
		const { getByText, queryByText } = render(
			{ kind: 'unrated' },
			{ status: status as 'new' | 'running', output: null },
		);

		expect(getByText('Waiting for the agent…')).toBeInTheDocument();
		expect(queryByText("The agent didn't return an answer.")).not.toBeInTheDocument();
	});

	it('still reports a genuinely empty answer on a settled case', () => {
		const { getByText } = render({ kind: 'unrated' }, { status: 'success', output: null });

		expect(getByText("The agent didn't return an answer.")).toBeInTheDocument();
	});

	describe('voting', () => {
		it('emits the vote when thumbs-down is pressed', async () => {
			const { getByTestId, emitted } = render({ kind: 'unrated' });

			await userEvent.click(getByTestId('agent-eval-vote-down'));

			expect(emitted().vote).toEqual([['down']]);
		});

		it('disables both votes while the case is still running', () => {
			const { getByTestId } = render({ kind: 'unrated' }, { status: 'running' });

			expect(getByTestId('agent-eval-vote-up')).toBeDisabled();
			expect(getByTestId('agent-eval-vote-down')).toBeDisabled();
		});

		it('keeps errored cases rateable — "it failed" is still a judgment', () => {
			const { getByTestId } = render({ kind: 'unrated' }, { status: 'error' });

			expect(getByTestId('agent-eval-vote-down')).toBeEnabled();
		});
	});

	describe('editing the answer', () => {
		// Exactly one edit affordance may render per state, or the emit is ambiguous.
		it.each([
			['unrated', { kind: 'unrated' } as ReviewRowView],
			['settled with an edit', settled({ vote: 'down', correction: 'better' })],
			['editing with the reason open', editing()],
		])('offers a single edit action when %s', async (_label, view) => {
			const { getAllByTestId, emitted } = render(view);
			const actions = getAllByTestId('agent-eval-edit-answer');

			expect(actions).toHaveLength(1);
			await userEvent.click(actions[0]);

			expect(emitted()['edit-answer']).toHaveLength(1);
		});
	});

	describe('the reason field', () => {
		it('is required before a thumbs-down can be saved', () => {
			const { getByTestId } = render(editing({ canSave: false }));

			expect(getByTestId('agent-eval-reason-save')).toBeDisabled();
		});

		it('allows saving once a reason has been given', () => {
			const { getByTestId } = render(editing({ comment: 'off-task', canSave: true }));

			expect(getByTestId('agent-eval-reason-save')).toBeEnabled();
		});

		// Friction on agreement is what causes rubber-stamping, so 👍 must never
		// present the field — in either state.
		it('is absent while editing a thumbs-up', () => {
			const { queryByTestId } = render(editing({ vote: 'up', showReason: false, canSave: true }));

			expect(queryByTestId('agent-eval-reason-input')).not.toBeInTheDocument();
		});

		it('is absent on a settled thumbs-up', () => {
			const { queryByTestId } = render(settled({ vote: 'up' }));

			expect(queryByTestId('agent-eval-reason-input')).not.toBeInTheDocument();
		});

		it('caps the reason at the length the service accepts', () => {
			const { getByTestId } = render(editing());

			expect(getByTestId('agent-eval-reason-input')).toHaveAttribute(
				'maxlength',
				String(AGENT_EVAL_MAX_COMMENT_CHARS),
			);
		});

		it('caps the edited answer at the length the service accepts', () => {
			const { getByTestId } = render(editing({ showAnswerEditor: true }));

			expect(getByTestId('agent-eval-answer-input')).toHaveAttribute(
				'maxlength',
				String(AGENT_EVAL_MAX_CORRECTION_TEXT_CHARS),
			);
		});

		it('emits save and cancel', async () => {
			const { getByTestId, emitted } = render(editing({ comment: 'off-task', canSave: true }));

			await userEvent.click(getByTestId('agent-eval-reason-save'));
			await userEvent.click(getByTestId('agent-eval-reason-cancel'));

			expect(emitted().save).toHaveLength(1);
			expect(emitted().cancel).toHaveLength(1);
		});
	});

	describe('a settled case carrying an edit', () => {
		const withEdit = settled({
			vote: 'down',
			comment: 'It answered off-task.',
			correction: 'Weather is not something I plan.',
		});

		it('labels the two answers and says the edit is kept as feedback', () => {
			const { getByText } = render(withEdit);

			expect(getByText('Agent answered')).toBeInTheDocument();
			expect(getByText('Your answer')).toBeInTheDocument();
			expect(getByText('Kept with your feedback on this case')).toBeInTheDocument();
		});

		// The edit must never be described as becoming the case's expected answer.
		it('never claims the edit becomes the expected answer', () => {
			const { queryByText } = render(withEdit);

			expect(queryByText(/expected answer/i)).not.toBeInTheDocument();
			expect(queryByText(/correct answer/i)).not.toBeInTheDocument();
		});

		it('shows the note strip with its own edit action', async () => {
			const { getByTestId, emitted } = render(withEdit);

			expect(getByTestId('agent-eval-note-strip')).toHaveTextContent('It answered off-task.');
			await userEvent.click(getByTestId('agent-eval-edit-note'));

			expect(emitted()['edit-note']).toHaveLength(1);
		});

		it('omits the edit blocks when there is no correction', () => {
			const { queryByText, queryByTestId } = render(settled({ vote: 'up' }));

			expect(queryByText('Agent answered')).not.toBeInTheDocument();
			expect(queryByText('Your answer')).not.toBeInTheDocument();
			expect(queryByTestId('agent-eval-correction')).not.toBeInTheDocument();
		});

		it('omits the note strip when there is no reason', () => {
			const { queryByTestId } = render(settled({ vote: 'up', comment: null }));

			expect(queryByTestId('agent-eval-note-strip')).not.toBeInTheDocument();
		});
	});

	describe('the status chip', () => {
		it('reports an errored run', () => {
			const { getByTestId } = render({ kind: 'unrated' }, { status: 'error' });

			expect(getByTestId('agent-eval-status-chip')).toHaveTextContent('Errored');
		});

		it('reports a cancelled run', () => {
			const { getByTestId } = render({ kind: 'unrated' }, { status: 'cancelled' });

			expect(getByTestId('agent-eval-status-chip')).toHaveTextContent('Cancelled');
		});

		// Queued and running are told apart so a waiting reviewer can see which case
		// is actually executing rather than sitting behind the concurrency cap.
		it.each([
			['new', 'Queued'],
			['running', 'Running'],
		])('reports a %s case as %s', (status, label) => {
			const { getByTestId } = render({ kind: 'unrated' }, { status: status as 'new' | 'running' });

			expect(getByTestId('agent-eval-status-chip')).toHaveTextContent(label);
		});

		it('is absent on a case that ran successfully', () => {
			const { queryByTestId } = render({ kind: 'unrated' }, { status: 'success' });

			expect(queryByTestId('agent-eval-status-chip')).not.toBeInTheDocument();
		});

		// There is no judge in this view: a thumbs-down is not a failed case.
		it('is absent on a thumbs-down, which is not an execution outcome', () => {
			const { queryByTestId } = render(settled({ vote: 'down', comment: 'wrong' }), {
				status: 'success',
			});

			expect(queryByTestId('agent-eval-status-chip')).not.toBeInTheDocument();
		});
	});

	describe('review state visibility', () => {
		it('marks an in-progress review unsaved', () => {
			const { getByTestId, queryByTestId } = render(editing());

			expect(getByTestId('agent-eval-unsaved-pill')).toBeInTheDocument();
			expect(queryByTestId('agent-eval-saved-pill')).not.toBeInTheDocument();
		});

		it('marks a persisted review saved', () => {
			const { getByTestId, queryByTestId } = render(settled());

			expect(getByTestId('agent-eval-saved-pill')).toBeInTheDocument();
			expect(queryByTestId('agent-eval-unsaved-pill')).not.toBeInTheDocument();
		});
	});
});
