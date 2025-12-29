<script setup lang="ts">
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { N8nButton, N8nTooltip } from '@n8n/design-system';
import type { INode } from 'n8n-workflow';
import { computed, onMounted } from 'vue';
import { useI18n } from '@n8n/i18n';

const {
	selected,
	transparentBg = false,
	disabledTooltip,
} = defineProps<{
	disabled: boolean;
	selected: INode[];
	transparentBg?: boolean;
	disabledTooltip?: string;
}>();

const emit = defineEmits<{
	click: [MouseEvent];
}>();

const nodeTypesStore = useNodeTypesStore();
const i18n = useI18n();

const toolCount = computed(() => selected.length ?? 0);

const displayToolNodeTypes = computed(() => {
	return selected
		.slice(0, 3)
		.map((t) => nodeTypesStore.getNodeType(t.type))
		.filter(Boolean);
});

const toolsLabel = computed(() => {
	if (toolCount.value > 0) {
		return i18n.baseText('chatHub.tools.selector.label.count', { adjustToNumber: toolCount.value });
	}
	return i18n.baseText('chatHub.tools.selector.label.default');
});

onMounted(async () => {
	await nodeTypesStore.loadNodeTypesIfNotLoaded();
});
</script>

<template>
	<N8nTooltip :content="disabledTooltip" :disabled="!disabledTooltip" placement="top">
		<N8nButton
			type="secondary"
			native-type="button"
			:class="[$style.toolsButton, { [$style.transparentBg]: transparentBg }]"
			:disabled="disabled"
			:icon="toolCount > 0 ? undefined : 'plus'"
			@click="emit('click', $event)"
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
			{{ toolsLabel }}
		</N8nButton>
	</N8nTooltip>
</template>

<style lang="scss" module>
.toolsButton {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);

	&.transparentBg {
		background-color: transparent !important;
	}
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
</style>
