import type { AgentProposalCaseArm, AgentProposalCaseResult } from '@n8n/api-types';
import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';
import { within } from '@testing-library/vue';

import AgentProposalEvalResults from './AgentProposalEvalResults.vue';

const renderComponent = createComponentRenderer(AgentProposalEvalResults);

const arm = (
	outcome: 'pass' | 'fail',
	overrides: Partial<AgentProposalCaseArm> = {},
): AgentProposalCaseArm => ({
	status: 'success',
	answer: `The ${outcome} answer`,
	verdict: { status: 'completed', outcome, reasoning: `The ${outcome} reasoning` },
	toolCalls: [],
	usage: { inputTokens: null, outputTokens: null, costUsd: null, durationMs: null },
	...overrides,
});

const result = (
	caseKey: string,
	published: AgentProposalCaseArm,
	proposed: AgentProposalCaseArm | null,
	overrides: Partial<AgentProposalCaseResult> = {},
): AgentProposalCaseResult => ({
	caseKey,
	origin: 'suite',
	motivating: false,
	input: `Input of ${caseKey}`,
	criteria: null,
	expectedOutput: null,
	expectedTools: [],
	published,
	proposed,
	...overrides,
});

const render = (cases: AgentProposalCaseResult[]) =>
	renderComponent({ props: { evidence: { ranAt: '2026-01-01T00:00:00.000Z', cases } } });

const comparison = [
	result('passing', arm('pass'), arm('pass')),
	result('fixed', arm('fail'), arm('pass'), { motivating: true }),
	result('still-failing', arm('fail'), arm('fail')),
	result('newly-failing', arm('pass'), arm('fail')),
];

