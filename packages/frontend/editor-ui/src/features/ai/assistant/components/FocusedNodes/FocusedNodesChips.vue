<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon } from '@n8n/design-system';
import { useFocusedNodesStore } from '../../focusedNodes.store';
import FocusedNodeChip from './FocusedNodeChip.vue';

const emit = defineEmits<{
	expand: [];
}>();

const focusedNodesStore = useFocusedNodesStore();
const i18n = useI18n();

const hasVisibleNodes = computed(() => focusedNodesStore.hasVisibleNodes);
const shouldCollapse = computed(() => focusedNodesStore.shouldCollapseChips);
const confirmedCount = computed(() => focusedNodesStore.confirmedNodes.length);
const tooManyUnconfirmed = computed(() => focusedNodesStore.tooManyUnconfirmed);
const unconfirmedCount = computed(() => focusedNodesStore.unconfirmedNodes.length);

const visibleNodes = computed(() => {
	// Show confirmed nodes first, then unconfirmed
	return [...focusedNodesStore.confirmedNodes, ...focusedNodesStore.unconfirmedNodes];
});

function handleChipClick(nodeId: string) {
	const isSelectedOnCanvas = focusedNodesStore.isNodeSelectedOnCanvas(nodeId);
	focusedNodesStore.toggleNode(nodeId, isSelectedOnCanvas);
}

function handleRemove(nodeId: string) {
	const isSelectedOnCanvas = focusedNodesStore.isNodeSelectedOnCanvas(nodeId);
	if (isSelectedOnCanvas) {
		focusedNodesStore.setState(nodeId, 'unconfirmed');
	} else {
		focusedNodesStore.removeNode(nodeId);
	}
}

function handleExpandClick() {
	emit('expand');
}
</script>

<template>
	<div v-if="hasVisibleNodes" :class="$style.container">
		<!-- Collapsed: count chip -->
		<template v-if="shouldCollapse">
			<button type="button" :class="$style.countChip" @click="handleExpandClick">
				<N8nIcon icon="crosshair" size="small" />
				<span>{{ confirmedCount }} {{ i18n.baseText('focusedNodes.nodesLabel') }}</span>
			</button>
		</template>

		<!-- Expanded: individual chips or overflow message -->
		<template v-else>
			<!-- Show overflow message for too many unconfirmed -->
			<span v-if="tooManyUnconfirmed && confirmedCount === 0" :class="$style.overflowText">
				{{
					i18n.baseText('focusedNodes.nodesSelected', { interpolate: { count: unconfirmedCount } })
				}}
			</span>

			<!-- Show individual chips -->
			<template v-else>
				<FocusedNodeChip
					v-for="node in visibleNodes"
					:key="node.nodeId"
					:node="node"
					@click="handleChipClick(node.nodeId)"
					@remove="handleRemove(node.nodeId)"
				/>
			</template>
		</template>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	background-color: var(--color--background--light-2);
	border-bottom: var(--border);
}

.countChip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	height: 24px;
	padding: 0 var(--spacing--2xs);
	background-color: var(--color--success--tint-3);
	border: 1px solid var(--color--success--tint-2);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	cursor: pointer;
	transition: background-color 0.15s ease;

	&:hover {
		background-color: var(--color--success--tint-2);
	}
}

.overflowText {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	padding: var(--spacing--4xs) 0;
}
</style>
