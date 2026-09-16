import type { NodeTypeAvailability } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';

import { fetchAvailableTypes } from './type-availability-policies.api';
import {
	TYPE_AVAILABILITY_POLICIES_MODULE_ID,
	TYPE_AVAILABILITY_POLICIES_STORE_ID,
} from './type-availability-policies.constants';

export const useTypeAvailabilityPoliciesStore = defineStore(
	TYPE_AVAILABILITY_POLICIES_STORE_ID,
	() => {
		const rootStore = useRootStore();
		const settingsStore = useSettingsStore();

		const restrictedNodeTypes = shallowRef<ReadonlyMap<string, NodeTypeAvailability>>(new Map());
		const loadedProjectId = ref<string | null>(null);
		const requestedProjectId = ref<string | null>(null);
		const isLoading = ref(false);

		const isEnabled = computed(
			() => settingsStore.isModuleActive(TYPE_AVAILABILITY_POLICIES_MODULE_ID) ?? false,
		);

		async function fetchForProject(projectId: string): Promise<void> {
			if (!isEnabled.value) return;

			requestedProjectId.value = projectId;

			if (projectId === loadedProjectId.value) {
				isLoading.value = false;
				return;
			}

			isLoading.value = true;
			try {
				const entries = await fetchAvailableTypes(rootStore.restApiContext, projectId);
				if (requestedProjectId.value !== projectId) return;

				restrictedNodeTypes.value = new Map(
					entries.filter((entry) => !entry.available).map((entry) => [entry.name, entry]),
				);
				loadedProjectId.value = projectId;
			} catch (error) {
				if (requestedProjectId.value !== projectId) return;

				console.error('Failed to fetch available types for project', projectId, error);
				restrictedNodeTypes.value = new Map();
				loadedProjectId.value = null;
			} finally {
				if (requestedProjectId.value === projectId) isLoading.value = false;
			}
		}

		function getNodeTypeAvailability(name: string): NodeTypeAvailability {
			if (loadedProjectId.value !== requestedProjectId.value) return { name, available: true };

			return restrictedNodeTypes.value.get(name) ?? { name, available: true };
		}

		function isNodeTypeAvailable(name: string): boolean {
			return getNodeTypeAvailability(name).available;
		}

		function reset(): void {
			restrictedNodeTypes.value = new Map();
			loadedProjectId.value = null;
			requestedProjectId.value = null;
			isLoading.value = false;
		}

		return {
			isEnabled,
			isLoading,
			loadedProjectId,
			fetchForProject,
			getNodeTypeAvailability,
			isNodeTypeAvailable,
			reset,
		};
	},
);
