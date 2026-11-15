import { createComponentRenderer } from '@n8n/frontend-test-utils';
import userEvent from '@testing-library/user-event';

import AppVisibilitySelect from './AppVisibilitySelect.vue';

const renderComponent = createComponentRenderer(AppVisibilitySelect, {
	props: { modelValue: 'project' },
});

describe('AppVisibilitySelect', () => {
	it('emits the selected visibility', async () => {
		const { getByTestId, findByText, emitted } = renderComponent();

		await userEvent.click(getByTestId('app-visibility-select'));
		await userEvent.click(await findByText('Anyone in your n8n instance'));

		expect(emitted('update:modelValue')).toEqual([['instance']]);
	});

	it('offers only the project and instance options', async () => {
		const { getByTestId, findByTestId, queryByTestId } = renderComponent();

		await userEvent.click(getByTestId('app-visibility-select'));

		expect(await findByTestId('app-visibility-option-project')).toBeInTheDocument();
		expect(queryByTestId('app-visibility-option-instance')).toBeInTheDocument();
		expect(queryByTestId('app-visibility-option-public')).not.toBeInTheDocument();
	});
});
