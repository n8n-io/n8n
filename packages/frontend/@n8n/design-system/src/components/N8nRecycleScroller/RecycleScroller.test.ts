import { render } from '@testing-library/vue';

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
	});
});
