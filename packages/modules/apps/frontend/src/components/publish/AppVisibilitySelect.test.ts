import type { AppVisibility } from '@n8n/api-types';
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

	it.each<[AppVisibility, boolean]>([
		['project', false],
		['instance', false],
		['public', true],
	])('shows the public warning for %s: %s', (modelValue, warning) => {
		const { queryByTestId } = renderComponent({ props: { modelValue } });

		expect(queryByTestId('app-visibility-public') !== null).toBe(warning);
	});
});
