import { computed } from 'vue';
import type { INode } from 'n8n-workflow';
import { useRouter } from 'vue-router';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useWorkflowSaving } from '@/app/composables/useWorkflowSaving';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';

export function useAiGateway() {
	const settingsStore = useSettingsStore();
	const router = useRouter();
	const { saveCurrentWorkflow } = useWorkflowSaving({ router });
	const aiGatewayStore = useAiGatewayStore();

	const balance = computed(() => aiGatewayStore.balance);
	const budget = computed(() => aiGatewayStore.budget);
	const creditsLabelKey = computed(() => aiGatewayStore.creditsLabelKey);
	const fetchError = computed(() => aiGatewayStore.fetchError);

	const isEnabled = computed(() => settingsStore.isAiGatewayEnabled);

	async function fetchWallet(options?: { force?: boolean }): Promise<void> {
		if (!isEnabled.value) return;
		await aiGatewayStore.fetchWallet(options);
	}

	const isCredentialTypeSupported = (credentialType: string): boolean =>
		aiGatewayStore.isCredentialTypeSupported(credentialType);

	const canServeCredentialType = (credentialType: string): boolean =>
		aiGatewayStore.canServeCredentialType(credentialType);

	const isActionSupported = (
		nodeName: string,
		resource: string | undefined,
		operation: string,
	): boolean => aiGatewayStore.isActionSupported(nodeName, resource, operation);

	const isNodeTypeVersionSupported = (nodeName: string, typeVersion: number): boolean =>
		aiGatewayStore.isNodeTypeVersionSupported(nodeName, typeVersion);

	const isActionOptionVisible = (
		node: INode | null,
		parameterName: string,
		optionValue: string,
	): boolean => aiGatewayStore.isActionOptionVisible(node, parameterName, optionValue);

	const isNodePropertyHidden = (node: INode | null, propertyName: string): boolean =>
		aiGatewayStore.isNodePropertyHidden(node, propertyName);

	async function fetchConfig(): Promise<void> {
		if (!isEnabled.value) return;
		await aiGatewayStore.fetchConfig();
	}

	async function saveAfterToggle(): Promise<void> {
		await saveCurrentWorkflow({}, false, false, true);
	}

	return {
		isEnabled,
		balance,
		budget,
		creditsLabelKey,
		fetchError,
		fetchConfig,
		fetchWallet,
		isCredentialTypeSupported,
		canServeCredentialType,
		isActionSupported,
		isActionOptionVisible,
		isNodeTypeVersionSupported,
		isNodePropertyHidden,
		saveAfterToggle,
	};
}
