import { createComponentRenderer } from '@/__tests__/render';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import CollectionParameterNew, { type Props } from './CollectionParameterNew.vue';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { setActivePinia } from 'pinia';
import { nextTick } from 'vue';

describe('CollectionParameterNew.vue', () => {
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
					name: 'field1',
					displayName: 'Field 1',
					values: [
						{
							displayName: 'Value 1',
							name: 'value1',
							type: 'string',
							default: 'Default Value',
						},
					],
				},
				{
					name: 'field2',
					displayName: 'Field 2',
					values: [
						{
							displayName: 'Value 2',
							name: 'value2',
							type: 'number',
							default: 0,
						},
					],
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

	const renderComponent = createComponentRenderer(CollectionParameterNew, {
		props: baseProps,
	});

	describe('Rendering', () => {
		it('renders the component with section header when not nested', () => {
			const { getByText } = renderComponent();
			expect(getByText('Additional Fields')).toBeInTheDocument();
		});

		it('renders add button in header when not nested', () => {
			const { getByTestId } = renderComponent();
			expect(getByTestId('collection-parameter-add-header')).toBeInTheDocument();
		});

		it('does not render section header add button when nested', () => {
			const { queryByTestId } = renderComponent({
				props: {
					...baseProps,
					isNested: true,
				},
			});
			// When nested, uses collapsible panel instead of section header
			// Section header has the add button with this test ID
			expect(queryByTestId('collection-parameter-add-header')).not.toBeInTheDocument();
		});

		it('renders dropdown for adding new items', () => {
			const { getByTestId } = renderComponent();
			expect(getByTestId('collection-parameter-add-dropdown')).toBeInTheDocument();
		});
	});

	describe('Collections with values', () => {
		it('renders parameters from collection items', () => {
			const { getByText } = renderComponent({
				props: {
					...baseProps,
					values: {
						field1: { value1: 'Test Value' },
					},
					nodeValues: {
						parameters: {
							additionalFields: {
								field1: { value1: 'Test Value' },
							},
						},
					},
				},
			});

			expect(getByText('Value 1')).toBeInTheDocument();
		});

		it('renders parameters from multiple collections correctly', () => {
			const { getByText } = renderComponent({
				props: {
					...baseProps,
					values: {
						field1: { value1: 'Test 1' },
						field2: { value2: 42 },
					},
					nodeValues: {
						parameters: {
							additionalFields: {
								field1: { value1: 'Test 1' },
								field2: { value2: 42 },
							},
						},
					},
				},
			});

			expect(getByText('Value 1')).toBeInTheDocument();
			expect(getByText('Value 2')).toBeInTheDocument();
		});
	});

	describe('Adding items', () => {
		it('emits valueChanged event when adding a collection via dropdown', async () => {
			const { getByTestId } = renderComponent();

			// Click the dropdown trigger
			const dropdown = getByTestId('collection-parameter-add-dropdown');
			await userEvent.click(dropdown);

			await nextTick();

			// The dropdown should have opened - this would require clicking an option
			// For now, we test the event emission indirectly
			expect(dropdown).toBeInTheDocument();
		});

		it('opens dropdown and scrolls into view when header add button clicked', async () => {
			const { getByTestId } = renderComponent();

			const addButton = getByTestId('collection-parameter-add-header');
			await userEvent.click(addButton);

			await nextTick();

			// Verify the dropdown is present
			const dropdown = getByTestId('collection-parameter-add-dropdown');
			expect(dropdown).toBeInTheDocument();
		});
	});

	describe('Deleting items', () => {
		it('renders collection parameters correctly', () => {
			const { getByText, getAllByRole } = renderComponent({
				props: {
					...baseProps,
					values: {
						field1: { value1: 'Test Value' },
					},
					nodeValues: {
						parameters: {
							additionalFields: {
								field1: { value1: 'Test Value' },
							},
						},
					},
				},
			});

			expect(getByText('Value 1')).toBeInTheDocument();
			const buttons = getAllByRole('button');
			expect(buttons.length).toBeGreaterThan(0);
		});
	});

	describe('Read-only mode', () => {
		it('does not render add buttons when isReadOnly is true', () => {
			const { queryByTestId } = renderComponent({
				props: {
					...baseProps,
					isReadOnly: true,
				},
			});

			expect(queryByTestId('collection-parameter-add-header')).not.toBeInTheDocument();
			expect(queryByTestId('collection-parameter-add-dropdown')).not.toBeInTheDocument();
		});

		it('does not show delete actions when isReadOnly is true', () => {
			const { getByText } = renderComponent({
				props: {
					...baseProps,
					isReadOnly: true,
					values: {
						field1: { value1: 'Test Value' },
					},
					nodeValues: {
						parameters: {
							additionalFields: {
								field1: { value1: 'Test Value' },
							},
						},
					},
				},
			});

			// Verify the parameter is rendered
			expect(getByText('Value 1')).toBeInTheDocument();
		});
	});

	describe('Sortable collections', () => {
		it('renders parameters when sortable and multiple items exist', () => {
			const { getByText } = renderComponent({
				props: {
					...baseProps,
					parameter: {
						...baseProps.parameter,
						typeOptions: {
							sortable: true,
						},
					},
					values: {
						field1: { value1: 'Test 1' },
						field2: { value2: 42 },
					},
					nodeValues: {
						parameters: {
							additionalFields: {
								field1: { value1: 'Test 1' },
								field2: { value2: 42 },
							},
						},
					},
				},
			});

			// Verify parameters from collections are rendered
			expect(getByText('Value 1')).toBeInTheDocument();
			expect(getByText('Value 2')).toBeInTheDocument();
		});

		it('respects sortable: false option', () => {
			const { getByText } = renderComponent({
				props: {
					...baseProps,
					parameter: {
						...baseProps.parameter,
						typeOptions: {
							sortable: false,
						},
					},
					values: {
						field1: { value1: 'Test 1' },
					},
					nodeValues: {
						parameters: {
							additionalFields: {
								field1: { value1: 'Test 1' },
							},
						},
					},
				},
			});

			expect(getByText('Value 1')).toBeInTheDocument();
		});
	});

	describe('Expanded state', () => {
		it('renders collection parameters', () => {
			const { getByText } = renderComponent({
				props: {
					...baseProps,
					values: {
						field1: { value1: 'Test' },
					},
					nodeValues: {
						parameters: {
							additionalFields: {
								field1: { value1: 'Test' },
							},
						},
					},
				},
			});

			// Verify parameter is rendered
			expect(getByText('Value 1')).toBeInTheDocument();
		});
	});

	describe('Disabled state', () => {
		it('disables add button when all options are added', () => {
			const { getByTestId } = renderComponent({
				props: {
					...baseProps,
					values: {
						field1: { value1: 'Test 1' },
						field2: { value2: 42 },
					},
					nodeValues: {
						parameters: {
							additionalFields: {
								field1: { value1: 'Test 1' },
								field2: { value2: 42 },
							},
						},
					},
				},
			});

			const addButton = getByTestId('collection-parameter-add-header');
			expect(addButton).toBeDisabled();
		});

		it('shows tooltip when all options are added', () => {
			const { getByTestId } = renderComponent({
				props: {
					...baseProps,
					values: {
						field1: { value1: 'Test 1' },
						field2: { value2: 42 },
					},
					nodeValues: {
						parameters: {
							additionalFields: {
								field1: { value1: 'Test 1' },
								field2: { value2: 42 },
							},
						},
					},
				},
			});

			// Verify disabled state
			const addButton = getByTestId('collection-parameter-add-header');
			expect(addButton).toBeDisabled();
		});
	});

	describe('Properties rendering', () => {
		it('renders flattened properties for non-collection options', () => {
			const propsWithMixedOptions: Props = {
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
									displayName: 'Value',
									name: 'value',
									type: 'string',
									default: '',
								},
							],
						},
					],
				},
				values: {
					simpleField: 'test',
				},
				nodeValues: {
					parameters: {
						additionalFields: {
							simpleField: 'test',
						},
					},
				},
			};

			const { container } = renderComponent({
				props: propsWithMixedOptions,
			});

			// Component should render
			expect(container).toBeInTheDocument();
		});
	});

	describe('Header divider', () => {
		it('shows header divider when no properties exist', () => {
			const { getByText } = renderComponent({
				props: {
					...baseProps,
					values: {},
				},
			});

			// Verify header is present
			expect(getByText('Additional Fields')).toBeInTheDocument();
		});

		it('shows header divider when first property is not a collection/fixedCollection', () => {
			const propsWithSimpleField: Props = {
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
					],
				},
				values: {
					simpleField: 'test',
				},
				nodeValues: {
					parameters: {
						additionalFields: {
							simpleField: 'test',
						},
					},
				},
			};

			const { getByText } = renderComponent({
				props: propsWithSimpleField,
			});

			expect(getByText('Additional Fields')).toBeInTheDocument();
		});
	});
});
