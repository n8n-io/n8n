import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { ref } from 'vue';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import { useAgentEvalsStore } from '@/features/agents/agentEvals.store';
import InstanceAiTestAgentPreviewPanel from '../components/InstanceAiTestAgentPreviewPanel.vue';

const target = { agentId: 'agent-1', projectId: 'project-1' };

const renderComponent = createComponentRenderer(InstanceAiTestAgentPreviewPanel, {
	props: { target },
});

describe('InstanceAiTestAgentPreviewPanel', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	it('generates and runs a single case, then shows its input and output', async () => {
		const store = useAgentEvalsStore();
		vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
			datasetId: 'dataset-1',
			dataTableId: 'table-1',
			cases: [
				{ input: 'Summarize the thread', whatToCheck: 'mentions the outage', scenario: 'Vague' },
			],
		});
		vi.spyOn(store, 'startRun').mockResolvedValue({
			id: 'run-1',
			datasetId: 'dataset-1',
			agentVersionId: null,
			status: 'new',
			runAt: null,
			completedAt: null,
			metrics: null,
			errorCode: null,
			errorDetails: null,
			createdById: null,
			createdAt: '',
			updatedAt: '',
		});
		vi.spyOn(store, 'openRun').mockImplementation(async () => {});
		vi.spyOn(store, 'isRunInFlight').mockReturnValue(false);
		vi.spyOn(store, 'startPollingRun').mockImplementation(() => {});
		vi.spyOn(store, 'getReview').mockReturnValue({
			run: { status: 'completed' } as never,
			results: [
				{
					id: 'result-1',
					runId: 'run-1',
					sourceRowId: '1',
					runIndex: 0,
					status: 'success',
					input: { input: 'Summarize the thread' },
					output: { finalText: 'Ticket #48219 is a P1 SSO outage.' },
					toolCalls: null,
					metrics: null,
					runAt: '',
					completedAt: '',
					errorCode: null,
					errorDetails: null,
					createdAt: '',
					updatedAt: '',
				},
			],
			resultsCount: 1,
			ratingsByResultId: {},
			pendingByResultId: {},
			draftsByResultId: {},
			counts: null,
			loading: false,
			loadingMore: false,
		});

		const { getByTestId, findByText } = renderComponent();

		expect(getByTestId('instance-ai-test-agent-preview-generating')).toBeInTheDocument();
		expect(await findByText('Summarize the thread')).toBeInTheDocument();
		expect(await findByText('Ticket #48219 is a P1 SSO outage.')).toBeInTheDocument();
		expect(store.generateDraftCases).toHaveBeenCalledWith('project-1', 'agent-1', { count: 1 });
		expect(store.startRun).toHaveBeenCalledWith('project-1', 'agent-1', 'dataset-1');
	});

	it("shows the builder's own test result directly, without generating or running a case", async () => {
		const store = useAgentEvalsStore();
		const generateDraftCases = vi.spyOn(store, 'generateDraftCases');
		const startRun = vi.spyOn(store, 'startRun');

		const { getByTestId, findByText } = createComponentRenderer(InstanceAiTestAgentPreviewPanel, {
			props: {
				target,
				initialCase: {
					message: 'Summarize the thread about the outage',
					response: 'Ticket #48219 is a P1 SSO outage.',
				},
			},
		})();

		expect(await findByText('Summarize the thread about the outage')).toBeInTheDocument();
		expect(await findByText('Ticket #48219 is a P1 SSO outage.')).toBeInTheDocument();
		expect(getByTestId('instance-ai-test-agent-preview-looks-good')).toBeEnabled();
		expect(generateDraftCases).not.toHaveBeenCalled();
		expect(startRun).not.toHaveBeenCalled();
	});

	it('renders the answer as formatted markdown', async () => {
		const store = useAgentEvalsStore();
		vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
			datasetId: 'dataset-1',
			dataTableId: 'table-1',
			cases: [{ input: 'x', whatToCheck: 'y', scenario: 'Vague' }],
		});
		vi.spyOn(store, 'startRun').mockResolvedValue({ id: 'run-1' } as never);
		vi.spyOn(store, 'openRun').mockImplementation(async () => {});
		vi.spyOn(store, 'getReview').mockReturnValue({
			run: { status: 'completed' } as never,
			results: [
				{
					status: 'success',
					input: { input: 'x' },
					output: { finalText: 'A **bold** claim and a [link](https://example.com).' },
				} as never,
			],
			resultsCount: 1,
			ratingsByResultId: {},
			pendingByResultId: {},
			draftsByResultId: {},
			counts: null,
			loading: false,
			loadingMore: false,
		});

		const { container, findByText } = renderComponent();

		expect(await findByText('bold')).toBeInTheDocument();
		expect(container.querySelector('strong')).toHaveTextContent('bold');
		expect(container.querySelector('a[href="https://example.com"]')).toBeInTheDocument();
	});

	it('renders the answer inside a fixed-height scrollable container regardless of length', async () => {
		const store = useAgentEvalsStore();
		vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
			datasetId: 'dataset-1',
			dataTableId: 'table-1',
			cases: [{ input: 'x', whatToCheck: 'y', scenario: 'Vague' }],
		});
		vi.spyOn(store, 'startRun').mockResolvedValue({ id: 'run-1' } as never);
		vi.spyOn(store, 'openRun').mockImplementation(async () => {});
		vi.spyOn(store, 'getReview').mockReturnValue({
			run: { status: 'completed' } as never,
			results: [
				{
					status: 'success',
					input: { input: 'x' },
					output: { finalText: 'a very long answer that would otherwise grow the card' },
				} as never,
			],
			resultsCount: 1,
			ratingsByResultId: {},
			pendingByResultId: {},
			draftsByResultId: {},
			counts: null,
			loading: false,
			loadingMore: false,
		});

		const { findByText, container } = renderComponent();

		await findByText(/very long answer/);
		expect(container.querySelector('[class*="content"]')).toBeInTheDocument();
	});

	it('shows the sample-input prompt instead of dismissing when "Needs work" is clicked', async () => {
		const store = useAgentEvalsStore();
		vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
			datasetId: 'dataset-1',
			dataTableId: 'table-1',
			cases: [{ input: 'x', whatToCheck: 'y', scenario: 'Vague' }],
		});
		vi.spyOn(store, 'startRun').mockResolvedValue({ id: 'run-1' } as never);
		vi.spyOn(store, 'openRun').mockImplementation(async () => {});
		vi.spyOn(store, 'isRunInFlight').mockReturnValue(false);
		vi.spyOn(store, 'getReview').mockReturnValue({
			run: { status: 'completed' } as never,
			results: [{ status: 'success', input: { input: 'x' }, output: { finalText: 'y' } } as never],
			resultsCount: 1,
			ratingsByResultId: {},
			pendingByResultId: {},
			draftsByResultId: {},
			counts: null,
			loading: false,
			loadingMore: false,
		});

		const user = userEvent.setup();
		const { getByTestId, findByTestId, emitted } = renderComponent();
		await waitFor(() =>
			expect(getByTestId('instance-ai-test-agent-preview-needs-work')).toBeEnabled(),
		);

		await user.click(getByTestId('instance-ai-test-agent-preview-needs-work'));

		expect(await findByTestId('instance-ai-test-agent-preview-sample-input')).toBeInTheDocument();
		expect(emitted().dismiss).toBeUndefined();
	});

	it('emits dismiss when "Don\'t create evals" is clicked', async () => {
		const store = useAgentEvalsStore();
		vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
			datasetId: 'dataset-1',
			dataTableId: 'table-1',
			cases: [{ input: 'x', whatToCheck: 'y', scenario: 'Vague' }],
		});
		vi.spyOn(store, 'startRun').mockResolvedValue({ id: 'run-1' } as never);
		vi.spyOn(store, 'openRun').mockImplementation(async () => {});
		vi.spyOn(store, 'isRunInFlight').mockReturnValue(false);
		vi.spyOn(store, 'getReview').mockReturnValue({
			run: { status: 'completed' } as never,
			results: [{ status: 'success', input: { input: 'x' }, output: { finalText: 'y' } } as never],
			resultsCount: 1,
			ratingsByResultId: {},
			pendingByResultId: {},
			draftsByResultId: {},
			counts: null,
			loading: false,
			loadingMore: false,
		});

		const user = userEvent.setup();
		const { findByTestId, emitted } = renderComponent();
		await user.click(await findByTestId('instance-ai-test-agent-preview-needs-work'));
		await user.click(await findByTestId('instance-ai-test-agent-preview-dont-create-evals'));

		expect(emitted().dismiss).toEqual([[]]);
	});

	it('submits a suggestion, regenerates the case with it, and shows the new answer', async () => {
		const store = useAgentEvalsStore();
		const generateDraftCases = vi
			.spyOn(store, 'generateDraftCases')
			.mockResolvedValueOnce({
				datasetId: 'dataset-1',
				dataTableId: 'table-1',
				cases: [{ input: 'x', whatToCheck: 'y', scenario: 'Vague' }],
			})
			.mockResolvedValueOnce({
				datasetId: 'dataset-2',
				dataTableId: 'table-2',
				cases: [
					{
						input: 'What is the refund policy?',
						whatToCheck: 'mentions 30 days',
						scenario: 'Vague',
					},
				],
			});
		vi.spyOn(store, 'startRun')
			.mockResolvedValueOnce({ id: 'run-1' } as never)
			.mockResolvedValueOnce({ id: 'run-2' } as never);
		vi.spyOn(store, 'openRun').mockImplementation(async () => {});
		vi.spyOn(store, 'isRunInFlight').mockReturnValue(false);
		// Keyed on `runId`, not call order: the preview's computeds re-read
		// `getReview` on every render, so a call-order mock would exhaust its
		// first-run value before the "Needs work" suggestion is even captured.
		vi.spyOn(store, 'getReview').mockImplementation((runId) =>
			runId === 'run-2'
				? {
						run: { status: 'completed' } as never,
						results: [
							{
								status: 'success',
								input: { input: 'What is the refund policy?' },
								output: { finalText: 'Yes, within 30 days.' },
							} as never,
						],
						resultsCount: 1,
						ratingsByResultId: {},
						pendingByResultId: {},
						draftsByResultId: {},
						counts: null,
						loading: false,
						loadingMore: false,
					}
				: {
						run: { status: 'completed' } as never,
						results: [
							{ status: 'success', input: { input: 'x' }, output: { finalText: 'y' } } as never,
						],
						resultsCount: 1,
						ratingsByResultId: {},
						pendingByResultId: {},
						draftsByResultId: {},
						counts: null,
						loading: false,
						loadingMore: false,
					},
		);

		const user = userEvent.setup();
		const { findByTestId, findByText } = renderComponent();
		await user.click(await findByTestId('instance-ai-test-agent-preview-needs-work'));

		const input = await findByTestId('instance-ai-test-agent-preview-sample-input');
		await user.type(input, 'Can I get my money back?');
		await user.click(await findByTestId('instance-ai-test-agent-preview-submit-sample'));

		expect(await findByText('Yes, within 30 days.')).toBeInTheDocument();
		expect(generateDraftCases).toHaveBeenNthCalledWith(2, 'project-1', 'agent-1', {
			count: 1,
			suggestion: 'Can I get my money back?',
			previousInput: 'x',
			previousOutput: 'y',
		});
	});

	it('generates a batch of examples and shows the examples panel on "Looks good"', async () => {
		const store = useAgentEvalsStore();
		vi.spyOn(store, 'generateDraftCases')
			.mockResolvedValueOnce({
				datasetId: 'dataset-1',
				dataTableId: 'table-1',
				cases: [{ input: 'x', whatToCheck: 'y', scenario: 'Upset' }],
			})
			.mockResolvedValueOnce({
				datasetId: 'dataset-2',
				dataTableId: 'table-2',
				cases: [
					{ input: 'a', whatToCheck: 'b', scenario: 'Vague' },
					{ input: 'c', whatToCheck: 'd', scenario: 'Sensitive data' },
				],
			});
		vi.spyOn(store, 'getDatasets').mockReturnValue([
			{
				id: 'dataset-2',
				name: 'Draft cases',
				description: null,
				agentId: 'agent-1',
				columnMapping: { input: 'input', criteria: 'criteria' },
				createdById: null,
				createdAt: '',
				updatedAt: '',
				datasetSource: 'data_table',
				datasetRef: { dataTableId: 'table-2' },
			},
		]);
		const deleteCase = vi.spyOn(store, 'deleteCase').mockResolvedValue(true);
		vi.spyOn(store, 'fetchCases').mockResolvedValue([
			{ rowId: 1, input: 'a', whatToCheck: 'b' },
			{ rowId: 2, input: 'c', whatToCheck: 'd' },
		]);
		const startRun = vi
			.spyOn(store, 'startRun')
			.mockResolvedValueOnce({ id: 'preview-run' } as never)
			.mockResolvedValueOnce({ id: 'suite-run' } as never);
		vi.spyOn(store, 'openRun').mockImplementation(async () => {});
		vi.spyOn(store, 'isRunInFlight').mockReturnValue(false);
		vi.spyOn(store, 'getReview').mockImplementation((runId) => {
			if (runId === 'suite-run') {
				return {
					run: { status: 'completed' } as never,
					results: [
						{
							sourceRowId: '1',
							status: 'success',
							input: { input: 'a' },
							output: { finalText: 'b answer' },
						} as never,
						{
							sourceRowId: '2',
							status: 'success',
							input: { input: 'c' },
							output: { finalText: 'd answer' },
						} as never,
					],
					resultsCount: 2,
					ratingsByResultId: {},
					pendingByResultId: {},
					draftsByResultId: {},
					counts: null,
					loading: false,
					loadingMore: false,
				};
			}
			return {
				run: { status: 'completed' } as never,
				results: [
					{ status: 'success', input: { input: 'x' }, output: { finalText: 'y' } } as never,
				],
				resultsCount: 1,
				ratingsByResultId: {},
				pendingByResultId: {},
				draftsByResultId: {},
				counts: null,
				loading: false,
				loadingMore: false,
			};
		});

		const user = userEvent.setup();
		const {
			getByTestId,
			emitted,
			findByTestId,
			findAllByTestId,
			getByText,
			queryByTestId,
			findByText,
		} = renderComponent();
		await waitFor(() =>
			expect(getByTestId('instance-ai-test-agent-preview-looks-good')).toBeEnabled(),
		);

		await user.click(getByTestId('instance-ai-test-agent-preview-looks-good'));

		expect(emitted().confirm).toEqual([[]]);
		expect(await findByTestId('instance-ai-test-agent-examples-check-agent')).toBeInTheDocument();
		expect(store.generateDraftCases).toHaveBeenNthCalledWith(2, 'project-1', 'agent-1', {
			count: 10,
			exampleInput: 'x',
			exampleOutput: 'y',
		});

		// Default slider value is 2, so only 2 of the generated examples show.
		const examples = await findAllByTestId('instance-ai-test-agent-examples-example');
		expect(examples).toHaveLength(2);
		expect(within(examples[0]).getByText('a')).toBeInTheDocument();
		expect(within(examples[1]).getByText('c')).toBeInTheDocument();
		// Each row labels itself with its own generated scenario tag.
		expect(getByText('Upset')).toBeInTheDocument();
		expect(within(examples[0]).getByText('Vague')).toBeInTheDocument();
		expect(within(examples[1]).getByText('Sensitive data')).toBeInTheDocument();

		await user.click(getByTestId('instance-ai-test-agent-examples-check-agent'));

		expect(startRun).toHaveBeenCalledWith('project-1', 'agent-1', 'dataset-2');
		// The default cap (2) matches the generated batch size, so nothing to trim.
		expect(deleteCase).not.toHaveBeenCalled();

		// Settles immediately (the mocked run is already "completed") — collapses
		// straight to the summary pill instead of the per-case list.
		expect(await findByText('2 of 2 went well, 0 need work')).toBeInTheDocument();
		expect(getByText('Saved 2 checks')).toBeInTheDocument();
		expect(queryByTestId('instance-ai-test-agent-examples-case-1')).not.toBeInTheDocument();

		await user.click(getByTestId('instance-ai-test-agent-examples-summary-toggle'));

		expect(await findByTestId('instance-ai-test-agent-examples-case-1')).toBeInTheDocument();
		await user.click(getByTestId('instance-ai-test-agent-examples-case-1-toggle'));
		await user.click(getByTestId('instance-ai-test-agent-examples-case-2-toggle'));
		expect(getByText('b answer')).toBeInTheDocument();
		expect(getByText('d answer')).toBeInTheDocument();
	});

	it('deletes the generated cases beyond the slider cap before running', async () => {
		const store = useAgentEvalsStore();
		vi.spyOn(store, 'generateDraftCases')
			.mockResolvedValueOnce({
				datasetId: 'dataset-1',
				dataTableId: 'table-1',
				cases: [{ input: 'x', whatToCheck: 'y', scenario: 'Vague' }],
			})
			.mockResolvedValueOnce({
				datasetId: 'dataset-2',
				dataTableId: 'table-2',
				cases: Array.from({ length: 10 }, (_, i) => ({
					input: `case-${i}`,
					whatToCheck: 'check',
					scenario: 'Vague',
				})),
			});
		vi.spyOn(store, 'getDatasets').mockReturnValue([
			{
				id: 'dataset-2',
				name: 'Draft cases',
				description: null,
				agentId: 'agent-1',
				columnMapping: { input: 'input', criteria: 'criteria' },
				createdById: null,
				createdAt: '',
				updatedAt: '',
				datasetSource: 'data_table',
				datasetRef: { dataTableId: 'table-2' },
			},
		]);
		const deleteCase = vi.spyOn(store, 'deleteCase').mockResolvedValue(true);
		vi.spyOn(store, 'fetchCases').mockResolvedValue(
			Array.from({ length: 10 }, (_, i) => ({
				rowId: i + 1,
				input: `case-${i}`,
				whatToCheck: 'check',
			})),
		);
		const startRun = vi
			.spyOn(store, 'startRun')
			.mockResolvedValueOnce({ id: 'preview-run' } as never)
			.mockResolvedValueOnce({ id: 'suite-run' } as never);
		vi.spyOn(store, 'openRun').mockImplementation(async () => {});
		vi.spyOn(store, 'isRunInFlight').mockReturnValue(false);
		vi.spyOn(store, 'getReview').mockImplementation((runId) => {
			if (runId === 'suite-run') {
				return {
					run: { status: 'running' } as never,
					results: [],
					resultsCount: 0,
					ratingsByResultId: {},
					pendingByResultId: {},
					draftsByResultId: {},
					counts: null,
					loading: false,
					loadingMore: false,
				};
			}
			return {
				run: { status: 'completed' } as never,
				results: [
					{ status: 'success', input: { input: 'x' }, output: { finalText: 'y' } } as never,
				],
				resultsCount: 1,
				ratingsByResultId: {},
				pendingByResultId: {},
				draftsByResultId: {},
				counts: null,
				loading: false,
				loadingMore: false,
			};
		});

		const user = userEvent.setup();
		const { getByTestId, findByTestId, queryByTestId } = renderComponent();
		await waitFor(() =>
			expect(getByTestId('instance-ai-test-agent-preview-looks-good')).toBeEnabled(),
		);
		await user.click(getByTestId('instance-ai-test-agent-preview-looks-good'));
		await findByTestId('instance-ai-test-agent-examples-check-agent');

		await user.click(getByTestId('instance-ai-test-agent-examples-check-agent'));

		// Default slider value (2) caps the generated batch of 10 — rows 3..10 are trimmed.
		await waitFor(() => expect(deleteCase).toHaveBeenCalledTimes(8));
		expect(deleteCase.mock.calls.map(([, , rowId]) => rowId).sort((a, b) => a - b)).toEqual([
			3, 4, 5, 6, 7, 8, 9, 10,
		]);
		expect(startRun).toHaveBeenCalledWith('project-1', 'agent-1', 'dataset-2');

		// Only the two kept rows show, both waiting since the run hasn't settled yet.
		expect(await findByTestId('instance-ai-test-agent-examples-case-1')).toBeInTheDocument();
		expect(await findByTestId('instance-ai-test-agent-examples-case-2')).toBeInTheDocument();
		expect(queryByTestId('instance-ai-test-agent-examples-case-3')).not.toBeInTheDocument();
	});

	it('hides the confirmed try, shows how many are left, and stops the run on request', async () => {
		const store = useAgentEvalsStore();
		vi.spyOn(store, 'generateDraftCases')
			.mockResolvedValueOnce({
				datasetId: 'dataset-1',
				dataTableId: 'table-1',
				cases: [{ input: 'x', whatToCheck: 'y', scenario: 'Vague' }],
			})
			.mockResolvedValueOnce({
				datasetId: 'dataset-2',
				dataTableId: 'table-2',
				cases: [
					{ input: 'a', whatToCheck: 'b', scenario: 'Vague' },
					{ input: 'c', whatToCheck: 'd', scenario: 'Sensitive data' },
				],
			});
		vi.spyOn(store, 'getDatasets').mockReturnValue([
			{
				id: 'dataset-2',
				name: 'Draft cases',
				description: null,
				agentId: 'agent-1',
				columnMapping: { input: 'input', criteria: 'criteria' },
				createdById: null,
				createdAt: '',
				updatedAt: '',
				datasetSource: 'data_table',
				datasetRef: { dataTableId: 'table-2' },
			},
		]);
		vi.spyOn(store, 'deleteCase').mockResolvedValue(true);
		vi.spyOn(store, 'fetchCases').mockResolvedValue([
			{ rowId: 1, input: 'a', whatToCheck: 'b' },
			{ rowId: 2, input: 'c', whatToCheck: 'd' },
		]);
		vi.spyOn(store, 'startRun')
			.mockResolvedValueOnce({ id: 'preview-run' } as never)
			.mockResolvedValueOnce({ id: 'suite-run' } as never);
		vi.spyOn(store, 'openRun').mockImplementation(async () => {});
		vi.spyOn(store, 'isRunInFlight').mockReturnValue(true);
		vi.spyOn(store, 'startPollingRun').mockImplementation(() => {});
		const cancelRun = vi.spyOn(store, 'cancelRun').mockResolvedValue({ id: 'suite-run' } as never);
		vi.spyOn(store, 'getReview').mockImplementation((runId) => {
			if (runId === 'suite-run') {
				return {
					run: { status: 'running' } as never,
					results: [
						{
							sourceRowId: '1',
							status: 'success',
							input: {},
							output: { finalText: 'ok' },
						} as never,
					],
					resultsCount: 1,
					ratingsByResultId: {},
					pendingByResultId: {},
					draftsByResultId: {},
					counts: null,
					loading: false,
					loadingMore: false,
				};
			}
			return {
				run: { status: 'completed' } as never,
				results: [
					{ status: 'success', input: { input: 'x' }, output: { finalText: 'y' } } as never,
				],
				resultsCount: 1,
				ratingsByResultId: {},
				pendingByResultId: {},
				draftsByResultId: {},
				counts: null,
				loading: false,
				loadingMore: false,
			};
		});

		const user = userEvent.setup();
		const { getByTestId, findByTestId, queryByTestId, findByText } = renderComponent();
		await waitFor(() =>
			expect(getByTestId('instance-ai-test-agent-preview-looks-good')).toBeEnabled(),
		);
		await user.click(getByTestId('instance-ai-test-agent-preview-looks-good'));
		await findByTestId('instance-ai-test-agent-examples-check-agent');
		await user.click(getByTestId('instance-ai-test-agent-examples-check-agent'));

		// One of the two cases has settled — one is still left.
		expect(await findByText('Checking, 1 left')).toBeInTheDocument();
		expect(queryByTestId('instance-ai-test-agent-examples-try')).not.toBeInTheDocument();
		expect(queryByTestId('instance-ai-test-agent-examples-view-evals')).not.toBeInTheDocument();

		await user.click(getByTestId('instance-ai-test-agent-examples-stop'));

		expect(cancelRun).toHaveBeenCalledWith('project-1', 'agent-1', 'dataset-2', 'suite-run');
	});

	it('dismisses with a toast when generation fails', async () => {
		const store = useAgentEvalsStore();
		vi.spyOn(store, 'generateDraftCases').mockRejectedValue(new Error('boom'));

		const { emitted } = renderComponent();

		await waitFor(() => expect(emitted().dismiss).toEqual([[]]));
	});

	it('dismisses when the preview run loses track of settling', async () => {
		const store = useAgentEvalsStore();
		vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
			datasetId: 'dataset-1',
			dataTableId: 'table-1',
			cases: [{ input: 'x', whatToCheck: 'y', scenario: 'Vague' }],
		});
		vi.spyOn(store, 'startRun').mockResolvedValue({ id: 'run-1' } as never);
		vi.spyOn(store, 'openRun').mockImplementation(async () => {});
		vi.spyOn(store, 'isRunInFlight').mockReturnValue(true);
		vi.spyOn(store, 'startPollingRun').mockImplementation(() => {});
		vi.spyOn(store, 'hasLostTrackOfRun').mockReturnValue(true);
		vi.spyOn(store, 'getReview').mockReturnValue({
			run: { status: 'running' } as never,
			results: [],
			resultsCount: 0,
			ratingsByResultId: {},
			pendingByResultId: {},
			draftsByResultId: {},
			counts: null,
			loading: false,
			loadingMore: false,
		});

		const { emitted } = renderComponent();

		await waitFor(() => expect(emitted().dismiss).toEqual([[]]));
	});

	it('does not generate the suite twice on a rapid double click of "Looks good"', async () => {
		const store = useAgentEvalsStore();
		vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
			datasetId: 'dataset-1',
			dataTableId: 'table-1',
			cases: [{ input: 'x', whatToCheck: 'y', scenario: 'Vague' }],
		});
		vi.spyOn(store, 'startRun').mockResolvedValue({ id: 'run-1' } as never);
		vi.spyOn(store, 'openRun').mockImplementation(async () => {});
		vi.spyOn(store, 'isRunInFlight').mockReturnValue(false);
		vi.spyOn(store, 'getReview').mockReturnValue({
			run: { status: 'completed' } as never,
			results: [{ status: 'success', input: { input: 'x' }, output: { finalText: 'y' } } as never],
			resultsCount: 1,
			ratingsByResultId: {},
			pendingByResultId: {},
			draftsByResultId: {},
			counts: null,
			loading: false,
			loadingMore: false,
		});

		const { getByTestId } = renderComponent();
		const button = await waitFor(() => {
			const el = getByTestId('instance-ai-test-agent-preview-looks-good');
			expect(el).toBeEnabled();
			return el;
		});

		// Two synchronous fires in the same tick, before Vue removes the button —
		// `fireEvent` (unlike `userEvent`) dispatches without awaiting between
		// clicks, which is what this guard protects against.
		await fireEvent.click(button);
		await fireEvent.click(button);

		expect(store.generateDraftCases).toHaveBeenCalledTimes(2); // 1 preview + 1 suite, not 3
	});

	it('does not confirm on an empty review before the run has loaded', async () => {
		const store = useAgentEvalsStore();
		vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
			datasetId: 'dataset-1',
			dataTableId: 'table-1',
			cases: [{ input: 'x', whatToCheck: 'y', scenario: 'Vague' }],
		});
		vi.spyOn(store, 'startRun').mockResolvedValue({ id: 'run-1' } as never);
		vi.spyOn(store, 'openRun').mockImplementation(async () => {});
		// `isRunInFlight` reads a run that was never loaded, so it is not
		// "pending" either — the empty review itself (`run: null`) is the only
		// signal that nothing has loaded yet.
		vi.spyOn(store, 'isRunInFlight').mockReturnValue(false);
		vi.spyOn(store, 'getReview').mockReturnValue({
			run: null,
			results: [],
			resultsCount: 0,
			ratingsByResultId: {},
			pendingByResultId: {},
			draftsByResultId: {},
			counts: null,
			loading: false,
			loadingMore: false,
		});

		const { getByTestId, queryByTestId } = renderComponent();

		await waitFor(() => expect(store.openRun).toHaveBeenCalled());
		expect(getByTestId('instance-ai-test-agent-preview-generating')).toBeInTheDocument();
		expect(queryByTestId('instance-ai-test-agent-preview-looks-good')).not.toBeInTheDocument();
	});

	it('keeps waiting when the run settles before its case result does', async () => {
		// Reproduces the store's real two-phase settle: `pollRunOnce` patches
		// `run.status` to its final value first, then refreshes `results` in a
		// later, separate patch (via `settleRun`). A mock that returns one fixed
		// object can't reproduce that gap — these refs back a `getReview` that
		// updates the same way, in two steps, so the panel's `watchEffect` sees
		// the same window a real settle produces.
		const runStatus = ref<'running' | 'completed'>('running');
		const resultStatus = ref<'new' | 'running' | 'success'>('new');
		const store = useAgentEvalsStore();
		vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
			datasetId: 'dataset-1',
			dataTableId: 'table-1',
			cases: [{ input: 'x', whatToCheck: 'y', scenario: 'Vague' }],
		});
		vi.spyOn(store, 'startRun').mockResolvedValue({ id: 'run-1' } as never);
		vi.spyOn(store, 'openRun').mockImplementation(async () => {});
		vi.spyOn(store, 'getReview').mockImplementation(
			() =>
				({
					run: { status: runStatus.value },
					results: [
						{
							status: resultStatus.value,
							input: { input: 'x' },
							output: resultStatus.value === 'success' ? { finalText: 'y' } : null,
						},
					],
					resultsCount: 1,
					ratingsByResultId: {},
					pendingByResultId: {},
					draftsByResultId: {},
					counts: null,
					loading: false,
					loadingMore: false,
				}) as never,
		);

		const { getByTestId, queryByTestId, findByTestId } = renderComponent();
		await waitFor(() => expect(store.openRun).toHaveBeenCalled());

		// The run settles first — the case result has not caught up yet. The
		// panel must not confirm on this window.
		runStatus.value = 'completed';
		await Promise.resolve();
		expect(getByTestId('instance-ai-test-agent-preview-generating')).toBeInTheDocument();
		expect(queryByTestId('instance-ai-test-agent-preview-looks-good')).not.toBeInTheDocument();

		// The second, later patch catches the result up — only now is it safe
		// to confirm.
		resultStatus.value = 'success';
		expect(await findByTestId('instance-ai-test-agent-preview-looks-good')).toBeInTheDocument();
	});

	it('dismisses when the preview case settles without succeeding', async () => {
		const store = useAgentEvalsStore();
		vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
			datasetId: 'dataset-1',
			dataTableId: 'table-1',
			cases: [{ input: 'x', whatToCheck: 'y', scenario: 'Vague' }],
		});
		vi.spyOn(store, 'startRun').mockResolvedValue({ id: 'run-1' } as never);
		vi.spyOn(store, 'openRun').mockImplementation(async () => {});
		vi.spyOn(store, 'isRunInFlight').mockReturnValue(false);
		vi.spyOn(store, 'getReview').mockReturnValue({
			run: { status: 'completed' } as never,
			results: [{ status: 'error', input: { input: 'x' }, output: null } as never],
			resultsCount: 1,
			ratingsByResultId: {},
			pendingByResultId: {},
			draftsByResultId: {},
			counts: null,
			loading: false,
			loadingMore: false,
		});

		const { emitted } = renderComponent();

		await waitFor(() => expect(emitted().dismiss).toEqual([[]]));
	});

	it('does not resume generation after the panel unmounts mid-flight', async () => {
		const store = useAgentEvalsStore();
		let resolveGenerate!: (value: {
			datasetId: string;
			dataTableId: string;
			cases: Array<{ input: string; whatToCheck: string; scenario: string }>;
		}) => void;
		vi.spyOn(store, 'generateDraftCases').mockImplementation(
			async () =>
				await new Promise((resolve) => {
					resolveGenerate = resolve;
				}),
		);
		const startRun = vi.spyOn(store, 'startRun').mockResolvedValue({ id: 'run-1' } as never);

		const { unmount } = renderComponent();
		await waitFor(() => expect(store.generateDraftCases).toHaveBeenCalled());

		unmount();
		resolveGenerate({
			datasetId: 'dataset-1',
			dataTableId: 'table-1',
			cases: [{ input: 'x', whatToCheck: 'y', scenario: 'Vague' }],
		});
		await Promise.resolve();
		await Promise.resolve();

		expect(startRun).not.toHaveBeenCalled();
	});

	it('stops polling when unmounted mid-generation', async () => {
		const store = useAgentEvalsStore();
		vi.spyOn(store, 'generateDraftCases').mockResolvedValue({
			datasetId: 'dataset-1',
			dataTableId: 'table-1',
			cases: [{ input: 'x', whatToCheck: 'y', scenario: 'Vague' }],
		});
		vi.spyOn(store, 'startRun').mockResolvedValue({ id: 'run-1' } as never);
		vi.spyOn(store, 'openRun').mockImplementation(async () => {});
		vi.spyOn(store, 'isRunInFlight').mockReturnValue(true);
		const stopPollingRun = vi.spyOn(store, 'stopPollingRun').mockImplementation(() => {});
		vi.spyOn(store, 'startPollingRun').mockImplementation(() => {});
		vi.spyOn(store, 'getReview').mockReturnValue({
			run: { status: 'running' } as never,
			results: [],
			resultsCount: 0,
			ratingsByResultId: {},
			pendingByResultId: {},
			draftsByResultId: {},
			counts: null,
			loading: false,
			loadingMore: false,
		});

		const { unmount } = renderComponent();
		await waitFor(() => expect(store.startPollingRun).toHaveBeenCalled());

		unmount();

		expect(stopPollingRun).toHaveBeenCalled();
	});
});
