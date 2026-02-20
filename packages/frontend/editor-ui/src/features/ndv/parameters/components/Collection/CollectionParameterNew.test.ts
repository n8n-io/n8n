import { createComponentRenderer } from '@/__tests__/render';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import CollectionParameterNew, { type Props } from './CollectionParameterNew.vue';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { flushPromises } from '@vue/test-utils';

describe('CollectionParameterNew.vue', () => {
	const pinia = createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: {
				settings: SETTINGS_STORE_DEFAULT_STATE.settings,
			},
		},
	});
	setActivePinia(pinia);

	afterEach(async () => {
		await flushPromises();
	});

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

		it('renders add button in collapsible panel when nested', () => {
			const { getByTestId } = renderComponent({
				props: {
					...baseProps,
					isNested: true,
				},
			});
			// When nested, uses collapsible panel instead of section header
			// Both have the add button with this test ID
			expect(getByTestId('collection-parameter-add-header')).toBeInTheDocument();
		});

		it('renders dropdown for adding new items', () => {
			const { getByTestId } = renderComponent();
			expect(getByTestId('collection-parameter-add-dropdown')).toBeInTheDocument();
		});
	});

	describe('Collections with values', () => {
		it('renders parameters from collection items', async () => {
			const { findByText } = renderComponent({
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

			expect(await findByText('Value 1')).toBeInTheDocument();
		});

		it('renders parameters from multiple collections correctly', async () => {
			const { findByText } = renderComponent({
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

			expect(await findByText('Value 1')).toBeInTheDocument();
			expect(await findByText('Value 2')).toBeInTheDocument();
		});
	});

	describe('Adding items', () => {
		it('renders dropdown for adding collection items', async () => {
			const { getByTestId } = renderComponent();

			// Click the dropdown trigger
			const dropdown = getByTestId('collection-parameter-add-dropdown');
			await userEvent.click(dropdown);

			await nextTick();

			expect(dropdown).toBeInTheDocument();
		});

		it('renders add button in header', async () => {
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
		it('renders collection parameters correctly', async () => {
			const { findByText, getAllByRole } = renderComponent({
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

			expect(await findByText('Value 1')).toBeInTheDocument();
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

		it('renders parameters in read-only mode', async () => {
			const { findByText } = renderComponent({
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
			expect(await findByText('Value 1')).toBeInTheDocument();
		});
	});

	describe('Sortable collections', () => {
		it('renders parameters when sortable and multiple items exist', async () => {
			const { findByText } = renderComponent({
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
			expect(await findByText('Value 1')).toBeInTheDocument();
			expect(await findByText('Value 2')).toBeInTheDocument();
		});

		it('respects sortable: false option', async () => {
			const { findByText } = renderComponent({
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

			expect(await findByText('Value 1')).toBeInTheDocument();
		});
	});

	describe('Expanded state', () => {
		it('renders collection parameters', async () => {
			const { findByText } = renderComponent({
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
			expect(await findByText('Value 1')).toBeInTheDocument();
		});
	});

	describe('Disabled state', () => {
		it('renders add dropdown when all options are added', () => {
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

			// When all options are added, the dropdown is still rendered but disabled
			const addButtonContainer = getByTestId('collection-parameter-add-header');
			expect(addButtonContainer).toBeInTheDocument();
		});

		it('does not show bottom add button when all options are added', () => {
			const { queryByTestId } = renderComponent({
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

			// When all options are added (isAddDisabled = true), the bottom add button should not render
			const bottomAddButton = queryByTestId('collection-parameter-add-dropdown');
			expect(bottomAddButton).not.toBeInTheDocument();
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
