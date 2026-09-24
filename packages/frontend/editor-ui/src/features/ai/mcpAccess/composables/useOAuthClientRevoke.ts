import { ref } from 'vue';
import type { OAuthClientResponseDto } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useUsersStore } from '@n8n/stores/users.store';

import { useMcp } from '@/features/ai/mcpAccess/composables/useMcp';
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';

/**
 * The confirm-then-revoke flow for a connected client, shared by the settings
 * overview and the clients page. `requestRevoke` opens the confirmation (the
 * pending client is the dialog's `open` state), `confirmRevoke` performs the
 * revoke and reports it, `cancelRevoke` dismisses.
 *
 * `onRevoked` runs after a successful revoke so the caller can refresh its own
 * view of the data. It owns its error handling: the revoke already succeeded,
 * so a failed refresh must not be reported as a failed revoke.
 */
export function useOAuthClientRevoke(options: { onRevoked?: () => Promise<void> | void } = {}) {
	const i18n = useI18n();
	const toast = useToast();
	const mcp = useMcp();
	const mcpStore = useMCPStore();
	const usersStore = useUsersStore();

	const revokeClient = ref<OAuthClientResponseDto | null>(null);
	const revoking = ref(false);

	/** An admin revoking someone else's grant rather than their own. */
	const isRevokingForOther = (client: OAuthClientResponseDto) =>
		!!client.owner && client.owner.id !== usersStore.currentUser?.id;

	const requestRevoke = (client: OAuthClientResponseDto) => {
		revokeClient.value = client;
	};

	const cancelRevoke = () => {
		revokeClient.value = null;
	};

	const confirmRevoke = async () => {
		const client = revokeClient.value;
		if (!client) return;
		let revoked = false;
		try {
			revoking.value = true;
			await mcpStore.removeOAuthClient(client.id, client.owner?.id);
			revoked = true;
			mcp.trackClientAccessRevoked({
				clientId: client.id,
				clientName: client.name,
				revokedForOther: isRevokingForOther(client),
			});
			toast.showMessage({
				type: 'success',
				title: i18n.baseText('settings.mcp.oAuthClients.revoke.success.title'),
				message: i18n.baseText('settings.mcp.oAuthClients.revoke.success.message', {
					interpolate: { name: client.name },
				}),
			});
		} catch (error) {
			toast.showError(error, i18n.baseText('settings.mcp.oAuthClients.revoke.error'));
		} finally {
			revoking.value = false;
			revokeClient.value = null;
		}
		if (revoked) {
			await options.onRevoked?.();
		}
	};

	return {
		revokeClient,
		revoking,
		isRevokingForOther,
		requestRevoke,
		cancelRevoke,
		confirmRevoke,
	};
}
