import { createComponentRenderer } from '@/__tests__/render';
import OutputPanel from './OutputPanel.vue';
import { createTestingPinia } from '@pinia/testing';
import {
	MANUAL_TRIGGER_NODE,
	TEST_EXECUTE_WORKFLOW_NODE,
	TEST_EXECUTE_WORKFLOW_NODE_WITH_EXPRESSION,
	TEST_WORKFLOW,
	TEST_WORKFLOW_WITH_EXPRESSION,
} from './OutputPanel.test.constant';
import { mockedStore } from '@/__tests__/utils';
import { useNDVStore } from '@/stores/ndv.store';

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

const renderComponent = createComponentRenderer(OutputPanel, {
	props: {
		runIndex: 0,
		pushRef: 'test-123',
		isReadOnly: false,
		linkedRuns: false,
		canLinkRuns: false,
		blockUI: false,
		isProductionExecutionPreview: false,
		isPaneActive: true,
	},
});

describe('OutputPanel', () => {
	beforeEach(() => {
		createTestingPinia();
		ndvStore = mockedStore(useNDVStore);
	});

	it('renders', () => {
		ndvStore.activeNode = TEST_EXECUTE_WORKFLOW_NODE;
		expect(() =>
			renderComponent({
				props: {
					workflow: TEST_WORKFLOW,
				},
			}),
		).not.toThrow();
	});

	it('renders workflow expression notice when workflow ID is an expression', () => {
		ndvStore.activeNode = TEST_EXECUTE_WORKFLOW_NODE_WITH_EXPRESSION;
		const { getByTestId } = renderComponent({
			props: {
				workflow: {
					TEST_WORKFLOW_WITH_EXPRESSION,
				},
			},
		});
		expect(getByTestId('run-data-callout')).toBeInTheDocument();
		expect(getByTestId('run-data-callout').textContent).toContain(
			'Note on using an expression for workflow ID:',
		);
	});

	it('does not render workflow expression notice when workflow ID is not an expression', () => {
		ndvStore.activeNode = TEST_EXECUTE_WORKFLOW_NODE;
		const { queryByTestId } = renderComponent({
			props: {
				workflow: {
					TEST_WORKFLOW,
				},
			},
		});
		expect(queryByTestId('run-data-callout')).not.toBeInTheDocument();
	});

	it('does not render workflow expression notice for nodes without workflow selector', () => {
		ndvStore.activeNode = MANUAL_TRIGGER_NODE;
		const { queryByTestId } = renderComponent({
			props: {
				workflow: {
					TEST_WORKFLOW_WITH_EXPRESSION,
				},
			},
		});
		expect(queryByTestId('run-data-callout')).not.toBeInTheDocument();
	});
});
