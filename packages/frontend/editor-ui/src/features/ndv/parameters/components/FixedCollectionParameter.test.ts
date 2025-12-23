import { createComponentRenderer } from '@/__tests__/render';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import FixedCollectionParameter, { type Props } from './FixedCollectionParameter.vue';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { fireEvent, waitFor } from '@testing-library/vue';
import { setActivePinia } from 'pinia';

describe('FixedCollectionParameter.vue', () => {
	const pinia = createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: {
				settings: SETTINGS_STORE_DEFAULT_STATE.settings,
			},
		},
	});
	setActivePinia(pinia);

	const props: Props = {
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
	};
	const renderComponent = createComponentRenderer(FixedCollectionParameter, { props });

	it('renders the component', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('fixed-collection-rules')).toBeInTheDocument();
		expect(getByTestId('fixed-collection-add')).toBeInTheDocument();
		expect(getByTestId('fixed-collection-delete')).toBeInTheDocument();
		expect(getByTestId('parameter-item')).toBeInTheDocument();
	});

	it('computes placeholder text correctly', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('fixed-collection-add')).toHaveTextContent('Add Routing Rule');
	});

	it('emits valueChanged event on option creation', async () => {
		const { getByTestId, emitted } = renderComponent();
		await userEvent.click(getByTestId('fixed-collection-add'));
		expect(emitted('valueChanged')).toEqual([
			[
				{
					name: 'parameters.rules.values',
					value: [{ outputKey: 'Test Output Name' }, { outputKey: 'Default Output Name' }],
				},
			],
		]);
	});

	it('emits valueChanged event on option deletion', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				...props,
				values: {
					values: [{ outputKey: 'Test' }],
				},
			},
		});
		await userEvent.click(getByTestId('fixed-collection-delete'));
		expect(emitted('valueChanged')).toEqual([
			[
				{
					name: 'parameters.rules.values',
					value: undefined,
				},
			],
		]);
	});

	it('[SUG-128] maintains focus after receiving updated values even when the inner most property shares the same name with its parent', async () => {
		const myProps: Props = {
			...props,
			parameter: {
				...props.parameter,
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
		const rendered = renderComponent({
			props: {
				...myProps,
				nodeValues: { parameters: { rules: { p0: [{ p0: 'Test' }] } } },
				values: { p0: [{ p0: 'Test' }] },
			},
		});

		const input = rendered.getByRole('textbox');

		await waitFor(() => expect(input).toHaveValue('Test'));
		await fireEvent.focus(input);

		expect(document.activeElement).toBe(input);

		await rendered.rerender({
			...myProps,
			nodeValues: { parameters: { rules: { p0: [{ p0: 'Updated' }] } } },
			values: { p0: [{ p0: 'Updated' }] },
		});
		expect(input).toBeInTheDocument();
		await waitFor(() => expect(input).toHaveValue('Updated'));
		expect(document.activeElement).toBe(input);
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
		};

		const renderRequiredOnly = createComponentRenderer(FixedCollectionParameter, {
			props: hideOptionalFieldsProps,
		});

		it('renders the optional values picker when hideOptionalFields is true', () => {
			const { container } = renderRequiredOnly();
			const picker = container.querySelector('.optional-values-picker');
			expect(picker).toBeInTheDocument();
		});

		it('shows required values and notices by default', async () => {
			const { container } = renderRequiredOnly();

			await waitFor(() => {
				const parameterItems = container.querySelectorAll('[data-test-id="parameter-item"]');
				expect(parameterItems.length).toBe(3);
			});
		});

		it('shows optional values in the picker dropdown', async () => {
			const { container } = renderRequiredOnly();
			const picker = container.querySelector('.optional-values-picker');
			expect(picker).toBeInTheDocument();

			const selectInput = picker?.querySelector('input');
			expect(selectInput).toBeInTheDocument();

			if (selectInput) {
				await userEvent.click(selectInput);
			}

			await waitFor(() => {
				const options = document.querySelectorAll('.optional-value-item');
				expect(options.length).toBe(2);

				const optionTexts = Array.from(options).map((opt) => opt.textContent?.trim());
				expect(optionTexts).toContain('Placeholder');
				expect(optionTexts).toContain('Required Field');
			});
		});

		it('emits valueChanged when toggling an optional value on', async () => {
			const { container, emitted } = renderRequiredOnly();
			const picker = container.querySelector('.optional-values-picker');
			const selectInput = picker?.querySelector('input');

			if (selectInput) {
				await userEvent.click(selectInput);
			}

			await waitFor(async () => {
				const options = document.querySelectorAll('.optional-value-item');
				const placeholderOption = Array.from(options).find(
					(opt) => opt.textContent?.trim() === 'Placeholder',
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

			const { container } = renderRequiredOnly({ props: propsWithSavedValue });

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
			};

			const renderWithArrayField = createComponentRenderer(FixedCollectionParameter, {
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
			};

			const renderWithArrayFieldDefault = createComponentRenderer(FixedCollectionParameter, {
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

			const { container } = renderRequiredOnly({ props: propsWithAutoShow });

			await waitFor(() => {
				const parameterItems = container.querySelectorAll('[data-test-id="parameter-item"]');
				expect(parameterItems.length).toBe(4);
			});
		});
	});
});
