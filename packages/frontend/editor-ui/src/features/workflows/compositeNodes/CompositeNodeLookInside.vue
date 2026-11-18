<script setup lang="ts">
import { computed } from 'vue';
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

import { useCompositeNodeLookInsideStore } from './compositeNodeLookInside.store';

const { nodeName } = defineProps<{ nodeName: string }>();

const i18n = useI18n();
const store = useCompositeNodeLookInsideStore();
const workflowDocumentStore = injectWorkflowDocumentStore();

const node = computed(() => workflowDocumentStore.value.getNodeByName(nodeName) ?? null);

function lookInside() {
	if (node.value) void store.open(node.value, workflowDocumentStore.value);
}
</script>

<template>
	<N8nButton
		variant="outline"
		size="small"
		icon="layers"
		:loading="store.loadingNodeName === nodeName"
		:class="$style.button"
		data-test-id="composite-node-look-inside"
		data-attr="composite-node-look-inside"
		@click="lookInside"
	>
		{{ i18n.baseText('compositeNode.lookInside') }}
	</N8nButton>
</template>

<style lang="scss" module>
.button {
	margin-right: var(--spacing--2xs);
}
</style>
