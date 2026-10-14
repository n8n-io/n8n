import { renderComponent } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import ParameterInputHint from './ParameterInputHint.vue';

describe('ParameterInputHint.vue', () => {
	it('styles the hint as redacted when redacted', () => {
		const { getByTestId } = renderComponent(ParameterInputHint, {
			pinia: createTestingPinia(),
			props: {
				hint: 'Reveal data first to see value',
				redacted: true,
			},
		});

		const hint = getByTestId('parameter-input-hint').parentElement;
		expect(hint?.className).toMatch(/redacted/);
	});

	it('does not style the hint as redacted by default', () => {
		const { getByTestId } = renderComponent(ParameterInputHint, {
			pinia: createTestingPinia(),
			props: {
				hint: 'undefined',
			},
		});

		const hint = getByTestId('parameter-input-hint').parentElement;
		expect(hint?.className).not.toMatch(/redacted/);
	});
});
