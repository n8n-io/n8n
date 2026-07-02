import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { renderComponent } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import {
	useWorkflowPublicationStatusSync,
	PUBLICATION_STATUS_POLL_INTERVAL_MS,
} from './useWorkflowPublicationStatusSync';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
	type WorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import type { WorkflowPublicationStatus } from '@n8n/api-types';
import type { INodeUi } from '@/Interface';

const TEST_WORKFLOW_ID = 'wf-pub-sync';
const TEST_DOCUMENT_ID = createWorkflowDocumentId(TEST_WORKFLOW_ID);

vi.mock('@/app/composables/useDocumentVisibility', () => ({
	useDocumentVisibility: () => ({
		isVisible: { value: true },
		onDocumentVisible: vi.fn(),
		onDocumentHidden: vi.fn(),
	}),
}));

function makeStatus(
	status: WorkflowPublicationStatus['status'],
	triggers: WorkflowPublicationStatus['triggers'] = [],
): WorkflowPublicationStatus {
	return {
		status,
		liveVersionId: null,
		pendingVersionId: null,
		triggers,
	};
}

async function mountComposable(documentId: WorkflowDocumentId = TEST_DOCUMENT_ID) {
	let composable!: ReturnType<typeof useWorkflowPublicationStatusSync>;

	renderComponent(
		defineComponent({
			setup() {
				// Pass a getter so we exercise the MaybeRefOrGetter code path.
				composable = useWorkflowPublicationStatusSync(() => documentId);
				return () => h('div');
			},
		}),
	);

	// Let the onMounted async refetch resolve
	await nextTick();
	await nextTick();
	return composable;
}

