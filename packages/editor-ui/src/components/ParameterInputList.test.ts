import { createComponentRenderer } from '@/__tests__/render';
import ParameterInputList from './ParameterInputList.vue';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useNDVStore } from '@/stores/ndv.store';
import {
	TEST_NODE_NO_ISSUES,
	TEST_PARAMETERS,
	TEST_NODE_VALUES,
	TEST_NODE_WITH_ISSUES,
	FIXED_COLLECTION_PARAMETERS,
	TEST_ISSUE,
} from './ParameterInputList.test.constants';

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

let ndvStore: ReturnType<typeof mockedStore<typeof useNDVStore>>;

const renderComponent = createComponentRenderer(ParameterInputList, {
	props: {
		hideDelete: true,
		indent: true,
		isReadOnly: false,
	},
	global: {
		stubs: {
			ParameterInputFull: { template: '<div data-test-id="parameter-input"></div>' },
			Suspense: { template: '<div data-test-id="suspense-stub"><slot></slot></div>' },
		},
	},
});

describe('ParameterInputList', () => {
	beforeEach(() => {
		createTestingPinia();
		ndvStore = mockedStore(useNDVStore);
	});

	it('renders', () => {
		ndvStore.activeNode = TEST_NODE_NO_ISSUES;
		expect(() =>
			renderComponent({
				props: {
					parameters: TEST_PARAMETERS,
					nodeValues: TEST_NODE_VALUES,
				},
			}),
		).not.toThrow();
	});

	it('renders fixed collection inputs correctly', () => {
		ndvStore.activeNode = TEST_NODE_NO_ISSUES;
		const { getAllByTestId, getByText } = renderComponent({
			props: {
				parameters: TEST_PARAMETERS,
				nodeValues: TEST_NODE_VALUES,
			},
		});

		// Should render labels for all parameters
		TEST_PARAMETERS.forEach((parameter) => {
			expect(getByText(parameter.displayName)).toBeInTheDocument();
		});
		// Should render input placeholders for all fixed collection parameters
		expect(getAllByTestId('suspense-stub')).toHaveLength(FIXED_COLLECTION_PARAMETERS.length);
	});

	it('renders fixed collection inputs correctly with issues', () => {
		ndvStore.activeNode = TEST_NODE_WITH_ISSUES;
		const { getByText, getByTestId } = renderComponent({
			props: {
				parameters: TEST_PARAMETERS,
				nodeValues: TEST_NODE_VALUES,
			},
		});

		// Should render labels for all parameters
		TEST_PARAMETERS.forEach((parameter) => {
			expect(getByText(parameter.displayName)).toBeInTheDocument();
		});
		// Should render error message for fixed collection parameter
		expect(
			getByTestId(`${FIXED_COLLECTION_PARAMETERS[0].name}-parameter-input-issues-container`),
		).toBeInTheDocument();
		expect(getByText(TEST_ISSUE)).toBeInTheDocument();
	});
});
