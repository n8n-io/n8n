import { render } from '@testing-library/vue';
import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';

import N8nCard from './Card.vue';

describe('components', () => {
	describe('N8nCard', () => {
		it('updates hover classes when the click listener changes', async () => {
			const onClick = vi.fn();
			const clickHandler = ref<typeof onClick>();
			const hoverable = ref(false);
			const wrapper = mount(
				defineComponent({
					setup: () => () =>
						h(N8nCard, { onClick: clickHandler.value, hoverable: hoverable.value }),
				}),
			);
			const card = wrapper.getComponent(N8nCard);
			expect(card.classes()).not.toContain('hoverable');
			clickHandler.value = onClick;
			await nextTick();
			expect(card.classes()).toContain('hoverable');
			await card.trigger('click');
			expect(onClick).toHaveBeenCalledOnce();
			clickHandler.value = undefined;
			await nextTick();
			expect(card.classes()).not.toContain('hoverable');
			hoverable.value = true;
			await nextTick();
			expect(card.classes()).toContain('hoverable');
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
