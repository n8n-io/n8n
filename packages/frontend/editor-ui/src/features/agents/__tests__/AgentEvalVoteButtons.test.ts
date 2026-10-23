import { configure, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
import { getTooltip } from '@/__tests__/utils';
import AgentEvalVoteButtons from '../components/AgentEvalVoteButtons.vue';

configure({ testIdAttribute: 'data-testid' });

const renderComponent = createComponentRenderer(AgentEvalVoteButtons);

describe('AgentEvalVoteButtons', () => {
	it('emits the side that was pressed', async () => {
		const { getByTestId, emitted } = renderComponent({ props: { vote: null } });

		await userEvent.click(getByTestId('agent-eval-vote-up'));
		await userEvent.click(getByTestId('agent-eval-vote-down'));

		expect(emitted().vote).toEqual([['up'], ['down']]);
	});

	/**
	 * The saved vote has to stay visibly picked — the pill says "Saved" but the pill
	 * doesn't say *which way*. The highlight is the only thing that does.
	 */
	describe('the current vote stays marked', () => {
		it('marks the up button when the vote is up', () => {
			const { getByTestId } = renderComponent({ props: { vote: 'up' } });

			expect(getByTestId('agent-eval-vote-up').className).toMatch(/selectedUp/);
			expect(getByTestId('agent-eval-vote-down').className).not.toMatch(/selected/);
		});

		it('marks the down button when the vote is down', () => {
			const { getByTestId } = renderComponent({ props: { vote: 'down' } });

			expect(getByTestId('agent-eval-vote-down').className).toMatch(/selectedDown/);
			expect(getByTestId('agent-eval-vote-up').className).not.toMatch(/selected/);
		});

		it('marks neither before a vote is cast', () => {
			const { getByTestId } = renderComponent({ props: { vote: null } });

			expect(getByTestId('agent-eval-vote-up').className).not.toMatch(/selected/);
			expect(getByTestId('agent-eval-vote-down').className).not.toMatch(/selected/);
		});

		it('reports the current vote to assistive tech too', () => {
			const { getByTestId } = renderComponent({ props: { vote: 'down' } });

			expect(getByTestId('agent-eval-vote-down')).toHaveAttribute('aria-pressed', 'true');
			expect(getByTestId('agent-eval-vote-up')).toHaveAttribute('aria-pressed', 'false');
		});
	});

	it('keeps vote labels and exposes the disabled reason on focus without accepting a vote', async () => {
		const user = userEvent.setup();
		const { getByTestId, emitted } = renderComponent({
			props: { vote: null, disabled: true, disabledReason: 'Still running' },
		});

		const up = getByTestId('agent-eval-vote-up');
		const down = getByTestId('agent-eval-vote-down');
		expect(up).toHaveAttribute('aria-disabled', 'true');
		expect(down).toHaveAttribute('aria-disabled', 'true');
		expect(up).toHaveAccessibleName('This answer is good');
		expect(down).toHaveAccessibleName('This answer is wrong');
		await user.tab();
		expect(up).toHaveFocus();
		await waitFor(() => expect(getTooltip()).toHaveTextContent('Still running'));
		expect(up).toHaveAccessibleDescription('Still running');
		await user.keyboard('{Enter} ');
		await user.click(up);
		await user.click(down);
		expect(emitted('vote')).toBeUndefined();
	});
});
