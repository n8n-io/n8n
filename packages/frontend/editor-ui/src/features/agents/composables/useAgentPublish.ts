import { ref } from 'vue';
import { N8N_CHAT_INTEGRATION_TYPE } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { useStorage } from '@n8n/composables/useStorage';
import { useUIStore } from '@/app/stores/ui.store';
import { MODAL_CONFIRM } from '@/app/constants';
import {
	AGENT_PUBLISHED_MODAL_KEY,
	LOCAL_STORAGE_HIDE_AGENT_PUBLISHED_CONFIRMATION,
} from '../constants';
import { publishAgent, revertAgentToPublished, unpublishAgent } from './useAgentApi';
import { useAgentConfirmationModal } from './useAgentConfirmationModal';
import { useAgentsN8nChatFlag } from './useAgentsN8nChatFlag';
import { useAgentTelemetry } from './useAgentTelemetry';
import { upsertProjectAgentsListCache } from './useProjectAgentsList';
import type { AgentResource } from '../types';

/**
 * Opens the "Agent published" confirmation modal after a successful publish,
 * unless the user opted out with "Don't show again". Shared by the
 * header/list publish flow and the version-history republish flow (AGENT-1102).
 */
export function showAgentPublishedConfirmation(agent: AgentResource): void {
	if (useStorage(LOCAL_STORAGE_HIDE_AGENT_PUBLISHED_CONFIRMATION).value === 'true') return;
	// The published snapshot decides n8n Chat reachability, not the draft (see
	// `AgentRepository.publishedN8nChatSql`), and a republish can differ from the draft.
	const n8nChatLive =
		useAgentsN8nChatFlag().value &&
		(agent.activeVersion?.schema?.integrations ?? []).some(
			({ type }) => type === N8N_CHAT_INTEGRATION_TYPE,
		);
	useUIStore().openModalWithData({
		name: AGENT_PUBLISHED_MODAL_KEY,
		data: { agentId: agent.id, projectId: agent.projectId, n8nChatLive },
	});
}

/**
 * Shared publish/unpublish flow used by the builder header button and the list card.
 * Owns the confirmation modal, toasts, error handling, and the `publishing` spinner
 * state so both call sites stay thin and behave consistently.
 */
export function useAgentPublish() {
	const rootStore = useRootStore();
	const locale = useI18n();
	const { showMessage, showError } = useToast();
	const { openAgentConfirmationModal } = useAgentConfirmationModal();
	const { trackRevertedChangesOnAgent } = useAgentTelemetry();

	const publishing = ref(false);

	async function publish(projectId: string, agentId: string): Promise<AgentResource | null> {
		if (publishing.value) return null;
		publishing.value = true;
		try {
			const updated = await publishAgent(rootStore.restApiContext, projectId, agentId);
			upsertProjectAgentsListCache(projectId, updated);
			showMessage({ title: locale.baseText('agents.publish.toast.published'), type: 'success' });
			showAgentPublishedConfirmation(updated);
			return updated;
		} catch (error) {
			showError(error, locale.baseText('agents.publish.error.publish'));
			return null;
		} finally {
			publishing.value = false;
		}
	}

	async function unpublish(
		projectId: string,
		agentId: string,
		agentName?: string,
	): Promise<AgentResource | null> {
		if (publishing.value) return null;
		const confirmed = await openAgentConfirmationModal({
			title: locale.baseText('agents.unpublish.modal.title', {
				interpolate: { name: agentName ?? '' },
			}),
			description: locale.baseText('agents.unpublish.modal.description'),
			confirmButtonText: locale.baseText('agents.unpublish.modal.button.unpublish'),
			cancelButtonText: locale.baseText('generic.cancel'),
		});
		if (confirmed !== MODAL_CONFIRM) return null;

		publishing.value = true;
		try {
			const updated = await unpublishAgent(rootStore.restApiContext, projectId, agentId);
			upsertProjectAgentsListCache(projectId, updated);
			showMessage({ title: locale.baseText('agents.publish.toast.unpublished'), type: 'success' });
			return updated;
		} catch (error) {
			showError(error, locale.baseText('agents.publish.error.unpublish'));
			return null;
		} finally {
			publishing.value = false;
		}
	}

	async function revertToPublished(
		projectId: string,
		agentId: string,
	): Promise<AgentResource | null> {
		if (publishing.value) return null;
		const confirmed = await openAgentConfirmationModal({
			title: locale.baseText('agents.revertToPublished.modal.title'),
			description: locale.baseText('agents.revertToPublished.modal.description'),
			confirmButtonText: locale.baseText('agents.revertToPublished.modal.button.revert'),
			cancelButtonText: locale.baseText('generic.cancel'),
		});
		if (confirmed !== MODAL_CONFIRM) return null;

		publishing.value = true;
		try {
			const updated = await revertAgentToPublished(rootStore.restApiContext, projectId, agentId);
			trackRevertedChangesOnAgent({ agentId });
			upsertProjectAgentsListCache(projectId, updated);
			showMessage({ title: locale.baseText('agents.publish.toast.reverted'), type: 'success' });
			return updated;
		} catch (error) {
			showError(error, locale.baseText('agents.publish.error.revert'));
			return null;
		} finally {
			publishing.value = false;
		}
	}

	return { publish, unpublish, revertToPublished, publishing };
}
