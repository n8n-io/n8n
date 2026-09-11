import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, type Ref } from 'vue';

import type { AgentChannelRuntime, AgentChannelRuntimeContext } from '../types';
import { generateOpenAiCompatibleKey, regenerateOpenAiCompatibleKey } from './api';

export interface OpenAiCompatibleChannelRuntime extends AgentChannelRuntime {
	/** The plaintext key, present only right after `connect`/`regenerate`; never re-fetched. */
	apiKey: Ref<string | null>;
	/**
	 * Opaque id of the integration entry created by `connect`. The setup flow
	 * uses it to roll the entry back if the user closes without confirming.
	 */
	connectionId: Ref<string | null>;
	baseUrl: Ref<string>;
	connect: () => Promise<void>;
	regenerate: () => Promise<void>;
}

export function isOpenAiCompatibleChannelRuntime(
	runtime: AgentChannelRuntime,
): runtime is OpenAiCompatibleChannelRuntime {
	return 'apiKey' in runtime;
}

/**
 * One runtime factory shared by the `openwebui` and `librechat` registry
 * entries (see agent-connection-channels.md 5.4): same backend endpoints,
 * `type` is the only thing that differs between the two rows.
 */
export function useOpenAiCompatibleChannelRuntime(
	context: AgentChannelRuntimeContext,
	type: string,
): OpenAiCompatibleChannelRuntime {
	const rootStore = useRootStore();
	const loading = ref(false);
	const apiKey = ref<string | null>(null);
	const connectionId = ref<string | null>(null);

	// This is a plain REST endpoint OpenWebUI/LibreChat call directly, not a
	// webhook: `urlBaseWebhook` can point at a different public domain than
	// the API in a reverse-proxied deployment (n8n's WEBHOOK_URL), so the
	// correct base is the REST API URL (`restUrl` = `baseUrl` + `restEndpoint`,
	// e.g. `.../rest`), not the webhook one. `restUrl` itself can be a bare
	// path (`baseUrl` defaults to `window.BASE_PATH` for same-origin
	// deployments, resolved fine by the app's own XHR calls but useless
	// pasted into an external tool with no "current origin" of its own), so
	// prepend the actual browser origin unless it's already absolute.
	const baseUrl = computed(() => {
		const rest = rootStore.restUrl.replace(/\/$/, '');
		const absoluteRest = /^https?:\/\//.test(rest) ? rest : `${window.location.origin}${rest}`;
		return `${absoluteRest}/projects/${context.projectId.value}/agents/v2/${context.agentId.value}/openai/v1`;
	});

	async function load() {}

	async function connect(): Promise<void> {
		loading.value = true;
		try {
			await context.ensureAgentPersisted?.();
			const result = await generateOpenAiCompatibleKey(
				rootStore.restApiContext,
				context.projectId.value,
				context.agentId.value,
				type,
			);
			apiKey.value = result.apiKey;
			connectionId.value = result.connectionId;
			await context.fetchStatus([type]);
		} finally {
			loading.value = false;
		}
	}

	async function regenerate(): Promise<void> {
		loading.value = true;
		try {
			const result = await regenerateOpenAiCompatibleKey(
				rootStore.restApiContext,
				context.projectId.value,
				context.agentId.value,
				type,
			);
			apiKey.value = result.apiKey;
			connectionId.value = result.connectionId;
		} finally {
			loading.value = false;
		}
	}

	return {
		load,
		loading: computed(() => loading.value),
		apiKey,
		connectionId,
		baseUrl,
		connect,
		regenerate,
	};
}
