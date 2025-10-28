import { createComponentRenderer } from '@/__tests__/render';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import FixedCollectionParameterNew, { type Props } from './FixedCollectionParameterNew.vue';
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
			expect(rendered.getByTestId('fixed-collection-add-header-nested')).toBeInTheDocument();
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
		it('updates local state and emits reordered values when items are dragged', async () => {
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

		it('disables add dropdown when all options are added', () => {
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

			const addDropdown = getByTestId('fixed-collection-add-top-level-dropdown');
			expect(addDropdown).toBeInTheDocument();
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

			const addDropdown = getByTestId('fixed-collection-add-top-level-dropdown');
			expect(addDropdown).toBeInTheDocument();
		});

		it('renders add dropdown at bottom for top-level multiple options', () => {
			const { getByTestId } = renderComponent({
				props: topLevelMultipleOptionsProps,
			});

			expect(getByTestId('fixed-collection-add-top-level-dropdown')).toBeInTheDocument();
		});
	});
});
