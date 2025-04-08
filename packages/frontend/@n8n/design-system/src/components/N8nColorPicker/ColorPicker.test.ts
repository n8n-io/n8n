import { render } from '@testing-library/vue';

import N8nColorPicker from './ColorPicker.vue';

describe('components', () => {
	describe('N8nColorPicker', () => {
		it('should render with input', () => {
			const { container } = render(N8nColorPicker, {
				props: {
					name: 'color-picker',
				},
			});
			expect(container).toMatchSnapshot();
		});

		it('should render without input', () => {
			const { container } = render(N8nColorPicker, {
				props: {
					name: 'color-picker',
					showInput: false,
				},
			});
			expect(container).toMatchSnapshot();
		});
	});
});
