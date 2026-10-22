import type {
	CredentialTypeAvailability,
	NodeTypeAvailability,
	SubWorkflowPolicyCheckResponse,
} from '@n8n/api-types';
import { getProject, ResponseError, type Project } from '@n8n/rest-api-client';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { computed, reactive, ref, shallowRef } from 'vue';

import {
	fetchAvailableCredentialTypes,
	fetchAvailableTypes,
	fetchSubWorkflowPolicyCheck,
} from './type-availability-policies.api';
import {
	TYPE_AVAILABILITY_POLICIES_MODULE_ID,
	TYPE_AVAILABILITY_POLICIES_STORE_ID,
} from './type-availability-policies.constants';

const isRefusal = (error: unknown) =>
	error instanceof ResponseError && (error.httpStatusCode === 404 || error.httpStatusCode === 403);

const subWorkflowCheckKey = (parentWorkflowId: string, subWorkflowId: string) =>
	`${parentWorkflowId}:${subWorkflowId}`;

/** Only the unavailable entries of one project, for both kinds, and the project itself. */
type ProjectRestrictions = {
	nodeTypes: ReadonlyMap<string, NodeTypeAvailability>;
	credentialTypes: ReadonlyMap<string, CredentialTypeAvailability>;
	project: Project | null;
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
		/** The active project's record, so the contact dialog can name its admins. */
		const policyProject = shallowRef<Project | null>(null);
		const latestRequestByProject = new Map<string, number>();
		const inFlightByProject = new Map<string, Promise<void>>();
		let requestCount = 0;

		/**
		 * Keyed by parent and sub-workflow, because the answer depends on whether the parent may
		 * call the sub-workflow. `null` means the call is refused, so there is nothing to show.
		 */
		const subWorkflowChecks = reactive(new Map<string, SubWorkflowPolicyCheckResponse | null>());
		/** Checks that failed to load. They stay out of the cache, so the next fetch retries. */
		const failedSubWorkflowChecks = reactive(new Set<string>());
		const subWorkflowRequests = new Map<string, Promise<void>>();
		let subWorkflowGeneration = 0;

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
			if (isSwitch) syncPolicyProject();

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
					const [nodeTypes, credentialTypes, project] = await Promise.all([
						fetchAvailableTypes(rootStore.restApiContext, projectId),
						fetchAvailableCredentialTypes(rootStore.restApiContext, projectId),
						getProject(rootStore.restApiContext, projectId).catch(() => null),
					]);
					if (!isLatest()) return;

					setRestrictions((all) =>
						all.set(projectId, {
							nodeTypes: unavailableByName(nodeTypes),
							credentialTypes: unavailableByName(credentialTypes),
							project,
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
			syncPolicyProject();
		}

		function syncPolicyProject(): void {
			policyProject.value = restrictionsFor()?.project ?? null;
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

		/**
		 * Loads the policy check for one sub-workflow call. Callers that render the same call share
		 * one request. `force` refetches a loaded answer, for a surface that must be current.
		 */
		async function fetchSubWorkflowCheck(
			parentWorkflowId: string,
			subWorkflowId: string,
			{ force = false }: { force?: boolean } = {},
		): Promise<void> {
			if (!isEnabled.value) return;

			const key = subWorkflowCheckKey(parentWorkflowId, subWorkflowId);
			const pending = subWorkflowRequests.get(key);
			if (pending) return await pending;
			if (!force && subWorkflowChecks.has(key)) return;

			const generation = subWorkflowGeneration;
			const request = fetchSubWorkflowPolicyCheck(
				rootStore.restApiContext,
				parentWorkflowId,
				subWorkflowId,
			)
				.then(
					(check) => ({ loaded: true as const, check }),
					(error: unknown) =>
						// The endpoint answers 404 for a call the caller policy refuses, and 403 when
						// the user may not check the parent. Neither changes until the page reloads.
						isRefusal(error) ? { loaded: true as const, check: null } : { loaded: false as const },
				)
				.then((result) => {
					if (generation !== subWorkflowGeneration) return;

					subWorkflowRequests.delete(key);
					if (result.loaded) {
						subWorkflowChecks.set(key, result.check);
						failedSubWorkflowChecks.delete(key);
					} else {
						subWorkflowChecks.delete(key);
						failedSubWorkflowChecks.add(key);
					}
				});
			subWorkflowRequests.set(key, request);

			await request;
		}

		function getSubWorkflowCheck(
			parentWorkflowId: string,
			subWorkflowId: string,
		): SubWorkflowPolicyCheckResponse | null {
			return subWorkflowChecks.get(subWorkflowCheckKey(parentWorkflowId, subWorkflowId)) ?? null;
		}

		/** The check failed to load, so the editor cannot tell whether a call would be refused. */
		function hasSubWorkflowCheckFailed(parentWorkflowId: string, subWorkflowId: string): boolean {
			return failedSubWorkflowChecks.has(subWorkflowCheckKey(parentWorkflowId, subWorkflowId));
		}

		function reset(): void {
			subWorkflowGeneration++;
			subWorkflowChecks.clear();
			failedSubWorkflowChecks.clear();
			subWorkflowRequests.clear();
			latestRequestByProject.clear();
			inFlightByProject.clear();
			restrictionsByProject.value = new Map();
			activeProjectId.value = null;
			policyProject.value = null;
		}

		return {
			isEnabled,
			activeProjectId,
			policyProject,
			fetchForProject,
			reload,
			getNodeTypeAvailability,
			isNodeTypeAvailable,
			getCredentialTypeAvailability,
			fetchSubWorkflowCheck,
			getSubWorkflowCheck,
			hasSubWorkflowCheckFailed,
			reset,
		};
	},
);
