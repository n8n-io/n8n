import {
	createCanvasNodeProvide,
	createCanvasProvide,
} from '@/features/workflows/canvas/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { EditorEnabledFeaturesKey, WorkflowDocumentStoreKey, VIEWS } from '@/app/constants';
import { createTestNode } from '@/__tests__/mocks';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { CanvasNodeDirtiness, CanvasNodeRenderType } from '../../../../../canvas.types';
import { createTestingPinia } from '@pinia/testing';
import { computed, type ComputedRef } from 'vue';
import type { IPinData } from 'n8n-workflow';
import type * as actualVueRouter from 'vue-router';
import { type RouteLocationNormalizedLoadedGeneric, useRoute } from 'vue-router';
import CanvasNodeStatusIcons from './CanvasNodeStatusIcons.vue';

vi.mock('vue-router', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...(actual as typeof actualVueRouter),
		useRoute: vi.fn(),
	};
});

const pinnedDataByNodeName: IPinData = {};
const executionPinDataByNodeId = new Map<string, ComputedRef<IPinData[string] | undefined>>();
const executionIssuesByNodeId = new Map<string, ComputedRef<string[]>>();
let isExecutionDataDisplayed = false;

vi.mock('@/features/workflows/canvas/canvas.utils', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/features/workflows/canvas/canvas.utils')>();
	return {
		...actual,
		injectCanvasRenderData: vi.fn(() => ({
			value: actual.createEmptyCanvasRenderData({
				pinnedDataByNodeName,
				executionPinDataByNodeId,
				executionIssuesByNodeId,
				isExecutionDataDisplayed,
			}),
		})),
	};
});

const renderComponent = createComponentRenderer(CanvasNodeStatusIcons, {
	pinia: createTestingPinia(),
});

const mockedUseRoute = vi.mocked(useRoute);

