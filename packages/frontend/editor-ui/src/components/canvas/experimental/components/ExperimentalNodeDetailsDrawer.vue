<script setup lang="ts">
import { type CanvasNode } from '@/types';
import ExperimentalCanvasNodeSettings from './ExperimentalCanvasNodeSettings.vue';
import { N8nText } from '@n8n/design-system';
import { computed, watch, ref } from 'vue';
import { useNDVStore } from '@/stores/ndv.store';

const { selectedNodes } = defineProps<{ selectedNodes: CanvasNode[] }>();

const content = computed(() =>
	selectedNodes.length > 1
		? `${selectedNodes.length} nodes selected`
		: selectedNodes.length > 0
			? selectedNodes[0]
			: undefined,
);
const lastContent = ref<string | CanvasNode | undefined>();
const { setActiveNodeName } = useNDVStore();

function handleOpenNdv() {
	if (typeof content.value === 'object' && content.value.data) {
		setActiveNodeName(content.value.data.name);
	}
}

// Sync lastContent to be "last defined content" (for drawer animation)
watch(
	content,
	(newContent) => {
		if (newContent !== undefined) {
			lastContent.value = newContent;
		}
	},
	{ immediate: true },
);
</script>

<template>
	<div :class="[$style.component, content === undefined ? $style.closed : '']">
		<N8nText v-if="typeof lastContent === 'string'" color="text-base">
			{{ lastContent }}
		</N8nText>
		<ExperimentalCanvasNodeSettings
			v-else-if="lastContent !== undefined"
			:key="lastContent.id"
			:node-id="lastContent.id"
		>
			<template #actions>
				<N8nIconButton
					icon="maximize-2"
					type="secondary"
					text
					size="mini"
					icon-size="large"
					aria-label="Expand"
					@click="handleOpenNdv"
				/>
			</template>
		</ExperimentalCanvasNodeSettings>
	</div>
</template>

<style lang="scss" module>
.component {
	position: absolute;
	right: 0;
	z-index: 10;
	flex-grow: 0;
	flex-shrink: 0;
	border-left: var(--border-base);
	background-color: var(--color-background-xlight);
	width: #{$node-creator-width};
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: transform 0.2s ease;

	&.closed {
		transform: translateX(100%);
	}
}
</style>
