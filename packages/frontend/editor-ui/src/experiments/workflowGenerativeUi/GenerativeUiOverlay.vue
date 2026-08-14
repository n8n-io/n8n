<script setup lang="ts">
import { useToast } from '@n8n/composables/useToast';
import { N8nText } from '@n8n/design-system';
import { JSONUIProvider, Renderer, type Spec } from '@json-render/vue';
import { computed, toRef, watch } from 'vue';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { injectNDVStoreIfProvided } from '@/features/ndv/shared/ndv.store';
import { followUpReserveStyle } from './followUpReserve';
import { provideGenerativeUiFlowGraph } from './flowGraph';
import { validateGeneratedSpec } from './generate';
import {
	provideGenerativeUiLookOnly,
	provideGenerativeUiNodes,
	provideGenerativeUiOpenNode,
} from './nodeLookup';
import { registry } from './registry';
import { buildWorkflowUiPayload } from './workflowPayload';
import {
	buildFallbackSpec,
	useWorkflowGenerativeUiStore,
	type WorkflowGenerativeUiError,
} from './workflowGenerativeUi.store';

const store = useWorkflowGenerativeUiStore();
const workflowDocumentStore = injectWorkflowDocumentStore();
const ndvStore = injectNDVStoreIfProvided();
const { showToast } = useToast();
const nodes = computed(() => workflowDocumentStore.value.allNodes);

provideGenerativeUiNodes(nodes);
provideGenerativeUiLookOnly(toRef(store, 'lookOnly'));

function openNode(nodeId: string) {
	const node = nodes.value.find((candidate) => candidate.id === nodeId);
	if (!store.lookOnly && node) {
		ndvStore.value?.setActiveNodeName(node.name, 'generative_ui');
	}
}

provideGenerativeUiOpenNode(openNode);

const validatedActiveSpec = computed<Spec | null>(() => {
	try {
		return validateGeneratedSpec(store.activeSpec);
	} catch {
		return null;
	}
});
const hasParseFailure = computed(
	() => store.activeSpec !== undefined && validatedActiveSpec.value === null,
);
const workflowUiPayload = computed(() =>
	buildWorkflowUiPayload({
		name: workflowDocumentStore.value.name,
		nodes: nodes.value.map((node) => ({ ...node })),
		connections: workflowDocumentStore.value.connectionsBySourceNode,
	}),
);
const fallbackSpec = computed(() => buildFallbackSpec(workflowUiPayload.value));

provideGenerativeUiFlowGraph(computed(() => workflowUiPayload.value.connections));
const renderSpec = computed<Spec | null>(() => {
	if (validatedActiveSpec.value) return validatedActiveSpec.value;
	if (hasParseFailure.value) return fallbackSpec.value;
	return null;
});

const errorMessages: Record<WorkflowGenerativeUiError, string> = {
	'missing-key': 'Enter an Anthropic API key to generate this view.',
	'missing-workflow': 'The workflow is not available.',
	unauthorized: 'The API key was rejected. Update it and try again.',
	'generate-failed': 'Generation failed. Showing a basic workflow view.',
};

const errorMessage = computed(() => {
	if (!store.error) return null;
	const base = errorMessages[store.error];
	return store.errorDetail ? `${base} Details: ${store.errorDetail}` : base;
});

watch(
	() => store.error,
	(error, previousError) => {
		if (!error || error === previousError || error === 'missing-key') return;
		showToast({
			title: 'Could not generate view',
			message: errorMessage.value ?? errorMessages[error],
			type: 'error',
		});
	},
);

const handlers = {
	openNode: (params: Record<string, unknown> = {}) => {
		const nodeId = typeof params.nodeId === 'string' ? params.nodeId : null;
		if (nodeId) openNode(nodeId);
		return Promise.resolve();
	},
};

const rawSpec = computed(() => JSON.stringify(store.activeSpec, null, 2));
</script>

<template>
	<div :class="$style.overlay" :style="followUpReserveStyle" data-test-id="generative-ui-overlay">
		<div v-if="nodes.length === 0" :class="$style.status">
			<N8nText>Add nodes, then pick a view.</N8nText>
		</div>
		<template v-else>
			<N8nText v-if="errorMessage" color="danger" :class="$style.error">
				{{ errorMessage }}
			</N8nText>
			<N8nText
				v-else-if="store.isStale"
				color="text-light"
				:class="$style.notice"
				data-test-id="generative-ui-stale-notice"
			>
				The workflow changed since this view was made. Regenerate to update it.
			</N8nText>
			<div v-if="store.isGenerating && !renderSpec" :class="$style.status">
				<N8nText>Generating…</N8nText>
			</div>
			<JSONUIProvider
				v-else-if="renderSpec"
				:registry="registry"
				:handlers="handlers"
				:initial-state="renderSpec.state ?? {}"
			>
				<Renderer :spec="renderSpec" :registry="registry" :loading="store.isGenerating" />
			</JSONUIProvider>
			<details v-if="hasParseFailure" :class="$style.debug">
				<summary>Raw spec</summary>
				<pre>{{ rawSpec }}</pre>
			</details>
		</template>
	</div>
</template>

<style lang="scss" module>
.overlay {
	position: absolute;
	inset: 0;
	z-index: 1;
	overflow: auto;
	padding: var(--spacing--3xl) var(--spacing--lg) var(--generative-ui--follow-up--reserve);
	background: var(--background--surface);
}

.status {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 100%;
}

.error {
	display: block;
	margin-bottom: var(--spacing--sm);
	text-align: center;
}

.notice {
	display: block;
	margin-bottom: var(--spacing--sm);
	text-align: center;
}

.debug {
	max-width: calc(var(--spacing--5xl) * 3);
	margin: var(--spacing--lg) auto 0;
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);

	pre {
		overflow: auto;
		padding: var(--spacing--sm);
		border-radius: var(--radius--xs);
		background: var(--background--light);
		font-family: var(--font-family--monospace);
		white-space: pre-wrap;
	}
}
</style>
