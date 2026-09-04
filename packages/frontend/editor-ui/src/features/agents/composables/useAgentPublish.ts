import { ref } from 'vue';
import { useRouter } from 'vue-router';
import type { AgentPublishDependency, AgentPublishDependencyFailure } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { MODAL_CONFIRM, VIEWS } from '@/app/constants';
import {
	getAgentUnpublishedDependencies,
	publishAgent,
	revertAgentToPublished,
	unpublishAgent,
} from './useAgentApi';
import { useAgentConfirmationModal } from './useAgentConfirmationModal';
import { upsertProjectAgentsListCache } from './useProjectAgentsList';
import type { AgentResource } from '../types';

function isDependencyFailure(value: unknown): value is AgentPublishDependencyFailure {
	return (
		typeof value === 'object' &&
		value !== null &&
		'id' in value &&
		'name' in value &&
		'reason' in value
	);
}

/** Workflows the backend tried to publish with the agent and could not. */
function failedDependenciesOf(error: unknown): AgentPublishDependencyFailure[] {
	const failed = error instanceof ResponseError ? error.meta?.failedDependencies : undefined;
	return Array.isArray(failed) ? failed.filter(isDependencyFailure) : [];
}

/**
 * Shared publish/unpublish flow used by the builder header button and the list card.
 * Owns the confirmation modal, toasts, error handling, and the `publishing` spinner
 * state so both call sites stay thin and behave consistently.
 */
export function useAgentPublish() {
	const rootStore = useRootStore();
	const router = useRouter();
	const locale = useI18n();
	const { showMessage, showError } = useToast();
	const { openAgentConfirmationModal } = useAgentConfirmationModal();

	const publishing = ref(false);

	function toModalItem({ id, name }: AgentPublishDependency) {
		return {
			id,
			name,
			href: router.resolve({ name: VIEWS.WORKFLOW, params: { workflowId: id } }).href,
		};
	}

	async function publishAndNotify(
		projectId: string,
		agentId: string,
		dependencies: AgentPublishDependency[],
	): Promise<AgentResource> {
		const updated = await publishAgent(rootStore.restApiContext, projectId, agentId, {
			publishDependencies: dependencies.length > 0,
		});
		upsertProjectAgentsListCache(projectId, updated);
		showMessage({ title: locale.baseText('agents.publish.toast.published'), type: 'success' });
		return updated;
	}

	async function publish(projectId: string, agentId: string): Promise<AgentResource | null> {
		if (publishing.value) return null;
		publishing.value = true;
		try {
			// Workflow tools without a published version go live with the agent,
			// but only after the user has seen which ones.
			const dependencies = await getAgentUnpublishedDependencies(
				rootStore.restApiContext,
				projectId,
				agentId,
			);
			if (dependencies.length === 0) return await publishAndNotify(projectId, agentId, []);

			// The modal closes only once the publish succeeds: workflows that could
			// not be published are listed in it so the user can open and fix them.
			let updated: AgentResource | undefined;
			const confirmed = await openAgentConfirmationModal({
				title: locale.baseText('agents.publish.dependencies.modal.title'),
				description: locale.baseText('agents.publish.dependencies.modal.description'),
				items: dependencies.map(toModalItem),
				confirmButtonText: locale.baseText('agents.publish.dependencies.modal.button.publish'),
				cancelButtonText: locale.baseText('generic.cancel'),
				onConfirm: async () => {
					try {
						updated = await publishAndNotify(projectId, agentId, dependencies);
						return undefined;
					} catch (error) {
						const failed = failedDependenciesOf(error);
						const message =
							failed.length > 0
								? locale.baseText('agents.publish.dependencies.modal.failed')
								: error instanceof Error
									? error.message
									: locale.baseText('agents.publish.error.publish');
						return { message, failedItems: failed.map(({ id, reason }) => ({ id, reason })) };
					}
				},
			});
			return confirmed === MODAL_CONFIRM && updated ? updated : null;
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
