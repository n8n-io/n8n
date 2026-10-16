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

/** Only the unavailable entries of one project, for both kinds. */
type ProjectRestrictions = {
	nodeTypes: ReadonlyMap<string, NodeTypeAvailability>;
	credentialTypes: ReadonlyMap<string, CredentialTypeAvailability>;
};

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

		const restrictionsByProject = shallowRef<ReadonlyMap<string, ProjectRestrictions>>(new Map());
		/** The project that lookups without an explicit project answer for. */
		const activeProjectId = ref<string | null>(null);
		const latestRequestByProject = new Map<string, number>();
		const inFlightByProject = new Map<string, Promise<void>>();
		let requestCount = 0;

		const isEnabled = computed(
			() => settingsStore.isModuleActive(TYPE_AVAILABILITY_POLICIES_MODULE_ID) ?? false,
		);

		/**
		 * Makes `projectId` the active project and loads it. A project that is already loaded
		 * keeps answering while a switch back to it refreshes the answer.
		 */
		async function fetchForProject(projectId: string): Promise<void> {
			if (!isEnabled.value) return;

			const isSwitch = activeProjectId.value !== projectId;
			activeProjectId.value = projectId;

			const inFlight = inFlightByProject.get(projectId);
			if (inFlight) {
				await inFlight;
				return;
			}
			if (restrictionsByProject.value.has(projectId) && !isSwitch) return;

			await load(projectId);
		}

		/** Refetches the active project after the server's node set changed. */
		async function reload(): Promise<void> {
			if (!isEnabled.value || activeProjectId.value === null) return;

			const projectId = activeProjectId.value;
			setRestrictions((all) => {
				for (const id of all.keys()) {
					if (id !== projectId) all.delete(id);
				}
			});
			await load(projectId);
		}

		/**
		 * Loads both kinds together. A credential-only node's answer composes the two, so they
		 * must describe the same project at the same time: either both maps are the project's or
		 * neither is.
		 */
		async function load(projectId: string): Promise<void> {
			const request = ++requestCount;
			latestRequestByProject.set(projectId, request);
			const isLatest = () => latestRequestByProject.get(projectId) === request;

			const pending = (async () => {
				try {
					const [nodeTypes, credentialTypes] = await Promise.all([
						fetchAvailableTypes(rootStore.restApiContext, projectId),
						fetchAvailableCredentialTypes(rootStore.restApiContext, projectId),
					]);
					if (!isLatest()) return;

					setRestrictions((all) =>
						all.set(projectId, {
							nodeTypes: unavailableByName(nodeTypes),
							credentialTypes: unavailableByName(credentialTypes),
						}),
					);
				} catch (error) {
					if (!isLatest()) return;

					console.error('Failed to fetch available types for project', projectId, error);
					setRestrictions((all) => all.delete(projectId));
				} finally {
					if (isLatest()) {
						latestRequestByProject.delete(projectId);
						inFlightByProject.delete(projectId);
					}
				}
			})();

			inFlightByProject.set(projectId, pending);
			await pending;
		}

		function setRestrictions(update: (all: Map<string, ProjectRestrictions>) => void): void {
			const next = new Map(restrictionsByProject.value);
			update(next);
			restrictionsByProject.value = next;
		}

		/** The load in flight for the project, so a caller can check once the answer arrives. */
		function pendingLoad(projectId?: string): Promise<void> | undefined {
			const id = projectId ?? activeProjectId.value;
			return id === null ? undefined : inFlightByProject.get(id);
		}

		function restrictionsFor(projectId?: string): ProjectRestrictions | undefined {
			const id = projectId ?? activeProjectId.value;
			return id === null ? undefined : restrictionsByProject.value.get(id);
		}

		function getNodeTypeAvailability(name: string, projectId?: string): NodeTypeAvailability {
			return restrictionsFor(projectId)?.nodeTypes.get(name) ?? { name, available: true };
		}

		function isNodeTypeAvailable(name: string, projectId?: string): boolean {
			return getNodeTypeAvailability(name, projectId).available;
		}

		function getCredentialTypeAvailability(
			name: string,
			projectId?: string,
		): CredentialTypeAvailability {
			return restrictionsFor(projectId)?.credentialTypes.get(name) ?? { name, available: true };
		}

		function reset(): void {
			latestRequestByProject.clear();
			inFlightByProject.clear();
			restrictionsByProject.value = new Map();
			activeProjectId.value = null;
		}

		return {
			isEnabled,
			activeProjectId,
			fetchForProject,
			reload,
			pendingLoad,
			getNodeTypeAvailability,
			isNodeTypeAvailable,
			getCredentialTypeAvailability,
			reset,
		};
	},
);
