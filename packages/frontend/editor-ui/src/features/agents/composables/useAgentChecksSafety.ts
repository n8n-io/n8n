import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import { connectedNames } from '../utils/agentChecks.utils';
import { getAgentConfig } from './useAgentApi';

const NAMED = 2;

// Shared by every practice surface on the page: the card and the Checks tab show the same line.
const names = ref<string[]>([]);
let loadedFor = '';

/**
 * The safety line for practice runs: names the channels and tools the agent
 * won't really use, or says it generally when it has none.
 */
export function useAgentChecksSafety() {
	const i18n = useI18n();
	const rootStore = useRootStore();
	const nodeTypesStore = useNodeTypesStore();

	const load = async (projectId: string, agentId: string, { force = false } = {}) => {
		if (loadedFor === agentId && !force) return;
		loadedFor = agentId;
		try {
			const config = await getAgentConfig(rootStore.restApiContext, projectId, agentId);
			names.value = connectedNames(
				config,
				(nodeType) => nodeTypesStore.getNodeType(nodeType)?.displayName,
			);
		} catch {
			// Without the config the general line still tells the truth.
			names.value = [];
		}
	};

	const line = computed(() => {
		const list = names.value;
		if (list.length === 0) return i18n.baseText('agents.builder.agentChecks.safety.none');
		const named =
			list.length === 1
				? list[0]
				: list.length === NAMED
					? i18n.baseText('agents.builder.agentChecks.safety.two', {
							interpolate: { first: list[0], second: list[1] },
						})
					: i18n.baseText('agents.builder.agentChecks.safety.more', {
							interpolate: {
								names: list.slice(0, NAMED).join(', '),
								count: String(list.length - NAMED),
							},
						});
		return i18n.baseText('agents.builder.agentChecks.safety.named', {
			interpolate: { names: named },
		});
	});

	return { line, load };
}
