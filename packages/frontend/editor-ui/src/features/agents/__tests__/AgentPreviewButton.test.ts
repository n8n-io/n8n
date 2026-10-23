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
			expect(button).not.toBeDisabled();
			await user.tab();
			expect(button).toHaveFocus();
			await waitFor(() => expect(getTooltip()).toHaveTextContent("Can't test agent yet"));
			expect(button).toHaveAccessibleDescription("Can't test agent yet");
			await user.keyboard('{Enter} ');
			await user.click(button);
			expect(emitted('open-preview')).toBeUndefined();
			await rerender({ isRunnable: true });
			await user.click(getByRole('button'));
			expect(emitted('open-preview')).toHaveLength(1);
		},
	);

	it('keeps focus when the icon-only control becomes unavailable', async () => {
		const user = userEvent.setup();
		const { getByRole, rerender, emitted } = renderComponent({
			props: { isRunnable: true, iconOnly: true },
		});
		const button = getByRole('button');
		await user.tab();
		expect(button).toHaveFocus();
		await rerender({ isRunnable: false });
		expect(getByRole('button')).toBe(button);
		expect(button).toHaveFocus();
		expect(button).toHaveAttribute('aria-disabled', 'true');
		await user.keyboard('{Enter} ');
		expect(emitted('open-preview')).toBeUndefined();
		await rerender({ isRunnable: true, isPreviewOpen: true });
		expect(button).toHaveFocus();
		expect(button).toHaveAttribute('aria-pressed', 'true');
		await user.click(button);
		expect(emitted('close-preview')).toHaveLength(1);
	});
});
