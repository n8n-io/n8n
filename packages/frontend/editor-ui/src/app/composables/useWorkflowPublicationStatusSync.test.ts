import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
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
} from '@/app/stores/workflowDocument.store';
import type { WorkflowPublicationStatus } from '@n8n/api-types';

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

async function mountComposable(documentId = TEST_DOCUMENT_ID) {
	let composable!: ReturnType<typeof useWorkflowPublicationStatusSync>;

	renderComponent(
		defineComponent({
			setup() {
				composable = useWorkflowPublicationStatusSync(documentId);
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
						useWorkflowPublicationStatusSync(documentId);
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

	it('should sort failures by nodeName for stable order', async () => {
		vi.spyOn(workflowsStore, 'fetchPublicationStatus').mockResolvedValue({
			...makeStatus('failed'),
			triggers: [
				{ nodeId: 'id-c', nodeName: 'Charlie', status: 'failed', errorMessage: 'err C' },
				{ nodeId: 'id-a', nodeName: 'Alpha', status: 'failed', errorMessage: 'err A' },
				{ nodeId: 'id-b', nodeName: 'Bravo', status: 'failed', errorMessage: 'err B' },
			],
		});

		await mountComposable();

		expect(workflowDocumentStore.publicationFailures).toEqual([
			{ nodeId: 'id-a', nodeName: 'Alpha', errorMessage: 'err A' },
			{ nodeId: 'id-b', nodeName: 'Bravo', errorMessage: 'err B' },
			{ nodeId: 'id-c', nodeName: 'Charlie', errorMessage: 'err C' },
		]);
	});

	it('should only include failed triggers in failures list', async () => {
		vi.spyOn(workflowsStore, 'fetchPublicationStatus').mockResolvedValue({
			...makeStatus('partial'),
			triggers: [
				{ nodeId: 'id-ok', nodeName: 'OkNode', status: 'activated', errorMessage: null },
				{ nodeId: 'id-fail', nodeName: 'FailNode', status: 'failed', errorMessage: 'err' },
			],
		});

		await mountComposable();

		expect(workflowDocumentStore.publicationFailures).toHaveLength(1);
		expect(workflowDocumentStore.publicationFailures[0].nodeName).toBe('FailNode');
	});
});
