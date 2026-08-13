import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { CANVAS_NODE_CONTEXT_FLAG } from '@n8n/api-types';
import { usePostHog } from '@/app/stores/posthog.store';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useInstanceAiStore } from '../instanceAi.store';
import { useInstanceAiHandoff, stashPendingDraftAttachment } from './useInstanceAiHandoff';
import { INSTANCE_AI_THREAD_VIEW } from '../constants';
import { buildNodesAttachment, type BuilderWorkflow } from '../utils/buildNodesAttachment';

/**
 * Shared entry point for both canvas triggers (toolbar button, context menu) that add
 * selected nodes to the AI chat. Context A (already inside the thread view) stages the
 * attachment directly into the live composer; Context B (standalone editor) mints a
 * thread, stashes the draft for it to pick up on mount, and navigates there.
 */
export function useAddNodesToChat() {
	const posthog = usePostHog();
	const store = useInstanceAiStore();
	const handoff = useInstanceAiHandoff();
	const router = useRouter();
	const toast = useToast();
	const i18n = useI18n();

	const isNodeContextEnabled = computed(() => posthog.isFeatureEnabled(CANVAS_NODE_CONTEXT_FLAG));

	async function addSelectedNodesToChat(params: {
		workflowId: string;
		selectedNodeIds: string[];
		workflow: BuilderWorkflow;
		isInsideThread: boolean;
		threadId?: string;
		onStaged?: () => void; // Context A: view supplies focus/un-expand
	}): Promise<void> {
		const built = buildNodesAttachment(params.workflowId, params.selectedNodeIds, params.workflow);
		if (!built) return;
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

		// Context B: open a thread with the draft pre-staged, unsent.
		const threadId = await handoff.openThreadForDraft();
		if (!threadId) return;
		stashPendingDraftAttachment(threadId, built.attachment.sets, params.workflowId);
		await router.push({ name: INSTANCE_AI_THREAD_VIEW, params: { threadId } });
	}

	return { isNodeContextEnabled, addSelectedNodesToChat };
}
