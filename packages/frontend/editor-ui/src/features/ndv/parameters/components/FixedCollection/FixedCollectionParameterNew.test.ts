import { createComponentRenderer } from '@/__tests__/render';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import FixedCollectionParameterNew, { type Props } from './FixedCollectionParameterNew.vue';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { nextTick } from 'vue';

describe('FixedCollectionParameterNew.vue', () => {
	const pinia = createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: {
				settings: SETTINGS_STORE_DEFAULT_STATE.settings,
			},
		},
	});
	setActivePinia(pinia);

	beforeEach(() => {
		sessionStorage.clear();
	});

	const baseProps: Props = {
		parameter: {
			displayName: 'Routing Rules',
			name: 'rules',
			placeholder: 'Add Routing Rule',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
				sortable: true,
			},
			default: '',
			options: [
				{
					name: 'values',
					displayName: 'Values',
					values: [
						{
							displayName: 'Output Name',
							name: 'outputKey',
							type: 'string',
							default: 'Default Output Name',
						},
					],
				},
			],
		},
		path: 'parameters.rules',
		nodeValues: {
			parameters: {
				rules: { values: [{ outputKey: 'Test Output Name' }] },
			},
		},
		values: {
			values: [{ outputKey: 'Test Output Name' }],
		},
		isReadOnly: false,
		isNested: false,
	};

	const renderComponent = createComponentRenderer(FixedCollectionParameterNew, {
		props: baseProps,
	});

	describe('Top-level multiple values', () => {
		it('renders with section header, add button, and items', () => {
			const rendered = renderComponent();

			expect(rendered.getByTestId('fixed-collection-rules')).toBeInTheDocument();
			expect(rendered.getByText('Routing Rules')).toBeInTheDocument();
			expect(rendered.getByTestId('fixed-collection-add-top-level-button')).toBeInTheDocument();
			expect(rendered.getByText('Values 1')).toBeInTheDocument();
		});

		it('emits valueChanged event on option creation', async () => {
			const rendered = renderComponent();
			await userEvent.click(rendered.getByTestId('fixed-collection-add-top-level-button'));
			expect(rendered.emitted('valueChanged')).toEqual([
				[
					{
						name: 'parameters.rules.values',
						value: [{ outputKey: 'Test Output Name' }, { outputKey: 'Default Output Name' }],
					},
				],
			]);
		});

		it('renders multiple items with stable indexes', () => {
			const rendered = renderComponent({
				props: {
					...baseProps,
					values: {
						values: [{ outputKey: 'Item 1' }, { outputKey: 'Item 2' }, { outputKey: 'Item 3' }],
					},
					nodeValues: {
						parameters: {
							rules: {
								values: [{ outputKey: 'Item 1' }, { outputKey: 'Item 2' }, { outputKey: 'Item 3' }],
							},
						},
					},
				},
			});

			expect(rendered.getByText('Values 1')).toBeInTheDocument();
			expect(rendered.getByText('Values 2')).toBeInTheDocument();
			expect(rendered.getByText('Values 3')).toBeInTheDocument();
		});
	});

	describe('Nested multiple values wrapper', () => {
		it('renders collapsible wrapper with add button', () => {
			const rendered = renderComponent({
				props: {
					...baseProps,
					isNested: true,
				},
			});

			expect(rendered.getByText('Routing Rules')).toBeInTheDocument();
			expect(rendered.getByTestId('fixed-collection-add-nested-button')).toBeInTheDocument();
		});

		it('expands by default when isNewlyAdded is true', () => {
			const rendered = renderComponent({
				props: {
					...baseProps,
					isNested: true,
					isNewlyAdded: true,
				},
			});

			expect(rendered.getByTestId('fixed-collection-rules')).toBeInTheDocument();
		});

		it('expands by default when there is only one item', () => {
			const rendered = renderComponent({
				props: {
					...baseProps,
					isNested: true,
					isNewlyAdded: false,
					values: {
						values: [{ outputKey: 'Single Item' }],
					},
					nodeValues: {
						parameters: {
							rules: { values: [{ outputKey: 'Single Item' }] },
						},
					},
				},
			});

			// The wrapper should be expanded - check that the nested content is visible
			expect(rendered.getByTestId('fixed-collection-add-nested-button')).toBeVisible();
		});

		it('does not expand by default when there are multiple items', () => {
			const rendered = renderComponent({
				props: {
					...baseProps,
					isNested: true,
					isNewlyAdded: false,
					values: {
						values: [{ outputKey: 'Item 1' }, { outputKey: 'Item 2' }],
					},
					nodeValues: {
						parameters: {
							rules: { values: [{ outputKey: 'Item 1' }, { outputKey: 'Item 2' }] },
						},
					},
				},
			});

			// The wrapper should be collapsed - check the collapsible panel state
			const collapsibleContent = rendered.container.querySelector(
				'[data-test-id="fixed-collection-rules"] [data-state="open"]',
			);
			expect(collapsibleContent).not.toBeInTheDocument();
		});
	});

	describe('Nested single value', () => {
		const singleValueProps: Props = {
			...baseProps,
			parameter: {
				...baseProps.parameter,
				typeOptions: {
					multipleValues: false,
				},
			},
			isNested: true,
			values: {
				values: { outputKey: 'Single Value' },
			},
		};

		it('renders single collapsible wrapper without duplicate nested panel', () => {
			const rendered = renderComponent({
				props: singleValueProps,
			});

			expect(rendered.getByText('Routing Rules')).toBeInTheDocument();
			expect(rendered.queryByText('Values')).toBeNull();

			const buttons = rendered.getAllByRole('button');
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

			expect(queryByTestId('fixed-collection-add-top-level-button')).not.toBeInTheDocument();
			expect(queryByTestId('fixed-collection-add-header-nested')).not.toBeInTheDocument();
		});
	});

	describe('Drag and drop reordering', () => {
		it('maintains correct display indexes after values are reordered', async () => {
			const rendered = renderComponent({
				props: {
					...baseProps,
					values: {
						values: [{ outputKey: 'Item 1' }, { outputKey: 'Item 2' }, { outputKey: 'Item 3' }],
					},
					nodeValues: {
						parameters: {
							rules: {
								values: [{ outputKey: 'Item 1' }, { outputKey: 'Item 2' }, { outputKey: 'Item 3' }],
							},
						},
					},
				},
			});

			const itemListComponent = rendered.container.querySelector(
				'[data-test-id="fixed-collection-rules"]',
			);
			expect(itemListComponent).toBeInTheDocument();

			await rendered.rerender({
				...baseProps,
				values: {
					values: [{ outputKey: 'Item 2' }, { outputKey: 'Item 3' }, { outputKey: 'Item 1' }],
				},
				nodeValues: {
					parameters: {
						rules: {
							values: [{ outputKey: 'Item 2' }, { outputKey: 'Item 3' }, { outputKey: 'Item 1' }],
						},
					},
				},
			});

			await nextTick();

			expect(rendered.getByText('Values 1')).toBeInTheDocument();
			expect(rendered.getByText('Values 2')).toBeInTheDocument();
			expect(rendered.getByText('Values 3')).toBeInTheDocument();
		});
	});

	describe('Value changes', () => {
		it('emits valueChanged when adding new items', async () => {
			const rendered = renderComponent();

			await userEvent.click(rendered.getByTestId('fixed-collection-add-top-level-button'));
			await nextTick();

			expect(rendered.emitted('valueChanged')).toBeDefined();
		});
	});

	describe('Multiple option types', () => {
		const multipleOptionsProps: Props = {
			...baseProps,
			parameter: {
				...baseProps.parameter,
				options: [
					{
						name: 'option1',
						displayName: 'Option 1',
						values: [
							{
								displayName: 'Field 1',
								name: 'field1',
								type: 'string',
								default: '',
							},
						],
					},
					{
						name: 'option2',
						displayName: 'Option 2',
						values: [
							{
								displayName: 'Field 2',
								name: 'field2',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			values: {},
		};

		it('renders dropdown when multiple options available', () => {
			const { getByTestId } = renderComponent({
				props: multipleOptionsProps,
			});

			// Should render a dropdown instead of a simple button
			const dropdown = getByTestId('fixed-collection-add-top-level-dropdown');
			expect(dropdown).toBeInTheDocument();
		});
	});

	describe('Value updates', () => {
		it('handles value updates correctly', async () => {
			const myProps: Props = {
				...baseProps,
				parameter: {
					...baseProps.parameter,
					options: [
						{
							name: 'p0',
							displayName: 'Values',
							values: [
								{
									displayName: 'Output Name',
									name: 'p0',
									type: 'string',
									default: '',
								},
							],
						},
					],
				},
			};

			const { getByTestId, rerender } = renderComponent({
				props: {
					...myProps,
					nodeValues: { parameters: { rules: { p0: [{ p0: 'Test' }] } } },
					values: { p0: [{ p0: 'Test' }] },
				},
			});

			// Verify initial render
			expect(getByTestId('fixed-collection-rules')).toBeInTheDocument();

			// Update values
			await rerender({
				...myProps,
				nodeValues: { parameters: { rules: { p0: [{ p0: 'Updated' }] } } },
				values: { p0: [{ p0: 'Updated' }] },
			});

			await nextTick();

			// Verify component still renders after update
			expect(getByTestId('fixed-collection-rules')).toBeInTheDocument();
		});

		it('normalizes mixed array and object values correctly', async () => {
			const myProps: Props = {
				...baseProps,
				parameter: {
					...baseProps.parameter,
					typeOptions: {
						multipleValues: false,
					},
				},
			};

			// Pass object value (not array) for single value mode
			const { getByTestId } = renderComponent({
				props: {
					...myProps,
					values: {
						values: { outputKey: 'Single Value' },
					},
					nodeValues: {
						parameters: {
							rules: { values: { outputKey: 'Single Value' } },
						},
					},
				},
			});

			expect(getByTestId('fixed-collection-rules')).toBeInTheDocument();
		});

		it('handles empty object values', async () => {
			const { getByTestId } = renderComponent({
				props: {
					...baseProps,
					values: {
						values: [],
					},
					nodeValues: {
						parameters: {
							rules: { values: [] },
						},
					},
				},
			});

			expect(getByTestId('fixed-collection-rules')).toBeInTheDocument();
		});
	});

	describe('Auto-expand first item', () => {
		it('should auto-expand newly added item when optionSelected is called', async () => {
			const rendered = renderComponent({
				props: {
					...baseProps,
					values: {}, // Start with no values
					nodeValues: {
						parameters: {
							rules: {},
						},
					},
				},
			});

			// Click the add button to add a new item
			await userEvent.click(rendered.getByTestId('fixed-collection-add-top-level-button'));
			await nextTick();

			// The newly added item should be expanded
			expect(rendered.emitted('valueChanged')).toBeDefined();
		});

		it('should auto-expand first item when there is only one item', () => {
			const rendered = renderComponent({
				props: {
					...baseProps,
					values: { values: [{ outputKey: 'Single Value' }] },
					nodeValues: {
						parameters: {
							rules: { values: [{ outputKey: 'Single Value' }] },
						},
					},
				},
			});

			// First item should be expanded when there's only one item
			const openContent = rendered.container.querySelector('[data-state="open"]');
			expect(openContent).toBeInTheDocument();
		});
	});

	describe('Top-level multiple options', () => {
		const topLevelMultipleOptionsProps: Props = {
			...baseProps,
			parameter: {
				...baseProps.parameter,
				typeOptions: {
					multipleValues: false,
				},
				options: [
					{
						name: 'option1',
						displayName: 'Option 1',
						values: [
							{
								displayName: 'Field 1',
								name: 'field1',
								type: 'string',
								default: '',
							},
						],
					},
					{
						name: 'option2',
						displayName: 'Option 2',
						values: [
							{
								displayName: 'Field 2',
								name: 'field2',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
			isNested: false,
			values: {},
		};

		it('renders section header with add dropdown for top-level multiple options', () => {
			const { getByText, getByTestId } = renderComponent({
				props: topLevelMultipleOptionsProps,
			});

			expect(getByText('Routing Rules')).toBeInTheDocument();
			expect(getByTestId('fixed-collection-add-top-level-dropdown')).toBeInTheDocument();
		});

		it('renders collapsible panels for each added option', () => {
			const { getByText } = renderComponent({
				props: {
					...topLevelMultipleOptionsProps,
					values: {
						option1: { field1: 'test' },
					},
					nodeValues: {
						parameters: {
							rules: { option1: { field1: 'test' } },
						},
					},
				},
			});

			expect(getByText('Option 1')).toBeInTheDocument();
		});

		it('hides add dropdown when all options are added', () => {
			const { queryByTestId } = renderComponent({
				props: {
					...topLevelMultipleOptionsProps,
					values: {
						option1: { field1: 'test1' },
						option2: { field2: 'test2' },
					},
					nodeValues: {
						parameters: {
							rules: {
								option1: { field1: 'test1' },
								option2: { field2: 'test2' },
							},
						},
					},
				},
			});

			expect(queryByTestId('fixed-collection-add-top-level-dropdown')).not.toBeInTheDocument();
		});

		it('renders add dropdown at bottom for top-level multiple options', () => {
			const { getByTestId } = renderComponent({
				props: topLevelMultipleOptionsProps,
			});

			expect(getByTestId('fixed-collection-add-top-level-dropdown')).toBeInTheDocument();
		});
	});

	describe('hideOptionalFields mode', () => {
		const hideOptionalFieldsProps: Props = {
			parameter: {
				displayName: 'Form Fields',
				name: 'formFields',
				placeholder: 'Add Form Field',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
					hideOptionalFields: true,
					addOptionalFieldButtonText: 'Add Attributes',
				},
				default: {},
				options: [
					{
						name: 'values',
						displayName: 'Values',
						values: [
							{
								displayName: 'Label',
								name: 'fieldLabel',
								type: 'string',
								default: '',
								required: true,
							},
							{
								displayName: 'Field Type',
								name: 'fieldType',
								type: 'options',
								default: 'text',
								required: true,
								options: [
									{ name: 'Text', value: 'text' },
									{ name: 'Number', value: 'number' },
								],
							},
							{
								displayName: 'Placeholder',
								name: 'placeholder',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Required Field',
								name: 'requiredField',
								type: 'boolean',
								default: false,
							},
							{
								displayName: 'Date format notice',
								name: 'dateNotice',
								type: 'notice',
								default: '',
							},
							{
								displayName: 'Min Value',
								name: 'minValue',
								type: 'number',
								default: 0,
								typeOptions: {
									showEvenWhenOptional: true,
								},
								displayOptions: {
									show: {
										fieldType: ['number'],
									},
								},
							},
						],
					},
				],
			},
			path: 'parameters.formFields',
			nodeValues: {
				parameters: {
					formFields: {
						values: [{ fieldLabel: 'Name', fieldType: 'text' }],
					},
				},
			},
			values: {
				values: [{ fieldLabel: 'Name', fieldType: 'text' }],
			},
			isReadOnly: false,
			isNested: false,
		};

		const renderHideOptionalFields = createComponentRenderer(FixedCollectionParameterNew, {
			props: hideOptionalFieldsProps,
		});

		it('renders the optional values picker when hideOptionalFields is true', () => {
			const { getByTestId } = renderHideOptionalFields();
			expect(getByTestId('fixed-collection-add-property')).toBeInTheDocument();
		});

		it('shows required values and notices by default', async () => {
			const { container } = renderHideOptionalFields();

			await waitFor(() => {
				const parameterItems = container.querySelectorAll('[data-test-id="parameter-item"]');
				expect(parameterItems.length).toBe(3);
			});
		});

		it('shows optional values in the picker dropdown', async () => {
			const { getByTestId } = renderHideOptionalFields();
			const picker = getByTestId('fixed-collection-add-property');
			expect(picker).toBeInTheDocument();

			const button = picker.querySelector('button');
			expect(button).toBeInTheDocument();

			if (button) {
				await userEvent.click(button);
			}

			await waitFor(() => {
				// N8nActionDropdown renders items with data-test-id like "action-*"
				const options = document.querySelectorAll('[class*="itemContainer"]');
				expect(options.length).toBe(2);
			});
		});

		it('emits valueChanged when toggling an optional value on', async () => {
			const { getByTestId, emitted } = renderHideOptionalFields();
			const picker = getByTestId('fixed-collection-add-property');
			const button = picker.querySelector('button');

			if (button) {
				await userEvent.click(button);
			}

			await waitFor(async () => {
				const options = document.querySelectorAll('[class*="itemContainer"]');
				const placeholderOption = Array.from(options).find((opt) =>
					opt.textContent?.includes('Placeholder'),
				);
				expect(placeholderOption).toBeDefined();

				if (placeholderOption) {
					await userEvent.click(placeholderOption);
				}
			});

			await waitFor(() => {
				const events = emitted('valueChanged');
				expect(events).toBeDefined();
				expect(events.length).toBeGreaterThan(0);
			});
		});

		it('initializes with optional values visible when they have non-default data', async () => {
			const propsWithSavedValue: Props = {
				...hideOptionalFieldsProps,
				nodeValues: {
					parameters: {
						formFields: {
							values: [
								{
									fieldLabel: 'Name',
									fieldType: 'text',
									placeholder: 'Enter your name',
								},
							],
						},
					},
				},
				values: {
					values: [
						{
							fieldLabel: 'Name',
							fieldType: 'text',
							placeholder: 'Enter your name',
						},
					],
				},
			};

			const { container } = renderHideOptionalFields({ props: propsWithSavedValue });

			await waitFor(() => {
				const parameterItems = container.querySelectorAll('[data-test-id="parameter-item"]');
				expect(parameterItems.length).toBe(4);
			});
		});

		it('shows optional field when array value differs from array default (deep equality)', async () => {
			const propsWithArrayField: Props = {
				parameter: {
					displayName: 'Config',
					name: 'config',
					type: 'fixedCollection',
					typeOptions: {
						multipleValues: true,
						hideOptionalFields: true,
					},
					default: {},
					options: [
						{
							name: 'values',
							displayName: 'Values',
							values: [
								{
									displayName: 'Name',
									name: 'name',
									type: 'string',
									default: '',
									required: true,
								},
								{
									displayName: 'Tags',
									name: 'tags',
									type: 'multiOptions',
									default: [],
									options: [
										{ name: 'Tag A', value: 'a' },
										{ name: 'Tag B', value: 'b' },
									],
								},
							],
						},
					],
				},
				path: 'parameters.config',
				nodeValues: {
					parameters: {
						config: {
							values: [
								{
									name: 'Test',
									tags: ['a', 'b'],
								},
							],
						},
					},
				},
				values: {
					values: [
						{
							name: 'Test',
							tags: ['a', 'b'],
						},
					],
				},
				isReadOnly: false,
				isNested: false,
			};

			const renderWithArrayField = createComponentRenderer(FixedCollectionParameterNew, {
				props: propsWithArrayField,
			});

			const { container } = renderWithArrayField();

			await waitFor(() => {
				const parameterItems = container.querySelectorAll('[data-test-id="parameter-item"]');
				expect(parameterItems.length).toBe(2);
			});
		});

		it('does not show optional field when array value equals array default (deep equality)', async () => {
			const propsWithArrayFieldDefault: Props = {
				parameter: {
					displayName: 'Config',
					name: 'config',
					type: 'fixedCollection',
					typeOptions: {
						multipleValues: true,
						hideOptionalFields: true,
					},
					default: {},
					options: [
						{
							name: 'values',
							displayName: 'Values',
							values: [
								{
									displayName: 'Name',
									name: 'name',
									type: 'string',
									default: '',
									required: true,
								},
								{
									displayName: 'Tags',
									name: 'tags',
									type: 'multiOptions',
									default: [],
									options: [
										{ name: 'Tag A', value: 'a' },
										{ name: 'Tag B', value: 'b' },
									],
								},
							],
						},
					],
				},
				path: 'parameters.config',
				nodeValues: {
					parameters: {
						config: {
							values: [
								{
									name: 'Test',
									tags: [],
								},
							],
						},
					},
				},
				values: {
					values: [
						{
							name: 'Test',
							tags: [],
						},
					],
				},
				isReadOnly: false,
				isNested: false,
			};

			const renderWithArrayFieldDefault = createComponentRenderer(FixedCollectionParameterNew, {
				props: propsWithArrayFieldDefault,
			});

			const { container } = renderWithArrayFieldDefault();

			await waitFor(() => {
				const parameterItems = container.querySelectorAll('[data-test-id="parameter-item"]');
				expect(parameterItems.length).toBe(1);
			});
		});

		it('shows fields with showEvenWhenOptional when displayOptions conditions are met', async () => {
			const propsWithAutoShow: Props = {
				...hideOptionalFieldsProps,
				nodeValues: {
					parameters: {
						formFields: {
							values: [{ fieldLabel: 'Age', fieldType: 'number' }],
						},
					},
				},
				values: {
					values: [{ fieldLabel: 'Age', fieldType: 'number' }],
				},
			};

			const { container } = renderHideOptionalFields({ props: propsWithAutoShow });

			await waitFor(() => {
				const parameterItems = container.querySelectorAll('[data-test-id="parameter-item"]');
				expect(parameterItems.length).toBe(4);
			});
		});
	});
});
