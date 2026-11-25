import { ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { MODAL_CONFIRM } from '@/app/constants';
import {
	getAgent,
	getAgentVersion,
	publishAgent,
	revertAgentToPublished,
	unpublishAgent,
} from './useAgentApi';
import { useAgentConfirmationModal } from './useAgentConfirmationModal';
import { useAgentVersionMetadataModal } from './useAgentVersionMetadataModal';
import { useAgentsN8nChatFlag } from './useAgentsN8nChatFlag';
import { useAgentTelemetry } from './useAgentTelemetry';
import { upsertProjectAgentsListCache } from './useProjectAgentsList';
import type { AgentResource } from '../types';

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
	const isN8nChatEnabled = useAgentsN8nChatFlag();

	const publishing = ref(false);
	const { openVersionMetadata } = useAgentVersionMetadataModal();

	async function publish(
		projectId: string,
		agentId: string,
		versionId?: string,
		isCurrent: () => boolean = () => true,
	): Promise<AgentResource | null> {
		if (publishing.value) return null;
		publishing.value = true;

		try {
			const currentDraft = versionId
				? undefined
				: await getAgent(rootStore.restApiContext, projectId, agentId);
			const selectedId = versionId ?? currentDraft?.versionId;
			if (!selectedId) return null;
			const draft = currentDraft
				? {
						versionId: selectedId,
						skillVersions: Object.fromEntries(
							Object.entries(currentDraft.skillVersions ?? {}).map(([id, info]) => [
								id,
								info.draft,
							]),
						),
					}
				: undefined;

			const version = await getAgentVersion(
				rootStore.restApiContext,
				projectId,
				agentId,
				selectedId,
			);
			if (!isCurrent()) return null;

			let updated: AgentResource | null = null;
			await openVersionMetadata({
				mode: 'publish',
				versionId: selectedId,
				isCurrent,
				name: version.name,
				description: version.description,
				// The version being published decides n8n Chat reachability, not the draft:
				// a republish from version history can differ from it.
				n8nChatAgentId: isN8nChatEnabled.value && version.includesN8nChat ? agentId : undefined,
				onSubmit: async (metadata) => {
					try {
						updated = await publishAgent(
							rootStore.restApiContext,
							projectId,
							agentId,
							versionId,
							metadata,
							draft,
						);
						upsertProjectAgentsListCache(projectId, updated);
						showMessage({
							title: locale.baseText('agents.publish.toast.published'),
							type: 'success',
						});
						return true;
					} catch (error) {
						showError(error, locale.baseText('agents.publish.error.publish'));
						return false;
					}
				},
			});

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
