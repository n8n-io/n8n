import { configure } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import AgentTestReplyReview from '../components/AgentTestReplyReview.vue';

configure({ testIdAttribute: 'data-testid' });

const { fetchReplyChecksMock, trackJudgedMock } = vi.hoisted(() => ({
	fetchReplyChecksMock: vi.fn(),
	trackJudgedMock: vi.fn(),
}));
vi.mock('../agentEvals.api', () => ({ fetchReplyChecks: fetchReplyChecksMock }));
vi.mock('../composables/useAgentTelemetry', () => ({
	useAgentTelemetry: () => ({ trackJudgedTestReply: trackJudgedMock }),
}));

const props = {
	projectId: 'project-1',
	agentId: 'agent-1',
	threadId: 'thread-1',
	executionId: 'exec-1',
};

const renderComponent = createComponentRenderer(AgentTestReplyReview, { props });

const render = async (overrides: Record<string, unknown> = {}) => {
	const rendered = renderComponent({ pinia: createTestingPinia(), props: overrides });
	await flushPromises();
	return rendered;
};

describe('AgentTestReplyReview', () => {
	beforeEach(() => {
		fetchReplyChecksMock.mockReset();
		fetchReplyChecksMock.mockResolvedValue({ issues: [] });
		trackJudgedMock.mockReset();
	});

	it('reads the checks of this reply', async () => {
		await render();

		expect(fetchReplyChecksMock).toHaveBeenCalledWith(
			expect.anything(),
			'project-1',
			'agent-1',
			'thread-1',
			'exec-1',
		);
	});

	it('shows nothing from the checks when they all pass', async () => {
		const { queryAllByTestId } = await render();

		expect(queryAllByTestId('agent-test-reply-issue')).toHaveLength(0);
	});

	it('shows one quiet line for each failed check', async () => {
		fetchReplyChecksMock.mockResolvedValue({
			issues: [{ checkId: 'tool:tool_failed', reason: 'The tool "lookup_order" failed: Timeout' }],
		});

		const { getAllByTestId } = await render();

		expect(getAllByTestId('agent-test-reply-issue').map((el) => el.textContent?.trim())).toEqual([
			'The tool "lookup_order" failed: Timeout',
		]);
	});

	it('records "Looks right" and lets the person change it', async () => {
		const rendered = await render();

		await userEvent.click(rendered.getByTestId('agent-test-reply-looks-right'));

		expect(rendered.getByTestId('agent-test-reply-judged')).toBeInTheDocument();
		expect(trackJudgedMock).toHaveBeenCalledWith({
			agentId: 'agent-1',
			executionId: 'exec-1',
			verdict: 'looks-right',
			noteLength: 0,
			hadCheckIssues: false,
		});

		await userEvent.click(rendered.getByTestId('agent-test-reply-change'));
		expect(rendered.getByTestId('agent-test-reply-looks-right')).toBeInTheDocument();
	});

	it('takes a note for "Not right" and sends only its length', async () => {
		fetchReplyChecksMock.mockResolvedValue({
			issues: [{ checkId: 'tool:empty_reply', reason: 'This turn ended with no reply.' }],
		});
		const rendered = await render();

		await userEvent.click(rendered.getByTestId('agent-test-reply-not-right'));
		expect(rendered.getByTestId('agent-test-reply-save-note')).toBeDisabled();

		await userEvent.type(rendered.getByTestId('agent-test-reply-note'), 'It promised a date');
		await userEvent.click(rendered.getByTestId('agent-test-reply-save-note'));

		expect(rendered.getByTestId('agent-test-reply-judged')).toHaveTextContent('It promised a date');
		expect(trackJudgedMock).toHaveBeenCalledWith({
			agentId: 'agent-1',
			executionId: 'exec-1',
			verdict: 'not-right',
			noteLength: 'It promised a date'.length,
			hadCheckIssues: true,
		});
	});

	it('brings the note into view when it opens, since the last reply sits at the bottom', async () => {
		const scrollIntoView = vi.fn();
		Element.prototype.scrollIntoView = scrollIntoView;
		const rendered = await render();

		await userEvent.click(rendered.getByTestId('agent-test-reply-not-right'));

		expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
	});

	it('records nothing when the person cancels the note', async () => {
		const rendered = await render();

		await userEvent.click(rendered.getByTestId('agent-test-reply-not-right'));
		await userEvent.click(rendered.getByTestId('agent-test-reply-cancel-note'));

		expect(rendered.getByTestId('agent-test-reply-looks-right')).toBeInTheDocument();
		expect(trackJudgedMock).not.toHaveBeenCalled();
	});

	it('keeps the buttons when the checks cannot be read', async () => {
		fetchReplyChecksMock.mockRejectedValue(new Error('Not found'));

		const rendered = await render();

		expect(rendered.queryAllByTestId('agent-test-reply-issue')).toHaveLength(0);
		expect(rendered.getByTestId('agent-test-reply-looks-right')).toBeInTheDocument();
	});
});
