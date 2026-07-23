import { readonly, ref } from 'vue';

export type PublicationLifecycle = 'idle' | 'publishing' | 'published' | 'partial' | 'failed';
export type PublicationFailure = { nodeId: string; nodeName: string; errorMessage: string };

export function useWorkflowDocumentPublicationStatus() {
	const publicationStatus = ref<PublicationLifecycle>('idle');
	const publicationFailures = ref<PublicationFailure[]>([]);

	function setPublicationStatus(state: {
		status: PublicationLifecycle;
		failures?: PublicationFailure[];
	}) {
		publicationStatus.value = state.status;
		publicationFailures.value = state.failures ?? [];
	}

	return {
		publicationStatus: readonly(publicationStatus),
		publicationFailures: readonly(publicationFailures),
		setPublicationStatus,
	};
}
