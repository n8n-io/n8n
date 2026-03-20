/**
 * Regression tests for GHC-7358: Workflow Settings shown as not configured
 *
 * Bug: Production checklist items read completion state from stale `props.workflow.settings`
 * instead of reactive `cachedSettings`, causing them to show as "not configured" even after
 * the user saves settings.
 *
 * Affected items:
 * - Error Workflow (reads from props.workflow.settings.errorWorkflow)
 * - Track time saved (reads from props.workflow.settings.timeSavedPerExecution)
 * - MCP access (reads from props.workflow.settings.availableInMCP)
 */

import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { ref, shallowRef } from 'vue';
import { setActivePinia } from 'pinia';
import WorkflowProductionChecklist from '@/app/components/WorkflowProductionChecklist.vue';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { useEvaluationStore } from '@/features/ai/evaluation.ee/evaluation.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowSettingsCache } from '@/app/composables/useWorkflowsCache';
import { useUIStore } from '@/app/stores/ui.store';
import { useMessage } from '@/app/composables/useMessage';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useRouter } from 'vue-router';
import type { IWorkflowDb } from '@/Interface';
import { MODAL_CONFIRM, ERROR_WORKFLOW_DOCS_URL, TIME_SAVED_DOCS_URL } from '@/app/constants';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { MCP_DOCS_PAGE_URL } from '@/features/ai/mcpAccess/mcp.constants';
import { useMcp } from '@/features/ai/mcpAccess/composables/useMcp';

vi.mock('vue-router', async (importOriginal) => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const actual = await importOriginal<typeof import('vue-router')>();
	return {
		...actual,
		useRouter: vi.fn(),
	};
});

vi.mock('@/app/composables/useWorkflowsCache', () => ({
	useWorkflowSettingsCache: vi.fn(),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: vi.fn(),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(),
}));

vi.mock('@/features/ai/mcpAccess/composables/useMcp', () => ({
	useMcp: vi.fn(),
}));

vi.mock('@n8n/i18n', async (importOriginal) => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const actual = await importOriginal<typeof import('@n8n/i18n')>();
	return {
		...actual,
		useI18n: () => ({
			baseText: (key: string) => key,
		}),
		i18n: {
			...actual.i18n,
			baseText: (key: string) => key,
		},
	};
});

const mockWorkflow: IWorkflowDb = {
	id: 'test-workflow-id',
	name: 'Test Workflow',
	active: true,
	activeVersionId: 'v1',
	nodes: [],
	settings: {
		executionOrder: 'v1',
	},
	connections: {},
	versionId: '1',
	createdAt: Date.now(),
	updatedAt: Date.now(),
	isArchived: false,
};

// eslint-disable-next-line
let mockN8nSuggestedActionsProps: Record<string, any> = {};

const mockN8nSuggestedActions = {
	name: 'N8nSuggestedActions',
	props: ['actions', 'ignoreAllLabel', 'popoverAlignment', 'open', 'title', 'notice'],
	emits: ['action-click', 'ignore-click', 'ignore-all', 'update:open'],
	// eslint-disable-next-line
	setup(props: any) {
		mockN8nSuggestedActionsProps = props;
		return { props };
	},
	template: '<div data-test-id="n8n-suggested-actions-stub" />',
};

const workflowDocumentStoreRef = shallowRef<ReturnType<typeof useWorkflowDocumentStore> | null>(
	null,
);

const renderComponent = createComponentRenderer(WorkflowProductionChecklist, {
	global: {
		provide: {
			[WorkflowDocumentStoreKey as symbol]: workflowDocumentStoreRef,
		},
		stubs: {
			N8nSuggestedActions: mockN8nSuggestedActions,
		},
	},
});

