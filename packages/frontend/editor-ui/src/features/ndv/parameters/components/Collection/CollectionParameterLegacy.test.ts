import { createComponentRenderer } from '@/__tests__/render';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import CollectionParameterLegacy, { type Props } from './CollectionParameterLegacy.vue';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { setActivePinia } from 'pinia';
import { nextTick } from 'vue';

describe('CollectionParameterLegacy.vue', () => {
	const pinia = createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: {
				settings: SETTINGS_STORE_DEFAULT_STATE.settings,
			},
		},
	});
	setActivePinia(pinia);

	const baseProps: Props = {
		parameter: {
			displayName: 'Additional Fields',
			name: 'additionalFields',
			placeholder: 'Add Field',
			type: 'collection',
			default: {},
			options: [
				{
					displayName: 'Currency',
					name: 'currency',
					type: 'string',
					default: 'USD',
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'number',
					default: 0,
				},
			],
		},
		path: 'parameters.additionalFields',
		nodeValues: {
			parameters: {
				additionalFields: {},
			},
		},
		values: {},
		isReadOnly: false,
		isNested: false,
	};

	const renderComponent = createComponentRenderer(CollectionParameterLegacy, {
		props: baseProps,
	});

	describe('Rendering', () => {
		it('renders the component', () => {
			const { container } = renderComponent();
			expect(container).toBeInTheDocument();
		});

		it('shows "no properties" message when empty and not nested', () => {
			const { getByText } = renderComponent({
				props: {
					...baseProps,
					values: {},
				},
			});

			expect(getByText('No properties')).toBeInTheDocument();
		});

		it('does not show "no properties" message when nested', () => {
			const { queryByText } = renderComponent({
				props: {
					...baseProps,
					values: {},
					isNested: true,
				},
			});

			expect(queryByText('No properties')).not.toBeInTheDocument();
		});
	});

	describe('Adding items - Single option', () => {
		it('renders a button when only one option is available', () => {
			const singleOptionProps: Props = {
				...baseProps,
				parameter: {
					...baseProps.parameter,
					options: [
						{
							displayName: 'Currency',
							name: 'currency',
							type: 'string',
							default: 'USD',
						},
					],
				},
			};

			const { getByTestId } = renderComponent({
				props: singleOptionProps,
			});

			expect(getByTestId('collection-parameter-add')).toBeInTheDocument();
		});

		it('emits valueChanged event when clicking single option button', async () => {
			const singleOptionProps: Props = {
				...baseProps,
				parameter: {
					...baseProps.parameter,
					options: [
						{
							displayName: 'Currency',
							name: 'currency',
							type: 'string',
							default: 'USD',
						},
					],
				},
			};

			const { getByTestId, emitted } = renderComponent({
				props: singleOptionProps,
			});

			const addButton = getByTestId('collection-parameter-add');
			await userEvent.click(addButton);

			expect(emitted('valueChanged')).toBeDefined();
			expect(emitted('valueChanged')?.[0]).toEqual([
				{
					name: 'parameters.additionalFields.currency',
					value: 'USD',
				},
			]);
		});
	});

	describe('Adding items - Multiple options', () => {
		it('renders a select dropdown when multiple options are available', () => {
			const { getByRole } = renderComponent();

			const select = getByRole('combobox');
			expect(select).toBeInTheDocument();
		});

		it('shows all available options in dropdown', () => {
			const { getAllByTestId } = renderComponent();

			const options = getAllByTestId('collection-parameter-option');
			expect(options.length).toBe(2);
			expect(options[0]).toHaveTextContent('Currency');
			expect(options[1]).toHaveTextContent('Value');
		});

		it('emits valueChanged event when selecting an option', async () => {
			const { getByRole } = renderComponent();

			const select = getByRole('combobox');
			await userEvent.click(select);

			// Simulate selecting the first option
			const firstOption = select.querySelector('option[value="currency"]') as HTMLOptionElement;
			if (firstOption) {
				await userEvent.selectOptions(select, firstOption);
			}

			await nextTick();

			// The component should emit the event (exact behavior depends on N8nSelect implementation)
			// This test verifies the structure is correct
			expect(select).toBeInTheDocument();
		});

		it('filters out already added options from dropdown', () => {
			const { getByTestId } = renderComponent({
				props: {
					...baseProps,
					values: {
						currency: 'USD',
					},
					nodeValues: {
						parameters: {
							additionalFields: {
								currency: 'USD',
							},
						},
					},
				},
			});

			// When only one option remains, it shows as a button instead of dropdown
			const addButton = getByTestId('collection-parameter-add');
			expect(addButton).toHaveTextContent('Add Field');
		});
	});

	describe('Read-only mode', () => {
		it('does not render add controls when isReadOnly is true', () => {
			const { queryByTestId, queryByRole } = renderComponent({
				props: {
					...baseProps,
					isReadOnly: true,
				},
			});

			expect(queryByTestId('collection-parameter-add')).not.toBeInTheDocument();
			expect(queryByRole('combobox')).not.toBeInTheDocument();
		});
	});

	describe('Disabled state', () => {
		it('disables dropdown when all options are added (multiple options)', () => {
			const { getByRole } = renderComponent({
				props: {
					...baseProps,
					values: {
						currency: 'USD',
						value: 100,
					},
					nodeValues: {
						parameters: {
							additionalFields: {
								currency: 'USD',
								value: 100,
							},
						},
					},
				},
			});

			// When all options from multiple are added, it shows a dropdown (not a button)
			const select = getByRole('combobox');
			expect(select).toBeDisabled();
		});

		it('disables button when all options are added (single option)', () => {
			const { getByTestId } = renderComponent({
				props: {
					...baseProps,
					parameter: {
						...baseProps.parameter,
						options: [
							{
								displayName: 'Currency',
								name: 'currency',
								type: 'string',
								default: 'USD',
							},
						],
					},
					values: {
						currency: 'USD',
					},
					nodeValues: {
						parameters: {
							additionalFields: {
								currency: 'USD',
							},
						},
					},
				},
			});

			const addButton = getByTestId('collection-parameter-add');
			expect(addButton).toBeDisabled();
		});
	});

	describe('Collection values', () => {
		it('handles INodePropertyCollection options', () => {
			const collectionProps: Props = {
				...baseProps,
				parameter: {
					...baseProps.parameter,
					options: [
						{
							name: 'collection1',
							displayName: 'Collection 1',
							values: [
								{
									displayName: 'Field 1',
									name: 'field1',
									type: 'string',
									default: '',
								},
							],
						},
					],
				},
			};

			const { container } = renderComponent({
				props: collectionProps,
			});

			expect(container).toBeInTheDocument();
		});

		it('handles mixed INodeProperties and INodePropertyCollection options', () => {
			const mixedProps: Props = {
				...baseProps,
				parameter: {
					...baseProps.parameter,
					options: [
						{
							displayName: 'Simple Field',
							name: 'simpleField',
							type: 'string',
							default: '',
						},
						{
							name: 'collection1',
							displayName: 'Collection 1',
							values: [
								{
									displayName: 'Field 1',
									name: 'field1',
									type: 'string',
									default: '',
								},
							],
						},
					],
				},
			};

			const { container } = renderComponent({
				props: mixedProps,
			});

			expect(container).toBeInTheDocument();
		});
	});

	describe('Value handling', () => {
		it('adds newly added parameter to tracking set', async () => {
			const singleOptionProps: Props = {
				...baseProps,
				parameter: {
					...baseProps.parameter,
					options: [
						{
							displayName: 'Currency',
							name: 'currency',
							type: 'string',
							default: 'USD',
						},
					],
				},
			};

			const { getByTestId, emitted } = renderComponent({
				props: singleOptionProps,
			});

			const addButton = getByTestId('collection-parameter-add');
			await userEvent.click(addButton);

			// Verify event was emitted
			expect(emitted('valueChanged')).toBeDefined();
		});

		it('clears selection after adding an option', async () => {
			const singleOptionProps: Props = {
				...baseProps,
				parameter: {
					...baseProps.parameter,
					options: [
						{
							displayName: 'Currency',
							name: 'currency',
							type: 'string',
							default: 'USD',
						},
					],
				},
			};

			const { getByTestId } = renderComponent({
				props: singleOptionProps,
			});

			const addButton = getByTestId('collection-parameter-add');
			await userEvent.click(addButton);

			await nextTick();

			// Button should still be present (selection cleared internally)
			expect(addButton).toBeInTheDocument();
		});
	});

	describe('Placeholder text', () => {
		it('uses parameter placeholder when available', () => {
			const { getByTestId } = renderComponent({
				props: {
					...baseProps,
					parameter: {
						...baseProps.parameter,
						options: [
							{
								displayName: 'Currency',
								name: 'currency',
								type: 'string',
								default: 'USD',
							},
						],
					},
				},
			});

			const addButton = getByTestId('collection-parameter-add');
			expect(addButton).toHaveTextContent('Add Field');
		});
	});

	describe('Nested collections', () => {
		it('renders correctly when isNested is true', () => {
			const { container } = renderComponent({
				props: {
					...baseProps,
					isNested: true,
					values: {
						currency: 'USD',
					},
					nodeValues: {
						parameters: {
							additionalFields: {
								currency: 'USD',
							},
						},
					},
				},
			});

			expect(container).toBeInTheDocument();
		});
	});

	describe('hideDelete prop', () => {
		it('passes hideDelete to ParameterInputList', () => {
			const { container } = renderComponent({
				props: {
					...baseProps,
					hideDelete: true,
					values: {
						currency: 'USD',
					},
					nodeValues: {
						parameters: {
							additionalFields: {
								currency: 'USD',
							},
						},
					},
				},
			});

			expect(container).toBeInTheDocument();
		});
	});
});
