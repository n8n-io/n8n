import { App, type McpUiHostContext } from '@modelcontextprotocol/ext-apps';
import { onMounted, ref, shallowRef } from 'vue';

type UseMcpHostAppOptions = {
	name: string;
	version: string;
};

export function useMcpHostApp({ name, version }: UseMcpHostAppOptions) {
	const app = shallowRef<App>();
	const hostContext = ref<McpUiHostContext>();
	const toolResult = shallowRef<unknown>();

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
		} catch (error) {
			console.error('[n8n MCP App] Failed to connect to host', error);
		}
	});

	return {
		app,
		hostContext,
		toolResult,
	};
}
