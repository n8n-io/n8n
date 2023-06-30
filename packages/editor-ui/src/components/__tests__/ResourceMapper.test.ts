import { PiniaVuePlugin } from 'pinia';
import { render, within } from '@testing-library/vue';
import { merge } from 'lodash-es';
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

let nodeTypeStore: ReturnType<typeof useNodeTypesStore>;

const renderComponent = (renderOptions: Parameters<typeof render>[1] = {}) =>
	render(ResourceMapper, merge(DEFAULT_SETUP, renderOptions), (vue) => {
		vue.use(PiniaVuePlugin);
	});

describe('ResourceMapper.vue', () => {
	beforeEach(() => {
		nodeTypeStore = useNodeTypesStore();
		vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValue(NODE_PARAMETER_VALUES);
		vi.spyOn(nodeTypeStore, 'getResourceMapperFields').mockResolvedValue(MAPPING_COLUMNS_RESPONSE);
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

	it('renders add mode  properly', async () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
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
		expect(getByTestId('resource-mapper-container')).toBeInTheDocument();
		// This mode doesn't render matching column selector
		expect(queryByTestId('matching-column-select')).not.toBeInTheDocument();
	});

	it('renders multi-key match selector properly', async () => {
		const { container, getByTestId } = renderComponent({
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
		});
		await waitAllPromises();
		expect(getByTestId('resource-mapper-container')).toBeInTheDocument();
		expect(container.querySelector('.el-select__tags')).toBeInTheDocument();
	});

	it('does not render mapping mode selector if it is disabled', async () => {
		const { getByTestId, queryByTestId } = renderComponent({
			props: {
				parameter: {
					typeOptions: {
						resourceMapper: {
							supportAutoMap: false,
						},
					},
				},
			},
		});
		await waitAllPromises();
		expect(getByTestId('resource-mapper-container')).toBeInTheDocument();
		expect(queryByTestId('mapping-mode-select')).not.toBeInTheDocument();
	});

	it('renders field on top of the list when they are selected for matching', async () => {
		const { container, getByTestId } = renderComponent({
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
		});
		await waitAllPromises();
		expect(getByTestId('resource-mapper-container')).toBeInTheDocument();
		// Id should be the first field in the list
		expect(container.querySelector('.parameter-item')).toContainHTML('id (using to match)');
		// // Select Last Name as matching column
		await userEvent.click(getByTestId('matching-column-select'));
		const matchingColumnDropdown = getByTestId('matching-column-select');
		await userEvent.click(within(matchingColumnDropdown).getByText('Last Name'));
		// // Now, last name should be the first field in the list
		expect(container.querySelector('.parameter-item')).toContainHTML('Last Name (using to match)');
	});

	it('renders selected matching columns properly when multiple key matching is enabled', async () => {
		const { getByTestId, getByText, queryByText } = renderComponent({
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
		});
		await waitAllPromises();
		expect(getByTestId('resource-mapper-container')).toBeInTheDocument();
		const matchingColumnDropdown = getByTestId('matching-column-select');
		await userEvent.click(matchingColumnDropdown);
		await userEvent.click(within(matchingColumnDropdown).getByText('Username'));
		// Both matching columns should be rendered in the dropdown
		expect(getByTestId('matching-column-select')).toContainHTML(
			'<span class="el-select__tags-text">id</span>',
		);
		expect(getByTestId('matching-column-select')).toContainHTML(
			'<span class="el-select__tags-text">Username</span>',
		);
		// All selected columns should have correct labels
		expect(getByText('id (using to match)')).toBeInTheDocument();
		expect(getByText('Username (using to match)')).toBeInTheDocument();
		expect(queryByText('First Name (using to match)')).not.toBeInTheDocument();
	});

	it('uses field words defined in node definition', async () => {
		const { getByText } = renderComponent({
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
		});
		await waitAllPromises();
		expect(getByText('Set the value for each foo')).toBeInTheDocument();
		expect(
			getByText('Look for incoming data that matches the foos in the service'),
		).toBeInTheDocument();
		expect(getByText('Foos to Match On')).toBeInTheDocument();
		expect(getByText('The foos that identify the row(s) to modify')).toBeInTheDocument();
	});

	it('should render correct fields based on saved schema', async () => {
		const { getByTestId, queryAllByTestId } = renderComponent({
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
		// There should be 5 fields rendered and only 2 of them should have remove button
		expect(
			getByTestId('mapping-fields-container').querySelectorAll('.parameter-input').length,
		).toBe(5);
		expect(queryAllByTestId('remove-field-button').length).toBe(2);
	});

	it('should render correct options based on saved schema', async () => {
		const { getByTestId } = renderComponent({
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
		// Should have one option in the bottom dropdown for one removed field
		expect(getByTestId('add-fields-select').querySelectorAll('li').length).toBe(1);
	});
});
