import userEvent from '@testing-library/user-event';
import { render, fireEvent } from '@testing-library/vue';

import AiActivityStepGroup from './AiActivityStepGroup.vue';

describe('AiActivityStepGroup', () => {
	it('keeps label updates in a live region without the timer', async () => {
		const { getByRole, getByText, rerender } = render(AiActivityStepGroup, {
			props: { label: 'Running 2 background tasks' },
			slots: { 'header-trailing': '<span aria-live="off">0:31</span>' },
		});
		const label = getByText('Running 2 background tasks');
		expect(getByRole('button')).toHaveAttribute('aria-live', 'off');
		expect(label).toHaveAttribute('aria-live', 'polite');
		expect(label).toHaveAttribute('aria-atomic', 'true');
		expect(label).not.toContainElement(getByText('0:31'));
		await rerender({ label: 'Background tasks finished' });
		expect(label).toHaveTextContent('Background tasks finished');
	});

	it.each(['above', 'below'] as const)(
		'supports slots and keyboard expansion %s the header',
		async (contentPosition) => {
			const user = userEvent.setup();
			const { container, getByRole, queryByText, getByText } = render(AiActivityStepGroup, {
				props: { label: 'Background tasks', fullWidth: true, contentPosition },
				slots: {
					prefix: '<span aria-hidden="true">Status</span>',
					'header-trailing': '<span>0:31</span>',
					default: '<ul><li>Check escalations</li></ul>',
				},
			});
			if (contentPosition === 'above') {
				expect(container.firstElementChild).toHaveClass('contentAbove');
			} else {
				expect(container.firstElementChild).not.toHaveClass('contentAbove');
			}
			const button = getByRole('button');
			expect(button).toHaveAttribute('aria-expanded', 'false');
			expect(button).toHaveAttribute('aria-live', 'off');
			expect(button).toHaveTextContent('Background tasks');
			expect(button).toHaveTextContent('0:31');
			expect(queryByText('Check escalations')).not.toBeInTheDocument();
			await user.tab();
			expect(button).toHaveFocus();
			await user.keyboard('{Enter}');
			expect(button).toHaveAttribute('aria-expanded', 'true');
			expect(getByText('Check escalations')).toBeVisible();
			expect(button.compareDocumentPosition(getByText('Check escalations'))).toBe(
				Node.DOCUMENT_POSITION_FOLLOWING,
			);
			await user.keyboard(' ');
			expect(button).toHaveAttribute('aria-expanded', 'false');
			await fireEvent.click(button);
			expect(button).toHaveAttribute('aria-expanded', 'true');
		},
	);
});
