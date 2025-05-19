import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import ParameterOverrideSelectableList from './ParameterOverrideSelectableList.vue';
import { createTestingPinia } from '@pinia/testing';
import { ref } from 'vue';
import { createAppModals } from '@/__tests__/utils';
import { STORES } from '@n8n/stores';

vi.mock('vue-router', () => {
	return {
		useRouter: () => ({
			push: vi.fn(),
			resolve: vi.fn().mockReturnValue({ href: 'https://test.com' }),
		}),
		useRoute: () => ({}),
		RouterLink: vi.fn(),
	};
});

beforeEach(() => {
	createAppModals();
});

const renderComponent = createComponentRenderer(ParameterOverrideSelectableList, {
	pinia: createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: {
				settings: {
					enterprise: {
						externalSecrets: false,
					},
				},
			},
		},
	}),
});

describe('ParameterOverrideSelectableList', () => {
	it('should render the component', () => {
		const model = ref({
			type: 'fromAI',
			extraProps: {
				description: {
					initialValue: 'Test',
					type: 'string',
					typeOptions: { rows: 2 },
					tooltip: '',
				},
			},
			extraPropValues: { description: 'Test description' },
		});
		const update = vi.fn((v) => (model.value = v));

		const { getByTestId } = renderComponent({
			props: {
				isReadOnly: false,
				parameter: {
					displayName: 'test',
					name: 'value["test"]',
					type: 'string',
					default: '',
					required: false,
					description: '',
					readOnly: false,
				},
				path: 'parameters.workflowInputs.value["test"]',
				modelValue: model.value,
				'onUpdate:modelValue': update,
			},
		});

		expect(getByTestId('parameter-input-field')).toBeInTheDocument();
		expect(getByTestId('selectable-list-remove-slot-description')).toBeInTheDocument();
	});

	it('should update extra prop value when input changes', async () => {
		const model = ref({
			type: 'fromAI',
			extraProps: {
				description: {
					initialValue: 'Test',
					type: 'string',
					typeOptions: { rows: 2 },
					tooltip: '',
				},
			},
			extraPropValues: { description: 'Test description' },
		});
		const update = vi.fn((v) => (model.value = v));

		const { getByTestId, emitted } = renderComponent({
			props: {
				isReadOnly: false,
				parameter: {
					displayName: 'test',
					name: 'value["test"]',
					type: 'string',
					default: '',
					required: false,
					description: '',
					readOnly: false,
				},
				path: 'parameters.workflowInputs.value["test"]',
				modelValue: model.value,
				'onUpdate:modelValue': update,
			},
		});

		await userEvent.type(getByTestId('parameter-input-field'), '2');
		expect(model.value.extraPropValues.description).toBe('Test description2');
		expect(emitted('update')).toHaveLength(1);
		expect(emitted('update')[0]).toEqual([
			{
				name: 'parameters.workflowInputs.value["test"]',
				value:
					"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('test', `Test description2`, 'string') }}",
			},
		]);
	});

	it('should reset extra prop back to default when removed', async () => {
		const model = ref({
			type: 'fromAI',
			extraProps: {
				description: {
					initialValue: '',
					type: 'string',
					typeOptions: { rows: 2 },
					tooltip: '',
				},
			},
			extraPropValues: { description: 'Test description' },
		});
		const update = vi.fn((v) => (model.value = v));

		const { getByTestId, emitted } = renderComponent({
			props: {
				isReadOnly: false,
				parameter: {
					displayName: 'test',
					name: 'value["test"]',
					type: 'string',
					default: '',
					required: false,
					description: '',
					readOnly: false,
				},
				path: 'parameters.workflowInputs.value["test"]',
				modelValue: model.value,
				'onUpdate:modelValue': update,
			},
		});

		expect(model.value.extraPropValues.description).toBeDefined();
		await userEvent.click(getByTestId('selectable-list-remove-slot-description'));
		expect(model.value.extraPropValues.description).toBeUndefined();
		expect(emitted('update')).toHaveLength(1);
		expect(emitted('update')[0]).toEqual([
			{
				name: 'parameters.workflowInputs.value["test"]',
				value: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('test', ``, 'string') }}",
			},
		]);
	});
});
