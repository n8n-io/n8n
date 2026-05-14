import {
	App as McpApp,
	applyDocumentTheme,
	applyHostFonts,
	applyHostStyleVariables,
	type McpUiHostContext,
	type McpUiTheme,
} from '@modelcontextprotocol/ext-apps';
import { createApp } from 'vue';

import RootApp from './App.vue';
import './styles.css';

const mcp = new McpApp({ name: 'Credential Setup', version: '0.1.0' });
const app = createApp(RootApp, { mcp });
const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');

applyDocumentTheme(getPreferredTheme());

mcp.onhostcontextchanged = applyHostContext;

app.mount('#app');

void mcp.connect().then(() => applyHostContext(mcp.getHostContext()));

colorScheme.addEventListener('change', () => {
	if (!mcp.getHostContext()?.theme) applyDocumentTheme(getPreferredTheme());
});

function applyHostContext(context: McpUiHostContext | undefined) {
	applyDocumentTheme(context?.theme ?? getPreferredTheme());

	if (context?.styles?.variables) {
		applyHostStyleVariables(context.styles.variables);
	}

	if (context?.styles?.css?.fonts) {
		applyHostFonts(context.styles.css.fonts);
	}
}

function getPreferredTheme(): McpUiTheme {
	return colorScheme.matches ? 'dark' : 'light';
}
