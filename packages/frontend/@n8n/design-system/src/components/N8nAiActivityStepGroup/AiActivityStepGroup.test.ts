import userEvent from '@testing-library/user-event';
import { render, fireEvent } from '@testing-library/vue';

import AiActivityStepGroup from './AiActivityStepGroup.vue';

describe('AiActivityStepGroup', () => {
	it.each(['above', 'below'] as const)(
		'supports slots and keyboard expansion %s the header',
		async (contentPosition) => {
			const user = userEvent.setup();
			const { getByRole, queryByText, getByText } = render(AiActivityStepGroup, {
				props: { label: 'Background tasks', fullWidth: true, contentPosition },
				slots: {
					prefix: '<span aria-hidden="true">Status</span>',
					'header-trailing': '<span>0:31</span>',
					default: '<ul><li>Check escalations</li></ul>',
				},
			});
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
				contentPosition === 'above'
					? Node.DOCUMENT_POSITION_PRECEDING
					: Node.DOCUMENT_POSITION_FOLLOWING,
			);
			await user.keyboard(' ');
			expect(button).toHaveAttribute('aria-expanded', 'false');
			await fireEvent.click(button);
			expect(button).toHaveAttribute('aria-expanded', 'true');
		},
	);
});
