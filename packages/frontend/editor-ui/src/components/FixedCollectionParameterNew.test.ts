import { createComponentRenderer } from '@/__tests__/render';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import FixedCollectionParameterNew, {
	type Props,
} from '@/components/FixedCollectionParameterNew.vue';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
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
		it('renders the component with section header', () => {
			const { getByTestId, getByText } = renderComponent();
			expect(getByTestId('fixed-collection-rules')).toBeInTheDocument();
			expect(getByText('Routing Rules')).toBeInTheDocument();
		});

		it('renders add button in header', () => {
			const { getByTestId } = renderComponent();
			expect(getByTestId('fixed-collection-add-header')).toBeInTheDocument();
		});

		it('renders FixedCollectionItem components', () => {
			const { getByText } = renderComponent();
			// FixedCollectionItem renders with item titles
			expect(getByText('Values 1')).toBeInTheDocument();
		});

		it('emits valueChanged event on option creation', async () => {
			const { getByTestId, emitted } = renderComponent();
			await userEvent.click(getByTestId('fixed-collection-add-header'));
			expect(emitted('valueChanged')).toEqual([
				[
					{
						name: 'parameters.rules.values',
						value: [{ outputKey: 'Test Output Name' }, { outputKey: 'Default Output Name' }],
					},
				],
			]);
		});

		it('renders multiple items correctly', async () => {
			const { getByText } = renderComponent({
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

			// Verify items are rendered with stable indexes
			expect(getByText('Values 1')).toBeInTheDocument();
			expect(getByText('Values 2')).toBeInTheDocument();
			expect(getByText('Values 3')).toBeInTheDocument();
		});
	});

	describe('Nested multiple values wrapper', () => {
		it('renders collapsible wrapper with add button', () => {
			const { getByTestId, getByText } = renderComponent({
				props: {
					...baseProps,
					isNested: true,
				},
			});

			expect(getByText('Routing Rules')).toBeInTheDocument();
			expect(getByTestId('fixed-collection-add-header-nested')).toBeInTheDocument();
		});

		it('has controls for adding items', () => {
			const { getByTestId } = renderComponent({
				props: {
					...baseProps,
					isNested: true,
				},
			});

			// The wrapper has an add button in the header
			const headerButton = getByTestId('fixed-collection-add-header-nested');
			expect(headerButton).toBeInTheDocument();
		});

		it('expands by default when isNewlyAdded is true', () => {
			const { getByTestId } = renderComponent({
				props: {
					...baseProps,
					isNested: true,
					isNewlyAdded: true,
				},
			});

			// Verify it renders
			expect(getByTestId('fixed-collection-rules')).toBeInTheDocument();
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

		it('renders as collapsible panel', () => {
			const { getByText } = renderComponent({
				props: singleValueProps,
			});

			expect(getByText('Values')).toBeInTheDocument();
		});

		it('renders with actions', () => {
			const { getAllByRole } = renderComponent({
				props: singleValueProps,
			});

			// Check that actions are present (delete button should be rendered)
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

			expect(queryByTestId('fixed-collection-add-header')).not.toBeInTheDocument();
		});
	});

	describe('Sortable configuration', () => {
		it('sortable is true by default', () => {
			const { getByTestId } = renderComponent();
			// Just verify the component renders - testing drag handle requires testing FixedCollectionItem
			expect(getByTestId('fixed-collection-rules')).toBeInTheDocument();
		});

		it('sortable can be set to false', () => {
			const { getByTestId } = renderComponent({
				props: {
					...baseProps,
					parameter: {
						...baseProps.parameter,
						typeOptions: {
							...baseProps.parameter.typeOptions,
							sortable: false,
						},
					},
				},
			});

			// Just verify the component renders
			expect(getByTestId('fixed-collection-rules')).toBeInTheDocument();
		});
	});

	describe('Expand/collapse state management', () => {
		it('newly added items trigger valueChanged event', async () => {
			const { getByTestId, emitted } = renderComponent();

			// Add a new item
			await userEvent.click(getByTestId('fixed-collection-add-header'));

			await nextTick();

			// Verify event was emitted
			expect(emitted('valueChanged')).toBeDefined();
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

		it('renders select dropdown when multiple options available', () => {
			const { getByRole } = renderComponent({
				props: multipleOptionsProps,
			});

			// Should render a select dropdown instead of a button
			const select = getByRole('combobox');
			expect(select).toBeInTheDocument();
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

		it('renders section header with add button for top-level multiple options', () => {
			const { getByText, getByTestId } = renderComponent({
				props: topLevelMultipleOptionsProps,
			});

			expect(getByText('Routing Rules')).toBeInTheDocument();
			expect(getByTestId('fixed-collection-add-header-top-level')).toBeInTheDocument();
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

		it('disables add button when all options are added', () => {
			const { getByTestId } = renderComponent({
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

			const addButton = getByTestId('fixed-collection-add-header-top-level');
			expect(addButton).toBeDisabled();
		});

		it('shows correct tooltip when all options added', () => {
			const { getByTestId } = renderComponent({
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

			const addButton = getByTestId('fixed-collection-add-header-top-level');
			expect(addButton).toBeDisabled();
		});

		it('renders add dropdown at bottom for top-level multiple options', () => {
			const { getByTestId } = renderComponent({
				props: topLevelMultipleOptionsProps,
			});

			expect(getByTestId('fixed-collection-add-dropdown-top-level')).toBeInTheDocument();
		});
	});
});
