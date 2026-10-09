import { createTestingPinia } from '@pinia/testing';

import { createTestWorkflow } from '@/__tests__/mocks';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { syncLocalTurnOff } from '../syncLocalTurnOff';

function liveDocument(workflowId: string) {
	const documentStore = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
	documentStore.setActiveState({ activeVersionId: 'version-1', activeVersion: null });
	documentStore.setChecksum('checksum-before');
	documentStore.setVersionData({ versionId: 'version-1', name: 'v1', description: null });
	return documentStore;
}

describe('syncLocalTurnOff', () => {
	beforeEach(() => {
		createTestingPinia({ stubActions: false });
	});

	it('shows the open workflow as off and reads its new checksum, so the next save works', async () => {
		const workflowsStore = useWorkflowsStore();
		workflowsStore.setWorkflowId('wf-1');
		const documentStore = liveDocument('wf-1');
		const setInactive = vi.spyOn(workflowsStore, 'setWorkflowInactive');
		const fetchWorkflow = vi.spyOn(useWorkflowsListStore(), 'fetchWorkflow').mockResolvedValue(
			createTestWorkflow({
				id: 'wf-1',
				versionId: 'version-1',
				activeVersionId: null,
				checksum: 'checksum-after',
			}),
		);

		await syncLocalTurnOff('wf-1');

		expect(setInactive).toHaveBeenCalledWith('wf-1');
		expect(documentStore.active).toBe(false);
		expect(fetchWorkflow).toHaveBeenCalledWith('wf-1');
		expect(documentStore.checksum).toBe('checksum-after');
		expect(documentStore.versionId).toBe('version-1');
		// The name of the version stays, as after a turn-off in the editor.
		expect(documentStore.versionData?.name).toBe('v1');
	});

	it('marks a workflow that is not open as off without reading it', async () => {
		useWorkflowsStore().setWorkflowId('wf-other');
		const documentStore = liveDocument('wf-1');
		const fetchWorkflow = vi.spyOn(useWorkflowsListStore(), 'fetchWorkflow');

		await syncLocalTurnOff('wf-1');

		expect(documentStore.active).toBe(false);
		expect(fetchWorkflow).not.toHaveBeenCalled();
		expect(documentStore.checksum).toBe('checksum-before');
	});

	it('still shows the workflow as off when the new checksum cannot be read', async () => {
		useWorkflowsStore().setWorkflowId('wf-1');
		const documentStore = liveDocument('wf-1');
		vi.spyOn(useWorkflowsListStore(), 'fetchWorkflow').mockRejectedValue(
			new Error('Network error'),
		);

		await expect(syncLocalTurnOff('wf-1')).resolves.toBeUndefined();

		expect(documentStore.active).toBe(false);
		expect(documentStore.checksum).toBe('checksum-before');
	});
});
