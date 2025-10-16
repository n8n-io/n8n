import { createComponentRenderer } from '@/__tests__/render';
import ResourceMapper from './ResourceMapper.vue';
import { createTestingPinia } from '@pinia/testing';
import {
	WORKFLOW_INPUTS_TEST_PARAMETER,
	WORKFLOW_INPUTS_TEST_NODE,
	WORKFLOW_INPUTS_TEST_PARAMETER_PATH,
	EXECUTE_WORKFLOW_NODE_TYPE_TEST,
} from './ResourceMapper.test.constants';
import { mockedStore, waitAllPromises } from '@/__tests__/utils';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');
	const params = {};
	const location = {};
	return {
		...actual,
		useRouter: () => ({
			push: vi.fn(),
		}),
		useRoute: () => ({
			params,
			location,
		}),
	};
});

let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;

const renderComponent = createComponentRenderer(ResourceMapper, {
	props: {
		inputSize: 'small',
		labelSize: 'small',
		dependentParametersValues: '-1',
		teleported: false,
	},
	global: {
		stubs: {
			ParameterInputFull: { template: '<div data-test-id="field-input"></div>' },
		},
	},
});

describe('ResourceMapper::Workflow Inputs', () => {
	beforeEach(() => {
		createTestingPinia();
		nodeTypesStore = mockedStore(useNodeTypesStore);
		nodeTypesStore.nodeTypes = {
			'n8n-nodes-base.executeWorkflow': {
				1.2: EXECUTE_WORKFLOW_NODE_TYPE_TEST,
			},
		};
	});

	it('renders', async () => {
		expect(() =>
			renderComponent({
				props: {
					parameter: WORKFLOW_INPUTS_TEST_PARAMETER,
					node: WORKFLOW_INPUTS_TEST_NODE,
					path: WORKFLOW_INPUTS_TEST_PARAMETER_PATH,
				},
			}),
		).not.toThrow();
	});

	it('renders workflow inputs list correctly', async () => {
		nodeTypesStore.getLocalResourceMapperFields.mockResolvedValue({
			fields: [
				{
					id: 'firstName',
					displayName: 'First Name',
					type: 'string',
					required: false,
					defaultMatch: false,
					display: true,
				},
				{
					id: 'lastName',
					displayName: 'Last Name',
					type: 'string',
					required: false,
					defaultMatch: false,
					display: true,
				},
			],
		});
		const { getByTestId, getAllByTestId } = renderComponent({
			props: {
				parameter: WORKFLOW_INPUTS_TEST_PARAMETER,
				node: WORKFLOW_INPUTS_TEST_NODE,
				path: WORKFLOW_INPUTS_TEST_PARAMETER_PATH,
			},
		});
		await waitAllPromises();
		expect(getByTestId('mapping-fields-container')).toBeInTheDocument();
		expect(getAllByTestId('field-input')).toHaveLength(2);
	});

	it('initializes boolean fields with false instead of null when value object is empty', async () => {
		// Mock a response with a boolean field
		nodeTypesStore.getLocalResourceMapperFields.mockResolvedValue({
			fields: [
				{
					id: 'enableFeature',
					displayName: 'Enable Feature',
					type: 'boolean',
					required: false,
					defaultMatch: false,
					display: true,
					canBeUsedToMatch: true,
				},
			],
		});

		// Create a node with an empty value object (this is the bug scenario)
		const nodeWithEmptyValue = {
			...WORKFLOW_INPUTS_TEST_NODE,
			parameters: {
				...WORKFLOW_INPUTS_TEST_NODE.parameters,
				workflowInputs: {
					mappingMode: 'defineBelow',
					value: {}, // Empty value object - this triggers the bug
					matchingColumns: [],
					schema: [],
					attemptToConvertTypes: false,
					convertFieldsToString: true,
				},
			},
		};

		const { emitted } = renderComponent({
			props: {
				parameter: WORKFLOW_INPUTS_TEST_PARAMETER,
				node: nodeWithEmptyValue,
				path: WORKFLOW_INPUTS_TEST_PARAMETER_PATH,
			},
		});

		await waitAllPromises();

		// Find the valueChanged emission that contains the boolean field initialization
		const valueChangedEvents = emitted('valueChanged') as any[];
		const lastValueChanged = valueChangedEvents[valueChangedEvents.length - 1];

		// Verify that the boolean field is initialized with false, not null
		expect(lastValueChanged[0].value.value.enableFeature).toBe(false);
		expect(lastValueChanged[0].value.value.enableFeature).not.toBe(null);
	});

	it('renders provided empty fields message', async () => {
		nodeTypesStore.getLocalResourceMapperFields.mockResolvedValue({
			fields: [],
			emptyFieldsNotice: 'Nothing <b>here</b>',
		});
		const { queryByTestId, queryAllByTestId, getByTestId } = renderComponent({
			props: {
				parameter: WORKFLOW_INPUTS_TEST_PARAMETER,
				node: WORKFLOW_INPUTS_TEST_NODE,
				path: WORKFLOW_INPUTS_TEST_PARAMETER_PATH,
			},
		});
		await waitAllPromises();
		expect(queryByTestId('mapping-fields-container')).not.toBeInTheDocument();
		expect(queryAllByTestId('field-input')).toHaveLength(0);
		expect(getByTestId('empty-fields-notice')).toHaveTextContent('Nothing here');
	});
});
