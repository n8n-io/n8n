import { configure } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { flushPromises } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import AgentTestReplyReview from '../components/AgentTestReplyReview.vue';
import { clearSavedTestCases } from '../composables/useSavedTestCases';

configure({ testIdAttribute: 'data-testid' });

const {
	fetchReplyChecksMock,
	trackJudgedMock,
	saveTestCaseMock,
	removeTestCaseMock,
	fetchSavedTestCasesMock,
} = vi.hoisted(() => ({
	fetchReplyChecksMock: vi.fn(),
	trackJudgedMock: vi.fn(),
	saveTestCaseMock: vi.fn(),
	removeTestCaseMock: vi.fn(),
	fetchSavedTestCasesMock: vi.fn(),
}));
vi.mock('../agentEvals.api', () => ({
	fetchReplyChecks: fetchReplyChecksMock,
	saveTestCase: saveTestCaseMock,
	removeTestCase: removeTestCaseMock,
	fetchSavedTestCases: fetchSavedTestCasesMock,
}));
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
		fetchReplyChecksMock.mockResolvedValue({ issues: [], askedBefore: 0 });
		fetchSavedTestCasesMock.mockReset();
		fetchSavedTestCasesMock.mockResolvedValue({ cases: [] });
		clearSavedTestCases();
		localStorage.clear();
		trackJudgedMock.mockReset();
		saveTestCaseMock.mockReset();
		saveTestCaseMock.mockResolvedValue({ datasetId: 'ds-1', rowId: 7, toolCalls: 2 });
		removeTestCaseMock.mockReset();
		removeTestCaseMock.mockResolvedValue(undefined);
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

	it('shows the live checks it is given, without computing checks for the reply', async () => {
		const { getAllByTestId } = await render({
			liveIssues: [{ checkId: 'tool:tool_failed', reason: 'lookup_order failed.' }],
		});

		expect(fetchReplyChecksMock).not.toHaveBeenCalled();
		expect(getAllByTestId('agent-test-reply-issue').map((el) => el.textContent?.trim())).toEqual([
			'lookup_order failed.',
		]);
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

	describe('after a reload', () => {
		it('shows a reply saved as right as saved, without the buttons', async () => {
			fetchSavedTestCasesMock.mockResolvedValue({
				cases: [
					{
						datasetId: 'ds-1',
						rowId: 7,
						executionId: 'exec-1',
						verdict: 'looks-right',
						toolCalls: 1,
					},
				],
			});

			const rendered = await render();

			expect(fetchSavedTestCasesMock).toHaveBeenCalledWith(
				expect.anything(),
				'project-1',
				'agent-1',
				'thread-1',
			);
			expect(rendered.getByTestId('agent-test-reply-judged')).toBeInTheDocument();
			expect(rendered.getByTestId('agent-test-reply-saved')).toHaveTextContent(
				'Saved as a test, with data from 1 tool call',
			);
			expect(rendered.queryByTestId('agent-test-reply-looks-right')).not.toBeInTheDocument();
		});

		it('shows a reply saved as not right with its note', async () => {
			fetchSavedTestCasesMock.mockResolvedValue({
				cases: [
					{
						datasetId: 'ds-1',
						rowId: 8,
						executionId: 'exec-1',
						verdict: 'not-right',
						note: 'Name the day',
						toolCalls: 0,
					},
				],
			});

			const rendered = await render();

			expect(rendered.getByTestId('agent-test-reply-judged')).toHaveTextContent('Name the day');
		});

		it('reads the saved cases of a chat once for all its replies', async () => {
			await render();
			await render({ executionId: 'exec-2' });

			expect(fetchSavedTestCasesMock).toHaveBeenCalledTimes(1);
		});
	});

	describe('a message the person keeps asking', () => {
		it('suggests saving it when earlier chats asked the same', async () => {
			fetchReplyChecksMock.mockResolvedValue({ issues: [], askedBefore: 2 });

			const rendered = await render();

			expect(rendered.getByTestId('agent-test-reply-asked-before')).toHaveTextContent(
				'You asked this in 2 earlier test chats',
			);
		});

		it('says nothing for a message asked for the first time', async () => {
			const rendered = await render();

			expect(rendered.queryByTestId('agent-test-reply-asked-before')).not.toBeInTheDocument();
		});

		it('hides the suggestion on "Not now" and keeps it hidden after a reload', async () => {
			fetchReplyChecksMock.mockResolvedValue({ issues: [], askedBefore: 1 });
			const rendered = await render();

			await userEvent.click(rendered.getByTestId('agent-test-reply-asked-before-dismiss'));
			expect(rendered.queryByTestId('agent-test-reply-asked-before')).not.toBeInTheDocument();

			rendered.unmount();
			const again = await render();
			expect(again.queryByTestId('agent-test-reply-asked-before')).not.toBeInTheDocument();
		});

		it('hides the suggestion once the reply has a verdict', async () => {
			fetchReplyChecksMock.mockResolvedValue({ issues: [], askedBefore: 1 });
			const rendered = await render();

			await userEvent.click(rendered.getByTestId('agent-test-reply-looks-right'));
			await flushPromises();

			expect(rendered.queryByTestId('agent-test-reply-asked-before')).not.toBeInTheDocument();
		});
	});

	describe('saving as a test', () => {
		it('saves "Looks right" as a test and names the tool data it kept', async () => {
			const rendered = await render();

			await userEvent.click(rendered.getByTestId('agent-test-reply-looks-right'));
			await flushPromises();

			expect(saveTestCaseMock).toHaveBeenCalledWith(expect.anything(), 'project-1', 'agent-1', {
				threadId: 'thread-1',
				executionId: 'exec-1',
				verdict: 'looks-right',
			});
			expect(rendered.getByTestId('agent-test-reply-saved')).toHaveTextContent(
				'Saved as a test, with data from 2 tool calls',
			);
			expect(rendered.queryByTestId('agent-test-reply-looks-right')).not.toBeInTheDocument();
		});

		it('saves "Not right" with its note', async () => {
			const rendered = await render();

			await userEvent.click(rendered.getByTestId('agent-test-reply-not-right'));
			await userEvent.type(rendered.getByTestId('agent-test-reply-note'), 'Name the day');
			await userEvent.click(rendered.getByTestId('agent-test-reply-save-note'));
			await flushPromises();

			expect(saveTestCaseMock).toHaveBeenCalledWith(expect.anything(), 'project-1', 'agent-1', {
				threadId: 'thread-1',
				executionId: 'exec-1',
				verdict: 'not-right',
				note: 'Name the day',
			});
		});

		it('removes the saved test on Undo and offers the choice again', async () => {
			const rendered = await render();
			await userEvent.click(rendered.getByTestId('agent-test-reply-looks-right'));
			await flushPromises();

			await userEvent.click(rendered.getByTestId('agent-test-reply-undo'));
			await flushPromises();

			expect(removeTestCaseMock).toHaveBeenCalledWith(
				expect.anything(),
				'project-1',
				'agent-1',
				'ds-1',
				7,
			);
			expect(rendered.getByTestId('agent-test-reply-looks-right')).toBeInTheDocument();
		});

		it('removes the saved test when the person changes the verdict', async () => {
			const rendered = await render();
			await userEvent.click(rendered.getByTestId('agent-test-reply-looks-right'));
			await flushPromises();

			await userEvent.click(rendered.getByTestId('agent-test-reply-change'));
			await flushPromises();

			expect(removeTestCaseMock).toHaveBeenCalledTimes(1);
		});

		it('keeps the verdict and says so when saving fails', async () => {
			saveTestCaseMock.mockRejectedValue(new Error('No access'));
			const rendered = await render();

			await userEvent.click(rendered.getByTestId('agent-test-reply-looks-right'));
			await flushPromises();

			expect(rendered.getByTestId('agent-test-reply-judged')).toBeInTheDocument();
			expect(rendered.getByTestId('agent-test-reply-save-error')).toHaveTextContent('No access');
			expect(rendered.queryByTestId('agent-test-reply-undo')).not.toBeInTheDocument();
		});
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
