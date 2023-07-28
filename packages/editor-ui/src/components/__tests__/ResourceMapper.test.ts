import {
	DEFAULT_SETUP,
	MAPPING_COLUMNS_RESPONSE,
	NODE_PARAMETER_VALUES,
	UPDATED_SCHEMA,
} from './utils/ResourceMapper.utils';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { waitAllPromises } from '@/__tests__/utils';
import * as workflowHelpers from '@/mixins/workflowHelpers';
import ResourceMapper from '@/components/ResourceMapper/ResourceMapper.vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import type { SpyInstance } from 'vitest';

let nodeTypeStore: ReturnType<typeof useNodeTypesStore>;
let fetchFieldsSpy: SpyInstance, resolveParameterSpy: SpyInstance;

const renderComponent = createComponentRenderer(ResourceMapper, DEFAULT_SETUP);

describe('ResourceMapper.vue', () => {
	beforeAll(() => {
		nodeTypeStore = useNodeTypesStore();
		fetchFieldsSpy = vi
			.spyOn(nodeTypeStore, 'getResourceMapperFields')
			.mockResolvedValue(MAPPING_COLUMNS_RESPONSE);
		resolveParameterSpy = vi
			.spyOn(workflowHelpers, 'resolveParameter')
			.mockReturnValue(NODE_PARAMETER_VALUES);
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

	it('renders add mode properly', async () => {
		const { getByTestId, queryByTestId } = renderComponent(
			{
				props: {
					parameter: {
						typeOptions: {
							resourceMapper: {
								mode: 'add',
							},
						},
					},
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
					parameter: {
						typeOptions: {
							resourceMapper: {
								mode: 'upsert',
								multiKeyMatch: true,
							},
						},
					},
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
					parameter: {
						typeOptions: {
							resourceMapper: {
								supportAutoMap: false,
							},
						},
					},
				},
			},
			{ merge: true },
		);
		await waitAllPromises();
		expect(getByTestId('resource-mapper-container')).toBeInTheDocument();
		expect(queryByTestId('mapping-mode-select')).not.toBeInTheDocument();
	});

	it('renders field on top of the list when they are selected for matching', async () => {
		const { container, getByTestId } = renderComponent(
			{
				props: {
					parameter: {
						typeOptions: {
							resourceMapper: {
								supportAutoMap: true,
								mode: 'upsert',
								multiKeyMatch: false,
							},
						},
					},
				},
			},
			{ merge: true },
		);
		await waitAllPromises();
		expect(getByTestId('resource-mapper-container')).toBeInTheDocument();
		// Id should be the first field in the list
		expect(container.querySelector('.parameter-item')).toContainHTML('id (using to match)');
		// Select Last Name as matching column
		await userEvent.click(getByTestId('matching-column-option-Last name'));
		// Now, last name should be the first field in the list
		expect(container.querySelector('.parameter-item  div.title')).toHaveTextContent(
			'Last name (using to match)',
		);
	});

	it('renders selected matching columns properly when multiple key matching is enabled', async () => {
		const { getByTestId, getAllByText, queryByText } = renderComponent(
			{
				props: {
					parameter: {
						typeOptions: {
							resourceMapper: {
								supportAutoMap: true,
								mode: 'upsert',
								multiKeyMatch: true,
							},
						},
					},
				},
			},
			{ merge: true },
		);
		await waitAllPromises();
		expect(getByTestId('resource-mapper-container')).toBeInTheDocument();
		await userEvent.click(getByTestId('matching-column-option-Username'));

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
					parameter: {
						typeOptions: {
							resourceMapper: {
								fieldWords: {
									singular: 'foo',
									plural: 'foos',
								},
							},
						},
					},
				},
			},
			{ merge: true },
		);
		await waitAllPromises();
		expect(getByText('Set the value for each foo')).toBeInTheDocument();
		expect(
			getByText('Look for incoming data that matches the foos in the service'),
		).toBeInTheDocument();
		expect(getByText('Foos to Match On')).toBeInTheDocument();
		expect(getByText('The foos that identify the row(s) to modify')).toBeInTheDocument();
	});

	it('should render correct fields based on saved schema', async () => {
		const { getByTestId, queryAllByTestId } = renderComponent(
			{
				props: {
					node: {
						parameters: {
							columns: {
								schema: UPDATED_SCHEMA,
							},
						},
					},
					parameter: {
						typeOptions: {
							resourceMapper: {
								mode: 'add',
							},
						},
					},
				},
			},
			{ merge: true },
		);
		await waitAllPromises();
		// There should be 4 fields rendered and only 1 of them should have remove button
		expect(
			getByTestId('mapping-fields-container').querySelectorAll('.parameter-input').length,
		).toBe(4);
		expect(queryAllByTestId('remove-field-button').length).toBe(1);
	});

	it('should render correct options based on saved schema', async () => {
		const { getByTestId } = renderComponent(
			{
				props: {
					node: {
						parameters: {
							columns: {
								schema: UPDATED_SCHEMA,
							},
						},
					},
					parameter: {
						typeOptions: {
							resourceMapper: {
								mode: 'add',
							},
						},
					},
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
				node: {
					parameters: {
						columns: {
							schema: null,
						},
					},
				},
			},
		});
		await waitAllPromises();
		expect(fetchFieldsSpy).toHaveBeenCalledTimes(1);
	});

	it('should not fetch fields if schema is already fetched', async () => {
		renderComponent({
			props: {
				node: {
					parameters: {
						columns: {
							schema: UPDATED_SCHEMA,
						},
					},
				},
				parameter: {
					typeOptions: {
						resourceMapper: {
							mode: 'add',
						},
					},
				},
			},
		});
		await waitAllPromises();
		expect(fetchFieldsSpy).not.toHaveBeenCalled();
	});
});
