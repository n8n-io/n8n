import { PiniaVuePlugin } from 'pinia';
import { render } from '@testing-library/vue';
import {
	DEFAULT_SETUP,
	MAPPING_COLUMNS_RESPONSE,
	RESOLVED_PARAMETER_MOCK,
} from './utils/ResourceMapper.utils';
import { createTestingPinia } from '@pinia/testing';
import { STORES } from '@/constants';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { SETTINGS_STORE_DEFAULT_STATE, waitAllPromises } from '@/__tests__/utils';
import { merge } from 'lodash-es';
import * as workflowHelpers from '@/mixins/workflowHelpers';
import ResourceMapper from '@/components/ResourceMapper/ResourceMapper.vue';

let pinia: ReturnType<typeof createTestingPinia>;
let nodeTypeStore: ReturnType<typeof useNodeTypesStore>;

const renderComponent = (renderOptions: Parameters<typeof render>[1] = {}) =>
	render(
		ResourceMapper,
		merge(
			{
				pinia,
			},
			renderOptions,
		),
		(vue) => {
			vue.use(PiniaVuePlugin);
		},
	);

describe('ResourceMapper.vue', () => {
	beforeEach(() => {
		pinia = createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: merge({}, SETTINGS_STORE_DEFAULT_STATE.settings),
				},
			},
		});
		nodeTypeStore = useNodeTypesStore();
		vi.spyOn(workflowHelpers, 'resolveParameter').mockReturnValue(RESOLVED_PARAMETER_MOCK);
		vi.spyOn(nodeTypeStore, 'getResourceMapperFields').mockResolvedValue(MAPPING_COLUMNS_RESPONSE);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders default configuration properly', async () => {
		const { getByTestId } = renderComponent(DEFAULT_SETUP);
		await waitAllPromises();
		expect(getByTestId('resource-mapper-container')).toBeInTheDocument();
		expect(getByTestId('mapping-mode-select')).toBeInTheDocument();
		// expect(getByTestId('matching-column-select')).toBeInTheDocument();
		expect(getByTestId('mapping-fields-container')).toBeInTheDocument();
	});
});
