import type {
	SaveSelfHealingConfigurationDto,
	SelfHealingConfigurationDto,
	SelfHealingConfigurationOptions,
	UpdateSelfHealingConfigurationDto,
} from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import * as api from './self-healing.api';

export const useSelfHealingStore = defineStore('selfHealing', () => {
	const root = useRootStore();
	const configurations = ref<Record<string, SelfHealingConfigurationDto[]>>({});
	const options = ref<Record<string, SelfHealingConfigurationOptions>>({});
	// Only the latest pending load can replace a project's saved state.
	const pendingLoads = new Map<string, symbol>();

	async function load(projectId: string) {
		const request = Symbol();
		pendingLoads.set(projectId, request);

		const [rows, choices] = await Promise.all([
			api.fetchConfigurations(root.restApiContext, projectId),
			api.fetchConfigurationOptions(root.restApiContext, projectId),
		]);

		if (pendingLoads.get(projectId) !== request) return;
		pendingLoads.delete(projectId);

		configurations.value[projectId] = rows;
		options.value[projectId] = choices;
	}

	function remember(projectId: string, configuration: SelfHealingConfigurationDto) {
		pendingLoads.delete(projectId);
		const rows = configurations.value[projectId] ?? [];
		configurations.value[projectId] = rows.some(({ id }) => id === configuration.id)
			? rows.map((row) => (row.id === configuration.id ? configuration : row))
			: [...rows, configuration];
	}

	async function save(
		projectId: string,
		input: SaveSelfHealingConfigurationDto | UpdateSelfHealingConfigurationDto,
		id?: number,
	) {
		const configuration = await api.saveConfiguration(root.restApiContext, projectId, input, id);
		remember(projectId, configuration);

		return configuration;
	}

	async function setEnabled(projectId: string, id: number, enabled: boolean) {
		const configuration = await api.setConfigurationEnabled(
			root.restApiContext,
			projectId,
			id,
			enabled,
		);
		remember(projectId, configuration);
	}

	async function remove(projectId: string, id: number) {
		await api.removeConfiguration(root.restApiContext, projectId, id);
		pendingLoads.delete(projectId);

		configurations.value[projectId] = (configurations.value[projectId] ?? []).filter(
			(row) => row.id !== id,
		);
	}

	return { configurations, options, load, save, setEnabled, remove };
});
