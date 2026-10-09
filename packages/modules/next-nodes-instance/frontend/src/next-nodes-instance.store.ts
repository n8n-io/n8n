import type { NextNodeInstanceVersion, NextNodeParent } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import * as api from './next-nodes-instance.api';
import type { HttpActionConfig } from './next-nodes-instance.config';

/** The versions of one action, newest first. */
export interface InstanceAction {
	readonly actionId: string;
	readonly newest: NextNodeInstanceVersion;
	readonly versions: readonly NextNodeInstanceVersion[];
}

export const useNextNodesInstanceStore = defineStore('nextNodesInstance', () => {
	const rootStore = useRootStore();

	const versions = ref<NextNodeInstanceVersion[]>([]);

	/** The server lists the versions newest first, so the first of each id is its newest. */
	const actions = computed<InstanceAction[]>(() =>
		[...new Set(versions.value.map(({ actionId }) => actionId))].flatMap((actionId) => {
			const own = versions.value.filter((version) => version.actionId === actionId);
			const newest = own[0];
			return newest ? [{ actionId, newest, versions: own }] : [];
		}),
	);

	async function fetchVersions() {
		versions.value = await api.listVersions(rootStore.restApiContext);
	}

	const parents = ref<NextNodeParent[]>([]);

	async function fetchParents() {
		parents.value = await api.listParents(rootStore.restApiContext);
	}

	async function configOf(actionId: string) {
		return await api.actionConfig(rootStore.restApiContext, actionId);
	}

	async function hide(actionId: string) {
		await api.hideAction(rootStore.restApiContext, actionId);
		await fetchVersions();
	}

	async function test(
		config: HttpActionConfig,
		params: Record<string, string | number | boolean>,
		credentialId?: string,
	) {
		return await api.testDraft(rootStore.restApiContext, config, params, credentialId);
	}

	async function publish(config: HttpActionConfig, fixture?: Record<string, unknown>) {
		const published = await api.publishVersion(rootStore.restApiContext, config, fixture);
		await fetchVersions();
		return published;
	}

	async function importOpenApi(document: string) {
		const imported = await api.importOpenApi(rootStore.restApiContext, document);
		await fetchVersions();
		return imported;
	}

	return {
		versions,
		actions,
		parents,
		fetchVersions,
		fetchParents,
		configOf,
		hide,
		test,
		publish,
		importOpenApi,
	};
});
