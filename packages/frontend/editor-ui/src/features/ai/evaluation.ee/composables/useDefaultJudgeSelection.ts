import { computed, type ComputedRef } from 'vue';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';

import { LM_SUBNODE_TYPE_TO_CHATHUB_PROVIDER } from '../evaluation.constants';
import type { JudgeSelection } from '../wizardSidepanel.store';

// Returns null when no matching sub-node exists, the model is unset, or the
// credential isn't visible to the current user (caller falls back to chat-hub).
export function useDefaultJudgeSelection(): ComputedRef<JudgeSelection | null> {
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const credentialsStore = useCredentialsStore();

	return computed<JudgeSelection | null>(() => {
		const allNodes = workflowDocumentStore.value?.allNodes ?? [];
		for (const node of allNodes) {
			const provider = LM_SUBNODE_TYPE_TO_CHATHUB_PROVIDER[node.type];
			if (!provider) continue;

			const model = extractModelId(node.parameters?.model);
			if (!model) continue;

			const credentialId = extractCredentialId(node.credentials);
			if (!credentialId) continue;

			if (!credentialsStore.allCredentials.some((c) => c.id === credentialId)) continue;

			return { provider, model, credentialId };
		}
		return null;
	});
}

// `model` is a string on older lmChat* versions and a resource-locator on newer.
function extractModelId(model: unknown): string | undefined {
	if (typeof model === 'string') return model || undefined;
	if (model && typeof model === 'object' && 'value' in model) {
		const value = (model as { value: unknown }).value;
		if (typeof value === 'string') return value || undefined;
	}
	return undefined;
}

function extractCredentialId(
	credentials: Record<string, { id: string | null }> | undefined,
): string | undefined {
	if (!credentials) return undefined;
	for (const slot of Object.values(credentials)) {
		if (slot?.id) return slot.id;
	}
	return undefined;
}
