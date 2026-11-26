// Experiment cleanup (137_instance_ai_draft_workflow_preview)
import { computed, provide, type Ref } from 'vue';

import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useDraftWorkflowPreviewEnabled } from '@/experiments/instanceAiDraftWorkflowPreview/useDraftWorkflowPreviewEnabled';

import type { ArtifactTurn } from '../artifactTurns';
import { getDraftWorkflowId, type WorkflowDraftsByFilePath } from '../instanceAi.workflowDrafts';
import { toStagingNodeTypeInfo } from '../instanceAi.workflowStaging';
import {
	ThinkingWordKey,
	useThinkingWordRotation,
} from '../../shared/composables/useThinkingWords';
import { useWorkflowStaging } from './useWorkflowStaging';

/** What the run shows on a workflow canvas: the building wave, or a pill that asks for the chat. */
export type CanvasRunState = 'building' | 'answer' | 'approval';

/** The parts of `useCanvasPreview` that tell if a workflow canvas shows. */
interface WorkflowCanvasView {
	isPreviewVisible: Ref<boolean>;
	activeWorkflowId: Ref<string | null>;
	activeWorkflowDraft: Ref<unknown>;
}

/**
 * The parts of the draft workflow preview experiment that a thread view sets
 * up: the staging canvas, the thinking words of the chat, and the options of
 * `useCanvasPreview`. Both Assistant runtimes use it with their own thread data.
 */
export function useDraftWorkflowPreview(options: {
	threadId: () => string;
	turns: () => readonly ArtifactTurn[];
	workflowDrafts: () => WorkflowDraftsByFilePath;
	dismissWorkflowDrafts: (workflowId: string) => void;
	/** The agent works. A run that waits on the user still counts. */
	isRunning: () => boolean;
	isAwaitingUser: () => boolean;
	/** The run waits for an approval, not for an answer. */
	isAwaitingApproval: () => boolean;
}) {
	const enabled = useDraftWorkflowPreviewEnabled();
	// The backend sends drafts to the variant only. The control arm ignores any that come.
	const workflowDrafts = (): WorkflowDraftsByFilePath =>
		enabled.value ? options.workflowDrafts() : {};
	const nodeTypesStore = useNodeTypesStore();
	const staging = useWorkflowStaging({
		turns: options.turns,
		workflowDrafts,
		enabled: () => enabled.value,
		describeType: (nodeType) => toStagingNodeTypeInfo(nodeTypesStore.getNodeType(nodeType)),
	});

	// Replaces the generic "Thinking" in the chat while the thread runs.
	const thinkingWord = useThinkingWordRotation({
		active: () => enabled.value && options.isRunning(),
		building: () => staging.building.value,
		threadId: options.threadId,
	});
	provide(ThinkingWordKey, thinkingWord);

	/** The build works on this saved workflow, or a draft of the thread belongs to it. */
	function isBuiltWorkflow(workflowId: string): boolean {
		return (
			staging.buildTarget.value?.workflowId === workflowId ||
			Object.values(workflowDrafts()).some((draft) => getDraftWorkflowId(draft) === workflowId)
		);
	}

	/** The run state over any workflow canvas: a saved workflow, a draft or the staging canvas. */
	function useCanvasRunState(canvas: WorkflowCanvasView) {
		return computed((): CanvasRunState | undefined => {
			if (!enabled.value || !canvas.isPreviewVisible.value) return undefined;
			if (canvas.activeWorkflowId.value === null && !canvas.activeWorkflowDraft.value) {
				return undefined;
			}
			// After a reload, the chat can show the question before the run state comes back.
			if (options.isAwaitingUser()) return options.isAwaitingApproval() ? 'approval' : 'answer';
			return options.isRunning() ? 'building' : undefined;
		});
	}

	return {
		thinkingWord,
		useCanvasRunState,
		isBuiltWorkflow,
		canvasOptions: {
			workflowDrafts,
			stagingDraft: () => staging.stagingDraft.value,
			buildTarget: () => staging.buildTarget.value,
			dismissWorkflowDrafts: options.dismissWorkflowDrafts,
			isAwaitingUser: options.isAwaitingUser,
		},
	};
}
