import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { INode } from 'n8n-workflow';
import type { AiGatewayConfigDto, AiGatewayUsageEntry } from '@n8n/api-types';
import { STORES } from '@n8n/stores';
import { useRootStore } from '@n8n/stores/useRootStore';

import {
	getGatewayConfig,
	getGatewayWallet,
	getGatewayUsage,
} from '@/features/ai/assistant/assistant.api';

const OPERATION_ONLY = '__operation_only__';

function toError(e: unknown): Error {
	return e instanceof Error ? e : new Error(String(e));
}

// Tool-variant node types carry a "Tool"/"HitlTool" suffix (e.g. "openAiTool"),
// but the gateway config is keyed by the base node name ("openAi").
export const stripToolSuffix = (nodeName: string) =>
	nodeName.replace(/HitlTool$/, '').replace(/Tool$/, '');

export const useAiGatewayStore = defineStore(STORES.AI_GATEWAY, () => {
	const rootStore = useRootStore();

	const config = ref<AiGatewayConfigDto | null>(null);
	const balance = ref<number | undefined>(undefined);
	const budget = ref<number | undefined>(undefined);
	const usageEntries = ref<AiGatewayUsageEntry[]>([]);
	const usageTotal = ref<number>(0);
	const fetchError = ref<Error | null>(null);

	async function fetchConfig(): Promise<void> {
		if (config.value !== null) return;
		try {
			config.value = await getGatewayConfig(rootStore.restApiContext);
			fetchError.value = null;
		} catch (error) {
			fetchError.value = toError(error);
		}
	}

	async function fetchWallet(): Promise<void> {
		try {
			const data = await getGatewayWallet(rootStore.restApiContext);
			balance.value = data.balance;
			budget.value = data.budget;
			fetchError.value = null;
		} catch (error) {
			fetchError.value = toError(error);
		}
	}

	async function fetchUsage(offset = 0, limit = 50): Promise<void> {
		try {
			const data = await getGatewayUsage(rootStore.restApiContext, offset, limit);
			usageEntries.value = data.entries;
			usageTotal.value = data.total;
			fetchError.value = null;
		} catch (error) {
			fetchError.value = toError(error);
		}
	}

	async function fetchMoreUsage(offset: number, limit = 50): Promise<void> {
		try {
			const data = await getGatewayUsage(rootStore.restApiContext, offset, limit);
			usageEntries.value = [...usageEntries.value, ...data.entries];
			usageTotal.value = data.total;
			fetchError.value = null;
		} catch (error) {
			fetchError.value = toError(error);
		}
	}

	function isNodeSupported(nodeName: string): boolean {
		return config.value?.nodes.includes(nodeName) ?? false;
	}

	function isCredentialTypeSupported(credentialType: string): boolean {
		return config.value?.credentialTypes.includes(credentialType) ?? false;
	}

	/**
	 * Returns true when the given node action (resource + operation) is allowed
	 * by the gateway config, or when there is no restriction to enforce.
	 *
	 * The "no restriction" cases — returning true — are intentional permissive
	 * defaults so that nodes without an entry in `supportedActions` are never
	 * accidentally hidden:
	 *  - config not yet loaded → allow everything until we know otherwise
	 *  - node not listed in supportedActions → no restrictions defined, allow all
	 *
	 * For operation-only nodes (no resource parameter, e.g. PDF.co), pass
	 * `resource` as `undefined`. The lookup falls back to the OPERATION_ONLY key
	 * (`'__operation_only__'`) so the operation list is still enforced.
	 */
	function isActionSupported(
		nodeName: string,
		resource: string | undefined,
		operation: string,
	): boolean {
		if (!config.value) return true;
		const nodeActions =
			config.value.supportedActions?.[nodeName] ??
			config.value.supportedActions?.[stripToolSuffix(nodeName)];
		if (!nodeActions) return true;
		const ops = nodeActions[resource ?? OPERATION_ONLY];
		if (!ops) return false;
		return ops.includes(operation);
	}

	function isNodeTypeVersionSupported(nodeName: string, typeVersion: number): boolean {
		const minVersion =
			config.value?.minNodeTypeVersion?.[nodeName] ??
			config.value?.minNodeTypeVersion?.[stripToolSuffix(nodeName)];
		if (minVersion === undefined) return true;
		return typeVersion >= minVersion;
	}

	function hasGatewayManagedCredential(node: INode | null): node is INode {
		if (!node?.credentials) return false;
		return Object.values(node.credentials).some((cred) => cred.__aiGatewayManaged === true);
	}

	function isNodePropertyHidden(node: INode | null, propertyName: string): boolean {
		if (!hasGatewayManagedCredential(node)) return false;

		const properties =
			config.value?.hiddenNodeProperties?.[node.type] ??
			config.value?.hiddenNodeProperties?.[stripToolSuffix(node.type)];
		if (!properties) return false;
		return properties.includes(propertyName);
	}

	/**
	 * Whether a `resource`/`operation` dropdown option should be shown for a
	 * gateway-managed node. Same permissive defaults as `isActionSupported`.
	 * Resources are only filtered for nodes with resource-keyed actions;
	 * operation-only nodes keep every resource. Operation filtering assumes
	 * top-level `resource`/`operation` params (not nested under a collection path).
	 */
	function isActionOptionVisible(
		node: INode | null,
		parameterName: string,
		optionValue: string,
	): boolean {
		if (parameterName !== 'resource' && parameterName !== 'operation') return true;
		if (!hasGatewayManagedCredential(node)) return true;

		const nodeActions =
			config.value?.supportedActions?.[node.type] ??
			config.value?.supportedActions?.[stripToolSuffix(node.type)];
		if (!nodeActions) return true;

		if (parameterName === 'resource') {
			const resourceKeys = Object.keys(nodeActions).filter((key) => key !== OPERATION_ONLY);
			if (resourceKeys.length === 0) return true;
			return resourceKeys.includes(optionValue);
		}

		const resource = node.parameters?.resource as string | undefined;
		return isActionSupported(node.type, resource, optionValue);
	}

	return {
		config,
		balance,
		budget,
		usageEntries,
		usageTotal,
		fetchError,
		fetchConfig,
		fetchWallet,
		fetchUsage,
		fetchMoreUsage,
		isNodeSupported,
		isNodeTypeVersionSupported,
		isCredentialTypeSupported,
		isActionSupported,
		isActionOptionVisible,
		isNodePropertyHidden,
	};
});
