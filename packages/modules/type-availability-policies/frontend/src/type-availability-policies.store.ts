import type { NodeTypeAvailability } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import {
	TYPE_AVAILABILITY_POLICIES_MODULE_ID,
	TYPE_AVAILABILITY_POLICIES_STORE_ID,
} from './type-availability-policies.constants';

/** The answer for a type no policy covers. Policies deny; they never allow by default. */
const availableByDefault = (name: string): NodeTypeAvailability => ({ name, available: true });

export const useTypeAvailabilityPoliciesStore = defineStore(
	TYPE_AVAILABILITY_POLICIES_STORE_ID,
	() => {
		const settingsStore = useSettingsStore();

		/**
		 * The whole module gate. `isModuleActive` reads `settings.activeModules`, which the
		 * backend fills only for an instance that is licensed for `feat:nodeTypePolicies` and
		 * lists the module in `N8N_ENABLED_MODULES`.
		 *
		 * There is no second level. The two-level pattern reads
		 * `settingsStore.moduleSettings[id]?.enabled` from `/rest/module-settings`, but the
		 * backend module publishes no client settings and `FrontendModuleSettings` has no key
		 * for this module, so that read does not even typecheck. Add both halves together if a
		 * later ticket needs per-instance configuration.
		 *
		 * Read through this computed, never at module scope: the shell imports the descriptor
		 * before `getSettings()` resolves, and `/rest/module-settings` is `{}` until login.
		 */
		const isEnabled = computed(() =>
			settingsStore.isModuleActive(TYPE_AVAILABILITY_POLICIES_MODULE_ID),
		);

		/**
		 * Node-type availability for the project in `cachedProjectId`, keyed by type name.
		 * Named by kind on purpose: the backend serves node types and credential types from
		 * separate controllers, so a credential-type cache is an addition, not a reshape.
		 */
		const nodeTypeAvailability = ref(new Map<string, NodeTypeAvailability>());

		/** The project the cache belongs to. GOV-49 refills the cache when this changes. */
		const cachedProjectId = ref<string | null>(null);

		/**
		 * Fail open. A disabled module, an empty cache and a failed request must all read as
		 * "available". A policy UI that hides nodes when it cannot reach its data is worse than
		 * one that shows a node the backend later rejects.
		 */
		function getNodeTypeAvailability(typeName: string): NodeTypeAvailability {
			if (!isEnabled.value) return availableByDefault(typeName);

			return nodeTypeAvailability.value.get(typeName) ?? availableByDefault(typeName);
		}

		function isNodeTypeAvailable(typeName: string): boolean {
			return getNodeTypeAvailability(typeName).available;
		}

		/** Replaces the cache with one project's answer. GOV-49 calls this after a fetch. */
		function setNodeTypeAvailability(projectId: string, entries: NodeTypeAvailability[]): void {
			nodeTypeAvailability.value = new Map(entries.map((entry) => [entry.name, entry]));
			cachedProjectId.value = projectId;
		}

		/** Drops the cache. Every type then reads as available again. */
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
