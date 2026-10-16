import { configure, waitFor, within } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentEvalDraftCase } from '@n8n/api-types';

import { createComponentRenderer } from '@/__tests__/render';
import { useAgentEvalsStore } from '../agentEvals.store';
import AgentEvalAddCheckPanel from '../components/AgentEvalAddCheckPanel.vue';

configure({ testIdAttribute: 'data-testid' });

const { showError } = vi.hoisted(() => ({ showError: vi.fn() }));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError }),
}));

const caseSource = {
	datasetId: 'dataset-1',
	dataTableId: 'table-1',
	columns: { input: 'input', whatToCheck: 'criteria' },
};

const draft = (index: number): AgentEvalDraftCase => ({
	input: `message ${index}`,
	whatToCheck: `rule ${index}`,
	scenario: `Scenario ${index}`,
});

type Props = { disabled?: boolean; busy?: boolean; caseSource?: typeof caseSource | null };

const renderPanel = (
	props: Props = {},
	options: { batchSize?: number; generatedMessage?: string } = {},
) => {
	const pinia = createTestingPinia({ stubActions: true });
	const store = useAgentEvalsStore();

	const batch = Array.from({ length: options.batchSize ?? 5 }, (_, i) => draft(i + 1));
	// A typed rule asks for one case; the panel's own batch asks for ten.
	vi.mocked(store.generateDraftCases).mockImplementation(async (_project, _agent, opts) => ({
		cases: opts?.rule
			? [
					{
						input: options.generatedMessage ?? 'drafted message',
						whatToCheck: opts.rule,
						scenario: 'Rule',
					},
				]
			: batch,
	}));
	vi.mocked(store.createCase).mockResolvedValue({
		rowId: 1,
		input: 'x',
		whatToCheck: 'y',
	} as never);

	const view = createComponentRenderer(AgentEvalAddCheckPanel, {
		props: {
			projectId: 'project-1',
			agentId: 'agent-1',
			caseSource: 'caseSource' in props ? props.caseSource : caseSource,
			disabled: props.disabled,
			busy: props.busy,
		},
	})({ pinia });

	return { ...view, store };
};

