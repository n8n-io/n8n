<script setup lang="ts">
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import type { INode } from 'n8n-workflow';
import { computed, onMounted } from 'vue';
import { TOOLS_SELECTOR_MODAL_KEY } from '../constants';

const { selected } = defineProps<{
	disabled: boolean;
	selected: INode[];
}>();

const emit = defineEmits<{
	select: [INode[]];
}>();

const uiStore = useUIStore();
const nodeTypesStore = useNodeTypesStore();

const toolCount = computed(() => selected.length ?? 0);

const displayToolNodeTypes = computed(() => {
	return selected
		.slice(0, 3)
		.map((t) => nodeTypesStore.getNodeType(t.type))
		.filter(Boolean);
});

const toolsLabel = computed(() =>
	toolCount.value > 0 ? `${toolCount.value} Tool${toolCount.value > 1 ? 's' : ''}` : 'Tools',
);

onMounted(async () => {
	await nodeTypesStore.loadNodeTypesIfNotLoaded();
});

const handleSelect = (tools: INode[]) => {
	emit('select', tools);
};

const onClick = () => {
	uiStore.openModalWithData({
		name: TOOLS_SELECTOR_MODAL_KEY,
		data: { selected, onConfirm: handleSelect },
	});
};
</script>

<template>
	<N8nButton
		type="secondary"
		:class="$style.toolsButton"
		:disabled="disabled"
		aria-label="Select tools"
		@click="onClick"
	>
		<span v-if="toolCount" :class="$style.iconStack">
			<NodeIcon
				v-for="(nodeType, i) in displayToolNodeTypes"
				:key="`${nodeType?.name}-${i}`"
				:style="{ zIndex: displayToolNodeTypes.length - i }"
				:node-type="nodeType"
				:class="[$style.icon, { [$style.iconOverlap]: i !== 0 }]"
				:circle="true"
				:size="12"
			/>
		</span>
		<span v-else :class="$style.iconFallback">
			<N8nIcon icon="plus" :size="12" />
		</span>

		<N8nText size="small" bold color="text-dark">{{ toolsLabel }}</N8nText>
	</N8nButton>
</template>

<style lang="scss" module>
.toolsButton {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	background-color: transparent;
}

.iconStack {
	display: flex;
	align-items: center;
	position: relative;
}

.icon {
	padding: var(--spacing--4xs);
	background-color: var(--color--background--light-2);
	border-radius: 50%;
	outline: 2px var(--color--background--light-3) solid;
}

.iconOverlap {
	margin-left: -6px;
}

.iconFallback {
	padding: var(--spacing--4xs);
	display: flex;
	align-items: center;
	justify-content: center;
}
</style>
