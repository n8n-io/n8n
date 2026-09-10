/**
 * `WorkflowDocumentStoreKey` is provided once, by App.vue, and shared by every
 * layout. A layout that renders its `RouterView` before its own initialization
 * has produced a document store therefore renders it against whatever store the
 * *outgoing* layout left in that ref — a store the outgoing layout's `cleanup()`
 * is about to null.
 *
 * `NodeView` reads that ref strictly, through `injectNDVStore()`, from a watcher
 * getter that re-runs on every invalidation. So "store nulled while NodeView is
 * mounted" is an illegal state: the read throws
 * `injectNDVStore() was accessed without an active workflow document store`.
 *
 * These tests assert the state, not the throw. In the browser the throw is masked
 * because the parent render effect happens to unmount `NodeView` before the child
 * watcher job runs — flush order, not a guard, is what holds the invariant today.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computed, defineComponent, ref, shallowRef, type ShallowRef } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { renderComponent } from '@/__tests__/render';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { injectStrict } from '@/app/utils/injectStrict';
import type { WorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import DemoLayout from './DemoLayout.vue';
import WorkflowLayout from './WorkflowLayout.vue';

/** The single App.vue-provided ref, under the test's control. */
let providedDocumentStore: ShallowRef<WorkflowDocumentStore | null>;

vi.mock('vue-router', async (importOriginal) => {
	const actual = (await importOriginal()) as object;
	return {
		...actual,
		useRoute: () => ({ params: {}, query: {}, meta: {}, name: 'demo' }),
		useRouter: () => ({ replace: vi.fn(), push: vi.fn(), afterEach: vi.fn() }),
	};
});

vi.mock('@/app/composables/useWorkflowInitialization', () => ({
	useWorkflowInitialization: () => {
		// Models the three things about the real composable that this window depends on:
		// it injects the shared ref (line 63), starts with isLoading true (line 76), and
		// nulls the shared ref from cleanup() (line 89). Initialization is left in flight
		// on purpose — the window under test is the one before it resolves.
		const currentWorkflowDocumentStore = injectStrict(WorkflowDocumentStoreKey);
		const stillInFlight = () => new Promise<void>(() => {});

		return {
			isLoading: ref(true),
			workflowId: computed(() => 'demo'),
			currentWorkflowDocumentStore,
			isNewWorkflowRoute: computed(() => false),
			isDemoRoute: computed(() => true),
			isTemplateRoute: computed(() => false),
			isOnboardingRoute: computed(() => false),
			isDebugRoute: computed(() => false),
			initializeData: stillInFlight,
			initializeWorkflow: stillInFlight,
			handleDebugModeRoute: stillInFlight,
			cleanup: () => {
				currentWorkflowDocumentStore.value = null;
			},
		};
	},
}));

vi.mock('@/app/composables/usePostMessageHandler', () => ({
	usePostMessageHandler: () => ({ setup: vi.fn(), cleanup: vi.fn() }),
}));

vi.mock('@/app/composables/usePushConnection/usePushConnection', () => ({
	usePushConnection: () => ({ initialize: vi.fn(), terminate: vi.fn() }),
}));

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({ pushConnect: vi.fn(), pushDisconnect: vi.fn() }),
}));

vi.mock('@/app/composables/useLayoutProps', () => ({
	useLayoutProps: () => ({ layoutProps: computed(() => ({ logs: false })) }),
}));

vi.mock('@/features/ai/assistant/assistant.store', () => ({
	useAssistantStore: () => ({ isFloatingButtonShown: false }),
}));

/**
 * Stands in for NodeView: strict-injects the shared document store ref, exactly as
 * `injectNDVStore()` does. Its presence in the DOM is the fact under test.
 */
const NodeViewStub = defineComponent({
	setup() {
		injectStrict(WorkflowDocumentStoreKey);
	},
	template: '<div data-test-id="node-view" />',
});

const stubs = {
	AppHeader: { template: '<div />' },
	AppSidebar: { template: '<div />' },
	LogsPanel: { template: '<div />' },
	AskAssistantFloatingButton: { template: '<div />' },
	CanvasChatOverlay: { template: '<div />' },
	DemoFooter: { template: '<div />' },
	LoadingView: { template: '<div data-test-id="loading-view" />' },
	RouterView: NodeViewStub,
	Suspense: { template: '<div><slot /></div>' },
};

function renderLayout(layout: typeof DemoLayout) {
	return renderComponent(layout, {
		global: {
			provide: { [WorkflowDocumentStoreKey as symbol]: providedDocumentStore },
			stubs,
		},
	});
}

/** The document store the layout being navigated away from still has provided. */
function outgoingDocumentStore() {
	return {
		documentId: 'workflow:outgoing',
		workflowId: 'outgoing',
	} as unknown as WorkflowDocumentStore;
}

describe('layouts: workflow document store null window', () => {
	beforeEach(() => {
		createTestingPinia();
		vi.clearAllMocks();
		providedDocumentStore = shallowRef(outgoingDocumentStore());
	});

	describe('DemoLayout', () => {
		it('does not mount NodeView against the outgoing layout document store', () => {
			const { queryByTestId } = renderLayout(DemoLayout);

			expect(queryByTestId('node-view')).not.toBeInTheDocument();
		});

		it('does not keep NodeView mounted once the provided document store is null', () => {
			const { queryByTestId } = renderLayout(DemoLayout);

			// The outgoing layout's cleanup(), which nulls the shared ref.
			providedDocumentStore.value = null;

			// Read the DOM in the same frame, with no flush in between. This is the frame
			// NodeView's watcher getters re-run in and injectNDVStore() throws in. Awaiting
			// nextTick first would let the v-if unmount NodeView and hide the window.
			expect(queryByTestId('node-view')).not.toBeInTheDocument();
		});
	});

	describe('WorkflowLayout', () => {
		it('does not mount NodeView against the outgoing layout document store', () => {
			const { queryByTestId } = renderLayout(WorkflowLayout);

			expect(queryByTestId('node-view')).not.toBeInTheDocument();
			expect(queryByTestId('loading-view')).toBeInTheDocument();
		});

		it('does not keep NodeView mounted once the provided document store is null', () => {
			const { queryByTestId } = renderLayout(WorkflowLayout);

			providedDocumentStore.value = null;

			expect(queryByTestId('node-view')).not.toBeInTheDocument();
		});
	});
});
