import type { AgentIntegrationAccountResponse } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { ref } from 'vue';

import { getIntegrationAccount } from './useAgentApi';

/** Channels where users reach the agent with a mention. */
export const MENTION_CHANNEL_TYPES: readonly string[] = ['slack', 'discord', 'teams'];

interface AccountRef {
	agentId: string;
	type: string;
	credentialId: string | undefined;
}

/**
 * Keyed by agent, channel, and credential, so a new credential asks again.
 * Kept for the session: the backend caches too, and the data only labels rows.
 */
const accounts = ref<Record<string, AgentIntegrationAccountResponse>>({});
const requested = new Set<string>();

function accountKey({ agentId, type, credentialId }: AccountRef) {
	return `${agentId}:${type}:${credentialId ?? ''}`;
}

/** Bot names and workspaces of the agent's chat channels, loaded on request. */
export function useAgentIntegrationAccounts() {
	const rootStore = useRootStore();

	function getAccount(ref: AccountRef) {
		if (!ref.credentialId) return undefined;
		return accounts.value[accountKey(ref)];
	}

	/** Never throws: an unknown account only makes the label less specific. */
	async function loadAccount(projectId: string, ref: AccountRef) {
		if (!ref.credentialId || !MENTION_CHANNEL_TYPES.includes(ref.type)) return;
		const key = accountKey(ref);
		if (requested.has(key)) return;
		requested.add(key);
		try {
			const account = await getIntegrationAccount(
				rootStore.restApiContext,
				projectId,
				ref.agentId,
				ref.type,
			);
			accounts.value[key] = account;
		} catch {
			requested.delete(key);
		}
	}

	return { getAccount, loadAccount };
}
