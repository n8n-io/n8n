import type { AgentEmailProvisionResponse } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { readonly, ref } from 'vue';

import type { AgentChannelRuntime, AgentChannelRuntimeContext } from '../types';
import { provisionAgentEmail } from './api';

export interface EmailChannelRuntime extends AgentChannelRuntime {
	provision: () => Promise<AgentEmailProvisionResponse>;
}

export function isEmailChannelRuntime(
	runtime: AgentChannelRuntime,
): runtime is EmailChannelRuntime {
	return 'provision' in runtime;
}

export function useEmailChannelRuntime(context: AgentChannelRuntimeContext): EmailChannelRuntime {
	const rootStore = useRootStore();
	const loading = ref(false);

	async function provision(): Promise<AgentEmailProvisionResponse> {
		await context.ensureAgentPersisted?.();
		loading.value = true;
		try {
			const channel = await provisionAgentEmail(
				rootStore.restApiContext,
				context.projectId.value,
				context.agentId.value,
			);
			await context.fetchStatus(['email']);
			return channel;
		} finally {
			loading.value = false;
		}
	}

	return {
		load: async () => {},
		loading: readonly(loading),
		provision,
	};
}
