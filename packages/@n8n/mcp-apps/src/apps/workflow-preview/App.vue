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

type WorkflowResult = {
	url?: unknown;
	name?: unknown;
};

const hostContext = ref<McpUiHostContext>();
const workflowUrl = ref<string>();
const appRef = shallowRef<App>();

const ariaLabel = computed(() =>
	workflowUrl.value ? 'Workflow ready to open' : 'Creating workflow',
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
});

function readWorkflowResult(structured: unknown): WorkflowResult | undefined {
	if (typeof structured !== 'object' || structured === null) return undefined;
	return structured as WorkflowResult;
}

async function handleOpenWorkflow() {
	const app = appRef.value;
	const url = workflowUrl.value;
	if (!app || !url) return;

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
		const result = readWorkflowResult(params.structuredContent);
		if (typeof result?.url === 'string') {
			workflowUrl.value = result.url;
		}
	};

	app.onerror = console.error;

	await app.connect();
	hostContext.value = app.getHostContext();
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
			Open in n8n
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
	min-height: 100vh;
	padding: var(--spacing--xl);
}

.open-button {
	@include motion.fade-in-up;
}
</style>
