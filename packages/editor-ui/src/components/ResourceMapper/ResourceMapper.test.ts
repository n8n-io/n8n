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
		isReadonly: false,
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

	it.only('renders workflow inputs list correctly', async () => {
		nodeTypesStore.getLocalResourceMapperFields.mockResolvedValue({
			fields: [
				{
					id: 'name',
					displayName: 'name',
					required: false,
					defaultMatch: false,
					display: true,
					canBeUsedToMatch: true,
					type: 'string',
					removed: false,
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
		expect(getAllByTestId('field-input')).toHaveLength(1);
	});
});
