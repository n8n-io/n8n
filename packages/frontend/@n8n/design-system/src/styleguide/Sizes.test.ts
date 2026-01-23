import { render } from '@testing-library/vue';
import { mock, mockClear } from 'vitest-mock-extended';

import Sizes from './Sizes.vue';

describe('Sizes', () => {
	const mockCssDeclaration = mock<CSSStyleDeclaration>();
	window.getComputedStyle = () => mockCssDeclaration;

	beforeEach(() => {
		mockClear(mockCssDeclaration);
	});

	it('should render a section with a variable', () => {
		mockCssDeclaration.getPropertyValue.mockReturnValue('400');

		const wrapper = render(Sizes, {
			props: {
				variables: ['--font-weight--regular'],
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});
});
