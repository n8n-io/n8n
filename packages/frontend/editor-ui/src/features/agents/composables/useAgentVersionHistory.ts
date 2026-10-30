import { computed, ref } from 'vue';
import type { AgentVersionListItemDto } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { MODAL_CONFIRM } from '@/app/constants';
import { listAgentVersions, updateAgentVersion, revertAgentToVersion } from './useAgentApi';
import { useAgentConfirmationModal } from './useAgentConfirmationModal';
import { useAgentTelemetry } from './useAgentTelemetry';
import { useAgentPublish } from './useAgentPublish';
import { useAgentVersionMetadataModal } from './useAgentVersionMetadataModal';
import type { AgentResource } from '../types';

const PAGE_SIZE = 20;

/** Owns saved-version pagination and actions. The caller applies Agent changes to the editor. */
export function useAgentVersionHistory() {
	const rootStore = useRootStore();
	const locale = useI18n();
	const { showMessage, showError } = useToast();
	const { openAgentConfirmationModal } = useAgentConfirmationModal();
	const { trackRevertedChangesOnAgent } = useAgentTelemetry();

	const { publish } = useAgentPublish();
	const { openVersionMetadata } = useAgentVersionMetadataModal();
	const items = ref<AgentVersionListItemDto[]>([]);
	const isLoading = ref(false);
	const isInitialLoad = ref(true);
	const hasMore = ref(true);
	const acting = ref(false);
	const failedLoad = ref<'refresh' | 'fetchMore' | null>(null);
	const hasLoadError = computed(() => failedLoad.value !== null);
	const agentKey = ref('');
	let fetchedCount = 0;

	// Guards against out-of-order responses. Each load captures the current
	// token; when its request settles it only writes to shared state if the
	// token is still the latest. A newer load supersedes an older in-flight one
	// (e.g. switching agents while the panel is open, which re-fires the load via
	// a prop watcher), so a slow earlier response can't overwrite fresher data.
	let requestToken = 0;

	async function refresh(projectId: string, agentId: string): Promise<void> {
		if (agentKey.value !== `${projectId}/${agentId}`) {
			agentKey.value = `${projectId}/${agentId}`;
			items.value = [];
			isInitialLoad.value = true;
			fetchedCount = 0;
		}

		failedLoad.value = null;
		const token = ++requestToken;
		isLoading.value = true;

		try {
			const data = await listAgentVersions(rootStore.restApiContext, projectId, agentId, {
				take: PAGE_SIZE,
				skip: 0,
			});

			if (token !== requestToken) return;

			items.value = data;
			fetchedCount = data.length;
			hasMore.value = data.length === PAGE_SIZE;
		} catch (error) {
			if (token !== requestToken) return;

			failedLoad.value = 'refresh';
			showError(error, locale.baseText('agents.versionHistory.error.load'));
		} finally {
			if (token === requestToken) {
				isLoading.value = false;
				isInitialLoad.value = false;
			}
		}
	}

	async function fetchMore(projectId: string, agentId: string): Promise<void> {
		if (isLoading.value || !hasMore.value || failedLoad.value === 'refresh') return;
		const token = ++requestToken;
		isLoading.value = true;

		try {
			const data = await listAgentVersions(rootStore.restApiContext, projectId, agentId, {
				take: PAGE_SIZE,
				skip: fetchedCount,
			});

			if (token !== requestToken) return;

			items.value = [
				...new Map([...items.value, ...data].map((item) => [item.versionId, item])).values(),
			];
			fetchedCount += data.length;
			failedLoad.value = null;
			hasMore.value = data.length === PAGE_SIZE;
		} catch (error) {
			if (token !== requestToken) return;

			failedLoad.value = 'fetchMore';
			showError(error, locale.baseText('agents.versionHistory.error.load'));
		} finally {
			if (token === requestToken) {
				isLoading.value = false;
			}
		}
	}

	async function retry(projectId: string, agentId: string): Promise<void> {
		if (isLoading.value) return;
		if (failedLoad.value === 'refresh') {
			await refresh(projectId, agentId);
		} else if (failedLoad.value === 'fetchMore') {
			await fetchMore(projectId, agentId);
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

			trackRevertedChangesOnAgent({ agentId });
			showMessage({
				title: locale.baseText('agents.versionHistory.revert.toast.title'),
				type: 'success',
			});

			if (!agentKey.value || agentKey.value === `${projectId}/${agentId}`)
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
			const updated = await publish(
				projectId,
				agentId,
				versionId,
				() => !agentKey.value || agentKey.value === `${projectId}/${agentId}`,
			);

			if (updated && (!agentKey.value || agentKey.value === `${projectId}/${agentId}`))
				await refresh(projectId, agentId);

			return updated;
		} finally {
			acting.value = false;
		}
	}

	async function editVersion(projectId: string, agentId: string, versionId: string): Promise<void> {
		if (acting.value) return;

		const version = items.value.find((item) => item.versionId === versionId);
		if (!version) return;

		acting.value = true;
		try {
			await openVersionMetadata({
				mode: 'edit',
				isCurrent: () => !agentKey.value || agentKey.value === `${projectId}/${agentId}`,
				name: version.name,
				description: version.description,
				onSubmit: async (metadata) => {
					try {
						await updateAgentVersion(
							rootStore.restApiContext,
							projectId,
							agentId,
							versionId,
							metadata,
						);

						if (!agentKey.value || agentKey.value === `${projectId}/${agentId}`)
							await refresh(projectId, agentId);

						return true;
					} catch (error) {
						showError(error, locale.baseText('agents.versionHistory.metadata.error'));

						return false;
					}
				},
			});
		} finally {
			acting.value = false;
		}
	}

	return {
		items,
		isLoading,
		isInitialLoad,
		hasMore,
		hasLoadError,
		acting,
		pageSize: PAGE_SIZE,
		refresh,
		fetchMore,
		retry,
		revertToVersion,
		publishVersion,
		editVersion,
	};
}
