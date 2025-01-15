import { fireEvent, render, waitFor } from '@testing-library/vue';

import N8nPillList from './PillList.vue';

const itemSize = 100;
const itemKey = 'id';
const items = [...(new Array(100) as number[])].map((_, index) => ({
	id: String(index),
	name: `Item ${index}`,
}));

describe('components', () => {
	describe('N8nRecycleScroller', () => {
		it('renders when empty', () => {
			const wrapper = render(N8nPillList, {
				props: {
					modelValue: {},
					inputs: [],
				},
			});
			expect(wrapper.html()).toMatchSnapshot();
		});

		it('renders one clickable element that can be added and removed', async () => {
			const wrapper = render(N8nPillList, {
				props: {
					modelValue: {},
					inputs: [{ name: 'propA', defaultValue: '' }],
				},
			});

			expect(wrapper.getByTestId('pill-list-pill-propA')).toBeInTheDocument();

			await fireEvent.click(wrapper.getByTestId('pill-list-pill-propA'));

			expect(wrapper.queryByTestId('pill-list-pill-propA')).not.toBeInTheDocument();
			expect(wrapper.getByTestId('pill-list-slot-propA')).toBeInTheDocument();

			await fireEvent.click(wrapper.getByTestId('pill-list-remove-slot-propA'));

			expect(wrapper.queryByTestId('pill-list-slot-propA')).not.toBeInTheDocument();
		});

		it('renders multiple elements with some pre-selected', () => {
			const wrapper = render(N8nPillList, {
				props: {
					modelValue: {
						propA: 'propA value',
					},
					inputs: [
						{ name: 'propA', defaultValue: '' },
						{ name: 'propB', defaultValue: '' },
						{ name: 'propC', defaultValue: '' },
					],
				},
			});

			expect(wrapper.queryByTestId('pill-list-pill-propA')).not.toBeInTheDocument();
			expect(wrapper.getByTestId('pill-list-pill-propB')).toBeInTheDocument();
			expect(wrapper.getByTestId('pill-list-pill-propC')).toBeInTheDocument();
			expect(wrapper.getByTestId('pill-list-slot-propA')).toBeInTheDocument();

			expect(wrapper.html()).toMatchSnapshot();
		});
	});
});
