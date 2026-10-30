import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';

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
	it('opens from the trigger and emits the selected value', async () => {
		const { getByLabelText, findByText, emitted } = renderComponent();

		await userEvent.click(getByLabelText('Screen size'));
		await userEvent.click(await findByText('Mobile'));

		expect(emitted('update:modelValue')).toEqual([['mobile']]);
	});
});
