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
import { useTypeAvailabilityPoliciesStore } from '@n8n/frontend-module-type-availability-policies';
import { CanvasNodeDirtiness, CanvasNodeRenderType } from '../../../../../canvas.types';
import { createTestingPinia } from '@pinia/testing';
import { getActivePinia, setActivePinia } from 'pinia';
import { computed, type ComputedRef } from 'vue';
import type { IPinData } from 'n8n-workflow';
import type { Scope } from '@n8n/permissions';
import type * as actualVueRouter from 'vue-router';
import { type RouteLocationNormalizedLoadedGeneric, useRoute } from 'vue-router';
import CanvasNodeStatusIcons from './CanvasNodeStatusIcons.vue';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/vue';

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
	let typeAvailabilityPoliciesStore: MockedStore<typeof useTypeAvailabilityPoliciesStore>;

	beforeEach(() => {
		nodeTypesStore = mockedStore(useNodeTypesStore);
		typeAvailabilityPoliciesStore = mockedStore(useTypeAvailabilityPoliciesStore);
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

	describe('deprecated node', () => {
		const renderDeprecated = () =>
			renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({
							data: {
								issues: { visible: true, validation: ['Parameter "Code" is required.'] },
								render: { type: CanvasNodeRenderType.Default, options: { deprecated: true } },
							},
						}),
					},
				},
			});

		it('should render the deprecated icon ahead of validation issues', () => {
			const { getByTestId, queryByTestId } = renderDeprecated();

			expect(getByTestId('canvas-node-status-deprecated')).toBeInTheDocument();
			expect(queryByTestId('node-issues')).not.toBeInTheDocument();
		});

		it('should render execution errors ahead of the deprecated icon', () => {
			executionIssuesByNodeId.set(
				'node',
				computed(() => ['Request failed']),
			);

			const { getByTestId, queryByTestId } = renderDeprecated();

			expect(getByTestId('node-issues')).toBeInTheDocument();
			expect(queryByTestId('canvas-node-status-deprecated')).not.toBeInTheDocument();
		});
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

	describe('restricted node type', () => {
		beforeEach(() => {
			typeAvailabilityPoliciesStore.getNodeTypeAvailability.mockReturnValue({
				name: 'n8n-nodes-base.slack',
				available: false,
				scope: 'instance',
			});
		});

		it('should render the lock badge for a restricted node type', () => {
			const { queryByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { type: 'n8n-nodes-base.slack' } }),
					},
				},
			});

			expect(queryByTestId('node-restricted')).toBeInTheDocument();
		});

		it('should keep the lock badge ahead of the not-installed badge', () => {
			nodeTypesStore.getIsNodeInstalled = vi.fn().mockReturnValue(false);
			const { queryByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { type: 'n8n-nodes-base.slack' } }),
					},
				},
			});

			expect(queryByTestId('node-restricted')).toBeInTheDocument();
			expect(queryByTestId('node-not-installed')).not.toBeInTheDocument();
		});
	});

	describe('sub-workflow with a restricted node type', () => {
		beforeEach(() => {
			typeAvailabilityPoliciesStore.getNodeTypeAvailability.mockReturnValue({
				name: 'n8n-nodes-base.executeWorkflow',
				available: true,
			});
		});

		function renderExecuteWorkflowNode(scopes: Scope[]) {
			// The testing pinia stubs actions, so the document gets a pinia of its own to set scopes.
			const canvasPinia = getActivePinia();
			setActivePinia(createTestingPinia({ stubActions: false }));
			const document = useWorkflowDocumentStore(createWorkflowDocumentId('parent'));
			document.setScopes(scopes);
			setActivePinia(canvasPinia);
			vi.spyOn(document, 'getNodeById').mockReturnValue(
				createTestNode({
					id: 'node',
					type: 'n8n-nodes-base.executeWorkflow',
					parameters: { workflowId: { __rl: true, mode: 'list', value: 'child' } },
				}),
			);
			typeAvailabilityPoliciesStore.getSubWorkflowCheck.mockReturnValue({
				draft: [
					{
						kind: 'node-type-unavailable',
						checkId: 'node-type-availability',
						message: 'blocked',
						subject: 'n8n-nodes-base.set',
						subjectType: 'nodeType',
						scope: 'project',
					},
				],
				published: null,
			});

			return renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({
							id: 'node',
							data: { type: 'n8n-nodes-base.executeWorkflow' },
						}),
						[WorkflowDocumentStoreKey]: computed(() => document),
					},
				},
			});
		}

		it('should render the warning badge for a builder of the parent', () => {
			const { queryByTestId } = renderExecuteWorkflowNode(['workflow:update']);

			expect(typeAvailabilityPoliciesStore.fetchSubWorkflowCheck).toHaveBeenCalledWith(
				'parent',
				'child',
				{ force: false },
			);
			expect(queryByTestId('node-sub-workflow-restricted')).toBeInTheDocument();
		});

		it('should name the blocked node types and the scope in the tooltip', async () => {
			const { getByTestId } = renderExecuteWorkflowNode(['workflow:update']);

			await userEvent.hover(getByTestId('node-sub-workflow-restricted').firstElementChild!);

			expect(
				await screen.findByText("Restricted in the sub-workflow's project: 'n8n-nodes-base.set'.", {
					exact: false,
				}),
			).toBeInTheDocument();
		});

		it('should not check for a user who cannot update the parent', () => {
			const { queryByTestId } = renderExecuteWorkflowNode(['workflow:read']);

			expect(typeAvailabilityPoliciesStore.fetchSubWorkflowCheck).not.toHaveBeenCalled();
			expect(queryByTestId('node-sub-workflow-restricted')).not.toBeInTheDocument();
		});
	});
});
