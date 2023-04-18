import { PiniaVuePlugin } from 'pinia';
import { render } from '@testing-library/vue';
import { merge } from 'lodash-es';
import {
	DEFAULT_SETUP,
	MAPPING_COLUMNS_RESPONSE,
	NODE_PARAMETER_VALUES,
} from './utils/ResourceMapper.utils';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { waitAllPromises } from '@/__tests__/utils';
import * as workflowHelpers from '@/mixins/workflowHelpers';
import ResourceMapper from '@/components/ResourceMapper/ResourceMapper.vue';

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
});
