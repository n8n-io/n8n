import {
	createCanvasNodeProvide,
	createCanvasProvide,
} from '@/features/workflows/canvas/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { createTestingPinia } from '@pinia/testing';
import CanvasNodeSettingsIcons from './CanvasNodeSettingsIcons.vue';
import type { INodeUi } from '@/Interface';
import { computed } from 'vue';

const WORKFLOW_ID = 'test-workflow-id';

vi.mock('@/features/resolvers/composables/useDynamicCredentials', () => ({
	useDynamicCredentials: vi.fn(),
}));

import { useDynamicCredentials } from '@/features/resolvers/composables/useDynamicCredentials';

const mockedUseDynamicCredentials = vi.mocked(useDynamicCredentials);

const renderComponent = createComponentRenderer(CanvasNodeSettingsIcons, {
	pinia: createTestingPinia(),
});

const mockFeatureFlag = (enabled: boolean) => {
	mockedUseDynamicCredentials.mockReturnValue({
		isEnabled: computed(() => enabled),
	} as ReturnType<typeof useDynamicCredentials>);
};

describe('CanvasNodeSettingsIcons', () => {
	let workflowsStore: MockedStore<typeof useWorkflowsStore>;
	let credentialsStore: MockedStore<typeof useCredentialsStore>;
	let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;

	const createMockNode = (overrides: Partial<INodeUi> = {}): INodeUi =>
		({
			name: 'Test Node',
			type: 'test',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			...overrides,
		}) as INodeUi;

	beforeEach(() => {
		workflowsStore = mockedStore(useWorkflowsStore);
		credentialsStore = mockedStore(useCredentialsStore);

		workflowsStore.workflow.id = WORKFLOW_ID;
		workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(WORKFLOW_ID));

		// Default: feature flag disabled
		mockFeatureFlag(false);
	});

	describe('dynamic credentials icon', () => {
		it('should not render when feature flag is disabled', () => {
			const node = createMockNode({
				credentials: { testCred: { id: 'cred-1', name: 'Test Cred' } },
			});
			vi.mocked(workflowDocumentStore.getNodeByName).mockReturnValue(node);
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({ isResolvable: true });

			const { queryByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(queryByTestId('canvas-node-status-dynamic-credentials')).not.toBeInTheDocument();
		});

		it('should render when feature flag enabled and credential is resolvable', () => {
			mockFeatureFlag(true);

			const node = createMockNode({
				credentials: { testCred: { id: 'cred-1', name: 'Test Cred' } },
			});
			vi.mocked(workflowDocumentStore.getNodeByName).mockReturnValue(node);
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({ isResolvable: true });

			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(getByTestId('canvas-node-status-dynamic-credentials')).toBeInTheDocument();
		});

		it('should not render when credential is not resolvable', () => {
			mockFeatureFlag(true);

			const node = createMockNode({
				credentials: { testCred: { id: 'cred-1', name: 'Test Cred' } },
			});
			vi.mocked(workflowDocumentStore.getNodeByName).mockReturnValue(node);
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({ isResolvable: false });

			const { queryByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(queryByTestId('canvas-node-status-dynamic-credentials')).not.toBeInTheDocument();
		});

		it('should render when node has context establishment hooks', () => {
			mockFeatureFlag(true);

			const node = createMockNode({
				parameters: {
					contextEstablishmentHooks: { hooks: [{ id: 'hook-1' }] },
				},
			});
			vi.mocked(workflowDocumentStore.getNodeByName).mockReturnValue(node);

			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(getByTestId('canvas-node-status-dynamic-credentials')).toBeInTheDocument();
		});

		it('should not render when node has empty context establishment hooks', () => {
			mockFeatureFlag(true);

			const node = createMockNode({
				parameters: {
					contextEstablishmentHooks: { hooks: [] },
				},
			});
			vi.mocked(workflowDocumentStore.getNodeByName).mockReturnValue(node);

			const { queryByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(queryByTestId('canvas-node-status-dynamic-credentials')).not.toBeInTheDocument();
		});

		it('should not render when node has no credentials', () => {
			mockFeatureFlag(true);

			const node = createMockNode({ credentials: undefined });
			vi.mocked(workflowDocumentStore.getNodeByName).mockReturnValue(node);

			const { queryByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(queryByTestId('canvas-node-status-dynamic-credentials')).not.toBeInTheDocument();
		});

		it('should not render when credential has no id', () => {
			mockFeatureFlag(true);

			const node = createMockNode({
				credentials: { testCred: { id: '', name: 'Test Cred' } },
			});
			vi.mocked(workflowDocumentStore.getNodeByName).mockReturnValue(node);
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({ isResolvable: true });

			const { queryByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(queryByTestId('canvas-node-status-dynamic-credentials')).not.toBeInTheDocument();
		});

		it('should not render when credential is not found in store', () => {
			mockFeatureFlag(true);

			const node = createMockNode({
				credentials: { testCred: { id: 'cred-1', name: 'Test Cred' } },
			});
			vi.mocked(workflowDocumentStore.getNodeByName).mockReturnValue(node);
			credentialsStore.getCredentialById = vi.fn().mockReturnValue(undefined);

			const { queryByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(queryByTestId('canvas-node-status-dynamic-credentials')).not.toBeInTheDocument();
		});

		it('should not render when contextEstablishmentHooks is not an object', () => {
			mockFeatureFlag(true);

			const node = createMockNode({
				parameters: {
					contextEstablishmentHooks: 'not-an-object',
				},
			});
			vi.mocked(workflowDocumentStore.getNodeByName).mockReturnValue(node);

			const { queryByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(queryByTestId('canvas-node-status-dynamic-credentials')).not.toBeInTheDocument();
		});

		it('should not render when contextEstablishmentHooks has no hooks property', () => {
			mockFeatureFlag(true);

			const node = createMockNode({
				parameters: {
					contextEstablishmentHooks: { other: 'property' },
				},
			});
			vi.mocked(workflowDocumentStore.getNodeByName).mockReturnValue(node);

			const { queryByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(queryByTestId('canvas-node-status-dynamic-credentials')).not.toBeInTheDocument();
		});

		it('should not render when hooks is not an array', () => {
			mockFeatureFlag(true);

			const node = createMockNode({
				parameters: {
					contextEstablishmentHooks: { hooks: 'not-an-array' },
				},
			});
			vi.mocked(workflowDocumentStore.getNodeByName).mockReturnValue(node);

			const { queryByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(queryByTestId('canvas-node-status-dynamic-credentials')).not.toBeInTheDocument();
		});
	});

	describe('other settings icons', () => {
		beforeEach(() => {
			vi.mocked(workflowDocumentStore.getNodeByName).mockReturnValue(createMockNode());
		});

		it('should render always output data icon when enabled', () => {
			const node = createMockNode({ alwaysOutputData: true });
			vi.mocked(workflowDocumentStore.getNodeByName).mockReturnValue(node);

			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(getByTestId('canvas-node-status-always-output-data')).toBeInTheDocument();
		});

		it('should render execute once icon when enabled', () => {
			const node = createMockNode({ executeOnce: true });
			vi.mocked(workflowDocumentStore.getNodeByName).mockReturnValue(node);

			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(getByTestId('canvas-node-status-execute-once')).toBeInTheDocument();
		});

		it('should render retry on fail icon when enabled', () => {
			const node = createMockNode({ retryOnFail: true });
			vi.mocked(workflowDocumentStore.getNodeByName).mockReturnValue(node);

			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(getByTestId('canvas-node-status-retry-on-fail')).toBeInTheDocument();
		});

		it('should render continue on error icon when onError is continueRegularOutput', () => {
			const node = createMockNode({ onError: 'continueRegularOutput' });
			vi.mocked(workflowDocumentStore.getNodeByName).mockReturnValue(node);

			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(getByTestId('canvas-node-status-continue-on-error')).toBeInTheDocument();
		});

		it('should render continue on error icon when onError is continueErrorOutput', () => {
			const node = createMockNode({ onError: 'continueErrorOutput' });
			vi.mocked(workflowDocumentStore.getNodeByName).mockReturnValue(node);

			const { getByTestId } = renderComponent({
				global: {
					provide: {
						...createCanvasProvide(),
						...createCanvasNodeProvide({ data: { name: 'Test Node' } }),
					},
				},
			});

			expect(getByTestId('canvas-node-status-continue-on-error')).toBeInTheDocument();
		});
	});
});
