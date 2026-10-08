import { useRouter } from 'vue-router';
import { TELEMETRY_EVENT, type InferTelemetryProps } from '@n8n/telemetry';
import { useToast } from '@n8n/composables/useToast';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useI18n } from '@n8n/i18n';
import { useInstanceAiStore } from '../instanceAi.store';
import { useInstanceAiHandoff, stashPendingDraftAttachment } from './useInstanceAiHandoff';
import { useIsNodeContextEnabled } from './useIsNodeContextEnabled';
import { INSTANCE_AI_THREAD_VIEW } from '../constants';
import { buildNodesAttachment, type NodeContextWorkflow } from '../utils/buildNodesAttachment';
import type { IWorkflowDb } from '@/Interface';

/** Which affordance triggered add-to-chat — derived from the telemetry event's `source`. */
export type AddNodesToChatSource = InferTelemetryProps<
	typeof TELEMETRY_EVENT.INSTANCE_AI.USER_ADDED_NODES_TO_CHAT
>['source'];

export function useAddNodesToChat() {
	const store = useInstanceAiStore();
	const handoff = useInstanceAiHandoff();
	const router = useRouter();
	const toast = useToast();
	const telemetry = useTelemetry();
	const i18n = useI18n();
	const isNodeContextEnabled = useIsNodeContextEnabled();

	async function addSelectedNodesToChat(params: {
		workflowId: string;
		selectedNodeIds: string[];
		workflow: NodeContextWorkflow;
		isInsideThread: boolean;
		onStaged?: () => void;
		workflowName?: string;
		workflowSnapshot?: IWorkflowDb;
		source?: AddNodesToChatSource;
	}): Promise<void> {
		const built = buildNodesAttachment(params.workflowId, params.selectedNodeIds, params.workflow);
		if (!built) return;

		if (params.source) {
			telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_ADDED_NODES_TO_CHAT, {
				source: params.source,
				node_count: built.attachment.sets.reduce((sum, set) => sum + set.nodes.length, 0),
			});
		}
		if (built.truncated) {
			toast.showMessage({
				type: 'warning',
				title: i18n.baseText('instanceAi.nodeContext.truncated.title'),
				message: i18n.baseText('instanceAi.nodeContext.truncated.message'),
			});
		}

		if (params.isInsideThread) {
			store.stageNodeSets(params.workflowId, built.attachment.sets);
			params.onStaged?.();
			return;
		}

		const threadId = await handoff.openThreadForDraft({
			id: params.workflowId,
			name: params.workflowName,
			snapshot: params.workflowSnapshot,
		});
		if (!threadId) return;
		stashPendingDraftAttachment(threadId, built.attachment.sets, params.workflowId);
		await router.push({ name: INSTANCE_AI_THREAD_VIEW, params: { threadId } });
	}

	return { isNodeContextEnabled, addSelectedNodesToChat };
}
