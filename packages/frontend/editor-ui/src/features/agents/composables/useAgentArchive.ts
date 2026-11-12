import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { MODAL_CONFIRM } from '@/app/constants';
import { archiveAgent, unarchiveAgent } from './useAgentApi';
import { useAgentConfirmationModal } from './useAgentConfirmationModal';
import {
	removeProjectAgentFromListCache,
	upsertProjectAgentsListCache,
} from './useProjectAgentsList';
import type { AgentResource } from '../types';

// Every component instance shares this set, so a second click cannot send a second request.
const agentIdsInFlight = new Set<string>();

/**
 * Shared archive/unarchive flow used by the builder header menu and the list card.
 * Owns the confirmation modal, toasts, error handling, and the project list cache.
 */
export function useAgentArchive() {
	const rootStore = useRootStore();
	const locale = useI18n();
	const { showMessage, showError } = useToast();
	const { openAgentConfirmationModal } = useAgentConfirmationModal();

	async function confirmArchivePublished(agentName: string): Promise<boolean> {
		const confirmed = await openAgentConfirmationModal({
			title: locale.baseText('agents.archive.modal.title', { interpolate: { name: agentName } }),
			description: locale.baseText('agents.archive.modal.description'),
			confirmButtonText: locale.baseText('menuActions.archive'),
			cancelButtonText: locale.baseText('generic.cancel'),
		});
		return confirmed === MODAL_CONFIRM;
	}

	async function archive(agent: AgentResource): Promise<AgentResource | null> {
		// Archive unpublishes the agent, so a published agent needs a confirmation.
		if (agent.activeVersionId !== null && !(await confirmArchivePublished(agent.name))) return null;
		if (agentIdsInFlight.has(agent.id)) return null;

		agentIdsInFlight.add(agent.id);
		try {
			const updated = await archiveAgent(rootStore.restApiContext, agent.projectId, agent.id);
			// The project list cache holds only agents that are not archived.
			removeProjectAgentFromListCache(agent.projectId, agent.id);
			showMessage({ title: locale.baseText('agents.archive.toast.archived'), type: 'success' });
			return updated;
		} catch (error) {
			showError(error, locale.baseText('agents.archive.error.archive'));
			return null;
		} finally {
			agentIdsInFlight.delete(agent.id);
		}
	}

	async function unarchive(agent: AgentResource): Promise<AgentResource | null> {
		if (agentIdsInFlight.has(agent.id)) return null;

		agentIdsInFlight.add(agent.id);
		try {
			const updated = await unarchiveAgent(rootStore.restApiContext, agent.projectId, agent.id);
			upsertProjectAgentsListCache(agent.projectId, updated);
			showMessage({ title: locale.baseText('agents.archive.toast.unarchived'), type: 'success' });
			return updated;
		} catch (error) {
			showError(error, locale.baseText('agents.archive.error.unarchive'));
			return null;
		} finally {
			agentIdsInFlight.delete(agent.id);
		}
	}

	return { archive, unarchive };
}
