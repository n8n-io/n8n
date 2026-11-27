import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { ref, shallowRef } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { useRoute } from 'vue-router';
import ActionsDropdownMenu from '@/app/components/MainHeader/ActionsDropdownMenu.vue';
import { VIEWS } from '@/app/constants';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowSettingsCache } from '@/app/composables/useWorkflowsCache';
import { useSettingsStore } from '@n8n/stores/settings.store';

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal()),
	useRoute: vi.fn(),
	useRouter: vi.fn().mockReturnValue({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/app/composables/useWorkflowsCache', async (importOriginal) => ({
	actionTypes: (await importOriginal<typeof import('@/app/composables/useWorkflowsCache')>())
		.actionTypes,
	useWorkflowSettingsCache: vi.fn(),
}));

vi.mock('@/app/composables/useDependencies', () => ({
	useDependencies: () => ({
		getDependencies: () => undefined,
		fetchDependencies: vi.fn(),
		fetchDependencyCounts: vi.fn(),
		hasDependencies: () => false,
	}),
}));

vi.mock('@/experiments/mcpJsonNudge/composables/useMcpJsonNudgeTrigger', () => ({
	useMcpJsonNudgeTrigger: () => ({ gate: vi.fn() }),
}));

const WORKFLOW_ID = 'test-workflow-id';

let suggestedActionsProps: { open?: boolean } = {};

const N8nSuggestedActionsStub = {
	name: 'N8nSuggestedActions',
	props: ['actions', 'ignoreAllLabel', 'popoverAlignment', 'open', 'title', 'notice'],
	setup(props: { open?: boolean }) {
		suggestedActionsProps = props;
		return {};
	},
	template: '<div data-test-id="n8n-suggested-actions-stub" />',
};

const workflowDocumentStoreRef = shallowRef<ReturnType<typeof useWorkflowDocumentStore> | null>(
	null,
);

const renderComponent = createComponentRenderer(ActionsDropdownMenu, {
	props: {
		workflowPermissions: {},
		isNewWorkflow: false,
		isArchived: false,
		id: WORKFLOW_ID,
		name: 'Test Workflow',
		tags: [],
	},
	global: {
		provide: {
			[WorkflowDocumentStoreKey as symbol]: workflowDocumentStoreRef,
		},
		stubs: {
			N8nSuggestedActions: N8nSuggestedActionsStub,
		},
	},
});

async function settle() {
	await flushPromises();
	// The checklist opens in a zero-delay timeout after the activation watcher runs
	await new Promise((resolve) => setTimeout(resolve, 0));
	await flushPromises();
}

describe('ActionsDropdownMenu', () => {
	describe('Production checklist auto-open', () => {
		beforeEach(() => {
			setActivePinia(createTestingPinia({ stubActions: false }));
			const workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId(WORKFLOW_ID));
			workflowDocumentStore.setSettings({ executionOrder: 'v1' });
			workflowDocumentStoreRef.value = workflowDocumentStore;

			// Fresh browser: no "first activated" marker is stored for this workflow
			vi.mocked(useWorkflowSettingsCache).mockReturnValue({
				isCacheLoading: ref(false),
				getMergedWorkflowSettings: vi.fn().mockResolvedValue({ suggestedActions: {} }),
				getWorkflowSettings: vi.fn().mockResolvedValue({}),
				ignoreSuggestedAction: vi.fn().mockResolvedValue(undefined),
				ignoreAllSuggestedActionsForAllWorkflows: vi.fn().mockResolvedValue(undefined),
				updateFirstActivatedAt: vi.fn().mockResolvedValue(undefined),
			} as unknown as ReturnType<typeof useWorkflowSettingsCache>);
		});

		afterEach(() => {
			vi.clearAllMocks();
			suggestedActionsProps = {};
		});

		// Mirrors the load of a published workflow: activeVersionId comes with the
		// workflow, and the publication status sync then reports 'published'.
		async function loadPublishedWorkflowOn(routeName: string) {
			vi.mocked(useRoute).mockReturnValue({
				name: routeName,
				params: { workflowId: WORKFLOW_ID },
				query: {},
				meta: {},
			} as unknown as ReturnType<typeof useRoute>);

			const pinia = createTestingPinia();
			const settingsStore = useSettingsStore(pinia);
			vi.spyOn(settingsStore, 'isWorkflowPublicationServiceEnabled', 'get').mockReturnValue(true);

			workflowDocumentStoreRef.value?.setActiveState({
				activeVersionId: 'v1',
				activeVersion: null,
			});
			workflowDocumentStoreRef.value?.setPublicationStatus({ status: 'idle' });

			renderComponent({ pinia });
			await settle();

			workflowDocumentStoreRef.value?.setPublicationStatus({ status: 'published' });
			await settle();
		}

		it.each([VIEWS.EXECUTION_PREVIEW, VIEWS.EXECUTION_HOME, VIEWS.WORKFLOW_EXECUTIONS])(
			'should not open the production checklist automatically on the %s route',
			async (routeName) => {
				await loadPublishedWorkflowOn(routeName);

				expect(suggestedActionsProps.open).not.toBe(true);
			},
		);

		it('should open the production checklist automatically on the workflow editor route', async () => {
			await loadPublishedWorkflowOn(VIEWS.WORKFLOW);

			expect(suggestedActionsProps.open).toBe(true);
		});
	});
});
