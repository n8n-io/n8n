// Experiment cleanup (137_instance_ai_draft_workflow_preview)
import {
	workflowDraftIssuesPayloadSchema,
	workflowDraftPayloadSchema,
	type AgentSseEvent,
} from '@n8n/api-types';
import { computed, ref } from 'vue';

import {
	applyWorkflowDraft,
	applyWorkflowDraftIssues,
	dismissWorkflowDrafts,
	settleWorkflowDraft,
	type WorkflowDraftsByFilePath,
} from '../instanceAi.workflowDrafts';

/**
 * The workflow drafts of an Assistant agent thread. The Agents runtime streams
 * them as transient host events, so a thread that opens again has none.
 */
export function useAssistantWorkflowDrafts(options: {
	/** The turn that the agent works on. Its drafts count their revisions from 1. */
	liveRunId: () => string | undefined;
}) {
	const drafts = ref<WorkflowDraftsByFilePath>({});

	function handleTransientEvent(name: string, payload: unknown): void {
		if (name === 'workflow-draft') {
			const parsed = workflowDraftPayloadSchema.safeParse(payload);
			if (parsed.success) {
				drafts.value = applyWorkflowDraft(drafts.value, parsed.data, options.liveRunId());
			}
		} else if (name === 'workflow-draft-issues') {
			const parsed = workflowDraftIssuesPayloadSchema.safeParse(payload);
			if (parsed.success) drafts.value = applyWorkflowDraftIssues(drafts.value, parsed.data);
		}
	}

	function handleStreamEvent(event: AgentSseEvent): void {
		if (event.type === 'transient-host-event') handleTransientEvent(event.name, event.payload);
		else if (event.type === 'tool-result') {
			drafts.value = settleWorkflowDraft(drafts.value, event.output);
		}
	}

	function dismiss(workflowId: string): void {
		drafts.value = dismissWorkflowDrafts(drafts.value, workflowId);
	}

	return { drafts: computed(() => drafts.value), handleStreamEvent, dismiss };
}
