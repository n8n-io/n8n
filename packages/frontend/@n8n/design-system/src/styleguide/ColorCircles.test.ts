import { render } from '@testing-library/vue';
import { mock, mockClear } from 'vitest-mock-extended';

import ColorCircles from './ColorCircles.vue';

describe('ColorCircles', () => {
	const mockCssDeclaration = mock<CSSStyleDeclaration>();
	window.getComputedStyle = () => mockCssDeclaration;

	beforeEach(() => {
		mockClear(mockCssDeclaration);
	});

	it('should render an empty section with empty colors', () => {
		const wrapper = render(ColorCircles, {
			props: {
				colors: [],
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should render a section with two colors', () => {
		mockCssDeclaration.getPropertyValue.mockReturnValue('#663399');

		const wrapper = render(ColorCircles, {
			props: {
				colors: ['--color-primary-shade-1', '--color-primary'],
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});
});
