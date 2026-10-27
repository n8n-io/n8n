import { App, type McpUiHostContext } from '@modelcontextprotocol/ext-apps';
import type { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { onMounted, ref, shallowRef } from 'vue';

type UseMcpHostAppOptions = {
	name: string;
	version: string;
};

export type McpHostConnectionStatus = 'pending' | 'connected' | 'failed';

export function useMcpHostApp({ name, version }: UseMcpHostAppOptions) {
	const app = shallowRef<App>();
	const hostContext = ref<McpUiHostContext>();
	const toolResult = shallowRef<unknown>();
	const connectionStatus = ref<McpHostConnectionStatus>('pending');
	const connectionError = shallowRef<unknown>();
	const hostVersion = shallowRef<Implementation>();
	const bootMs = ref<number>();

	onMounted(async () => {
		const mcpApp = new App({ name, version });
		app.value = mcpApp;

		mcpApp.onhostcontextchanged = (params) => {
			hostContext.value = { ...hostContext.value, ...params };
		};

		mcpApp.ontoolresult = (params) => {
			toolResult.value = params.structuredContent;
		};

		mcpApp.onerror = console.error;

		try {
			await mcpApp.connect();
			hostContext.value = mcpApp.getHostContext();
			hostVersion.value = mcpApp.getHostVersion();
			bootMs.value = Math.round(performance.now());
			connectionStatus.value = 'connected';
		} catch (error) {
			connectionError.value = error;
			bootMs.value = Math.round(performance.now());
			connectionStatus.value = 'failed';
			console.error('[n8n MCP App] Failed to connect to host', error);
		}
	});

	return {
		app,
		bootMs,
		connectionError,
		connectionStatus,
		hostVersion,
		hostContext,
		toolResult,
	};
}