describe('WorkflowProductionChecklist - Stale Settings Bug (GHC-7358)', () => {
	let workflowsCache: ReturnType<typeof useWorkflowSettingsCache>;
	let settingsStore: ReturnType<typeof useSettingsStore>;
	let mcpComposable: ReturnType<typeof useMcp>;

	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		const workflowDocumentStore = useWorkflowDocumentStore(
			createWorkflowDocumentId(mockWorkflow.id),
		);
		workflowDocumentStore.setActiveState({ activeVersionId: 'v1', activeVersion: null });
		workflowDocumentStoreRef.value = workflowDocumentStore;

		(useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
			push: vi.fn(),
		} as unknown as ReturnType<typeof useRouter>);

		workflowsCache = {
			isCacheLoading: ref(false),
			getMergedWorkflowSettings: vi.fn().mockResolvedValue({
				suggestedActions: {},
			}),
			ignoreSuggestedAction: vi.fn().mockResolvedValue(undefined),
			ignoreAllSuggestedActionsForAllWorkflows: vi.fn().mockResolvedValue(undefined),
			updateFirstActivatedAt: vi.fn().mockResolvedValue(undefined),
		} as unknown as ReturnType<typeof useWorkflowSettingsCache>;
		(useWorkflowSettingsCache as ReturnType<typeof vi.fn>).mockReturnValue(workflowsCache);

		(useMessage as ReturnType<typeof vi.fn>).mockReturnValue({
			confirm: vi.fn().mockResolvedValue(MODAL_CONFIRM),
		} as unknown as ReturnType<typeof useMessage>);

		(useTelemetry as ReturnType<typeof vi.fn>).mockReturnValue({
			track: vi.fn(),
		} as unknown as ReturnType<typeof useTelemetry>);

		mcpComposable = {
			isEligibleForMcpAccess: vi.fn().mockReturnValue(true),
		} as unknown as ReturnType<typeof useMcp>;
		(useMcp as ReturnType<typeof vi.fn>).mockReturnValue(mcpComposable);
	});

	afterEach(() => {
		vi.clearAllMocks();
		mockN8nSuggestedActionsProps = {};
	});

	describe('Error Workflow completion state', () => {
		it('should reactively update when error workflow is configured via cache', async () => {
			const pinia = createTestingPinia();

			// Initial state: no error workflow configured
			workflowsCache.getMergedWorkflowSettings = vi.fn().mockResolvedValue({
				suggestedActions: {},
			});

			renderComponent({
				props: {
					workflow: {
						...mockWorkflow,
						settings: {
							executionOrder: 'v1',
							// Note: errorWorkflow NOT set in props initially
						},
					},
				},
				pinia,
			});

			// Wait for initial render - should show as not completed
			await vi.waitFor(() => {
				const errorAction = mockN8nSuggestedActionsProps.actions?.find(
					(a: { id: string }) => a.id === 'errorWorkflow',
				);
				expect(errorAction).toBeDefined();
				expect(errorAction.completed).toBe(false);
			});

			// Simulate user configuring error workflow via settings modal
			// The cache updates, but props.workflow.settings remains stale
			workflowsCache.getMergedWorkflowSettings = vi.fn().mockResolvedValue({
				suggestedActions: {},
				errorWorkflow: 'error-workflow-id', // Cache updated
			});

			// Trigger cache reload (this would happen after settings modal closes)
			await (workflowsCache.getMergedWorkflowSettings as ReturnType<typeof vi.fn>).mock.results[0]
				.value;

			// BUG: Action should now show as completed, but it doesn't
			// because it reads from stale props.workflow.settings.errorWorkflow
			await vi.waitFor(() => {
				const errorAction = mockN8nSuggestedActionsProps.actions?.find(
					(a: { id: string }) => a.id === 'errorWorkflow',
				);
				expect(errorAction).toBeDefined();
				// This assertion SHOULD pass but currently FAILS due to the bug
				expect(errorAction.completed).toBe(true);
			});
		});
	});

	describe('Time Saved completion state', () => {
		it('should reactively update when time saved is configured via cache', async () => {
			const pinia = createTestingPinia();

			// Initial state: no time saved configured
			workflowsCache.getMergedWorkflowSettings = vi.fn().mockResolvedValue({
				suggestedActions: {},
			});

			renderComponent({
				props: {
					workflow: {
						...mockWorkflow,
						settings: {
							executionOrder: 'v1',
							// Note: timeSavedPerExecution NOT set in props initially
						},
					},
				},
				pinia,
			});

			// Wait for initial render - should show as not completed
			await vi.waitFor(() => {
				const timeSavedAction = mockN8nSuggestedActionsProps.actions?.find(
					(a: { id: string }) => a.id === 'timeSaved',
				);
				expect(timeSavedAction).toBeDefined();
				expect(timeSavedAction.completed).toBe(false);
			});

			// Simulate user configuring time saved via settings modal
			// The cache updates, but props.workflow.settings remains stale
			workflowsCache.getMergedWorkflowSettings = vi.fn().mockResolvedValue({
				suggestedActions: {},
				timeSavedPerExecution: 10, // Cache updated
			});

			// Trigger cache reload
			await (workflowsCache.getMergedWorkflowSettings as ReturnType<typeof vi.fn>).mock.results[0]
				.value;

			// BUG: Action should now show as completed, but it doesn't
			// because it reads from stale props.workflow.settings.timeSavedPerExecution
			await vi.waitFor(() => {
				const timeSavedAction = mockN8nSuggestedActionsProps.actions?.find(
					(a: { id: string }) => a.id === 'timeSaved',
				);
				expect(timeSavedAction).toBeDefined();
				// This assertion SHOULD pass but currently FAILS due to the bug
				expect(timeSavedAction.completed).toBe(true);
			});
		});
	});

	describe('MCP Access completion state', () => {
		it('should reactively update when MCP access is enabled via cache', async () => {
			const pinia = createTestingPinia();
			settingsStore = useSettingsStore(pinia);

			vi.spyOn(settingsStore, 'isModuleActive').mockReturnValue(true);
			vi.spyOn(settingsStore, 'moduleSettings', 'get').mockReturnValue({
				mcp: { mcpAccessEnabled: true },
			});
			(mcpComposable.isEligibleForMcpAccess as ReturnType<typeof vi.fn>).mockReturnValue(true);

			// Initial state: MCP not enabled in workflow
			workflowsCache.getMergedWorkflowSettings = vi.fn().mockResolvedValue({
				suggestedActions: {},
			});

			renderComponent({
				props: {
					workflow: {
						...mockWorkflow,
						settings: {
							executionOrder: 'v1',
							// Note: availableInMCP NOT set in props initially
						},
					},
				},
				pinia,
			});

			// Wait for initial render - should show as not completed
			await vi.waitFor(() => {
				const mcpAction = mockN8nSuggestedActionsProps.actions?.find(
					(a: { id: string }) => a.id === 'workflow-mcp-access',
				);
				expect(mcpAction).toBeDefined();
				expect(mcpAction.completed).toBe(false);
			});

			// Simulate user enabling MCP access via settings modal
			// The cache updates, but props.workflow.settings remains stale
			workflowsCache.getMergedWorkflowSettings = vi.fn().mockResolvedValue({
				suggestedActions: {},
				availableInMCP: true, // Cache updated
			});

			// Trigger cache reload
			await (workflowsCache.getMergedWorkflowSettings as ReturnType<typeof vi.fn>).mock.results[0]
				.value;

			// BUG: Action should now show as completed, but it doesn't
			// because it reads from stale props.workflow.settings.availableInMCP
			await vi.waitFor(() => {
				const mcpAction = mockN8nSuggestedActionsProps.actions?.find(
					(a: { id: string }) => a.id === 'workflow-mcp-access',
				);
				expect(mcpAction).toBeDefined();
				// This assertion SHOULD pass but currently FAILS due to the bug
				expect(mcpAction.completed).toBe(true);
			});
		});
	});
});
