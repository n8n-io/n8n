import { render } from '@testing-library/vue';
import { mount } from '@vue/test-utils';

import N8nCard from './Card.vue';

describe('components', () => {
	describe('N8nCard', () => {
		it('updates hover classes when the click listener changes', async () => {
			const onClick = vi.fn();
			const wrapper = mount(N8nCard);
			expect(wrapper.classes()).not.toContain('hoverable');
			await wrapper.setProps({ onClick });
			expect(wrapper.classes()).toContain('hoverable');
			await wrapper.trigger('click');
			expect(onClick).toHaveBeenCalledOnce();
			await wrapper.setProps({ onClick: undefined });
			expect(wrapper.classes()).not.toContain('hoverable');
			await wrapper.setProps({ hoverable: true });
			expect(wrapper.classes()).toContain('hoverable');
			wrapper.unmount();
		});

		it('removes hover classes from an initially clickable card', async () => {
			const wrapper = mount(N8nCard, { attrs: { onClick: vi.fn() } });
			expect(wrapper.classes()).toContain('hoverable');
			await wrapper.setProps({ onClick: undefined });
			expect(wrapper.classes()).not.toContain('hoverable');
			wrapper.unmount();
		});

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
