import type { CredentialTypeAvailability, NodeTypeAvailability } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';

import {
	fetchAvailableCredentialTypes,
	fetchAvailableTypes,
} from './type-availability-policies.api';
import {
	TYPE_AVAILABILITY_POLICIES_MODULE_ID,
	TYPE_AVAILABILITY_POLICIES_STORE_ID,
} from './type-availability-policies.constants';

function unavailableByName<T extends { name: string; available: boolean }>(
	entries: T[],
): ReadonlyMap<string, T> {
	return new Map(entries.filter((entry) => !entry.available).map((entry) => [entry.name, entry]));
}

export const useTypeAvailabilityPoliciesStore = defineStore(
	TYPE_AVAILABILITY_POLICIES_STORE_ID,
	() => {
		const rootStore = useRootStore();
		const settingsStore = useSettingsStore();

		const restrictedNodeTypes = shallowRef<ReadonlyMap<string, NodeTypeAvailability>>(new Map());
		const restrictedCredentialTypes = shallowRef<ReadonlyMap<string, CredentialTypeAvailability>>(
			new Map(),
		);
		const loadedProjectId = ref<string | null>(null);
		const requestedProjectId = ref<string | null>(null);
		const isLoading = ref(false);

		const isEnabled = computed(
			() => settingsStore.isModuleActive(TYPE_AVAILABILITY_POLICIES_MODULE_ID) ?? false,
		);

		/**
		 * Loads both kinds together. A credential-only node's answer composes the two, so they
		 * must describe the same project at the same time: either both maps are the project's or
		 * neither is.
		 */
		async function fetchForProject(projectId: string): Promise<void> {
			if (!isEnabled.value) return;

			requestedProjectId.value = projectId;

			if (projectId === loadedProjectId.value) {
				isLoading.value = false;
				return;
			}

			isLoading.value = true;
			try {
				const [nodeTypes, credentialTypes] = await Promise.all([
					fetchAvailableTypes(rootStore.restApiContext, projectId),
					fetchAvailableCredentialTypes(rootStore.restApiContext, projectId),
				]);
				if (requestedProjectId.value !== projectId) return;

				restrictedNodeTypes.value = unavailableByName(nodeTypes);
				restrictedCredentialTypes.value = unavailableByName(credentialTypes);
				loadedProjectId.value = projectId;
			} catch (error) {
				if (requestedProjectId.value !== projectId) return;

				console.error('Failed to fetch available types for project', projectId, error);
				restrictedNodeTypes.value = new Map();
				restrictedCredentialTypes.value = new Map();
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

		function getCredentialTypeAvailability(name: string): CredentialTypeAvailability {
			if (loadedProjectId.value !== requestedProjectId.value) return { name, available: true };

			return restrictedCredentialTypes.value.get(name) ?? { name, available: true };
		}

		function isCredentialTypeAvailable(name: string): boolean {
			return getCredentialTypeAvailability(name).available;
		}

		function reset(): void {
			restrictedNodeTypes.value = new Map();
			restrictedCredentialTypes.value = new Map();
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
			getCredentialTypeAvailability,
			isCredentialTypeAvailable,
			reset,
		};
	},
);
