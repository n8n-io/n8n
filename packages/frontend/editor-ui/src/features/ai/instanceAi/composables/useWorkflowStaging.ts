import type { InstanceAiAttachment, InstanceAiMessage } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { WorkflowDraft, WorkflowDraftsByFilePath } from '../instanceAi.workflowDrafts';
import {
	getWorkflowStaging,
	stagingFilePath,
	toStagingWorkflowNodes,
	type StagingNodeTypeInfo,
} from '../instanceAi.workflowStaging';

function attachesWorkflow(attachment: InstanceAiAttachment): boolean {
	return attachment.type === 'workflow' || attachment.type === 'nodes';
}

/** The running assistant message and the user message that started it. */
function findRunningTurn(messages: InstanceAiMessage[]) {
	const index = messages.length - 1;
	const message = messages[index];
	if (message?.role !== 'assistant' || !message.isStreaming || !message.agentTree) return undefined;
	const request = messages[index - 1];
	return { tree: message.agentTree, request: request?.role === 'user' ? request : undefined };
}

/**
 * The canvas of a new workflow from the moment the agent loads the workflow
 * builder skill until the first draft of the run.
 */
export function useWorkflowStaging(options: {
	messages: () => InstanceAiMessage[];
	workflowDrafts: () => WorkflowDraftsByFilePath;
	enabled: () => boolean;
	describeType: (nodeType: string) => StagingNodeTypeInfo | undefined;
}) {
	const i18n = useI18n();
	const runningTurn = computed(() => findRunningTurn(options.messages()));

	const stagingDraft = computed((): WorkflowDraft | undefined => {
		const turn = runningTurn.value;
		if (!options.enabled() || !turn) return undefined;
		if (turn.request?.attachments?.some(attachesWorkflow)) return undefined;
		const staging = getWorkflowStaging(turn.tree, {
			hasNodeType: (nodeType) => options.describeType(nodeType) !== undefined,
		});
		if (!staging) return undefined;
		const drafts = Object.values(options.workflowDrafts());
		if (drafts.some((draft) => draft.runId === staging.runId)) return undefined;
		return {
			filePath: stagingFilePath(staging.runId),
			runId: staging.runId,
			revision: staging.nodes.length,
			workflow: {
				name: i18n.baseText('instanceAi.workflowDraft.newWorkflow'),
				nodes: toStagingWorkflowNodes(staging, options.describeType),
				connections: {},
			},
		};
	});

	return { stagingDraft };
}
