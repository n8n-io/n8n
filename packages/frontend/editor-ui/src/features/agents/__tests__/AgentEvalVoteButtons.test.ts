import { configure } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { createComponentRenderer } from '@/__tests__/render';
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

	it('disables both sides with the reason it was given', () => {
		const { getByTestId } = renderComponent({
			props: { vote: null, disabled: true, disabledReason: 'Still running' },
		});

		expect(getByTestId('agent-eval-vote-up')).toBeDisabled();
		expect(getByTestId('agent-eval-vote-down')).toBeDisabled();
		expect(getByTestId('agent-eval-vote-down')).toHaveAttribute('aria-label', 'Still running');
	});
});