describe('AgentProposalEvalResults', () => {
	it('should show the summary counts of both versions', () => {
		const { getByTestId } = render(comparison);

		const summary = getByTestId('agent-proposal-evals-summary');
		expect(summary).toHaveTextContent('4 cases');
		expect(summary).toHaveTextContent('Published: 2 of 4 passed');
		expect(summary).toHaveTextContent('Proposed: 2 of 4 passed');
		expect(getByTestId('agent-proposal-evals-summary-newly-failing')).toHaveTextContent(
			'1 newly failing',
		);
		expect(getByTestId('agent-proposal-evals-summary-fixed')).toHaveTextContent('1 fixed');
	});

	it('should show newly failing cases first, then failing cases, then passing cases', () => {
		const { getAllByTestId } = render(comparison);

		const rows = getAllByTestId('agent-proposal-eval-case');
		expect(
			rows.map((row) =>
				within(row)
					.getByTitle(/Input of/)
					.textContent?.trim(),
			),
		).toEqual([
			'Input of newly-failing',
			'Input of still-failing',
			'Input of passing',
			'Input of fixed',
		]);
		expect(
			within(rows[0]).getByTestId('agent-proposal-eval-case-newly-failing'),
		).toBeInTheDocument();
		expect(
			within(rows[1]).queryByTestId('agent-proposal-eval-case-newly-failing'),
		).not.toBeInTheDocument();
		expect(within(rows[3]).getByTestId('agent-proposal-eval-case-motivating')).toBeInTheDocument();
	});

	it('should show the status of each version in a row', () => {
		const { getAllByTestId } = render(comparison);

		const row = within(getAllByTestId('agent-proposal-eval-case')[0]);
		expect(row.getByTestId('agent-proposal-eval-case-published')).toHaveTextContent(
			/Published\s*Pass/,
		);
		expect(row.getByTestId('agent-proposal-eval-case-proposed')).toHaveTextContent(
			/Proposed\s*Fail/,
		);
	});

	it('should show no detail before a case is selected', () => {
		const { queryByTestId } = render(comparison);

		expect(queryByTestId('agent-proposal-eval-detail')).not.toBeInTheDocument();
	});

	it('should show the input and the checks one time and one column for each version', async () => {
		const { getByTestId, getAllByTestId } = render([
			result(
				'tools',
				arm('fail', {
					verdict: {
						status: 'completed',
						outcome: 'fail',
						reasoning: 'The agent used the wrong tool.',
						toolCheck: { pass: false, missing: ['lookup_order'], forbidden: ['search_web'] },
					},
					toolCalls: [
						{ tool: 'search_web', kind: 'node', input: { query: 'order 42' }, failed: false },
						{ tool: 'send_email', kind: 'workflow', failed: true },
					],
					usage: { inputTokens: 1200, outputTokens: 80, costUsd: 0.0123, durationMs: 2500 },
				}),
				arm('pass', {
					verdict: {
						status: 'completed',
						outcome: 'pass',
						reasoning: 'The agent found the order.',
						toolCheck: { pass: true, missing: [], forbidden: [] },
					},
					toolCalls: [{ tool: 'lookup_order', kind: 'workflow', output: 'Shipped', failed: false }],
				}),
				{
					criteria: 'The answer gives the order status.',
					expectedOutput: 'Order 42 is shipped.',
					expectedTools: ['lookup_order', '!search_web'],
				},
			),
		]);

		const toggle = getByTestId('agent-proposal-eval-case-toggle');
		await userEvent.click(toggle);

		expect(toggle).toHaveAttribute('aria-expanded', 'true');
		expect(getAllByTestId('agent-proposal-eval-input')).toHaveLength(1);
		expect(getByTestId('agent-proposal-eval-input')).toHaveTextContent('Input of tools');
		expect(getByTestId('agent-proposal-eval-rule')).toHaveTextContent(
			'The answer gives the order status.',
		);
		expect(getByTestId('agent-proposal-eval-expected-answer')).toHaveTextContent(
			'Order 42 is shipped.',
		);

		const published = within(getByTestId('agent-proposal-eval-version-published'));
		expect(published.getByTestId('agent-proposal-eval-answer')).toHaveTextContent(
			'The fail answer',
		);
		const missing = published.getByTestId('agent-proposal-eval-check-required-lookup_order');
		expect(missing).toHaveTextContent('Did not call lookup_order, which it must call');
		expect(missing).toHaveAttribute('data-tone', 'fail');
		const forbidden = published.getByTestId('agent-proposal-eval-check-forbidden-search_web');
		expect(forbidden).toHaveTextContent('Called search_web, which it must not call');
		expect(forbidden).toHaveAttribute('data-tone', 'fail');
		expect(published.getByTestId('agent-proposal-eval-check-rule')).toHaveTextContent(
			'Rule not checked, because a tool check failed',
		);
		expect(published.getAllByTestId('agent-proposal-eval-tool-call-forbidden')).toHaveLength(1);
		expect(published.getAllByTestId('agent-proposal-eval-tool-call')).toHaveLength(2);
		expect(published.getByTestId('agent-proposal-eval-usage-inputTokens')).toHaveTextContent(
			'1,200',
		);
		expect(published.getByTestId('agent-proposal-eval-usage-outputTokens')).toHaveTextContent('80');
		expect(published.getByTestId('agent-proposal-eval-usage-cost')).toHaveTextContent('$0.0123');
		expect(published.getByTestId('agent-proposal-eval-usage-latency')).toHaveTextContent('2.5 s');

		const proposed = within(getByTestId('agent-proposal-eval-version-proposed'));
		expect(proposed.getByTestId('agent-proposal-eval-answer')).toHaveTextContent('The pass answer');
		expect(proposed.getByTestId('agent-proposal-eval-check-required-lookup_order')).toHaveAttribute(
			'data-tone',
			'pass',
		);
		expect(proposed.getByTestId('agent-proposal-eval-check-rule')).toHaveTextContent(
			'Follows the rule',
		);
		expect(proposed.getByTestId('agent-proposal-eval-check-rule')).toHaveTextContent(
			'The agent found the order.',
		);
		expect(
			proposed.queryByTestId('agent-proposal-eval-tool-call-forbidden'),
		).not.toBeInTheDocument();
		// A correct tool call shows only in the checklist.
		expect(proposed.queryByTestId('agent-proposal-eval-tool-calls')).not.toBeInTheDocument();
		expect(proposed.queryByTestId('agent-proposal-eval-usage-cost')).not.toBeInTheDocument();
	});

	it('should show the input and the output of a wrong tool call when the tool call opens', async () => {
		const { getByTestId, getByRole, findByText } = render([
			result(
				'tools',
				arm('fail', {
					verdict: {
						status: 'completed',
						outcome: 'fail',
						reasoning: null,
						toolCheck: { pass: false, missing: [], forbidden: ['lookup_order'] },
					},
					toolCalls: [
						{
							tool: 'lookup_order',
							kind: 'workflow',
							input: { orderId: 42 },
							output: 'Shipped',
							failed: false,
						},
					],
				}),
				null,
			),
		]);
		await userEvent.click(getByTestId('agent-proposal-eval-case-toggle'));

		await userEvent.click(getByRole('button', { name: /lookup_order/ }));

		expect(await findByText(/"orderId": 42/)).toBeInTheDocument();
		expect(await findByText('Shipped')).toBeInTheDocument();
	});

	it('should show a generic label for a failed tool call', async () => {
		const { getByTestId, getByRole, findByText } = render([
			result(
				'tools',
				arm('fail', { toolCalls: [{ tool: 'send_email', kind: 'workflow', failed: true }] }),
				null,
			),
		]);
		await userEvent.click(getByTestId('agent-proposal-eval-case-toggle'));

		await userEvent.click(getByRole('button', { name: /send_email/ }));

		expect(await findByText('The tool call failed.')).toBeInTheDocument();
	});

	it('should show a run that did not finish as an error', async () => {
		const { getByTestId } = render([
			result(
				'broken',
				arm('pass'),
				arm('fail', {
					status: 'error',
					answer: null,
					verdict: { status: 'skipped', outcome: null, reasoning: null },
				}),
			),
		]);

		expect(getByTestId('agent-proposal-eval-case-proposed')).toHaveTextContent(/Proposed\s*Error/);

		await userEvent.click(getByTestId('agent-proposal-eval-case-toggle'));

		expect(getByTestId('agent-proposal-eval-version-proposed')).toHaveTextContent(
			'The run did not finish.',
		);
	});

	it('should show one column for the current agent when no proposed version ran', async () => {
		const { getByTestId, getAllByTestId, queryByTestId } = render([
			result('preview-pass', arm('pass'), null),
			result('preview-fail', arm('fail'), null),
		]);

		const summary = getByTestId('agent-proposal-evals-summary');
		expect(summary).toHaveTextContent('2 cases');
		expect(summary).toHaveTextContent('Current agent: 1 of 2 passed');
		expect(queryByTestId('agent-proposal-evals-summary-newly-failing')).not.toBeInTheDocument();
		expect(queryByTestId('agent-proposal-eval-case-proposed')).not.toBeInTheDocument();

		await userEvent.click(getAllByTestId('agent-proposal-eval-case-toggle')[0]);

		expect(getByTestId('agent-proposal-eval-version-current')).toHaveTextContent('Current agent');
		expect(getByTestId('agent-proposal-eval-version-current')).toHaveTextContent('The fail answer');
		expect(queryByTestId('agent-proposal-eval-version-published')).not.toBeInTheDocument();
		expect(queryByTestId('agent-proposal-eval-version-proposed')).not.toBeInTheDocument();
	});

	it('should close the detail when the selected case is selected again', async () => {
		const { getAllByTestId, queryByTestId } = render(comparison);
		const toggle = getAllByTestId('agent-proposal-eval-case-toggle')[0];

		await userEvent.click(toggle);
		await userEvent.click(toggle);

		expect(queryByTestId('agent-proposal-eval-detail')).not.toBeInTheDocument();
	});

	it('should show a text when no case ran', () => {
		const { getByTestId } = render([]);

		expect(getByTestId('agent-proposal-evals-empty')).toBeInTheDocument();
	});
});
