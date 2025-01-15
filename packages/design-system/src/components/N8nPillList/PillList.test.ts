import { fireEvent, render } from '@testing-library/vue';

import N8nPillList from './PillList.vue';

describe('N8nPillList', () => {
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
				inputs: [{ name: 'propA', initialValue: '' }],
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
					{ name: 'propA', initialValue: '' },
					{ name: 'propB', initialValue: 3 },
					{ name: 'propC', initialValue: true },
				],
			},
		});

		expect(wrapper.queryByTestId('pill-list-pill-propA')).not.toBeInTheDocument();
		expect(wrapper.getByTestId('pill-list-slot-propA')).toBeInTheDocument();
		expect(wrapper.getByTestId('pill-list-pill-propB')).toBeInTheDocument();
		expect(wrapper.getByTestId('pill-list-pill-propC')).toBeInTheDocument();

		expect(wrapper.html()).toMatchSnapshot();
	});
});
