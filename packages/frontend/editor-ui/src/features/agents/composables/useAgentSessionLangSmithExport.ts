import { useClipboard } from '@n8n/composables/useClipboard';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { computed, ref } from 'vue';

import { MODAL_CONFIRM } from '@/app/constants';

import { useAgentSessionsStore } from '../agentSessions.store';
import { useAgentConfirmationModal } from './useAgentConfirmationModal';

interface AgentSessionIdentifiers {
	projectId: string;
	agentId: string;
	threadId: string;
}

export function useAgentSessionLangSmithExport() {
	const i18n = useI18n();
	const settingsStore = useSettingsStore();
	const sessionsStore = useAgentSessionsStore();
	const clipboard = useClipboard();
	const { showError, showMessage } = useToast();
	const { openAgentConfirmationModal } = useAgentConfirmationModal();
	const isExporting = ref(false);
	const isEnabled = computed(
		() =>
			localStorage.getItem('instanceAi.debugMode') === 'true' &&
			settingsStore.moduleSettings.agents?.proxyEnabled === true,
	);

	async function sendSession({ projectId, agentId, threadId }: AgentSessionIdentifiers) {
		if (!isEnabled.value || isExporting.value) return;

		isExporting.value = true;
		try {
			const confirmed = await openAgentConfirmationModal({
				title: i18n.baseText('agentSessions.langsmithExport.confirm.title'),
				description: i18n.baseText('agentSessions.langsmithExport.confirm.body'),
				confirmButtonText: i18n.baseText('agentSessions.langsmithExport.confirm.button'),
				cancelButtonText: i18n.baseText('generic.cancel'),
			});
			if (confirmed !== MODAL_CONFIRM) return;

			const { traceId } = await sessionsStore.exportThreadToLangSmith(projectId, agentId, threadId);
			await clipboard.copy(traceId).catch(() => {});
			showMessage({
				title: i18n.baseText('agentSessions.langsmithExport.success'),
				message: i18n.baseText('agentSessions.langsmithExport.successMessage', {
					interpolate: { traceId },
				}),
				type: 'success',
			});
		} catch (error) {
			showError(error, i18n.baseText('agentSessions.langsmithExport.error'));
		} finally {
			isExporting.value = false;
		}
	}

	return { isEnabled, isExporting, sendSession };
}
