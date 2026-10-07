import { ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { MODAL_CONFIRM } from '@/app/constants';
import {
	getAgentPublishSkillChanges,
	publishAgent,
	revertAgentToPublished,
	unpublishAgent,
} from './useAgentApi';
import { useAgentConfirmationModal } from './useAgentConfirmationModal';
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

	const publishing = ref(false);

	/**
	 * Shared skills that another user changed since the last publish go live with this
	 * publish, so the user confirms them first. Returns false when the user backs out.
	 */
	async function confirmSkillChanges(
		projectId: string,
		agentId: string,
		onOpenSkill?: (skillId: string) => void,
	): Promise<boolean> {
		let skills: Array<{ id: string; name: string }>;
		try {
			({ skills } = await getAgentPublishSkillChanges(
				rootStore.restApiContext,
				projectId,
				agentId,
			));
		} catch {
			// The check only informs; it must not block a publish the server allows.
			return true;
		}
		if (skills.length === 0) return true;
		const confirmed = await openAgentConfirmationModal({
			title: locale.baseText('agents.publish.skillChanges.modal.title'),
			description: locale.baseText('agents.publish.skillChanges.modal.description'),
			items: skills.map((skill) => ({ id: skill.id, label: skill.name })),
			onItemClick: onOpenSkill,
			confirmButtonText: locale.baseText('agents.publish.skillChanges.modal.button.publish'),
			cancelButtonText: locale.baseText('generic.cancel'),
		});
		return confirmed === MODAL_CONFIRM;
	}

	async function publish(
		projectId: string,
		agentId: string,
		options: { onOpenSkill?: (skillId: string) => void } = {},
	): Promise<AgentResource | null> {
		if (publishing.value) return null;
		publishing.value = true;
		try {
			if (!(await confirmSkillChanges(projectId, agentId, options.onOpenSkill))) return null;
			const updated = await publishAgent(rootStore.restApiContext, projectId, agentId);
			upsertProjectAgentsListCache(projectId, updated);
			showMessage({ title: locale.baseText('agents.publish.toast.published'), type: 'success' });
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
