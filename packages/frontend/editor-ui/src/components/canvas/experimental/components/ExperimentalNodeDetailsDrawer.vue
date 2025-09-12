<script setup lang="ts">
import { useExpressionResolveCtx } from '@/components/canvas/experimental/composables/useExpressionResolveCtx';
import { type ContextMenuAction, useContextMenuItems } from '@/composables/useContextMenuItems';
import { ExpressionLocalResolveContextSymbol } from '@/constants';
import { type INodeUi } from '@/Interface';
import { N8nButton, N8nKeyboardShortcut, N8nText } from '@n8n/design-system';
import { computed, provide, ref, watch } from 'vue';
import ExperimentalCanvasNodeSettings from './ExperimentalCanvasNodeSettings.vue';
import { useNDVStore } from '@/stores/ndv.store';

const { node, nodeIds, isReadOnly } = defineProps<{
	node: INodeUi;
	nodeIds: string[];

	isReadOnly?: boolean;
}>();

const emit = defineEmits<{
	openNdv: [];
	contextMenuAction: [ContextMenuAction, nodeIds: string[]];
}>();

const expressionResolveCtx = useExpressionResolveCtx(computed(() => node));
const contextMenuItems = useContextMenuItems(computed(() => nodeIds));
const ndvStore = useNDVStore();

const ndvCloseTimes = ref(0);

// To ensure showing latest parameters, force re-render when NDV is closed
const nodeSettingsViewKey = computed(() => [node.id, ndvCloseTimes.value].join('|'));

// Track closing NDV
watch(
	() => ndvStore.activeNodeName,
	(name, oldName) => {
		if (name === null && oldName !== null) {
			ndvCloseTimes.value += 1;
		}
	},
);

provide(ExpressionLocalResolveContextSymbol, expressionResolveCtx);
</script>

<template>
	<div :class="$style.component">
		<N8nText v-if="nodeIds.length > 1" tag="div" color="text-base" :class="$style.multipleNodes">
			<div>{{ nodeIds.length }} nodes selected</div>
			<ul :class="$style.multipleNodesActions">
				<li v-for="action of contextMenuItems" :key="action.id" :class="$style.multipleNodesAction">
					<N8nButton
						type="secondary"
						:disabled="action.disabled"
						@click="emit('contextMenuAction', action.id, nodeIds)"
					>
						{{ action.label }}
						<N8nKeyboardShortcut v-if="action.shortcut" v-bind="action.shortcut" />
					</N8nButton>
				</li>
			</ul>
		</N8nText>
		<ExperimentalCanvasNodeSettings
			v-else-if="node"
			:key="nodeSettingsViewKey"
			:node-id="node.id"
			:is-read-only="isReadOnly"
		/>
	</div>
</template>

<style lang="scss" module>
.component {
	height: 100%;
	overflow: auto;
}

.multipleNodes {
	min-height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: start;
	padding: var(--spacing-3xl) var(--spacing-m);
	gap: var(--spacing-m);
}

.multipleNodesActions {
	align-self: stretch;
	list-style-type: none;
}

.multipleNodesAction {
	margin-top: -1px;

	& button {
		width: 100%;
		border-radius: 0;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-color: var(--border-color-light);

		&:disabled {
			border-color: var(--border-color-light);
		}
	}

	&:first-of-type button {
		border-top-left-radius: var(--border-radius-base);
		border-top-right-radius: var(--border-radius-base);
	}

	&:last-of-type button {
		border-bottom-left-radius: var(--border-radius-base);
		border-bottom-right-radius: var(--border-radius-base);
	}

	& button:hover {
		z-index: 1;
	}
}
</style>
