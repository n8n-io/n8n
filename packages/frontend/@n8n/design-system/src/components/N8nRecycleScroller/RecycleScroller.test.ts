import { render } from '@testing-library/vue';
import { mount } from '@vue/test-utils';
import { h, nextTick } from 'vue';

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

		it('adds a footer after the last item and includes its height', async () => {
			const footerHeight = 30;
			const originalOffsetHeight = Object.getOwnPropertyDescriptor(
				HTMLElement.prototype,
				'offsetHeight',
			);
			Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
				configurable: true,
				get(this: HTMLElement) {
					return this.classList?.contains('recycle-scroller-footer') ? footerHeight : itemSize;
				},
			});

			try {
				const page = items.slice(0, 2);
				const wrapper = mount(N8nRecycleScroller, {
					props: {
						itemSize,
						itemKey,
						items: page,
					},
					slots: {
						footer: '<div>More</div>',
					},
				});

				await nextTick();
				await nextTick();
				await nextTick();

				const contentHeight = itemSize * page.length;
				expect(wrapper.get('.recycle-scroller-footer').attributes('style')).toContain(
					`translateY(${contentHeight}px)`,
				);
				expect(wrapper.get('.recycle-scroller').attributes('style')).toContain(
					`height: ${contentHeight + footerHeight}px`,
				);
				wrapper.unmount();
			} finally {
				if (originalOffsetHeight) {
					Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
				} else {
					Reflect.deleteProperty(HTMLElement.prototype, 'offsetHeight');
				}
			}
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

		describe('variable row heights', () => {
			const wrapperHeight = 200;
			const rowHeights = new Map<string, number>();
			let restoreDom: (() => void) | undefined;

			function installDomMocks() {
				const originalOffsetHeight = Object.getOwnPropertyDescriptor(
					HTMLElement.prototype,
					'offsetHeight',
				);
				const originalScrollTop = Object.getOwnPropertyDescriptor(
					HTMLElement.prototype,
					'scrollTop',
				);
				const scrollTops = new WeakMap<HTMLElement, number>();

				Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
					configurable: true,
					get(this: HTMLElement) {
						if (this.classList.contains('recycle-scroller-wrapper')) return wrapperHeight;
						const id = this.querySelector('[data-id]')?.getAttribute('data-id');
						if (id && rowHeights.has(id)) return rowHeights.get(id);
						return itemSize;
					},
				});
				// jsdom keeps scrollTop at 0 because it does not lay out the list.
				Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
					configurable: true,
					get(this: HTMLElement) {
						return scrollTops.get(this) ?? 0;
					},
					set(this: HTMLElement, value: number) {
						scrollTops.set(this, value);
					},
				});

				restoreDom = () => {
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
				};
			}

			async function mountScroller() {
				const updateSize = new Map<string, (item: { id: string }) => void>();
				const wrapper = mount(N8nRecycleScroller, {
					props: {
						itemSize,
						itemKey,
						items,
					},
					slots: {
						default: (slotProps: {
							item: { id: string };
							updateItemSize: (item: { id: string }) => void;
						}) => {
							updateSize.set(slotProps.item.id, slotProps.updateItemSize);
							return h('div', { 'data-id': slotProps.item.id });
						},
					},
				});

				await nextTick();
				await nextTick();

				return { wrapper, updateSize };
			}

			async function scrollTo(wrapper: ReturnType<typeof mount>, top: number) {
				const element = wrapper.get('.recycle-scroller-wrapper').element;
				element.scrollTop = top;
				element.dispatchEvent(new Event('scroll'));
				await nextTick();
				await nextTick();
			}

			beforeEach(() => {
				rowHeights.clear();
				installDomMocks();
			});

			afterEach(() => {
				restoreDom?.();
				restoreDom = undefined;
			});

			it('keeps scrollTop when a shorter row is measured inside or below the viewport', async () => {
				// Rows 0-3 fill the first window. Later rows are the ones scrolling in.
				for (const item of items.slice(5)) {
					rowHeights.set(item.id, 40);
				}

				const { wrapper } = await mountScroller();
				await scrollTo(wrapper, 500);

				expect(wrapper.vm.scrollTop).toBe(500);
				wrapper.unmount();
			});

			it('moves scrollTop when a row above the viewport changes height', async () => {
				const { wrapper, updateSize } = await mountScroller();
				await scrollTo(wrapper, 500);

				const aboveId = '3';
				rowHeights.set(aboveId, 40);
				updateSize.get(aboveId)?.({ id: aboveId });
				await nextTick();

				expect(wrapper.vm.scrollTop).toBe(440);

				const belowId = '8';
				rowHeights.set(belowId, 40);
				updateSize.get(belowId)?.({ id: belowId });
				await nextTick();

				expect(wrapper.vm.scrollTop).toBe(440);
				wrapper.unmount();
			});
		});
	});
});