describe('CanvasNodeStatusIcons', () => {
	let nodeTypesStore: MockedStore<typeof useNodeTypesStore>;

	beforeEach(() => {
		nodeTypesStore = mockedStore(useNodeTypesStore);
		mockedUseRoute.mockReturnValue({} as RouteLocationNormalizedLoadedGeneric);
		for (const key of Object.keys(pinnedDataByNodeName)) {
			delete pinnedDataByNodeName[key];
		}
		executionPinDataByNodeId.clear();
		executionIssuesByNodeId.clear();
		isExecutionDataDisplayed = false;
	});

	it.each([
		{ enabled: true, bound: false, otherIssue: false, executionError: false, pending: true },
		{ enabled: false, bound: false, otherIssue: false, executionError: false, pending: false },
		{ enabled: true, bound: true, otherIssue: false, executionError: false, pending: false },
		{ enabled: true, bound: false, otherIssue: true, executionError: false, pending: false },
		{ enabled: true, bound: false, otherIssue: false, executionError: true, pending: false },
	])(
		'distinguishes missing credentials from errors: %j',
		({ enabled, bound, otherIssue, executionError, pending }) => {
			const document = useWorkflowDocumentStore(createWorkflowDocumentId('workflow'));
			vi.spyOn(document, 'getNodeById').mockReturnValue({
				...createTestNode({
					id: 'node',
					credentials: bound ? { slackApi: { id: 'account', name: 'Slack' } } : {},
				}),
				issues: {
					credentials: { slackApi: ['Select a credential'] },
					...(otherIssue ? { parameters: { channel: ['Channel is required'] } } : {}),
				},
			});
			if (executionError)
				executionIssuesByNodeId.set(
					'node',
					computed(() => ['Request failed']),
				);
			const { getByTestId, queryByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({
							data: { issues: { visible: true, validation: ['Select a credential'] } },
						}),
						[WorkflowDocumentStoreKey]: computed(() => document),
						[EditorEnabledFeaturesKey]: computed(() => ({ credentialSetupWarnings: enabled })),
					},
				},
			});
			expect(getByTestId(pending ? 'node-setup-required' : 'node-issues')).toBeVisible();
			expect(queryByTestId(pending ? 'node-issues' : 'node-setup-required')).toBeNull();
		},
	);

	it('should render correctly for a pinned node', () => {
		pinnedDataByNodeName['Test Node'] = [{ json: { key: 'value' } }];

		const { getByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasProvide(),
					...createCanvasNodeProvide(),
				},
			},
		});

		expect(getByTestId('canvas-node-status-pinned')).toBeInTheDocument();
	});

	it('should not render pinned icon when disabled', () => {
		pinnedDataByNodeName['Test Node'] = [{ json: { key: 'value' } }];

		const { queryByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasProvide(),
					...createCanvasNodeProvide({
						data: { disabled: true },
					}),
				},
			},
		});

		expect(queryByTestId('canvas-node-status-pinned')).not.toBeInTheDocument();
	});

	it('should render the pinned icon for a node with execution pin data', () => {
		executionPinDataByNodeId.set(
			'node',
			computed(() => [{ json: { key: 'value' } }]),
		);
		isExecutionDataDisplayed = true;

		const { getByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasProvide(),
					...createCanvasNodeProvide({
						data: {
							execution: { status: 'success', running: false },
							runData: { outputMap: {}, iterations: 1, visible: true },
						},
					}),
				},
			},
		});

		expect(getByTestId('canvas-node-status-pinned')).toBeInTheDocument();
	});

	it('should not render the pinned icon for execution pin data outside execution preview mode', () => {
		executionPinDataByNodeId.set(
			'node',
			computed(() => [{ json: { key: 'value' } }]),
		);

		const { queryByTestId, getByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasProvide(),
					...createCanvasNodeProvide({
						data: {
							execution: { status: 'success', running: false },
							runData: { outputMap: {}, iterations: 1, visible: true },
						},
					}),
				},
			},
		});

		expect(queryByTestId('canvas-node-status-pinned')).not.toBeInTheDocument();
		expect(getByTestId('canvas-node-status-success')).toBeInTheDocument();
	});

	it('should ignore workflow pin data when displaying an execution without pin data for the node', () => {
		pinnedDataByNodeName['Test Node'] = [{ json: { stale: true } }];
		isExecutionDataDisplayed = true;

		const { queryByTestId, getByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasProvide(),
					...createCanvasNodeProvide({
						data: {
							execution: { status: 'success', running: false },
							runData: { outputMap: {}, iterations: 1, visible: true },
						},
					}),
				},
			},
		});

		expect(queryByTestId('canvas-node-status-pinned')).not.toBeInTheDocument();
		expect(getByTestId('canvas-node-status-success')).toBeInTheDocument();
	});

	it('should use the pinned icon when both workflow and execution pin data are present', () => {
		executionPinDataByNodeId.set(
			'node',
			computed(() => [{ json: { source: 'execution' } }]),
		);
		pinnedDataByNodeName['Test Node'] = [{ json: { key: 'value' } }];

		const { getByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasProvide(),
					...createCanvasNodeProvide(),
				},
			},
		});

		expect(getByTestId('canvas-node-status-pinned')).toBeInTheDocument();
	});

	it('should keep validation issues ahead of execution pin data', () => {
		executionPinDataByNodeId.set(
			'node',
			computed(() => [{ json: { key: 'value' } }]),
		);

		const { getByTestId, queryByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasProvide(),
					...createCanvasNodeProvide({
						data: {
							issues: {
								validation: ['Parameter "Project" is required.'],
								visible: true,
							},
						},
					}),
				},
			},
		});

		expect(getByTestId('node-issues')).toBeInTheDocument();
		expect(queryByTestId('canvas-node-status-pinned')).not.toBeInTheDocument();
	});

	it('should render correctly for a node that ran successfully', () => {
		const { getByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasProvide(),
					...createCanvasNodeProvide({
						data: {
							execution: { status: 'success', running: false },
							runData: { outputMap: {}, iterations: 15, visible: true },
						},
					}),
				},
			},
		});

		expect(getByTestId('canvas-node-status-success')).toHaveTextContent('15');
	});

	it('should not render success icon for a node that was canceled', () => {
		const { queryByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasProvide(),
					...createCanvasNodeProvide({
						data: {
							execution: { status: 'canceled', running: false },
							runData: { outputMap: {}, iterations: 15, visible: true },
						},
					}),
				},
			},
		});

		expect(queryByTestId('canvas-node-status-success')).not.toBeInTheDocument();
	});

	it('should render correctly for a dirty node that has run successfully', () => {
		const { getByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasProvide(),
					...createCanvasNodeProvide({
						data: {
							runData: { outputMap: {}, iterations: 15, visible: true },
							render: {
								type: CanvasNodeRenderType.Default,
								options: { dirtiness: CanvasNodeDirtiness.PARAMETERS_UPDATED },
							},
						},
					}),
				},
			},
		});

		expect(getByTestId('canvas-node-status-warning')).toBeInTheDocument();
	});

	it('should render warning icon when node is not installed', () => {
		nodeTypesStore.getIsNodeInstalled = vi.fn().mockReturnValue(false);
		const { queryByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasProvide(),
					...createCanvasNodeProvide({ data: { type: 'n8n-nodes-test.testNode' } }),
				},
			},
		});

		expect(queryByTestId('node-not-installed')).toBeInTheDocument();
	});
	it('should not render warning icon when node is not installed and route is demo', () => {
		mockedUseRoute.mockReturnValue({
			name: VIEWS.DEMO,
		} as RouteLocationNormalizedLoadedGeneric);
		nodeTypesStore.getIsNodeInstalled = vi.fn().mockReturnValue(false);
		const { queryByTestId } = renderComponent({
			global: {
				provide: {
					...createCanvasProvide(),
					...createCanvasNodeProvide({ data: { type: 'n8n-nodes-test.testNode' } }),
				},
			},
		});

		expect(queryByTestId('node-not-installed')).not.toBeInTheDocument();
	});
});
