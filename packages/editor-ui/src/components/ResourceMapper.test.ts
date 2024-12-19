import {
	DEFAULT_SETUP,
	MAPPING_COLUMNS_RESPONSE,
	UPDATED_SCHEMA,
} from './__tests__/utils/ResourceMapper.utils';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { cleanupAppModals, createAppModals, waitAllPromises } from '@/__tests__/utils';
import ResourceMapper from '@/components/ResourceMapper/ResourceMapper.vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import type { MockInstance } from 'vitest';

let nodeTypeStore: ReturnType<typeof useNodeTypesStore>;
let fetchFieldsSpy: MockInstance;

const renderComponent = createComponentRenderer(ResourceMapper, DEFAULT_SETUP);

describe('ResourceMapper.vue', () => {
	beforeAll(() => {
		nodeTypeStore = useNodeTypesStore();
		fetchFieldsSpy = vi
			.spyOn(nodeTypeStore, 'getResourceMapperFields')
			.mockResolvedValue(MAPPING_COLUMNS_RESPONSE);
	});

	beforeEach(() => {
		createAppModals();
	});

	afterEach(() => {
		vi.clearAllMocks();
		cleanupAppModals();
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

	it('renders map mode properly', async () => {
		const { getByTestId, queryByTestId } = renderComponent(
			{
				props: {
					parameter: {
						typeOptions: {
							resourceMapper: {
								mode: 'map',
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
		const user = userEvent.setup();
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

	it('renders initially selected matching column properly', async () => {
		const { getByTestId } = renderComponent(
			{
				props: {
					node: {
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
					},
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

		expect(getByTestId('matching-column-select').querySelector('input')).toHaveValue('name');
	});
});
