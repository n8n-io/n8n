import { ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@/app/composables/useToast';
import { MODAL_CONFIRM } from '@/app/constants';
import { publishAgent, unpublishAgent } from './useAgentApi';
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
	const message = useMessage();

	const publishing = ref(false);

	async function publish(projectId: string, agentId: string): Promise<AgentResource | null> {
		if (publishing.value) return null;
		publishing.value = true;
		try {
			const updated = await publishAgent(rootStore.restApiContext, projectId, agentId);
			showMessage({ title: locale.baseText('agents.publish.toast.published'), type: 'success' });
			return updated;
		} catch (error) {
			showError(error, locale.baseText('agents.publish.error.publish'));
			return null;
		} finally {
			publishing.value = false;
		}
	}

	async function unpublish(projectId: string, agentId: string): Promise<AgentResource | null> {
		if (publishing.value) return null;
		const confirmed = await message.confirm(
			locale.baseText('agents.unpublish.modal.description'),
			locale.baseText('agents.unpublish.modal.title'),
			{
				confirmButtonText: locale.baseText('agents.unpublish.modal.button.unpublish'),
				cancelButtonText: locale.baseText('generic.cancel'),
				type: 'warning',
			},
		);
		if (confirmed !== MODAL_CONFIRM) return null;

		publishing.value = true;
		try {
			const updated = await unpublishAgent(rootStore.restApiContext, projectId, agentId);
			showMessage({ title: locale.baseText('agents.publish.toast.unpublished'), type: 'success' });
			return updated;
		} catch (error) {
			showError(error, locale.baseText('agents.publish.error.unpublish'));
			return null;
		} finally {
			publishing.value = false;
		}
	}

	return { publish, unpublish, publishing };
}
