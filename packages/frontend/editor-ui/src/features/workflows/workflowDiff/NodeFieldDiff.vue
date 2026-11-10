<script setup lang="ts">
// Prototype: the diff of one node as the fields of the node settings. This applies direction B
// of the skill review to the workflow diff. It replaces the raw JSON of NodeDiff.
import { computed, onBeforeUnmount, provide, useId, watch } from 'vue';
import type { INode, INodeTypeDescription } from 'n8n-workflow';

import { ExpressionLocalResolveContextSymbol, WorkflowDocumentStoreKey } from '@/app/constants';
import {
	createWorkflowDocumentId,
	disposeWorkflowDocumentStore,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import type { ExpressionLocalResolveContext } from '@/app/types/expressions';
import { disposeNDVStore, useNDVStore } from '@/features/ndv/shared/ndv.store';

import NodeFieldDiffSection from './NodeFieldDiffSection.vue';
import { useNodeFieldDiff } from './nodeFieldDiff';

const props = defineProps<{
	before?: INode;
	after?: INode;
	nodeType: INodeTypeDescription | null;
	credentialLabel?: (type: string) => string;
}>();

const { build } = useNodeFieldDiff();

const sections = computed(() =>
	build({
		before: props.before,
		after: props.after,
		nodeType: props.nodeType,
		credentialLabel: props.credentialLabel,
	}),
);

// The parameter inputs read their node from a workflow document, as in the node settings. The
// diff has its own document with the newer node, so it does not touch the open workflow.
const documentStore = useWorkflowDocumentStore(
	createWorkflowDocumentId(`node-field-diff-${useId()}`),
);
const ndvStore = useNDVStore(documentStore.documentId);
const node = computed(() => props.after ?? props.before);

watch(
	node,
	(current) => {
		if (!current) return;
		documentStore.setNodes([{ ...current, position: current.position ?? [0, 0] }]);
		ndvStore.setActiveNodeName(current.name, 'other');
	},
	{ immediate: true },
);

const expressionContext = computed<ExpressionLocalResolveContext | undefined>(() =>
	node.value
		? {
				localResolve: true,
				envVars: {},
				nodeName: node.value.name,
				additionalKeys: {},
				inputNode: undefined,
			}
		: undefined,
);

provide(
	WorkflowDocumentStoreKey,
	computed(() => documentStore),
);
provide(ExpressionLocalResolveContextSymbol, expressionContext);

onBeforeUnmount(() => {
	disposeNDVStore(ndvStore);
	disposeWorkflowDocumentStore(documentStore);
});
</script>

<template>
	<div :class="$style.fields" data-test-id="node-field-diff">
		<NodeFieldDiffSection v-for="section in sections" :key="section.id" :section="section" />
	</div>
</template>

<style lang="scss" module>
.fields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--xs);
}
</style>
