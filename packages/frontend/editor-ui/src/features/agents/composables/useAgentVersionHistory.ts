import { ref } from 'vue';
import type { AgentVersionListItemDto } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/app/composables/useToast';
import { MODAL_CONFIRM } from '@/app/constants';
import { listAgentVersions, publishAgent, revertAgentToVersion } from './useAgentApi';
import { useAgentConfirmationModal } from './useAgentConfirmationModal';
import type { AgentResource } from '../types';

const PAGE_SIZE = 20;

/**
 * Owns the version-history list state (items, pagination cursor, loading flags)
 * and the two row actions — revert-to-version (with confirmation modal) and
 * publish-this-version. Both actions refresh the list on success; the caller
 * is responsible for refetching the agent so the editor reflects any draft
 * changes from a revert.
 */
export function useAgentVersionHistory() {
	const rootStore = useRootStore();
	const locale = useI18n();
	const { showMessage, showError } = useToast();
	const { openAgentConfirmationModal } = useAgentConfirmationModal();

	const items = ref<AgentVersionListItemDto[]>([]);
	const isLoading = ref(false);
	const isInitialLoad = ref(true);
	const hasMore = ref(true);
	const acting = ref(false);

	async function refresh(projectId: string, agentId: string): Promise<void> {
		isLoading.value = true;
		try {
			const data = await listAgentVersions(rootStore.restApiContext, projectId, agentId, {
				take: PAGE_SIZE,
				skip: 0,
			});
			items.value = data;
			hasMore.value = data.length === PAGE_SIZE;
		} catch (error) {
			showError(error, locale.baseText('agents.versionHistory.error.load'));
		} finally {
			isLoading.value = false;
			isInitialLoad.value = false;
		}
	}

	async function fetchMore(projectId: string, agentId: string): Promise<void> {
		if (isLoading.value || !hasMore.value) return;
		isLoading.value = true;
		try {
			const data = await listAgentVersions(rootStore.restApiContext, projectId, agentId, {
				take: PAGE_SIZE,
				skip: items.value.length,
			});
			items.value = [...items.value, ...data];
			hasMore.value = data.length === PAGE_SIZE;
		} catch (error) {
			showError(error, locale.baseText('agents.versionHistory.error.load'));
		} finally {
			isLoading.value = false;
		}
	}

	async function revertToVersion(
		projectId: string,
		agentId: string,
		versionId: string,
	): Promise<AgentResource | null> {
		if (acting.value) return null;

		const confirmed = await openAgentConfirmationModal({
			title: locale.baseText('agents.versionHistory.revert.modal.title'),
			description: locale.baseText('agents.versionHistory.revert.modal.description'),
			confirmButtonText: locale.baseText('agents.versionHistory.revert.modal.button.revert'),
			cancelButtonText: locale.baseText('generic.cancel'),
		});
		if (confirmed !== MODAL_CONFIRM) return null;

		acting.value = true;
		try {
			const updated = await revertAgentToVersion(
				rootStore.restApiContext,
				projectId,
				agentId,
				versionId,
			);
			showMessage({
				title: locale.baseText('agents.versionHistory.revert.toast.title'),
				type: 'success',
			});
			await refresh(projectId, agentId);
			return updated;
		} catch (error) {
			showError(error, locale.baseText('agents.versionHistory.revert.error'));
			return null;
		} finally {
			acting.value = false;
		}
	}

	async function publishVersion(
		projectId: string,
		agentId: string,
		versionId: string,
	): Promise<AgentResource | null> {
		if (acting.value) return null;

		acting.value = true;
		try {
			const updated = await publishAgent(rootStore.restApiContext, projectId, agentId, versionId);
			showMessage({
				title: locale.baseText('agents.versionHistory.publish.toast.title'),
				type: 'success',
			});
			await refresh(projectId, agentId);
			return updated;
		} catch (error) {
			showError(error, locale.baseText('agents.versionHistory.publish.error'));
			return null;
		} finally {
			acting.value = false;
		}
	}

	return {
		items,
		isLoading,
		isInitialLoad,
		hasMore,
		acting,
		pageSize: PAGE_SIZE,
		refresh,
		fetchMore,
		revertToVersion,
		publishVersion,
	};
}
