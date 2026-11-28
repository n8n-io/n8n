import { ref, watch, type Ref } from 'vue';
import type { ToolTestCapability } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';

import { getAgentTestRunTools } from './useAgentApi';

export interface UseAgentTestRunToolsOptions {
	projectId: Ref<string>;
	agentId: Ref<string>;
	enabled: Ref<boolean>;
	/** Reactive fingerprint of the agent's tools so edits re-check testability. */
	configKey?: Ref<string>;
}

/**
 * Fetches tool testability for an agent's safe-testing run before the first message.
 * Silently returns an empty list if the backend flag is off (404) or the request fails.
 */
export function useAgentTestRunTools(options: UseAgentTestRunToolsOptions) {
	const rootStore = useRootStore();
	const tools = ref<ToolTestCapability[]>([]);
	const isLoading = ref(false);
	let requestVersion = 0;

	async function refresh(): Promise<void> {
		const version = ++requestVersion;
		if (!options.enabled.value || !options.projectId.value || !options.agentId.value) {
			tools.value = [];
			isLoading.value = false;
			return;
		}

		isLoading.value = true;
		try {
			const response = await getAgentTestRunTools(
				rootStore.restApiContext,
				options.projectId.value,
				options.agentId.value,
			);
			if (version !== requestVersion) return;
			tools.value = Array.isArray(response.tools) ? response.tools : [];
		} catch {
			if (version !== requestVersion) return;
			tools.value = [];
		} finally {
			if (version === requestVersion) {
				isLoading.value = false;
			}
		}
	}

	watch(
		[options.enabled, options.projectId, options.agentId, () => options.configKey?.value],
		() => {
			void refresh();
		},
		{ immediate: true },
	);

	return {
		tools,
		isLoading,
		refresh,
	};
}
