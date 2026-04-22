import { ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@/app/composables/useToast';
import { MODAL_CONFIRM } from '@/app/constants';
import { publishAgent, unpublishAgent } from './useAgentApi';
import { useAgentTelemetry } from './useAgentTelemetry';
import { buildAgentConfigFingerprint } from './agentTelemetry.utils';
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
	const agentTelemetry = useAgentTelemetry();

	const publishing = ref(false);

	async function publish(projectId: string, agentId: string): Promise<AgentResource | null> {
		if (publishing.value) return null;
		publishing.value = true;
		try {
			const updated = await publishAgent(rootStore.restApiContext, projectId, agentId);
			// Derive the fingerprint from the server's response so `config_version`
			// reflects what was actually published regardless of the caller —
			// list-card publishes don't have access to the live draft. Triggers
			// are intentionally omitted: they live outside AgentJsonConfig and
			// aren't part of the published schema. `crypto.subtle.digest` can
			// throw in insecure contexts — swallow so telemetry never surfaces
			// as a publish failure. `trackPublishedAgent` itself is already safe.
			try {
				const fp = await buildAgentConfigFingerprint(updated.publishedVersion?.schema ?? null, []);
				agentTelemetry.trackPublishedAgent({ agentId, configVersion: fp.config_version });
			} catch {
				// Swallow fingerprint failures.
			}
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
			agentTelemetry.trackUnpublishedAgent({ agentId });
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
