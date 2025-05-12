import { render } from '@testing-library/vue';

import N8nInput from './Input.vue';

describe('N8nInput', () => {
	it('should render correctly', () => {
		const wrapper = render(N8nInput, {
			props: {
				name: 'input',
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('should add .ph-no-capture class on password input', () => {
		const { container } = render(N8nInput, {
			props: {
				type: 'password',
			},
		});
		expect(container.firstChild).toHaveClass('ph-no-capture');
	});

	it('should not add .ph-no-capture class on other input types', () => {
		const { container } = render(N8nInput, {
			props: {
				type: 'number',
			},
		});
		expect(container.firstChild).not.toHaveClass('ph-no-capture');
	});
});
