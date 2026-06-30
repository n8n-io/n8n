import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { createTestingPinia } from '@pinia/testing';
import type { INodeUi } from '@/Interface';
import { computed, defineComponent } from 'vue';
import { useNodeRunsAsYou } from './useNodeRunsAsYou';

const WORKFLOW_ID = 'test-workflow-id';

vi.mock('@/features/resolvers/composables/usePrivateCredentials', () => ({
	usePrivateCredentials: vi.fn(),
}));

import { usePrivateCredentials } from '@/features/resolvers/composables/usePrivateCredentials';

const mockedUsePrivateCredentials = vi.mocked(usePrivateCredentials);

const TestComponent = defineComponent({
	setup() {
		const { runsAsYou, tooltipText } = useNodeRunsAsYou(() => 'Test Node');
		return { runsAsYou, tooltipText };
	},
	template: `<div>
		<span data-test-id="runs-as-you">{{ runsAsYou }}</span>
		<span data-test-id="tooltip-text">{{ tooltipText }}</span>
	</div>`,
});

const renderComponent = createComponentRenderer(TestComponent, {
	pinia: createTestingPinia(),
});

const mockFeatureFlag = (enabled: boolean) => {
	mockedUsePrivateCredentials.mockReturnValue({
		isEnabled: computed(() => enabled),
	} as ReturnType<typeof usePrivateCredentials>);
};

describe('useNodeRunsAsYou', () => {
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

		workflowsStore.workflowId = WORKFLOW_ID;

		// Default: feature flag disabled
		mockFeatureFlag(false);

		workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(WORKFLOW_ID));
	});

	it('is false when the feature flag is disabled', () => {
		const node = createMockNode({ credentials: { testCred: { id: 'cred-1', name: 'Test Cred' } } });
		vi.mocked(workflowDocumentStore.getNodeByName).mockReturnValue(node);
		credentialsStore.getCredentialById = vi.fn().mockReturnValue({ isResolvable: true });

		const { getByTestId } = renderComponent();

		expect(getByTestId('runs-as-you')).toHaveTextContent('false');
	});

	it('is true with a resolvable credential when the flag is enabled', () => {
		mockFeatureFlag(true);
		const node = createMockNode({ credentials: { testCred: { id: 'cred-1', name: 'Test Cred' } } });
		vi.mocked(workflowDocumentStore.getNodeByName).mockReturnValue(node);
		credentialsStore.getCredentialById = vi.fn().mockReturnValue({ isResolvable: true });

		const { getByTestId } = renderComponent();

		expect(getByTestId('runs-as-you')).toHaveTextContent('true');
		expect(getByTestId('tooltip-text')).toHaveTextContent(
			'This node uses private credentials that are resolved at runtime.',
		);
	});

	it('is false with a non-resolvable credential', () => {
		mockFeatureFlag(true);
		const node = createMockNode({ credentials: { testCred: { id: 'cred-1', name: 'Test Cred' } } });
		vi.mocked(workflowDocumentStore.getNodeByName).mockReturnValue(node);
		credentialsStore.getCredentialById = vi.fn().mockReturnValue({ isResolvable: false });

		const { getByTestId } = renderComponent();

		expect(getByTestId('runs-as-you')).toHaveTextContent('false');
	});

	it('is true for a node with context establishment hooks', () => {
		mockFeatureFlag(true);
		const node = createMockNode({
			parameters: { contextEstablishmentHooks: { hooks: [{ id: 'hook-1' }] } },
		});
		vi.mocked(workflowDocumentStore.getNodeByName).mockReturnValue(node);

		const { getByTestId } = renderComponent();

		expect(getByTestId('runs-as-you')).toHaveTextContent('true');
		expect(getByTestId('tooltip-text')).toHaveTextContent(
			"This webhook extracts the triggering user's identity token to resolve credentials at runtime.",
		);
	});

	it('is false when the node has no credentials', () => {
		mockFeatureFlag(true);
		const node = createMockNode({ credentials: undefined });
		vi.mocked(workflowDocumentStore.getNodeByName).mockReturnValue(node);

		const { getByTestId } = renderComponent();

		expect(getByTestId('runs-as-you')).toHaveTextContent('false');
	});

	it('is false when the credential is not found in the store', () => {
		mockFeatureFlag(true);
		const node = createMockNode({ credentials: { testCred: { id: 'cred-1', name: 'Test Cred' } } });
		vi.mocked(workflowDocumentStore.getNodeByName).mockReturnValue(node);
		credentialsStore.getCredentialById = vi.fn().mockReturnValue(undefined);

		const { getByTestId } = renderComponent();

		expect(getByTestId('runs-as-you')).toHaveTextContent('false');
	});
});
