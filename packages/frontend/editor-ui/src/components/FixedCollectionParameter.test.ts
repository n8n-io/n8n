import { createComponentRenderer } from '@/__tests__/render';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import FixedCollectionParameter, { type Props } from '@/components/FixedCollectionParameter.vue';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { fireEvent, waitFor } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { nextTick } from 'vue';

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
		await nextTick();
		expect(input).toBeInTheDocument();
		expect(input).toHaveValue('Updated');
		expect(document.activeElement).toBe(input);
	});
});