describe('AgentEvalAddCheckPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('the prepared cases', () => {
		it('drafts a batch of ten without saving anything when it opens', async () => {
			const { store, findAllByTestId } = renderPanel();

			await findAllByTestId('agent-eval-add-check-prepared-row');

			expect(store.generateDraftCases).toHaveBeenCalledWith('project-1', 'agent-1', {
				count: 10,
				save: false,
			});
		});

		it('shows a loading state while the batch is being drafted', async () => {
			const pinia = createTestingPinia({ stubActions: true });
			const store = useAgentEvalsStore();
			let resolveBatch!: (value: { cases: AgentEvalDraftCase[] }) => void;
			vi.mocked(store.generateDraftCases).mockImplementation(
				async () => await new Promise((resolve) => (resolveBatch = resolve)),
			);
			const { findByTestId, queryByTestId, findAllByTestId } = createComponentRenderer(
				AgentEvalAddCheckPanel,
				{ props: { projectId: 'project-1', agentId: 'agent-1', caseSource } },
			)({ pinia });

			expect(await findByTestId('agent-eval-add-check-loading')).toBeInTheDocument();
			expect(queryByTestId('agent-eval-add-check-prepared')).not.toBeInTheDocument();

			resolveBatch({ cases: [draft(1)] });

			expect(await findAllByTestId('agent-eval-add-check-prepared-row')).toHaveLength(1);
			expect(queryByTestId('agent-eval-add-check-loading')).not.toBeInTheDocument();
		});

		it('titles each case by its rule, with its message quoted under it, and picks none', async () => {
			const { findAllByTestId } = renderPanel({}, { batchSize: 2 });

			const rows = await findAllByTestId('agent-eval-add-check-prepared-row');

			expect(within(rows[0]).getByText('rule 1')).toBeInTheDocument();
			expect(within(rows[0]).getByText('“message 1”')).toBeInTheDocument();
			expect(within(rows[1]).getByText('rule 2')).toBeInTheDocument();
			for (const row of rows) {
				expect(within(row).getByRole('checkbox')).not.toBeChecked();
			}
		});

		it('titles a case with no rule by its message', async () => {
			const pinia = createTestingPinia({ stubActions: true });
			const store = useAgentEvalsStore();
			vi.mocked(store.generateDraftCases).mockResolvedValue({
				cases: [{ input: 'message 1', whatToCheck: '', scenario: 'Custom' }],
			});
			const { findAllByTestId } = createComponentRenderer(AgentEvalAddCheckPanel, {
				props: { projectId: 'project-1', agentId: 'agent-1', caseSource },
			})({ pinia });

			const [row] = await findAllByTestId('agent-eval-add-check-prepared-row');

			expect(within(row).getByText('message 1')).toBeInTheDocument();
			expect(within(row).queryByText('“message 1”')).not.toBeInTheDocument();
		});

		it('shows the first three and a "Show N more" toggle for the rest', async () => {
			const user = userEvent.setup();
			const { findAllByTestId, getByTestId, queryByText } = renderPanel({}, { batchSize: 10 });

			expect(await findAllByTestId('agent-eval-add-check-prepared-row')).toHaveLength(3);
			expect(getByTestId('agent-eval-add-check-more')).toHaveTextContent('Show 7 more');
			expect(queryByText('rule 4')).not.toBeInTheDocument();

			await user.click(getByTestId('agent-eval-add-check-more'));

			expect(await findAllByTestId('agent-eval-add-check-prepared-row')).toHaveLength(10);
			expect(getByTestId('agent-eval-add-check-more')).toHaveTextContent('Show fewer');

			await user.click(getByTestId('agent-eval-add-check-more'));

			expect(await findAllByTestId('agent-eval-add-check-prepared-row')).toHaveLength(3);
		});

		it('has no toggle when three or fewer cases come back', async () => {
			const { findAllByTestId, queryByTestId } = renderPanel({}, { batchSize: 3 });

			await findAllByTestId('agent-eval-add-check-prepared-row');

			expect(queryByTestId('agent-eval-add-check-more')).not.toBeInTheDocument();
		});

		it('toasts and shows no list when the batch cannot be drafted', async () => {
			const pinia = createTestingPinia({ stubActions: true });
			const store = useAgentEvalsStore();
			vi.mocked(store.generateDraftCases).mockRejectedValue(new Error('model unavailable'));
			const { queryByTestId, getByTestId } = createComponentRenderer(AgentEvalAddCheckPanel, {
				props: { projectId: 'project-1', agentId: 'agent-1', caseSource },
			})({ pinia });

			await waitFor(() => expect(showError).toHaveBeenCalled());
			expect(showError).toHaveBeenCalledWith(expect.any(Error), "Couldn't generate test cases");
			await waitFor(() =>
				expect(queryByTestId('agent-eval-add-check-loading')).not.toBeInTheDocument(),
			);
			expect(queryByTestId('agent-eval-add-check-prepared')).not.toBeInTheDocument();
			// Typing a rule still works without the prepared batch.
			expect(getByTestId('agent-eval-add-check-rule-input')).toBeEnabled();
		});
	});

	describe('adding prepared cases', () => {
		const pick = async (
			user: ReturnType<typeof userEvent.setup>,
			rows: HTMLElement[],
			indexes: number[],
		) => {
			for (const index of indexes) await user.click(within(rows[index]).getByRole('checkbox'));
		};

		it('keeps "Add checks" off until a case is picked, then counts the picked cases', async () => {
			const user = userEvent.setup();
			const { findAllByTestId, getByTestId } = renderPanel({}, { batchSize: 3 });
			const rows = await findAllByTestId('agent-eval-add-check-prepared-row');
			const add = getByTestId('agent-eval-add-check-prepared-add');

			expect(add).toBeDisabled();
			expect(add).toHaveTextContent('Add checks');

			await pick(user, rows, [0]);
			expect(add).toBeEnabled();
			expect(add).toHaveTextContent('Add 1 check');

			await pick(user, rows, [2]);
			expect(add).toHaveTextContent('Add 2 checks');

			await pick(user, rows, [0]);
			expect(add).toHaveTextContent('Add 1 check');
		});

		it('writes nothing until "Add checks" is pressed', async () => {
			const user = userEvent.setup();
			const { findAllByTestId, store, emitted } = renderPanel({}, { batchSize: 3 });
			const rows = await findAllByTestId('agent-eval-add-check-prepared-row');

			await pick(user, rows, [0, 1]);

			expect(store.createCase).not.toHaveBeenCalled();
			expect(emitted('added')).toBeUndefined();
		});

		it('writes the picked cases in order, tells the parent once, and drops them from the list', async () => {
			const user = userEvent.setup();
			const { findAllByTestId, store, emitted, getAllByTestId, getByTestId } = renderPanel(
				{},
				{ batchSize: 3 },
			);
			const rows = await findAllByTestId('agent-eval-add-check-prepared-row');
			await pick(user, rows, [2, 0]);

			await user.click(getByTestId('agent-eval-add-check-prepared-add'));

			await waitFor(() => expect(emitted('added')).toHaveLength(1));
			expect(vi.mocked(store.createCase).mock.calls).toEqual([
				['project-1', caseSource, { input: 'message 1', whatToCheck: 'rule 1' }],
				['project-1', caseSource, { input: 'message 3', whatToCheck: 'rule 3' }],
			]);
			await waitFor(() =>
				expect(getAllByTestId('agent-eval-add-check-prepared-row')).toHaveLength(1),
			);
			expect(
				within(getAllByTestId('agent-eval-add-check-prepared-row')[0]).getByText('rule 2'),
			).toBeInTheDocument();
			expect(getByTestId('agent-eval-add-check-prepared-add')).toBeDisabled();
		});

		it('toasts and keeps the cases when the write fails', async () => {
			const user = userEvent.setup();
			const { findAllByTestId, store, emitted, getByTestId } = renderPanel({}, { batchSize: 3 });
			vi.mocked(store.createCase).mockRejectedValue(new Error('table is full'));
			const rows = await findAllByTestId('agent-eval-add-check-prepared-row');
			await pick(user, rows, [0, 1]);

			await user.click(getByTestId('agent-eval-add-check-prepared-add'));

			await waitFor(() =>
				expect(showError).toHaveBeenCalledWith(expect.any(Error), "Couldn't add the test case"),
			);
			expect(store.createCase).toHaveBeenCalledTimes(1);
			expect(emitted('added')).toBeUndefined();
			expect(await findAllByTestId('agent-eval-add-check-prepared-row')).toHaveLength(3);
		});

		it('stops at the first failed write, keeps that case and the rest, and reports what was written', async () => {
			const user = userEvent.setup();
			const { findAllByTestId, store, emitted, getAllByTestId, getByTestId } = renderPanel(
				{},
				{ batchSize: 3 },
			);
			vi.mocked(store.createCase)
				.mockResolvedValueOnce({ rowId: 1 } as never)
				.mockRejectedValueOnce(new Error('table is full'));
			const rows = await findAllByTestId('agent-eval-add-check-prepared-row');
			await pick(user, rows, [0, 1, 2]);

			await user.click(getByTestId('agent-eval-add-check-prepared-add'));

			await waitFor(() => expect(emitted('added')).toHaveLength(1));
			expect(store.createCase).toHaveBeenCalledTimes(2);
			await waitFor(() =>
				expect(getAllByTestId('agent-eval-add-check-prepared-row')).toHaveLength(2),
			);
			expect(getByTestId('agent-eval-add-check-prepared-add')).toHaveTextContent('Add 2 checks');
		});

		it('treats a write that returns no row as a failure', async () => {
			const user = userEvent.setup();
			const { findAllByTestId, store, emitted, getByTestId } = renderPanel({}, { batchSize: 3 });
			vi.mocked(store.createCase).mockResolvedValue(null);
			const rows = await findAllByTestId('agent-eval-add-check-prepared-row');
			await pick(user, rows, [0]);

			await user.click(getByTestId('agent-eval-add-check-prepared-add'));

			await waitFor(() => expect(showError).toHaveBeenCalled());
			expect(emitted('added')).toBeUndefined();
		});

		// The panel is only unmounted when the checks view goes away, e.g. on an agent
		// switch. A failure that lands after that must not toast over the new screen.
		it('does not toast a failed write once the panel is gone', async () => {
			const user = userEvent.setup();
			const { findAllByTestId, store, unmount, getByTestId } = renderPanel({}, { batchSize: 3 });
			let rejectWrite!: (error: Error) => void;
			vi.mocked(store.createCase).mockImplementation(
				async () =>
					await new Promise((_, reject) => {
						rejectWrite = reject;
					}),
			);
			const rows = await findAllByTestId('agent-eval-add-check-prepared-row');
			await pick(user, rows, [0]);
			await user.click(getByTestId('agent-eval-add-check-prepared-add'));
			await waitFor(() => expect(rejectWrite).toBeDefined());
			showError.mockClear();

			unmount();
			rejectWrite(new Error('table is full'));
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(showError).not.toHaveBeenCalled();
		});

		it('does not toast a failed rule draft once the panel is gone', async () => {
			const user = userEvent.setup();
			const { findAllByTestId, store, getByTestId, unmount } = renderPanel({}, { batchSize: 3 });
			await findAllByTestId('agent-eval-add-check-prepared-row');
			let rejectDraft!: (error: Error) => void;
			vi.mocked(store.generateDraftCases).mockImplementation(
				async () =>
					await new Promise((_, reject) => {
						rejectDraft = reject;
					}),
			);
			await user.type(getByTestId('agent-eval-add-check-rule-input'), 'never share a phone number');
			await user.click(getByTestId('agent-eval-add-check-rule-submit'));
			await waitFor(() => expect(rejectDraft).toBeDefined());
			showError.mockClear();

			unmount();
			rejectDraft(new Error('model unavailable'));
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(showError).not.toHaveBeenCalled();
		});

		it('disables picking and adding while the picked cases are being written', async () => {
			const user = userEvent.setup();
			const { findAllByTestId, store, getByTestId, getAllByTestId } = renderPanel(
				{},
				{ batchSize: 3 },
			);
			let finishWrite!: (value: never) => void;
			vi.mocked(store.createCase).mockImplementation(
				async () => await new Promise((resolve) => (finishWrite = resolve)),
			);
			const rows = await findAllByTestId('agent-eval-add-check-prepared-row');
			await pick(user, rows, [0]);

			await user.click(getByTestId('agent-eval-add-check-prepared-add'));

			await waitFor(() => {
				for (const row of getAllByTestId('agent-eval-add-check-prepared-row')) {
					expect(within(row).getByRole('checkbox')).toBeDisabled();
				}
			});
			await user.type(getByTestId('agent-eval-add-check-rule-input'), 'a rule');
			expect(getByTestId('agent-eval-add-check-rule-submit')).toBeDisabled();

			finishWrite({ rowId: 1 } as never);
			await waitFor(() =>
				expect(
					within(getAllByTestId('agent-eval-add-check-prepared-row')[0]).getByRole('checkbox'),
				).toBeEnabled(),
			);
		});
	});

	describe('adding a typed rule', () => {
		it('drafts a test message for the rule and saves the pair as a check', async () => {
			const user = userEvent.setup();
			const { getByTestId, store, emitted } = renderPanel(
				{},
				{ generatedMessage: 'Can I get Ana’s number?' },
			);

			await user.type(
				getByTestId('agent-eval-add-check-rule-input'),
				'  Never share a phone number  ',
			);
			await user.click(getByTestId('agent-eval-add-check-rule-submit'));

			await waitFor(() =>
				expect(store.generateDraftCases).toHaveBeenCalledWith('project-1', 'agent-1', {
					count: 1,
					save: false,
					rule: 'Never share a phone number',
				}),
			);
			await waitFor(() =>
				expect(store.createCase).toHaveBeenCalledWith('project-1', caseSource, {
					input: 'Can I get Ana’s number?',
					whatToCheck: 'Never share a phone number',
				}),
			);
			await waitFor(() => expect(emitted('added')).toHaveLength(1));
		});

		it('clears the input after a successful add', async () => {
			const user = userEvent.setup();
			const { getByTestId } = renderPanel();
			const input = getByTestId('agent-eval-add-check-rule-input') as HTMLInputElement;

			await user.type(input, 'Never share a phone number');
			await user.click(getByTestId('agent-eval-add-check-rule-submit'));

			await waitFor(() => expect(input.value).toBe(''));
		});

		it('adds on Enter', async () => {
			const user = userEvent.setup();
			const { getByTestId, store } = renderPanel();

			await user.type(getByTestId('agent-eval-add-check-rule-input'), 'Be polite{Enter}');

			await waitFor(() => expect(store.createCase).toHaveBeenCalled());
		});

		it('keeps "Add" off until there is a rule', async () => {
			const user = userEvent.setup();
			const { getByTestId } = renderPanel();

			expect(getByTestId('agent-eval-add-check-rule-submit')).toBeDisabled();

			await user.type(getByTestId('agent-eval-add-check-rule-input'), '   ');
			expect(getByTestId('agent-eval-add-check-rule-submit')).toBeDisabled();

			await user.type(getByTestId('agent-eval-add-check-rule-input'), 'Be polite');
			expect(getByTestId('agent-eval-add-check-rule-submit')).toBeEnabled();
		});

		it('toasts, writes nothing, and keeps the rule when the test message cannot be drafted', async () => {
			const user = userEvent.setup();
			const { getByTestId, store, emitted } = renderPanel();
			vi.mocked(store.generateDraftCases).mockImplementation(async (_p, _a, opts) => {
				if (opts?.rule) throw new Error('model unavailable');
				return { cases: [] };
			});
			const input = getByTestId('agent-eval-add-check-rule-input') as HTMLInputElement;

			await user.type(input, 'Be polite');
			await user.click(getByTestId('agent-eval-add-check-rule-submit'));

			await waitFor(() =>
				expect(showError).toHaveBeenCalledWith(expect.any(Error), "Couldn't generate test cases"),
			);
			expect(store.createCase).not.toHaveBeenCalled();
			expect(emitted('added')).toBeUndefined();
			expect(input.value).toBe('Be polite');
		});

		it('toasts and keeps the rule when the model returns no case', async () => {
			const user = userEvent.setup();
			const { getByTestId, store } = renderPanel();
			vi.mocked(store.generateDraftCases).mockResolvedValue({ cases: [] });

			await user.type(getByTestId('agent-eval-add-check-rule-input'), 'Be polite');
			await user.click(getByTestId('agent-eval-add-check-rule-submit'));

			await waitFor(() => expect(showError).toHaveBeenCalled());
			expect(store.createCase).not.toHaveBeenCalled();
		});

		it('toasts and keeps the rule when saving the check fails', async () => {
			const user = userEvent.setup();
			const { getByTestId, store, emitted } = renderPanel();
			vi.mocked(store.createCase).mockRejectedValue(new Error('table is full'));
			const input = getByTestId('agent-eval-add-check-rule-input') as HTMLInputElement;

			await user.type(input, 'Be polite');
			await user.click(getByTestId('agent-eval-add-check-rule-submit'));

			await waitFor(() =>
				expect(showError).toHaveBeenCalledWith(expect.any(Error), "Couldn't add the test case"),
			);
			expect(emitted('added')).toBeUndefined();
			expect(input.value).toBe('Be polite');
		});
	});

	describe('when adding is not allowed', () => {
		const expectNothingAddable = (
			rows: HTMLElement[],
			getByTestId: (id: string) => HTMLElement,
		) => {
			expect(getByTestId('agent-eval-add-check-rule-submit')).toBeDisabled();
			expect(getByTestId('agent-eval-add-check-prepared-add')).toBeDisabled();
			for (const row of rows) expect(within(row).getByRole('checkbox')).toBeDisabled();
		};

		it('disables the input, the picks and "Add checks" for a read-only viewer', async () => {
			const { getByTestId, findAllByTestId } = renderPanel({ disabled: true });
			const rows = await findAllByTestId('agent-eval-add-check-prepared-row');

			expect(getByTestId('agent-eval-add-check-rule-input')).toBeDisabled();
			expectNothingAddable(rows, getByTestId);
		});

		it('disables adding while the checks are running, so their run is not changed under them', async () => {
			const { getByTestId, findAllByTestId } = renderPanel({ busy: true });
			const rows = await findAllByTestId('agent-eval-add-check-prepared-row');

			expectNothingAddable(rows, getByTestId);
		});

		it('disables everything when the dataset has nowhere to write a case', async () => {
			const { getByTestId, findAllByTestId } = renderPanel({ caseSource: null });
			const rows = await findAllByTestId('agent-eval-add-check-prepared-row');

			expect(getByTestId('agent-eval-add-check-rule-input')).toBeDisabled();
			expectNothingAddable(rows, getByTestId);
		});

		it('does not pick or add when a case is clicked while disabled', async () => {
			const user = userEvent.setup();
			const { store, findAllByTestId, getByTestId } = renderPanel({ disabled: true });
			const rows = await findAllByTestId('agent-eval-add-check-prepared-row');

			await user.click(within(rows[0]).getByRole('checkbox'));
			await user.click(getByTestId('agent-eval-add-check-prepared-add'));

			expect(within(rows[0]).getByRole('checkbox')).not.toBeChecked();
			expect(store.createCase).not.toHaveBeenCalled();
		});
	});

	it('asks the parent to close when the close button is clicked', async () => {
		const user = userEvent.setup();
		const { getByTestId, emitted } = renderPanel();

		await user.click(getByTestId('agent-eval-add-check-close'));

		expect(emitted('close')).toHaveLength(1);
	});

	it('titles itself "Add a check"', () => {
		const { getByRole } = renderPanel();

		expect(getByRole('heading', { name: 'Add a check' })).toBeInTheDocument();
	});
});
