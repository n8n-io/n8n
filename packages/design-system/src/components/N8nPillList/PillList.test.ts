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
					propC: false,
					propA: 'propA value',
				},
				inputs: [
					{ name: 'propA', initialValue: '' },
					{ name: 'propB', initialValue: 3 },
					{ name: 'propC', initialValue: true },
					{ name: 'propD', initialValue: true },
				],
			},
		});

		expect(wrapper.queryByTestId('pill-list-pill-propA')).not.toBeInTheDocument();
		expect(wrapper.queryByTestId('pill-list-pill-propC')).not.toBeInTheDocument();
		expect(wrapper.getByTestId('pill-list-slot-propA')).toBeInTheDocument();
		expect(wrapper.getByTestId('pill-list-pill-propB')).toBeInTheDocument();
		expect(wrapper.getByTestId('pill-list-slot-propC')).toBeInTheDocument();
		expect(wrapper.getByTestId('pill-list-pill-propD')).toBeInTheDocument();

		// This asserts order - specifically that propA appears before propC
		expect(
			wrapper
				.getByTestId('pill-list-slot-propA')
				.compareDocumentPosition(wrapper.getByTestId('pill-list-slot-propC')),
		).toEqual(2);

		expect(wrapper.html()).toMatchSnapshot();
	});
});
