import { describe, expect, it } from 'vitest';
import { configure } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import AgentEvalVerdictLine, { type VerdictLineCheck } from '../AgentEvalVerdictLine.vue';

configure({ testIdAttribute: 'data-testid' });

const renderComponent = createComponentRenderer(AgentEvalVerdictLine);

const check = (id: string, overrides: Partial<VerdictLineCheck> = {}): VerdictLineCheck => ({
	id,
	status: 'pass',
	input: `request ${id}`,
	output: `answer ${id}`,
	whatToCheck: `rule ${id}`,
	reasoning: null,
	...overrides,
});

const failing = (id: string, reasoning = `It broke rule ${id}. More detail.`) =>
	check(id, { status: 'work', reasoning });

describe('AgentEvalVerdictLine', () => {
	it('renders nothing when there is no finished check and no run', () => {
		const { queryByTestId } = renderComponent({
			props: { checks: [check('a', { status: 'idle' })] },
		});

		expect(queryByTestId('agent-eval-verdict-line')).not.toBeInTheDocument();
	});

	it('quotes the first sentence of the first failing check’s reasoning for one or two', () => {
		const { getByTestId } = renderComponent({
			props: { checks: [check('a'), failing('b'), failing('c')] },
		});

		expect(getByTestId('agent-eval-verdict-line')).toHaveAttribute('data-state', 'needs-work');
		expect(getByTestId('agent-eval-verdict-sentence')).toHaveTextContent('It broke rule b.');
	});

	it('counts the failing checks from three on', () => {
		const { getByTestId } = renderComponent({
			props: { checks: [failing('a'), failing('b'), failing('c')] },
		});

		expect(getByTestId('agent-eval-verdict-sentence')).toHaveTextContent(
			'Your agent doesn’t handle 3 kinds of messages well',
		);
	});

	it('opens the details of every failing check, with its rule as a heading when there are several', async () => {
		const user = userEvent.setup();
		const { getByTestId, queryByTestId, getByText, getAllByText } = renderComponent({
			props: {
				checks: [failing('a'), failing('b', 'Too vague.'), check('c')],
			},
		});

		expect(queryByTestId('agent-eval-verdict-details-body')).not.toBeInTheDocument();
		await user.click(getByTestId('agent-eval-verdict-details'));

		const body = getByTestId('agent-eval-verdict-details-body');
		expect(body).toHaveTextContent('Asked “request a”, it replied “answer a”');
		expect(getAllByText('rule a')).toHaveLength(2);
		expect(getByText('Too vague.')).toBeInTheDocument();
		expect(body).not.toHaveTextContent('request c');
		expect(getByTestId('agent-eval-verdict-details')).toHaveTextContent('Hide details');
	});

	it('emits the failing checks from "Fix with Assistant"', async () => {
		const user = userEvent.setup();
		const { getByTestId, emitted } = renderComponent({
			props: { checks: [failing('a'), check('b')] },
		});

		await user.click(getByTestId('agent-eval-verdict-fix'));

		const [[sent]] = emitted<[VerdictLineCheck[]]>().fix;
		expect(sent.map((item) => item.id)).toEqual(['a']);
	});

	it('hides "Fix with Assistant" while the Assistant has the fix', () => {
		const { queryByTestId, getByTestId } = renderComponent({
			props: { checks: [failing('a')], hideFix: true },
		});

		expect(queryByTestId('agent-eval-verdict-fix')).not.toBeInTheDocument();
		expect(getByTestId('agent-eval-verdict-details')).toBeInTheDocument();
	});

	it('says every check passes, with the time of the last run and no buttons', () => {
		const { getByTestId, queryByRole } = renderComponent({
			props: {
				checks: [check('a'), check('b')],
				completedAt: '2026-01-01T00:00:00.000Z',
			},
		});

		expect(getByTestId('agent-eval-verdict-sentence')).toHaveTextContent('All 2 checks pass');
		expect(getByTestId('agent-eval-verdict-last-run')).toHaveTextContent('Last run');
		expect(queryByRole('button')).not.toBeInTheDocument();
	});

	it('shows progress and no buttons while a run is in flight', () => {
		const { getByTestId, queryByRole } = renderComponent({
			props: { checks: [failing('a')], running: true, done: 1, total: 4 },
		});

		expect(getByTestId('agent-eval-verdict-line')).toHaveAttribute('data-state', 'running');
		expect(getByTestId('agent-eval-verdict-sentence')).toHaveTextContent('Checking: 1 of 4 done…');
		expect(queryByRole('button')).not.toBeInTheDocument();
	});
});
