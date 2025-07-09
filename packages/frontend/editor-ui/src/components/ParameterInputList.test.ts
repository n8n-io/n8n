import { createComponentRenderer } from '@/__tests__/render';
import ParameterInputList from './ParameterInputList.vue';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useNDVStore } from '@/stores/ndv.store';
import * as workflowHelpers from '@/composables/useWorkflowHelpers';

import {
	TEST_NODE_NO_ISSUES,
	TEST_PARAMETERS,
	TEST_NODE_VALUES,
	TEST_NODE_WITH_ISSUES,
	FIXED_COLLECTION_PARAMETERS,
	TEST_ISSUE,
} from './ParameterInputList.test.constants';
import { FORM_NODE_TYPE, FORM_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import type { INodeUi } from '../Interface';
import type { MockInstance } from 'vitest';

vi.mock('@/composables/useWorkflowHelpers', () => ({
	useWorkflowHelpers: vi.fn().mockReturnValue({
		getCurrentWorkflow: vi.fn(),
	}),
}));

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
		FIXED_COLLECTION_PARAMETERS.forEach((parameter) => {
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
		FIXED_COLLECTION_PARAMETERS.forEach((parameter) => {
			expect(getByText(parameter.displayName)).toBeInTheDocument();
		});
		// Should render error message for fixed collection parameter
		expect(
			getByTestId(`${FIXED_COLLECTION_PARAMETERS[0].name}-parameter-input-issues-container`),
		).toBeInTheDocument();
		expect(getByText(TEST_ISSUE)).toBeInTheDocument();
	});

	it('renders notice correctly', () => {
		ndvStore.activeNode = TEST_NODE_NO_ISSUES;
		const { getByText } = renderComponent({
			props: {
				parameters: TEST_PARAMETERS,
				nodeValues: TEST_NODE_VALUES,
			},
		});
		expect(getByText('Note: This is a notice with')).toBeInTheDocument();
		expect(getByText('notice link')).toBeInTheDocument();
		expect(getByText('notice link').getAttribute('href')).toEqual('notice.n8n.io');
	});

	it('renders callout correctly', () => {
		ndvStore.activeNode = TEST_NODE_NO_ISSUES;
		const { getByTestId, getByText } = renderComponent({
			props: {
				parameters: TEST_PARAMETERS,
				nodeValues: TEST_NODE_VALUES,
			},
		});

		expect(getByText('Tip: This is a callout with')).toBeInTheDocument();
		expect(getByText('callout link')).toBeInTheDocument();
		expect(getByText('callout link').getAttribute('href')).toEqual('callout.n8n.io');
		expect(getByText('and action!')).toBeInTheDocument();
		expect(getByTestId('callout-dismiss-icon')).toBeInTheDocument();
	});

	describe('updateFormParameters', () => {
		const workflowHelpersMock: MockInstance = vi.spyOn(workflowHelpers, 'useWorkflowHelpers');
		const formParameters = [
			{
				displayName: 'TRIGGER NOTICE',
				name: 'triggerNotice',
				type: 'notice',
				default: '',
			},
		];

		afterAll(() => {
			workflowHelpersMock.mockRestore();
		});

		it('should show triggerNotice if Form Trigger not connected', () => {
			ndvStore.activeNode = { name: 'From', type: FORM_NODE_TYPE, parameters: {} } as INodeUi;

			workflowHelpersMock.mockReturnValue({
				getCurrentWorkflow: vi.fn(() => {
					return {
						getParentNodes: vi.fn(() => []),
						nodes: {},
					};
				}),
			});

			const { getByText } = renderComponent({
				props: {
					parameters: formParameters,
					nodeValues: {},
				},
			});

			expect(getByText('TRIGGER NOTICE')).toBeInTheDocument();
		});

		it('should not show triggerNotice if Form Trigger is connected', () => {
			ndvStore.activeNode = { name: 'From', type: FORM_NODE_TYPE, parameters: {} } as INodeUi;

			workflowHelpersMock.mockReturnValue({
				getCurrentWorkflow: vi.fn(() => {
					return {
						getParentNodes: vi.fn(() => ['Form Trigger']),
						nodes: {
							'Form Trigger': {
								type: FORM_TRIGGER_NODE_TYPE,
								parameters: {},
							},
						},
					};
				}),
			});

			const { queryByText } = renderComponent({
				props: {
					parameters: formParameters,
					nodeValues: {},
				},
			});

			const el = queryByText('TRIGGER NOTICE');

			expect(el).not.toBeInTheDocument();
		});
	});
});
