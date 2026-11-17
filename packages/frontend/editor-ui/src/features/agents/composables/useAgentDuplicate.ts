import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUIStore } from '@/app/stores/ui.store';
import type { AgentListItem } from '../agent.types';
import { AGENT_DUPLICATE_MODAL_KEY } from '../constants';
import { duplicateAgent } from './useAgentApi';
import { upsertProjectAgentsListCache } from './useProjectAgentsList';
import { useAgentTelemetry } from './useAgentTelemetry';

/** Opens the duplicate modal for an agent in a list */
export function useAgentDuplicate() {
	const locale = useI18n();
	const toast = useToast();
	const rootStore = useRootStore();
	const uiStore = useUIStore();
	const agentTelemetry = useAgentTelemetry();

	function openDuplicate(
		agent: AgentListItem,
		existingNames: string[],
		onDuplicated: (agentId: string, projectId: string) => void,
	) {
		// An unconfigured agent has no config to clone — duplicating it would only
		// yield an empty draft, so inform the user instead of opening the modal.
		if (!agent.hasConfig) {
			toast.showMessage({
				title: locale.baseText('agents.duplicate.modal.unconfigured'),
				type: 'info',
			});
			return;
		}
		uiStore.openModalWithData({
			name: AGENT_DUPLICATE_MODAL_KEY,
			data: {
				projectId: agent.projectId,
				agentId: agent.id,
				name: agent.name,
				existingNames,
				onConfirm: async (newName: string) => {
					try {
						const duplicated = await duplicateAgent(
							rootStore.restApiContext,
							agent.projectId,
							agent.id,
							newName,
						);
						// Keep the source Agent context alongside the backend creation event.
						// The safe wrapper prevents telemetry errors from failing duplication.
						agentTelemetry.trackDuplicatedAgent({
							sourceAgentId: agent.id,
							agentId: duplicated.id,
							projectId: agent.projectId,
						});
						upsertProjectAgentsListCache(agent.projectId, duplicated);
						toast.showMessage({
							title: locale.baseText('agents.duplicate.modal.success'),
							type: 'success',
						});
						onDuplicated(duplicated.id, agent.projectId);
					} catch (error) {
						toast.showError(error, locale.baseText('agents.duplicate.modal.error'));
						throw error;
					}
				},
			},
		});
	}

	return { openDuplicate };
}
