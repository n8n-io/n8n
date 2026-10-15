import { computed, toValue, type MaybeRefOrGetter } from 'vue';

import {
	useWhatsAppAccountStatus,
	useWhatsAppAccountWarnings,
} from '../channels/whatsapp/useWhatsAppAccountStatus';
import { useAgentIntegrationStatus } from './useAgentIntegrationStatus';

/**
 * Channels that are connected but that their platform has not fully approved
 * yet, keyed by channel type. A warning does not block Publish: the channel
 * can often still reply, and the platform's review can take days.
 */
export function useAgentChannelWarnings(
	projectId: MaybeRefOrGetter<string>,
	agentId: MaybeRefOrGetter<string>,
) {
	const { connectedCredentials } = useAgentIntegrationStatus(toValue(projectId), toValue(agentId));

	const whatsAppCredentialId = computed(() => connectedCredentials.value.whatsapp ?? '');
	const { status: whatsAppStatus } = useWhatsAppAccountStatus({
		projectId,
		agentId,
		credentialId: whatsAppCredentialId,
		enabled: () => Boolean(whatsAppCredentialId.value),
	});
	const whatsAppWarnings = useWhatsAppAccountWarnings(whatsAppStatus);

	const warningsByChannel = computed<Record<string, string[]>>(() =>
		whatsAppWarnings.value.length > 0 ? { whatsapp: whatsAppWarnings.value } : {},
	);
	const allWarnings = computed(() => Object.values(warningsByChannel.value).flat());

	return { warningsByChannel, allWarnings };
}
