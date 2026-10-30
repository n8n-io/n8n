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
		const policyProject = shallowRef<Project | null>(null);
		const requestedProjectId = ref<string | null>(null);
		const isLoading = ref(false);
		let latestRequest = 0;

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

		async function fetchForProject(projectId: string): Promise<void> {
			if (!isEnabled.value) return;

			requestedProjectId.value = projectId;
			latestRequest++;

			if (projectId === loadedProjectId.value) {
				isLoading.value = false;
				return;
			}

			await load(projectId);
		}

		/** Refetches the current project after the server's node set changed. */
		async function reload(): Promise<void> {
			if (!isEnabled.value || requestedProjectId.value === null) return;

			await load(requestedProjectId.value);
		}

		/**
		 * Loads both kinds together. A credential-only node's answer composes the two, so they
		 * must describe the same project at the same time: either both maps are the project's or
		 * neither is.
		 */
		async function load(projectId: string): Promise<void> {
			const request = ++latestRequest;
			isLoading.value = true;
			try {
				const [nodeTypes, credentialTypes, project] = await Promise.all([
					fetchAvailableTypes(rootStore.restApiContext, projectId),
					fetchAvailableCredentialTypes(rootStore.restApiContext, projectId),
					getProject(rootStore.restApiContext, projectId).catch(() => null),
				]);
				if (request !== latestRequest) return;

				restrictedNodeTypes.value = unavailableByName(nodeTypes);
				restrictedCredentialTypes.value = unavailableByName(credentialTypes);
				policyProject.value = project;
				loadedProjectId.value = projectId;
			} catch (error) {
				if (request !== latestRequest) return;

				console.error('Failed to fetch available types for project', projectId, error);
				restrictedNodeTypes.value = new Map();
				restrictedCredentialTypes.value = new Map();
				policyProject.value = null;
				loadedProjectId.value = null;
			} finally {
				if (request === latestRequest) isLoading.value = false;
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
			latestRequest++;
			subWorkflowGeneration++;
			subWorkflowChecks.clear();
			failedSubWorkflowChecks.clear();
			subWorkflowRequests.clear();
			restrictedNodeTypes.value = new Map();
			restrictedCredentialTypes.value = new Map();
			policyProject.value = null;
			loadedProjectId.value = null;
			requestedProjectId.value = null;
			isLoading.value = false;
		}

		return {
			isEnabled,
			isLoading,
			loadedProjectId,
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
