import { fireEvent, render } from '@testing-library/vue';

import N8nSelectableList from './SelectableList.vue';

describe('N8nSelectableList', () => {
	it('renders when empty', () => {
		const wrapper = render(N8nSelectableList, {
			props: {
				modelValue: {},
				inputs: [],
			},
		});
		expect(wrapper.html()).toMatchSnapshot();
	});

	it('renders one clickable element that can be added and removed', async () => {
		const wrapper = render(N8nSelectableList, {
			props: {
				modelValue: {},
				inputs: [{ name: 'propA', initialValue: '' }],
			},
			global: {
				stubs: ['n8n-icon'],
			},
		});

		expect(wrapper.getByTestId('selectable-list-selectable-propA')).toBeInTheDocument();

		await fireEvent.click(wrapper.getByTestId('selectable-list-selectable-propA'));

		expect(wrapper.queryByTestId('selectable-list-selectable-propA')).not.toBeInTheDocument();
		expect(wrapper.getByTestId('selectable-list-slot-propA')).toBeInTheDocument();

		await fireEvent.click(wrapper.getByTestId('selectable-list-remove-slot-propA'));

		expect(wrapper.queryByTestId('selectable-list-slot-propA')).not.toBeInTheDocument();
		expect(wrapper.emitted('removeItem')).toHaveLength(1);
		expect(wrapper.emitted('removeItem')[0]).toEqual(['propA']);
	});

	it('renders multiple elements with some pre-selected', () => {
		const wrapper = render(N8nSelectableList, {
			props: {
				modelValue: {
					propC: false,
					propA: 'propA value',
				},
				inputs: [
					{ name: 'propD', initialValue: true },
					{ name: 'propC', initialValue: true },
					{ name: 'propB', initialValue: 3 },
					{ name: 'propA', initialValue: '' },
				],
			},
			global: {
				stubs: ['n8n-icon'],
			},
		});

		expect(wrapper.queryByTestId('selectable-list-selectable-propA')).not.toBeInTheDocument();
		expect(wrapper.queryByTestId('selectable-list-selectable-propC')).not.toBeInTheDocument();
		expect(wrapper.getByTestId('selectable-list-slot-propA')).toBeInTheDocument();
		expect(wrapper.getByTestId('selectable-list-selectable-propB')).toBeInTheDocument();
		expect(wrapper.getByTestId('selectable-list-slot-propC')).toBeInTheDocument();
		expect(wrapper.getByTestId('selectable-list-selectable-propD')).toBeInTheDocument();

		// This asserts order - specifically that propA appears before propC
		expect(
			wrapper
				.getByTestId('selectable-list-slot-propA')
				.compareDocumentPosition(wrapper.getByTestId('selectable-list-slot-propC')),
		).toEqual(4);

		expect(
			wrapper
				.getByTestId('selectable-list-selectable-propB')
				.compareDocumentPosition(wrapper.getByTestId('selectable-list-selectable-propD')),
		).toEqual(4);

		expect(wrapper.html()).toMatchSnapshot();
	});

	it('renders disabled collection without selectables', async () => {
		const wrapper = render(N8nSelectableList, {
			props: {
				modelValue: {
					propB: 'propB value',
				},
				disabled: true,
				inputs: [
					{ name: 'propA', initialValue: '' },
					{ name: 'propB', initialValue: '' },
					{ name: 'propC', initialValue: '' },
				],
			},
			global: {
				stubs: ['n8n-icon'],
			},
		});

		expect(wrapper.queryByTestId('selectable-list-selectable-propA')).not.toBeInTheDocument();
		expect(wrapper.getByTestId('selectable-list-slot-propB')).toBeInTheDocument();
		expect(wrapper.queryByTestId('selectable-list-selectable-propB')).not.toBeInTheDocument();
		expect(wrapper.queryByTestId('selectable-list-selectable-propC')).not.toBeInTheDocument();

		expect(wrapper.html()).toMatchSnapshot();
	});
});
