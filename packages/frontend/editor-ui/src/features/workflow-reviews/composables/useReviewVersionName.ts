import { ref } from 'vue';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { generateVersionLabelFromId } from '@/features/workflows/workflowHistory/utils';

/**
 * Shared by the submit-for-review and update-review dialogs, which both prefill
 * the current version's name and description and write the submitted ones back
 * to the editor.
 */
export const useReviewVersionName = () => {
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const versionName = ref('');
	const versionDescription = ref('');

	/**
	 * Every path into either dialog is gated on a saved workflow, so the document
	 * store's version is the one `flushSave()` will return.
	 * Falsy rather than nullish: the publish endpoints accept `name: ""`.
	 */
	const prefillVersionName = () => {
		versionName.value =
			workflowDocumentStore.value.versionData?.name ||
			generateVersionLabelFromId(workflowDocumentStore.value.versionId);
		versionDescription.value = workflowDocumentStore.value.versionData?.description ?? '';
	};

	/**
	 * Mirror the persisted name and description into the editor so version
	 * history and the publish modal's prefill reflect them without a refetch.
	 */
	const applyVersionName = (workflowVersionId: string, name: string, description: string) => {
		const store = workflowDocumentStore.value;
		if (store.versionId !== workflowVersionId) return;

		store.setVersionData({
			versionId: workflowVersionId,
			name,
			description: description.trim() || null,
		});
	};

	return { versionName, versionDescription, prefillVersionName, applyVersionName };
};
