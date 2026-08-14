import {
	applyDocumentTheme,
	applyHostFonts,
	applyHostStyleVariables,
	type McpUiHostContext,
} from '@modelcontextprotocol/ext-apps';
import type { Ref } from 'vue';
import { watchEffect } from 'vue';

import { setLocaleFromHost } from '@mcp-apps/i18n';

export function useMcpHostContextStyles(hostContext: Ref<McpUiHostContext | undefined>) {
	watchEffect(() => {
		const context = hostContext.value;

		if (context?.theme) {
			applyDocumentTheme(context.theme);
		}

		if (context?.styles?.variables) {
			applyHostStyleVariables(context.styles.variables);
		}

		if (context?.styles?.css?.fonts) {
			applyHostFonts(context.styles.css.fonts);
		}

		setLocaleFromHost(context?.locale);
	});
}
