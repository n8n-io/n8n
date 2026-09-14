import type { NodeTypeAvailability } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import {
	TYPE_AVAILABILITY_POLICIES_MODULE_ID,
	TYPE_AVAILABILITY_POLICIES_STORE_ID,
} from './type-availability-policies.constants';

const availableByDefault = (name: string): NodeTypeAvailability => ({ name, available: true });

export const useTypeAvailabilityPoliciesStore = defineStore(
	TYPE_AVAILABILITY_POLICIES_STORE_ID,
	() => {
		const settingsStore = useSettingsStore();

		const isEnabled = computed(() =>
			settingsStore.isModuleActive(TYPE_AVAILABILITY_POLICIES_MODULE_ID),
		);

		const nodeTypeAvailability = ref(new Map<string, NodeTypeAvailability>());
		const cachedProjectId = ref<string | null>(null);

		/**
		 * Fail open. A disabled module, an empty cache and a failed request all read as
		 * available: hiding nodes when the policy data is unreachable is worse than showing
		 * a node the backend later rejects.
		 */
		function getNodeTypeAvailability(typeName: string): NodeTypeAvailability {
			if (!isEnabled.value) return availableByDefault(typeName);

			return nodeTypeAvailability.value.get(typeName) ?? availableByDefault(typeName);
		}

		function isNodeTypeAvailable(typeName: string): boolean {
			return getNodeTypeAvailability(typeName).available;
		}

		function setNodeTypeAvailability(projectId: string, entries: NodeTypeAvailability[]): void {
			nodeTypeAvailability.value = new Map(entries.map((entry) => [entry.name, entry]));
			cachedProjectId.value = projectId;
		}

		function reset(): void {
			nodeTypeAvailability.value = new Map();
			cachedProjectId.value = null;
		}

		return {
			isEnabled,
			cachedProjectId,
			getNodeTypeAvailability,
			isNodeTypeAvailable,
			setNodeTypeAvailability,
			reset,
		};
	},
);
