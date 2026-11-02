import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';

import AppPreviewOptionMenu from './AppPreviewOptionMenu.vue';

const renderComponent = createComponentRenderer(AppPreviewOptionMenu, {
	props: {
		label: 'Screen size',
		modelValue: 'desktop',
		options: [
			{ value: 'desktop', label: 'Desktop', icon: 'monitor' },
			{ value: 'mobile', label: 'Mobile', icon: 'smartphone' },
		],
	},
});

describe('AppPreviewOptionMenu', () => {
	it('shows the label as a tooltip on hover', async () => {
		const { getByLabelText } = renderComponent();

		getByLabelText('Screen size').dispatchEvent(
			new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse' }),
		);

		await waitFor(() =>
			expect(document.querySelector('[data-dismissable-layer]')).toHaveTextContent('Screen size'),
		);
	});

	it('opens from the trigger and emits the selected value', async () => {
		const { getByLabelText, findByText, emitted } = renderComponent();

		await userEvent.click(getByLabelText('Screen size'));
		await userEvent.click(await findByText('Mobile'));

		expect(emitted('update:modelValue')).toEqual([['mobile']]);
	});
});
