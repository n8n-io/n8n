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
				const scrollTo = vi.spyOn(wrapper.get('.recycle-scroller-wrapper').element, 'scrollTo');
				wrapper.vm.scrollToKey('10');

				expect(scrollTo).toHaveBeenLastCalledWith({ top: 1000, behavior: 'auto' });
				wrapper.vm.scrollToKey('20', 'smooth');
				expect(scrollTo).toHaveBeenLastCalledWith({ top: 2000, behavior: 'smooth' });
				wrapper.unmount();
				scrollTo.mockRestore();
			} finally {
				if (originalOffsetHeight) {
					Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
				} else {
					Reflect.deleteProperty(HTMLElement.prototype, 'offsetHeight');
				}
			}
		});

		it('does not scroll past a target when the visible rows are taller than the estimate', async () => {
			const originalOffsetHeight = Object.getOwnPropertyDescriptor(
				HTMLElement.prototype,
				'offsetHeight',
			);
			const originalScrollTop = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTop');
			const scrollTops = new WeakMap<HTMLElement, number>();
			let rowHeight = itemSize;

			Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
				configurable: true,
				get() {
					if (this.classList?.contains('recycle-scroller-wrapper')) return 400;
					if (this.classList?.contains('recycle-scroller-item')) return rowHeight;
					return itemSize;
				},
			});
			Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
				configurable: true,
				get() {
					return scrollTops.get(this) ?? 0;
				},
				set(value: number) {
					scrollTops.set(this, value);
				},
			});
			// jsdom drops scrollTo when the layout height stays 0.
			const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(function (
				this: HTMLElement,
				options?: ScrollToOptions | number,
			) {
				if (typeof options === 'object' && typeof options.top === 'number') {
					this.scrollTop = options.top;
				}
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
				await nextTick();
				rowHeight = itemSize + 60;
				wrapper.vm.scrollToKey('20');
				await nextTick();
				await nextTick();

				// The first screen stays at the estimate. Three rows above the target grow.
				// Rows on screen must not add their growth, or the target leaves the view.
				expect(wrapper.get('.recycle-scroller-wrapper').element.scrollTop).toBe(2000 + 60 * 3);
				wrapper.unmount();
			} finally {
				scrollTo.mockRestore();
				if (originalOffsetHeight) {
					Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
				} else {
					Reflect.deleteProperty(HTMLElement.prototype, 'offsetHeight');
				}
				if (originalScrollTop) {
					Object.defineProperty(HTMLElement.prototype, 'scrollTop', originalScrollTop);
				} else {
					Reflect.deleteProperty(HTMLElement.prototype, 'scrollTop');
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
