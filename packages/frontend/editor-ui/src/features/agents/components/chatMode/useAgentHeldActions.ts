import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client/utils';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch, type Ref } from 'vue';

import {
	commitAgentTestRunActions,
	type AgentTestRunCommitResponse,
} from '../../composables/useAgentApi';
import type { AgentHeldAction } from './heldActions';

export interface UseAgentHeldActionsOptions {
	projectId: Ref<string>;
	agentId: Ref<string>;
	sessionId: Ref<string | undefined>;
}

/**
 * Manages the V1 Hold & Replay commit modal and per-reply committed state
 * for held write actions in an agent test chat.
 */
export function useAgentHeldActions(options: UseAgentHeldActionsOptions) {
	const rootStore = useRootStore();
	const i18n = useI18n();

	const committedByReply = ref<Record<string, AgentTestRunCommitResponse>>({});
	const pendingReplyId = ref<string | null>(null);
	const pendingActions = ref<AgentHeldAction[]>([]);
	const committingReplyId = ref<string | null>(null);
	const commitError = ref<string | null>(null);
	// The request that owns the busy state. A request for an earlier chat must not change it.
	let activeRequest: symbol | null = null;

	/** Actions of this chat that ran in the real apps. A failed action did not run. */
	const sentCount = computed(() =>
		Object.values(committedByReply.value).reduce(
			(count, response) =>
				count + response.results.filter((result) => result.status !== 'failed').length,
			0,
		),
	);

	const confirmModalOpen = computed({
		get: () => pendingReplyId.value !== null,
		set: (open: boolean) => {
			if (!open && committingReplyId.value === null) {
				pendingReplyId.value = null;
				pendingActions.value = [];
				commitError.value = null;
			}
		},
	});

	watch([options.projectId, options.agentId, options.sessionId], () => {
		activeRequest = null;
		committedByReply.value = {};
		pendingReplyId.value = null;
		pendingActions.value = [];
		committingReplyId.value = null;
		commitError.value = null;
	});

	function openConfirmModal(replyId: string, actions: AgentHeldAction[]) {
		if (committingReplyId.value !== null || actions.length === 0) return;
		pendingReplyId.value = replyId;
		pendingActions.value = actions;
		commitError.value = null;
	}

	function cancelConfirmModal() {
		if (committingReplyId.value !== null) return;
		pendingReplyId.value = null;
		pendingActions.value = [];
		commitError.value = null;
	}

	async function confirmCommit(): Promise<boolean> {
		const replyId = pendingReplyId.value;
		const actions = pendingActions.value;
		const testChatId = options.sessionId.value;
		const targetProjectId = options.projectId.value;
		const targetAgentId = options.agentId.value;

		if (!replyId || actions.length === 0 || committingReplyId.value !== null) {
			return false;
		}
		if (!testChatId) {
			commitError.value = i18n.baseText('agents.testRun.holdReplay.confirmModal.sessionMissing');
			return false;
		}

		const request = Symbol('commit');
		activeRequest = request;
		committingReplyId.value = replyId;
		commitError.value = null;
		try {
			const response = await commitAgentTestRunActions(
				rootStore.restApiContext,
				targetProjectId,
				targetAgentId,
				{
					testChatId,
					actionIds: actions.map((action) => action.actionId),
				},
			);
			if (
				activeRequest !== request ||
				options.projectId.value !== targetProjectId ||
				options.agentId.value !== targetAgentId ||
				options.sessionId.value !== testChatId
			) {
				return false;
			}
			committedByReply.value = {
				...committedByReply.value,
				[replyId]: response,
			};
			pendingReplyId.value = null;
			pendingActions.value = [];
			return true;
		} catch (error) {
			if (activeRequest !== request) return false;
			// Server messages are not localized, so show our own text.
			commitError.value =
				error instanceof ResponseError && error.httpStatusCode === 404
					? i18n.baseText('agents.testRun.holdReplay.confirmModal.sessionMissing')
					: i18n.baseText('agents.testRun.holdReplay.confirmModal.error');
			return false;
		} finally {
			if (activeRequest === request) {
				activeRequest = null;
				committingReplyId.value = null;
			}
		}
	}

	return {
		committedByReply,
		sentCount,
		pendingActions,
		committingReplyId,
		commitError,
		confirmModalOpen,
		openConfirmModal,
		cancelConfirmModal,
		confirmCommit,
	};
}
