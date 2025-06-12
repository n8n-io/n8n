import { render } from '@testing-library/vue';

import N8nCard from './Card.vue';

describe('components', () => {
	describe('N8nCard', () => {
		it('should render correctly', () => {
			const wrapper = render(N8nCard, {
				slots: {
					default: 'This is a card.',
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		it('should render correctly with header and footer', () => {
			const wrapper = render(N8nCard, {
				slots: {
					header: 'Header',
					default: 'This is a card.',
					footer: 'Footer',
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});
	});
});
