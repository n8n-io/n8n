import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { getTooltip } from '@/__tests__/utils';
import { waitFor } from '@testing-library/vue';

import AgentPreviewButton from '../components/AgentPreviewButton.vue';

const renderComponent = createComponentRenderer(AgentPreviewButton);

describe('AgentPreviewButton', () => {
	it.each([false, true])(
		'explains an unavailable preview without opening it, icon only: %s',
		async (iconOnly) => {
			const user = userEvent.setup();
			const { getByRole, emitted, rerender } = renderComponent({
				props: { isRunnable: false, iconOnly },
			});
			const button = getByRole('button');
			expect(button).toHaveAttribute('aria-disabled', 'true');
			await user.tab();
			expect(button).toHaveFocus();
			await waitFor(() => expect(getTooltip()).not.toBeEmptyDOMElement());
			await user.keyboard('{Enter} ');
			await user.click(button);
			expect(emitted('open-preview')).toBeUndefined();
			await rerender({ isRunnable: true });
			await user.click(getByRole('button'));
			expect(emitted('open-preview')).toHaveLength(1);
		},
	);
});
