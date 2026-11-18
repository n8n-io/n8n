import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import { useInstanceAiAvailable } from '@/features/ai/instanceAi/composables/useInstanceAiAvailability';
import { useInstanceAiHandoff } from '@/features/ai/instanceAi/composables/useInstanceAiHandoff';

import { useIsPageModuleActive } from './useIsPageModuleActive';

/** The workflow that the assistant documents. It must be saved. */
export interface WorkflowToDocument {
	id: string;
	name: string;
}

/**
 * Gives the "Document with AI" action of a workflow.
 * `isAvailable` is true when this user can reach the assistant and the instance has pages.
 * `documentWorkflow` opens an assistant thread in the project and sends a request to write a page about the workflow.
 * It resolves with `true` only when the thread opened. An assistant that is not set up opens its setup instead.
 */
export function useDocumentWorkflowWithAi() {
	const i18n = useI18n();
	const isAssistantAvailable = useInstanceAiAvailable();
	const isPageModuleActive = useIsPageModuleActive();
	const { startThread } = useInstanceAiHandoff();
	const isStarting = ref(false);

	const isAvailable = computed(() => isAssistantAvailable.value && isPageModuleActive.value);

	function toDocumentationRequest(workflow: WorkflowToDocument): string {
		return i18n.baseText('page.documentWithAi.prompt', {
			interpolate: { workflowName: workflow.name },
		});
	}

	async function documentWorkflow(
		workflow: WorkflowToDocument,
		projectId: string,
	): Promise<boolean> {
		isStarting.value = true;
		try {
			const outcome = await startThread(
				projectId,
				toDocumentationRequest(workflow),
				{ kind: 'prefill', prefillType: 'handoff_document_workflow' },
				{
					source: 'workflow_pages_button',
					origin: 'internal',
					sourceContext: { workflowId: workflow.id },
				},
				[{ type: 'workflow', id: workflow.id, name: workflow.name || undefined }],
			);
			return outcome === 'started';
		} finally {
			isStarting.value = false;
		}
	}

	return { isAvailable, isStarting, documentWorkflow };
}
