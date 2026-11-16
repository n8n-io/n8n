import type { InstanceAiAttachment, InstanceAiMessage } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { WorkflowDraft, WorkflowDraftsByFilePath } from '../instanceAi.workflowDrafts';
import {
	getWorkflowStaging,
	loadsWorkflowBuilder,
	stagingFilePath,
	toStagingWorkflowNodes,
	workflowOfRun,
	type StagingNodeTypeInfo,
} from '../instanceAi.workflowStaging';

/**
 * The saved workflow that a running build works on, and how it is known:
 * - `run`: the run reads, builds on or saved it.
 * - `request`: the user message attaches it, or hands it off.
 * - `thread`: an earlier turn worked on it. This is a guess, so its tab does not open.
 */
export interface BuildTarget {
	workflowId: string;
	source: 'run' | 'request' | 'thread';
}

function attachedWorkflowId(attachment: InstanceAiAttachment): string | undefined {
	if (attachment.type === 'workflow') return attachment.id;
	if (attachment.type === 'nodes') return attachment.workflowId;
	return undefined;
}

/** The saved workflow that the user message names: an attachment, or a handoff from the setup panel or a migration report. */
function requestWorkflowId(request: InstanceAiMessage): string | undefined {
	const attached = request.attachments?.flatMap((a) => attachedWorkflowId(a) ?? []).at(0);
	if (attached) return attached;
	return request.context && 'workflowId' in request.context
		? request.context.workflowId
		: undefined;
}

/** The running assistant message and the user message that started it. */
function findRunningTurn(messages: InstanceAiMessage[]) {
	const index = messages.length - 1;
	const message = messages[index];
	if (message?.role !== 'assistant' || !message.isStreaming || !message.agentTree) return undefined;
	const request = messages[index - 1];
	// A follow-up can edit the workflow of an earlier turn without reading it again.
	const earlierWorkflowId = messages
		.slice(0, index)
		.flatMap((earlier) => (earlier.agentTree ? (workflowOfRun(earlier.agentTree) ?? []) : []))
		.at(-1);
	return {
		tree: message.agentTree,
		request: request?.role === 'user' ? request : undefined,
		earlierWorkflowId,
	};
}

/**
 * The canvas of a running build. A build on a saved workflow has a target; a
 * new workflow has the staging canvas from the moment the agent loads the
 * workflow builder skill until the first draft of the run.
 */
export function useWorkflowStaging(options: {
	messages: () => InstanceAiMessage[];
	workflowDrafts: () => WorkflowDraftsByFilePath;
	enabled: () => boolean;
	describeType: (nodeType: string) => StagingNodeTypeInfo | undefined;
}) {
	const i18n = useI18n();
	const runningTurn = computed(() =>
		options.enabled() ? findRunningTurn(options.messages()) : undefined,
	);

	const buildTarget = computed((): BuildTarget | undefined => {
		const turn = runningTurn.value;
		if (!turn || !loadsWorkflowBuilder(turn.tree)) return undefined;
		const fromRun = workflowOfRun(turn.tree);
		if (fromRun) return { workflowId: fromRun, source: 'run' };
		const fromRequest = turn.request ? requestWorkflowId(turn.request) : undefined;
		if (fromRequest) return { workflowId: fromRequest, source: 'request' };
		if (turn.earlierWorkflowId) return { workflowId: turn.earlierWorkflowId, source: 'thread' };
		return undefined;
	});

	const stagingDraft = computed((): WorkflowDraft | undefined => {
		const turn = runningTurn.value;
		if (!turn || buildTarget.value) return undefined;
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

	return { stagingDraft, buildTarget };
}
