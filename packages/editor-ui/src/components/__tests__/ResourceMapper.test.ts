import { PiniaVuePlugin } from 'pinia';
import { render } from '@testing-library/vue';
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
	render(ResourceMapper, renderOptions, (vue) => {
		vue.use(PiniaVuePlugin);
	});

describe('ResourceMapper.vue', () => {
	beforeEach(() => {
		nodeTypeStore = useNodeTypesStore();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders default configuration properly', async () => {
		vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValue(NODE_PARAMETER_VALUES);
		vi.spyOn(nodeTypeStore, 'getResourceMapperFields').mockResolvedValue(MAPPING_COLUMNS_RESPONSE);
		const { container, getByTestId } = renderComponent(DEFAULT_SETUP);
		await waitAllPromises();
		expect(getByTestId('resource-mapper-container')).toBeInTheDocument();
		expect(getByTestId('mapping-mode-select')).toBeInTheDocument();
		expect(getByTestId('matching-column-select')).toBeInTheDocument();
		expect(getByTestId('mapping-fields-container')).toBeInTheDocument();
		expect(
			container.querySelectorAll('[data-test-id="mapping-fields-container"] .parameter-input')
				.length,
		).toBe(MAPPING_COLUMNS_RESPONSE.fields.length);
	});
});
