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
const unconfirmedCount = computed(() => focusedNodesStore.unconfirmedNodes.length);

// Show bundled chip when 2+ nodes of each type
const shouldBundleConfirmed = computed(() => confirmedCount.value >= 2);
const shouldBundleUnconfirmed = computed(() => unconfirmedCount.value >= 2);

// Get single nodes for individual display
const singleConfirmedNode = computed(() =>
	confirmedCount.value === 1 ? focusedNodesStore.confirmedNodes[0] : null,
);
const singleUnconfirmedNode = computed(() =>
	unconfirmedCount.value === 1 ? focusedNodesStore.unconfirmedNodes[0] : null,
);

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

function handleConfirmAll() {
	focusedNodesStore.confirmAllUnconfirmed();
}

function handleRemoveAllConfirmed() {
	focusedNodesStore.removeAllConfirmed();
}
</script>

<template>
	<div v-if="hasVisibleNodes" :class="$style.container">
		<!-- Collapsed: total count chip (when >= 7 confirmed) -->
		<template v-if="shouldCollapse">
			<button type="button" :class="$style.countChip" @click="handleExpandClick">
				<N8nIcon icon="crosshair" size="small" />
				<span>{{ confirmedCount }} {{ i18n.baseText('focusedNodes.nodesLabel') }}</span>
			</button>
		</template>

		<!-- Expanded: bundled or individual chips -->
		<template v-else>
			<!-- Confirmed nodes section -->
			<template v-if="confirmedCount > 0">
				<!-- Single confirmed: show individual chip -->
				<FocusedNodeChip
					v-if="singleConfirmedNode"
					:node="singleConfirmedNode"
					@click="handleChipClick(singleConfirmedNode.nodeId)"
					@remove="handleRemove(singleConfirmedNode.nodeId)"
				/>

				<!-- Multiple confirmed: show bundled chip -->
				<span v-else-if="shouldBundleConfirmed" :class="$style.bundledChip">
					<N8nIcon icon="layers" size="small" :class="$style.bundledIcon" />
					<span :class="$style.label">{{
						i18n.baseText('focusedNodes.nodesCount', { interpolate: { count: confirmedCount } })
					}}</span>
					<button type="button" :class="$style.removeButton" @click="handleRemoveAllConfirmed">
						<N8nIcon icon="x" size="xsmall" />
					</button>
				</span>
			</template>

			<!-- Unconfirmed nodes section -->
			<template v-if="unconfirmedCount > 0">
				<!-- Single unconfirmed: show individual chip -->
				<FocusedNodeChip
					v-if="singleUnconfirmedNode"
					:node="singleUnconfirmedNode"
					@click="handleChipClick(singleUnconfirmedNode.nodeId)"
					@remove="handleRemove(singleUnconfirmedNode.nodeId)"
				/>

				<!-- Multiple unconfirmed: show bundled chip -->
				<button
					v-else-if="shouldBundleUnconfirmed"
					type="button"
					:class="$style.bundledUnconfirmedChip"
					@click="handleConfirmAll"
				>
					<N8nIcon icon="plus" size="xsmall" :class="$style.bundledUnconfirmedIcon" />
					<span :class="$style.label">{{
						i18n.baseText('focusedNodes.nodesCount', { interpolate: { count: unconfirmedCount } })
					}}</span>
				</button>
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

.bundledChip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	height: 24px;
	padding: 0 var(--spacing--2xs);
	background-color: var(--color--green-100);
	border: 1px solid var(--color--green-100);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	color: var(--color--green-800);
	white-space: nowrap;
}

.bundledIcon {
	color: var(--color--green-800);
}

.bundledUnconfirmedChip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	height: 24px;
	padding: 0 var(--spacing--2xs);
	background-color: var(--color--background--light-3);
	border: 1px dashed var(--color--foreground);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);
	color: var(--color--text--tint-1);
	cursor: pointer;
	transition: background-color 0.15s ease;
	white-space: nowrap;

	&:hover {
		background-color: var(--color--background--light-1);
	}
}

.bundledUnconfirmedIcon {
	color: var(--color--text--tint-1);
}

.label {
	line-height: 1;
}

.removeButton {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	margin-left: var(--spacing--4xs);
	background: none;
	border: none;
	cursor: pointer;
	color: var(--color--green-800);
	transition: color 0.15s ease;

	&:hover {
		color: var(--color--green-800);
	}
}
</style>
