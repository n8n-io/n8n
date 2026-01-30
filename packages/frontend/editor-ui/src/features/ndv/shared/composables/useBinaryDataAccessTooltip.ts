import { computed } from 'vue';
import { BINARY_MODE_COMBINED } from 'n8n-workflow';
import { useWorkflowDocumentsStore } from '@/app/stores/workflowDocuments.store';
import { useI18n } from '@n8n/i18n';

/**
 * Composable for getting the binary data access tooltip based on the workflow's binary mode
 */
export function useBinaryDataAccessTooltip() {
	const workflowDocumentsStore = useWorkflowDocumentsStore();
	const i18n = useI18n();

	const binaryDataAccessTooltip = computed(() => {
		if (
			workflowDocumentsStore.workflowDocumentsById[workflowDocumentsStore.workflowDocumentId]
				?.settings?.binaryMode === BINARY_MODE_COMBINED
		) {
			return i18n.baseText('ndv.binaryData.combinedTooltip', {
				interpolate: {
					example: "{{ $('Target Node').item.binaryName }}",
				},
			});
		}

		return i18n.baseText('ndv.binaryData.separateTooltip', {
			interpolate: { example: "{{ $('Target Node').item.binary.data }}" },
		});
	});

	return {
		binaryDataAccessTooltip,
	};
}
