import { createComponentRenderer } from '@/__tests__/render';

import ParameterInputLoading from './ParameterInputLoading.vue';

const renderComponent = createComponentRenderer(ParameterInputLoading);

describe('ParameterInputLoading', () => {
	it('reserves the field row while the chunk loads', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('parameter-input-loading')).toBeVisible();
	});
});
