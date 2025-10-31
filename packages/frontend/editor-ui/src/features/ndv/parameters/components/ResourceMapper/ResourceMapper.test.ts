import {
	DEFAULT_SETUP,
	MAPPING_COLUMNS_RESPONSE,
	UPDATED_SCHEMA,
} from './ResourceMapper.test.utils';
import type { MockedStore } from '@/__tests__/utils';
import { mockedStore, waitAllPromises } from '@/__tests__/utils';
import ResourceMapper from './ResourceMapper.vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import type { MockInstance } from 'vitest';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { ResourceMapperTypeOptions } from 'n8n-workflow';
import { createTestNode, createTestNodeProperties } from '@/__tests__/mocks';
import { createTestingPinia } from '@pinia/testing';
import {
	WORKFLOW_INPUTS_TEST_PARAMETER,
	WORKFLOW_INPUTS_TEST_NODE,
	WORKFLOW_INPUTS_TEST_PARAMETER_PATH,
	EXECUTE_WORKFLOW_NODE_TYPE_TEST,
} from './ResourceMapper.test.constants';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';

let nodeTypeStore: ReturnType<typeof useNodeTypesStore>;
let projectsStore: MockedStore<typeof useProjectsStore>;

let fetchFieldsSpy: MockInstance;

describe('ResourceMapper.vue', () => {
	const renderComponent = createComponentRenderer(ResourceMapper, DEFAULT_SETUP);

	beforeAll(() => {
		nodeTypeStore = useNodeTypesStore();
		fetchFieldsSpy = vi
			.spyOn(nodeTypeStore, 'getResourceMapperFields')
			.mockResolvedValue(MAPPING_COLUMNS_RESPONSE);
	});

	beforeEach(() => {
		projectsStore = mockedStore(useProjectsStore);
		projectsStore.currentProjectId = 'aProjectId';
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders default configuration properly', async () => {
		const { getByTestId } = renderComponent();
		await waitAllPromises();
		expect(getByTestId('resource-mapper-container')).toBeInTheDocument();
		expect(getByTestId('mapping-mode-select')).toBeInTheDocument();
		expect(getByTestId('matching-column-select')).toBeInTheDocument();
		expect(getByTestId('mapping-fields-container')).toBeInTheDocument();
		// Should render one parameter input for each fetched column
		expect(
			getByTestId('mapping-fields-container').querySelectorAll('.parameter-input').length,
		).toBe(MAPPING_COLUMNS_RESPONSE.fields.length);
	});

	it('renders correctly in read only mode', async () => {
		const { getByTestId } = renderComponent({ props: { isReadOnly: true } });
		await waitAllPromises();
		expect(getByTestId('mapping-mode-select').querySelector('input')).toBeDisabled();
		expect(getByTestId('matching-column-select').querySelector('input')).toBeDisabled();
		expect(getByTestId('mapping-fields-container').querySelector('input')).toBeDisabled();
	});

	it('renders add mode properly', async () => {
		const { getByTestId, queryByTestId } = renderComponent(
			{
				props: {
					parameter: createTestNodeProperties({
						name: 'columns',
						typeOptions: {
							resourceMapper: {
								mode: 'add',
							} as ResourceMapperTypeOptions,
						},
					}),
				},
			},
			{ merge: true },
		);
		await waitAllPromises();
		expect(getByTestId('resource-mapper-container')).toBeInTheDocument();
		// This mode doesn't render matching column selector
		expect(queryByTestId('matching-column-select')).not.toBeInTheDocument();
	});

	it('renders map mode properly', async () => {
		const { getByTestId, queryByTestId } = renderComponent(
			{
				props: {
					parameter: createTestNodeProperties({
						name: 'columns',
						typeOptions: {
							resourceMapper: {
								mode: 'map',
							} as ResourceMapperTypeOptions,
						},
					}),
				},
			},
			{ merge: true },
		);
		await waitAllPromises();
		expect(getByTestId('resource-mapper-container')).toBeInTheDocument();
		// This mode doesn't render matching column selector
		expect(queryByTestId('matching-column-select')).not.toBeInTheDocument();
	});

	it('renders multi-key match selector properly', async () => {
		const { container, getByTestId } = renderComponent(
			{
				props: {
					parameter: createTestNodeProperties({
						name: 'columns',
						typeOptions: {
							resourceMapper: {
								mode: 'upsert',
								multiKeyMatch: true,
							} as ResourceMapperTypeOptions,
						},
					}),
				},
			},
			{ merge: true },
		);
		await waitAllPromises();
		expect(getByTestId('resource-mapper-container')).toBeInTheDocument();
		expect(container.querySelector('.el-select__tags')).toBeInTheDocument();
	});

	it('does not render mapping mode selector if it is disabled', async () => {
		const { getByTestId, queryByTestId } = renderComponent(
			{
				props: {
					parameter: createTestNodeProperties({
						name: 'columns',
						typeOptions: {
							resourceMapper: {
								supportAutoMap: false,
							} as ResourceMapperTypeOptions,
						},
					}),
				},
			},
			{ merge: true },
		);
		await waitAllPromises();
		expect(getByTestId('resource-mapper-container')).toBeInTheDocument();
		expect(queryByTestId('mapping-mode-select')).not.toBeInTheDocument();
	});

	it('renders field on top of the list when they are selected for matching', async () => {
		const user = userEvent.setup();
		const { container, getByTestId } = renderComponent(
			{
				props: {
					parameter: createTestNodeProperties({
						name: 'columns',
						typeOptions: {
							resourceMapper: {
								supportAutoMap: true,
								mode: 'upsert',
								multiKeyMatch: false,
							} as ResourceMapperTypeOptions,
						},
					}),
				},
			},
			{ merge: true },
		);
		await waitAllPromises();
		expect(getByTestId('resource-mapper-container')).toBeInTheDocument();
		// Id should be the first field in the list
		expect(container.querySelector('.parameter-item')).toContainHTML('id (using to match)');
		// Select Last Name as matching column
		await user.click(getByTestId('matching-column-option-Last name'));
		// Now, last name should be the first field in the list
		expect(container.querySelector('.parameter-item div.title')).toHaveTextContent(
			'Last name (using to match)',
		);
	}, 10000);

	it('renders selected matching columns properly when multiple key matching is enabled', async () => {
		const user = userEvent.setup();
		const { getByTestId, getAllByText, queryByText } = renderComponent(
			{
				props: {
					parameter: createTestNodeProperties({
						name: 'columns',
						typeOptions: {
							resourceMapper: {
								supportAutoMap: true,
								mode: 'upsert',
								multiKeyMatch: true,
							} as ResourceMapperTypeOptions,
						},
					}),
				},
			},
			{ merge: true },
		);
		await waitAllPromises();
		expect(getByTestId('resource-mapper-container')).toBeInTheDocument();
		await user.click(getByTestId('matching-column-option-Username'));

		// Both matching columns (id and Username) should be rendered in the dropdown
		expect(
			getByTestId('matching-column-select').querySelector('.el-select  > div'),
		).toHaveTextContent('idUsername');
		// All selected columns should have correct labels
		expect(getAllByText('id (using to match)')[0]).toBeInTheDocument();
		expect(getAllByText('Username (using to match)')[0]).toBeInTheDocument();
		expect(queryByText('First Name (using to match)')).not.toBeInTheDocument();
	});

	it('uses field words defined in node definition', async () => {
		const { getByText } = renderComponent(
			{
				props: {
					parameter: createTestNodeProperties({
						name: 'columns',
						typeOptions: {
							resourceMapper: {
								fieldWords: {
									singular: 'foo',
									plural: 'foos',
								},
							} as ResourceMapperTypeOptions,
						},
					}),
				},
			},
			{ merge: true },
		);

		await waitAllPromises();
		expect(getByText('Set the value for each foo')).toBeInTheDocument();
		expect(
			getByText('Look for incoming data that matches the foos in the service'),
		).toBeInTheDocument();
		expect(getByText('Foos to match on')).toBeInTheDocument();
		expect(
			getByText(
				'The foos to use when matching rows in the service to the input items of this node. Usually an ID.',
			),
		).toBeInTheDocument();
	});

	it('should render correct fields based on saved schema', async () => {
		const { getByTestId } = renderComponent(
			{
				props: {
					node: createTestNode({
						parameters: {
							columns: {
								schema: UPDATED_SCHEMA,
							},
						},
					}),
					parameter: createTestNodeProperties({
						name: 'columns',
						typeOptions: {
							resourceMapper: {
								mode: 'add',
							} as ResourceMapperTypeOptions,
						},
					}),
				},
			},
			{ merge: true },
		);
		await waitAllPromises();
		// There should be 4 fields rendered and only 1 of them should have remove button
		expect(
			getByTestId('mapping-fields-container').querySelectorAll('.parameter-input').length,
		).toBe(4);
		expect(
			getByTestId('mapping-fields-container').querySelectorAll(
				'[data-test-id^="remove-field-button"]',
			).length,
		).toBe(1);
	});

	it('should render correct options based on saved schema', async () => {
		const { getByTestId } = renderComponent(
			{
				props: {
					node: createTestNode({
						parameters: {
							columns: {
								schema: UPDATED_SCHEMA,
							},
						},
					}),
					parameter: createTestNodeProperties({
						name: 'columns',
						typeOptions: {
							resourceMapper: {
								mode: 'add',
							} as ResourceMapperTypeOptions,
						},
					}),
				},
			},
			{ merge: true },
		);
		await waitAllPromises();
		// Should have one option in the bottom dropdown for one removed field
		expect(getByTestId('add-fields-select').querySelectorAll('li').length).toBe(1);
	});

	it('should fetch fields if there is no cached schema', async () => {
		renderComponent({
			props: {
				node: createTestNode({
					parameters: {
						columns: {
							schema: null,
						},
					},
				}),
			},
		});
		await waitAllPromises();
		expect(fetchFieldsSpy).toHaveBeenCalledTimes(1);
	});

	it('should not fetch fields if schema is already fetched', async () => {
		renderComponent({
			props: {
				node: createTestNode({
					parameters: {
						columns: {
							schema: UPDATED_SCHEMA,
						},
					},
				}),
				parameter: createTestNodeProperties({
					name: 'columns',
					typeOptions: {
						resourceMapper: {
							mode: 'add',
						} as ResourceMapperTypeOptions,
					},
				}),
			},
		});
		await waitAllPromises();
		expect(fetchFieldsSpy).not.toHaveBeenCalled();
	});

	it('renders initially selected matching column properly', async () => {
		const { getByTestId } = renderComponent(
			{
				props: {
					node: createTestNode({
						parameters: {
							columns: {
								mappingMode: 'autoMapInputData',
								matchingColumns: ['name'],
								schema: [
									{
										id: 'name',
										displayName: 'name',
										canBeUsedToMatch: true,
									},
									{
										id: 'email',
										displayName: 'email',
										canBeUsedToMatch: true,
									},
								],
							},
						},
					}),
					parameter: createTestNodeProperties({
						name: 'columns',
						typeOptions: {
							resourceMapper: {
								supportAutoMap: true,
								mode: 'upsert',
								multiKeyMatch: false,
							} as ResourceMapperTypeOptions,
						},
					}),
				},
			},
			{ merge: true },
		);
		await waitAllPromises();

		expect(getByTestId('matching-column-select').querySelector('input')).toHaveValue('name');
	});
});

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

describe('ResourceMapper::Workflow Inputs', () => {
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