describe('useWorkflowPublicationStatusSync', () => {
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
	let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;
	let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;

	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		vi.useFakeTimers();

		workflowsStore = mockedStore(useWorkflowsStore);
		settingsStore = mockedStore(useSettingsStore);
		workflowDocumentStore = useWorkflowDocumentStore(TEST_DOCUMENT_ID);

		settingsStore.isWorkflowPublicationServiceEnabled = true;

		vi.spyOn(workflowsStore, 'fetchPublicationStatus').mockResolvedValue(makeStatus('published'));
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.clearAllTimers();
		vi.useRealTimers();
	});

	it('should fetch publication status on mount and map to lifecycle', async () => {
		vi.spyOn(workflowsStore, 'fetchPublicationStatus').mockResolvedValue(makeStatus('published'));

		await mountComposable();

		// Pinia setup stores auto-unwrap refs — access as plain value
		expect(workflowsStore.fetchPublicationStatus).toHaveBeenCalledWith(TEST_WORKFLOW_ID);
		expect(workflowDocumentStore.publicationStatus).toBe('published');
	});

	it('should not fetch if the feature flag is off', async () => {
		settingsStore.isWorkflowPublicationServiceEnabled = false;

		await mountComposable();

		expect(workflowsStore.fetchPublicationStatus).not.toHaveBeenCalled();
	});

	it('should map all API statuses to lifecycle values', async () => {
		const cases: Array<[WorkflowPublicationStatus['status'], string]> = [
			['in_progress', 'publishing'],
			['published', 'published'],
			['partial', 'partial'],
			['failed', 'failed'],
			['not_published', 'idle'],
		];

		for (const [apiStatus, expectedLifecycle] of cases) {
			vi.spyOn(workflowsStore, 'fetchPublicationStatus').mockResolvedValue(makeStatus(apiStatus));
			const documentId = createWorkflowDocumentId(`wf-map-${apiStatus}`);
			const store = useWorkflowDocumentStore(documentId);

			renderComponent(
				defineComponent({
					setup() {
						useWorkflowPublicationStatusSync(() => documentId);
						return () => h('div');
					},
				}),
			);

			await nextTick();
			await nextTick();

			expect(store.publicationStatus).toBe(expectedLifecycle);
		}
	});

	it('should re-poll while in_progress and stop when published', async () => {
		vi.spyOn(workflowsStore, 'fetchPublicationStatus')
			.mockResolvedValueOnce(makeStatus('in_progress'))
			.mockResolvedValueOnce(makeStatus('published'));

		await mountComposable();

		// First call resolves in_progress → timer should be scheduled
		expect(workflowsStore.fetchPublicationStatus).toHaveBeenCalledTimes(1);
		expect(workflowDocumentStore.publicationStatus).toBe('publishing');

		// Advance by poll interval — resolves async timer callback
		await vi.advanceTimersByTimeAsync(PUBLICATION_STATUS_POLL_INTERVAL_MS);

		expect(workflowsStore.fetchPublicationStatus).toHaveBeenCalledTimes(2);
		expect(workflowDocumentStore.publicationStatus).toBe('published');

		// No further timers should be armed
		await vi.advanceTimersByTimeAsync(PUBLICATION_STATUS_POLL_INTERVAL_MS);
		expect(workflowsStore.fetchPublicationStatus).toHaveBeenCalledTimes(2);
	});

	it('should resolve failure node names from the workflow and sort them', async () => {
		// The API returns only nodeId; the composable resolves the current display
		// name from the live workflow via getNodeById.
		const names: Record<string, string> = { 'id-a': 'Alpha', 'id-b': 'Bravo', 'id-c': 'Charlie' };
		vi.spyOn(workflowDocumentStore, 'getNodeById').mockImplementation((id) =>
			names[id] ? ({ name: names[id] } as INodeUi) : undefined,
		);
		vi.spyOn(workflowsStore, 'fetchPublicationStatus').mockResolvedValue({
			...makeStatus('failed'),
			triggers: [
				{ nodeId: 'id-c', status: 'failed', errorMessage: 'err C' },
				{ nodeId: 'id-a', status: 'failed', errorMessage: 'err A' },
				{ nodeId: 'id-b', status: 'failed', errorMessage: 'err B' },
			],
		});

		await mountComposable();

		expect(workflowDocumentStore.publicationFailures).toEqual([
			{ nodeId: 'id-a', nodeName: 'Alpha', errorMessage: 'err A' },
			{ nodeId: 'id-b', nodeName: 'Bravo', errorMessage: 'err B' },
			{ nodeId: 'id-c', nodeName: 'Charlie', errorMessage: 'err C' },
		]);
	});

	it('should fall back to the nodeId when the node is not in the workflow', async () => {
		// No nodes seeded → getNodeById returns undefined → nodeName falls back to nodeId.
		vi.spyOn(workflowsStore, 'fetchPublicationStatus').mockResolvedValue({
			...makeStatus('failed'),
			triggers: [{ nodeId: 'unknown-id', status: 'failed', errorMessage: 'err' }],
		});

		await mountComposable();

		expect(workflowDocumentStore.publicationFailures).toEqual([
			{ nodeId: 'unknown-id', nodeName: 'unknown-id', errorMessage: 'err' },
		]);
	});

	it('should only include failed triggers in failures list', async () => {
		vi.spyOn(workflowDocumentStore, 'getNodeById').mockImplementation((id) =>
			id === 'id-fail' ? ({ name: 'FailNode' } as INodeUi) : ({ name: 'OkNode' } as INodeUi),
		);
		vi.spyOn(workflowsStore, 'fetchPublicationStatus').mockResolvedValue({
			...makeStatus('partial'),
			triggers: [
				{ nodeId: 'id-ok', status: 'activated', errorMessage: null },
				{ nodeId: 'id-fail', status: 'failed', errorMessage: 'err' },
			],
		});

		await mountComposable();

		expect(workflowDocumentStore.publicationFailures).toHaveLength(1);
		expect(workflowDocumentStore.publicationFailures[0].nodeName).toBe('FailNode');
	});

	it('(Issue 2) a rejected fetch while status is publishing does not throw unhandled and re-arms the poll', async () => {
		// Set up: first call rejects, second call resolves published
		vi.spyOn(workflowsStore, 'fetchPublicationStatus')
			.mockRejectedValueOnce(new Error('network error'))
			.mockResolvedValueOnce(makeStatus('published'));

		// Seed the document store with 'publishing' so the catch branch re-arms
		workflowDocumentStore.setPublicationStatus({ status: 'publishing' });

		// Track any unhandled rejections
		const unhandledRejections: Error[] = [];
		const handler = (event: PromiseRejectionEvent) => unhandledRejections.push(event.reason);
		window.addEventListener('unhandledrejection', handler);

		try {
			// Manually call refetch (simulates the poll timer callback or onMounted)
			const composable = await mountComposable();
			// mountComposable calls refetch via onMounted which rejects — verify no unhandled rejection
			await nextTick();

			// Status should still be 'publishing' (catch did not update it)
			expect(workflowDocumentStore.publicationStatus).toBe('publishing');

			// The catch block should have re-armed the poll; advance to trigger it
			await vi.advanceTimersByTimeAsync(PUBLICATION_STATUS_POLL_INTERVAL_MS);

			// Second call (the re-armed poll) resolves successfully
			expect(workflowsStore.fetchPublicationStatus).toHaveBeenCalledTimes(2);
			expect(workflowDocumentStore.publicationStatus).toBe('published');

			expect(unhandledRejections).toHaveLength(0);

			// Suppress unused variable lint warning
			void composable;
		} finally {
			window.removeEventListener('unhandledrejection', handler);
		}
	});

	it('(Issue 1) setting publicationStatus to publishing externally arms a poll', async () => {
		// Start idle — no in_progress response, so no poll armed from refetch
		vi.spyOn(workflowsStore, 'fetchPublicationStatus')
			.mockResolvedValueOnce(makeStatus('published')) // initial mount fetch
			.mockResolvedValueOnce(makeStatus('published')); // poll after external set

		await mountComposable();
		expect(workflowsStore.fetchPublicationStatus).toHaveBeenCalledTimes(1);

		// Simulate the publish action (UI or multi-main push) writing 'publishing' directly
		workflowDocumentStore.setPublicationStatus({ status: 'publishing' });
		await nextTick(); // let the watcher fire

		// Watcher sees 'publishing' and calls armPoll() — advance to trigger it
		await vi.advanceTimersByTimeAsync(PUBLICATION_STATUS_POLL_INTERVAL_MS);

		expect(workflowsStore.fetchPublicationStatus).toHaveBeenCalledTimes(2);
	});

	it('should re-sync when documentId changes (workflow switch without remount)', async () => {
		const WF_A_ID = 'wf-react-a';
		const WF_B_ID = 'wf-react-b';
		const docIdA = createWorkflowDocumentId(WF_A_ID);
		const docIdB = createWorkflowDocumentId(WF_B_ID);

		const storeA = useWorkflowDocumentStore(docIdA);
		const storeB = useWorkflowDocumentStore(docIdB);

		vi.spyOn(workflowsStore, 'fetchPublicationStatus')
			.mockResolvedValueOnce(makeStatus('published')) // initial mount → workflow A
			.mockResolvedValueOnce(makeStatus('failed')); // after switch → workflow B

		const documentIdRef = ref<WorkflowDocumentId>(docIdA);

		renderComponent(
			defineComponent({
				setup() {
					useWorkflowPublicationStatusSync(documentIdRef);
					return () => h('div');
				},
			}),
		);

		// Let onMounted refetch resolve for workflow A
		await nextTick();
		await nextTick();

		expect(workflowsStore.fetchPublicationStatus).toHaveBeenCalledTimes(1);
		expect(workflowsStore.fetchPublicationStatus).toHaveBeenLastCalledWith(WF_A_ID);
		expect(storeA.publicationStatus).toBe('published');

		// Switch to workflow B
		documentIdRef.value = docIdB;
		await nextTick();
		await nextTick();

		expect(workflowsStore.fetchPublicationStatus).toHaveBeenCalledTimes(2);
		expect(workflowsStore.fetchPublicationStatus).toHaveBeenLastCalledWith(WF_B_ID);
		expect(storeB.publicationStatus).toBe('failed');
	});

	it('does not resume polling if an in-flight fetch resolves after unmount', async () => {
		// Keep the fetch in-flight until we resolve it manually, so we can tear down mid-flight.
		let resolveFetch!: (value: WorkflowPublicationStatus) => void;
		const pending = new Promise<WorkflowPublicationStatus>((resolve) => {
			resolveFetch = resolve;
		});
		vi.spyOn(workflowsStore, 'fetchPublicationStatus').mockReturnValueOnce(pending);

		const rendered = renderComponent(
			defineComponent({
				setup() {
					useWorkflowPublicationStatusSync(() => TEST_DOCUMENT_ID);
					return () => h('div');
				},
			}),
		);

		// onMounted fired refetch(); the fetch is now awaiting `pending`.
		await nextTick();
		expect(workflowsStore.fetchPublicationStatus).toHaveBeenCalledTimes(1);

		// Tear down while the fetch is in-flight, then resolve it as in_progress.
		rendered.unmount();
		resolveFetch(makeStatus('in_progress'));
		await nextTick();
		await nextTick();

		// A leaked armPoll() would schedule a timer that fires another fetch after teardown.
		await vi.advanceTimersByTimeAsync(PUBLICATION_STATUS_POLL_INTERVAL_MS * 2);
		expect(workflowsStore.fetchPublicationStatus).toHaveBeenCalledTimes(1);
	});
});
