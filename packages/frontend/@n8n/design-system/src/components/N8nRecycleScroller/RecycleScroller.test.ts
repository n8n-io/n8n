import { render } from '@testing-library/vue';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import N8nRecycleScroller from './RecycleScroller.vue';

const itemSize = 100;
const itemKey = 'id';
const items = [...(new Array(100) as number[])].map((_, index) => ({
	id: String(index),
	name: `Item ${index}`,
}));

describe('components', () => {
	describe('N8nRecycleScroller', () => {
		it('should render correctly', () => {
			const wrapper = render(N8nRecycleScroller, {
				props: {
					itemSize,
					itemKey,
					items,
				},
			});

			expect(wrapper.container.querySelector('.recycle-scroller')).toHaveStyle(
				`height: ${itemSize * items.length}px`,
			);
			expect(wrapper.html()).toMatchSnapshot();
		});

		it('scrolls to an item by key using cached item positions', async () => {
			const originalOffsetHeight = Object.getOwnPropertyDescriptor(
				HTMLElement.prototype,
				'offsetHeight',
			);
			Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
				configurable: true,
				value: itemSize,
			});

			try {
				const wrapper = mount(N8nRecycleScroller, {
					props: {
						itemSize,
						itemKey,
						items,
					},
				});

				await nextTick();
				wrapper.vm.scrollToKey('10');

				expect(wrapper.find('.recycle-scroller-wrapper').element.scrollTop).toBe(1000);
			} finally {
				if (originalOffsetHeight) {
					Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
				} else {
					Reflect.deleteProperty(HTMLElement.prototype, 'offsetHeight');
				}
			}
		});

		it('keeps positions finite when the item keys are all replaced', async () => {
			const originalOffsetHeight = Object.getOwnPropertyDescriptor(
				HTMLElement.prototype,
				'offsetHeight',
			);
			Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
				configurable: true,
				value: itemSize,
			});

			try {
				const wrapper = mount(N8nRecycleScroller, {
					props: {
						itemSize,
						itemKey,
						items,
					},
				});

				await nextTick();

				const replacedItems = items.map((item) => ({
					id: `replaced-${item.id}`,
					name: `Replaced ${item.name}`,
				}));
				await wrapper.setProps({ items: replacedItems });

				// Unmeasured keys must fall back to itemSize, otherwise the positions turn
				// NaN and every item is rendered instead of the visible window.
				expect(wrapper.findAll('.recycle-scroller-item').length).toBeLessThan(replacedItems.length);
				expect(wrapper.find('.recycle-scroller').attributes('style')).not.toContain('NaN');
				expect(wrapper.find('.recycle-scroller-items-wrapper').attributes('style')).not.toContain(
					'NaN',
				);
			} finally {
				if (originalOffsetHeight) {
					Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
				} else {
					Reflect.deleteProperty(HTMLElement.prototype, 'offsetHeight');
				}
			}
		});
	});
});
