<script setup lang="ts">
import {
	App,
	applyDocumentTheme,
	applyHostFonts,
	applyHostStyleVariables,
	type McpUiHostContext,
} from '@modelcontextprotocol/ext-apps';
import { N8nButton, N8nIcon, N8nSpinner } from '@n8n/design-system';
import { computed, onMounted, ref, shallowRef, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';

import { isAllowedWorkflowUrl } from './url';
import { setLocaleFromHost, type MessageSchema } from '../../i18n';

type WorkflowResult = {
	url?: unknown;
};

function isWorkflowResult(value: unknown): value is WorkflowResult {
	return typeof value === 'object' && value !== null;
}

const { t } = useI18n<{ message: MessageSchema }>({ useScope: 'global' });

const hostContext = ref<McpUiHostContext>();
const workflowUrl = ref<string>();
const appRef = shallowRef<App>();

const ariaLabel = computed(() =>
	workflowUrl.value
		? t('workflowPreview.ariaLabel.ready')
		: t('workflowPreview.ariaLabel.creating'),
);

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

async function handleOpenWorkflow() {
	const app = appRef.value;
	const url = workflowUrl.value;
	if (!app || !url) return;

	if (!isAllowedWorkflowUrl(url)) {
		console.warn('[n8n MCP App] Refusing to open unexpected workflow URL', { url });
		return;
	}

	try {
		const result = await app.openLink({ url });
		if (result.isError) {
			console.warn('[n8n MCP App] Host denied open-link request', { url });
		}
	} catch (error) {
		console.error('[n8n MCP App] Failed to open workflow link', error);
	}
}

onMounted(async () => {
	const app = new App({ name: 'n8n Workflow Creation', version: '0.1.0' });
	appRef.value = app;

	app.onhostcontextchanged = (params) => {
		hostContext.value = { ...hostContext.value, ...params };
	};

	app.ontoolresult = (params) => {
		const { structuredContent } = params;
		const candidate = isWorkflowResult(structuredContent) ? structuredContent.url : undefined;
		if (isAllowedWorkflowUrl(candidate)) {
			workflowUrl.value = candidate;
			return;
		}
		if (candidate !== undefined) {
			console.warn('[n8n MCP App] Ignoring unexpected workflow URL in tool result', {
				url: candidate,
			});
		}
		// Drop any prior URL so the button can't navigate to a stale workflow
		// after a tool re-run that produced an invalid result.
		workflowUrl.value = undefined;
	};

	app.onerror = console.error;

	try {
		await app.connect();
		hostContext.value = app.getHostContext();
	} catch (error) {
		console.error('[n8n MCP App] Failed to connect to host', error);
	}
});
</script>

<template>
	<main class="container" :aria-busy="!workflowUrl" :aria-label="ariaLabel">
		<N8nButton
			v-if="workflowUrl"
			class="open-button"
			variant="solid"
			size="medium"
			@click="handleOpenWorkflow"
		>
			{{ t('workflowPreview.openButton') }}
			<template #icon>
				<N8nIcon icon="arrow-up-right" />
			</template>
		</N8nButton>
		<N8nSpinner v-else type="ring" />
	</main>
</template>

<style scoped lang="scss">
@use '@n8n/design-system/css/mixins/motion';

.container {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--xl);
}

.open-button {
	@include motion.fade-in-up;
}
</style>
