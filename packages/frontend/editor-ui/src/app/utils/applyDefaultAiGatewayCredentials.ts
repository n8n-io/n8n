import type { INodeUi, INodeTypeDescription } from 'n8n-workflow';

import { AI_GATEWAY_EXPERIMENT } from '@/app/constants/experiments';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { useSettingsStore } from '@/app/stores/settings.store';

/**
 * When AI Gateway is enabled, new supported AI nodes default to n8n Connect
 * (gateway-managed credentials) instead of an empty BYOK credential.
 *
 * @returns whether any credential entry was set
 */
export async function applyDefaultAiGatewayCredentialsForNewNode(
	node: INodeUi,
	nodeTypeDescription: INodeTypeDescription,
): Promise<boolean> {
	const settingsStore = useSettingsStore();
	const postHogStore = usePostHog();
	const aiGatewayStore = useAiGatewayStore();

	if (!settingsStore.isAiGatewayEnabled) {
		return false;
	}
	if (postHogStore.getVariant(AI_GATEWAY_EXPERIMENT.name) !== AI_GATEWAY_EXPERIMENT.variant) {
		return false;
	}

	await aiGatewayStore.fetchConfig();

	if (!nodeTypeDescription.credentials?.length) {
		return false;
	}

	if (!aiGatewayStore.isNodeSupported(node.type)) {
		return false;
	}

	let applied = false;
	for (const credDesc of nodeTypeDescription.credentials) {
		if (!aiGatewayStore.isCredentialTypeSupported(credDesc.name)) {
			continue;
		}

		const existing = node.credentials?.[credDesc.name];
		if (existing?.id) {
			continue;
		}
		if (existing?.__aiGatewayManaged) {
			continue;
		}

		node.credentials ??= {};
		node.credentials[credDesc.name] = { id: null, name: '', __aiGatewayManaged: true };
		applied = true;
	}

	return applied;
}
