import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { getAgentChannelPlatform } from '../channels/registry';
import type { AgentChannelRuntime } from '../channels/types';
import type { useAgentIntegrationStatus } from './useAgentIntegrationStatus';

interface PendingDisconnect {
	channelType: string;
	credentialId: string;
}

export function useAgentChannelRemoval(options: {
	projectId: () => string;
	agentId: () => string;
	isPublished: () => boolean;
	disabled: () => boolean;
	status: Pick<
		ReturnType<typeof useAgentIntegrationStatus>,
		'disconnect' | 'fetchStatus' | 'loadingMap'
	>;
	runtimeFor: (type: string) => AgentChannelRuntime | Promise<AgentChannelRuntime>;
	onRemoved: (channelType: string) => void;
}) {
	const toast = useToast();
	const i18n = useI18n();
	const projectId = options.projectId();
	const agentId = options.agentId();
	const pendingDisconnect = ref<PendingDisconnect | null>(null);
	const removing = ref(false);
	let active = true;

	onBeforeUnmount(() => {
		active = false;
	});

	watch(options.disabled, (disabled) => {
		if (disabled) pendingDisconnect.value = null;
	});

	const isCurrentAgent = () =>
		active && options.projectId() === projectId && options.agentId() === agentId;
	const isBlocked = (channelType: string) =>
		!isCurrentAgent() ||
		options.disabled() ||
		removing.value ||
		options.status.loadingMap.value[channelType];

	const disconnectConfirmationComponent = computed(() => {
		const pending = pendingDisconnect.value;
		return pending
			? getAgentChannelPlatform(pending.channelType).disconnectConfirmationComponent
			: undefined;
	});

	function showError(error: unknown) {
		if (isCurrentAgent()) {
			toast.showError(error, i18n.baseText('agents.channels.modal.removeChannelError'));
		}
	}

	async function disconnectChannel(pending: PendingDisconnect, deleteExternalResource?: boolean) {
		try {
			const result = await options.status.disconnect(pending.channelType, pending.credentialId, {
				deleteExternalResource,
			});
			await options.status.fetchStatus([pending.channelType]);
			if (!isCurrentAgent()) return;

			if (result.warning) {
				const presentation = getAgentChannelPlatform(
					pending.channelType,
				).presentDisconnectWarning?.(result.warning, { text: (key) => i18n.baseText(key) });
				if (presentation) {
					toast.showMessage({ type: 'warning', ...presentation, duration: 0 });
				}
			}
			pendingDisconnect.value = null;
			options.onRemoved(pending.channelType);
		} catch (error) {
			showError(error);
		}
	}

	async function requestDisconnect(channelType: string, credentialId: string) {
		if (isBlocked(channelType) || pendingDisconnect.value) return;
		removing.value = true;
		try {
			const runtime = await options.runtimeFor(channelType);
			if (!isCurrentAgent() || options.disabled()) return;
			const pending = { channelType, credentialId };
			const platform = getAgentChannelPlatform(channelType);
			if (
				platform.shouldConfirmDisconnect?.(runtime, credentialId, {
					isPublished: options.isPublished(),
				})
			) {
				pendingDisconnect.value = pending;
				return;
			}
			await disconnectChannel(pending);
		} catch (error) {
			showError(error);
		} finally {
			removing.value = false;
		}
	}

	async function confirmDisconnect(deleteExternalResource: boolean) {
		const pending = pendingDisconnect.value;
		if (!pending || isBlocked(pending.channelType)) return;
		removing.value = true;
		try {
			await disconnectChannel(pending, deleteExternalResource);
		} finally {
			removing.value = false;
		}
	}

	return {
		pendingDisconnect,
		disconnectConfirmationComponent,
		removing,
		requestDisconnect,
		confirmDisconnect,
	};
}
