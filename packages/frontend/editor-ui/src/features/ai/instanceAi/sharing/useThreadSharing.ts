import { computed, provide, type ComputedRef } from 'vue';
import type { AgentMessageAuthor } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useUsersStore } from '@n8n/stores/users.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { AGENT_CHAT_TOOL_STEP_NOTE } from '@/features/agents/utils/tool-step-note';
import type { AgentResumeFailure } from '@/features/agents/utils/chat-rejection';
import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';
import { useInstanceAiStore } from '../instanceAi.store';
import {
	answerAuthorship,
	resumeFailureNotice,
	teammateCardAccess,
	threadSharingView,
	type ThreadSharingView,
} from './sharingView';
import { provideThreadSharingContext } from './threadSharingContext';
import { useSharingText } from './useSharingText';

/** The thread fields that the sharing view reads. A thread runtime has them. */
export interface SharingThreadRef {
	id: string;
	projectId?: string;
}

/** How the current user sees the chat: as its owner or as a teammate. */
export function useThreadSharingView(thread: SharingThreadRef): ComputedRef<ThreadSharingView> {
	const store = useInstanceAiStore();
	const usersStore = useUsersStore();
	const projectsStore = useProjectsStore();

	// The sidebar list and the history page can each hold the thread.
	const summary = computed(
		() =>
			store.threads.find((t) => t.id === thread.id) ??
			store.threadHistory.threads.find((t) => t.id === thread.id),
	);

	return computed(() => {
		const { sharedWith, owner } = summary.value ?? {};
		const projectId = sharedWith?.projectId ?? thread.projectId;
		return threadSharingView({
			viewerId: usersStore.currentUserId ?? undefined,
			projectId,
			owner,
			sharedWith,
			project: projectsStore.myProjects.find((project) => project.id === projectId),
		});
	});
}

/**
 * Gives the conversation's cards and tool steps the sharing state of the chat, and reports
 * card answers that did not go through. `messages` is the transcript that the chat shows.
 */
export function provideThreadSharing(thread: SharingThreadRef, messages: () => ChatMessage[]) {
	const usersStore = useUsersStore();
	const toast = useToast();
	const i18n = useI18n();
	const text = useSharingText();
	const view = useThreadSharingView(thread);
	const viewerId = () => usersStore.currentUserId ?? undefined;

	provideThreadSharingContext({
		view,
		cardAccess: (call) =>
			view.value.role === 'teammate'
				? teammateCardAccess(call, view.value.projectId, view.value.scopes)
				: undefined,
	});

	provide(AGENT_CHAT_TOOL_STEP_NOTE, (toolCall) => {
		const authorship = answerAuthorship(toolCall, viewerId(), view.value.isShared);
		return authorship ? text.answerAuthorship(authorship) : undefined;
	});

	/** Who answered the card, as the history says after it was read again. */
	function historyAnswerer(toolCallId: string): AgentMessageAuthor | undefined {
		const toolCall = messages()
			.flatMap((message) => message.toolCalls ?? [])
			.find((call) => call.toolCallId === toolCallId);
		return toolCall?.declinedBy ?? toolCall?.approvedBy;
	}

	function onResumeFailed(failure: AgentResumeFailure): void {
		const notice = resumeFailureNotice(failure, {
			answerer: historyAnswerer(failure.toolCallId),
			viewerId: viewerId(),
			isShared: view.value.isShared,
		});
		if (notice?.kind === 'refused') {
			// Not tracked: the server's text can name users and projects.
			toast.showMessage(
				{
					type: 'error',
					title: i18n.baseText('instanceAi.sharing.answerError'),
					...(notice.message && { message: notice.message }),
				},
				false,
			);
		} else if (notice) {
			toast.showMessage({ type: 'info', title: text.alreadyAnswered(notice) });
		}
	}

	return { view, onResumeFailed };
}
