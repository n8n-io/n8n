<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nPopover } from '@n8n/design-system';
import { useFocusedNodesStore } from '../../focusedNodes.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';
import NodeIcon from '@/app/components/NodeIcon.vue';
import FocusedNodeChip from './FocusedNodeChip.vue';

const emit = defineEmits<{
	expand: [];
}>();

const focusedNodesStore = useFocusedNodesStore();
const nodeTypesStore = useNodeTypesStore();
const i18n = useI18n();

function getNodeType(nodeTypeName: string) {
	return nodeTypesStore.getNodeType(nodeTypeName);
}

const isFeatureEnabled = computed(() => focusedNodesStore.isFeatureEnabled);
const hasVisibleNodes = computed(() => focusedNodesStore.hasVisibleNodes);
const shouldCollapse = computed(() => focusedNodesStore.shouldCollapseChips);
const confirmedCount = computed(() => focusedNodesStore.confirmedNodes.length);
const unconfirmedCount = computed(() => focusedNodesStore.filteredUnconfirmedNodes.length);

const shouldBundleConfirmed = computed(() => confirmedCount.value >= 4);
const shouldBundleUnconfirmed = computed(() => unconfirmedCount.value >= 4);

const individualConfirmedNodes = computed(() =>
	confirmedCount.value >= 1 && confirmedCount.value <= 3 ? focusedNodesStore.confirmedNodes : [],
);
const individualUnconfirmedNodes = computed(() =>
	unconfirmedCount.value >= 1 && unconfirmedCount.value <= 3
		? focusedNodesStore.filteredUnconfirmedNodes
		: [],
);

function handleChipClick(nodeId: string) {
	const node = focusedNodesStore.focusedNodesMap[nodeId];
	if (node?.state === 'confirmed') {
		canvasEventBus.emit('nodes:select', { ids: [nodeId], panIntoView: true });
	} else {
		const isSelectedOnCanvas = focusedNodesStore.isNodeSelectedOnCanvas(nodeId);
		focusedNodesStore.toggleNode(nodeId, isSelectedOnCanvas);
	}
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
	<div v-if="isFeatureEnabled && hasVisibleNodes" :class="$style.container">
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
				<!-- Individual confirmed chips (1-3 nodes) -->
				<FocusedNodeChip
					v-for="node in individualConfirmedNodes"
					:key="node.nodeId"
					:node="node"
					@click="handleChipClick(node.nodeId)"
					@remove="handleRemove(node.nodeId)"
				/>

				<!-- Bundled confirmed chip (4+ nodes) with expandable popover -->
				<N8nPopover v-if="shouldBundleConfirmed" side="top" width="220px">
					<template #trigger>
						<span :class="$style.bundledChip">
							<N8nIcon icon="layers" size="small" :class="$style.bundledIcon" />
							<span :class="$style.label">{{
								i18n.baseText('focusedNodes.nodesCount', {
									interpolate: { count: confirmedCount },
								})
							}}</span>
							<button
								type="button"
								:class="$style.removeButton"
								@click.stop="handleRemoveAllConfirmed"
							>
								<N8nIcon icon="x" size="xsmall" />
							</button>
						</span>
					</template>
					<template #content>
						<div :class="$style.expandedNodeList">
							<div
								v-for="node in focusedNodesStore.confirmedNodes"
								:key="node.nodeId"
								:class="$style.expandedNodeItem"
							>
								<NodeIcon :node-type="getNodeType(node.nodeType)" :size="12" />
								<span :class="$style.expandedNodeName">{{ node.nodeName }}</span>
								<button
									type="button"
									:class="$style.expandedRemoveButton"
									@click.stop="handleRemove(node.nodeId)"
								>
									<N8nIcon icon="x" size="xsmall" />
								</button>
							</div>
						</div>
					</template>
				</N8nPopover>
			</template>

			<!-- Unconfirmed nodes section -->
			<template v-if="unconfirmedCount > 0">
				<!-- Individual unconfirmed chips (1-3 nodes) -->
				<FocusedNodeChip
					v-for="node in individualUnconfirmedNodes"
					:key="node.nodeId"
					:node="node"
					@click="handleChipClick(node.nodeId)"
					@remove="handleRemove(node.nodeId)"
				/>

				<!-- Bundled unconfirmed chip (4+ nodes) -->
				<button
					v-if="shouldBundleUnconfirmed"
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
	/* stylelint-disable-next-line @n8n/css-var-naming */
	background-color: var(--background--success);
	/* stylelint-disable-next-line @n8n/css-var-naming */
	border: 1px solid var(--background--success);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	/* stylelint-disable-next-line @n8n/css-var-naming */
	color: var(--text-color--success);
	white-space: nowrap;
}

.bundledIcon {
	/* stylelint-disable-next-line @n8n/css-var-naming */
	color: var(--text-color--success);
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
	font-style: italic;
	color: var(--color--text--tint-1);
	cursor: pointer;
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
	min-width: 24px;
	min-height: 24px;
	padding: 0;
	margin-left: var(--spacing--4xs);
	background: none;
	border: none;
	cursor: pointer;
	/* stylelint-disable-next-line @n8n/css-var-naming */
	color: var(--text-color--success);

	&:hover {
		/* stylelint-disable-next-line @n8n/css-var-naming */
		color: var(--text-color--success);
	}
}

.expandedNodeList {
	padding: var(--spacing--4xs);
	max-height: 240px;
	overflow-y: auto;
}

.expandedNodeItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	color: var(--color--text);

	&:hover {
		background-color: var(--color--foreground--tint-2);
	}
}

.expandedNodeName {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	line-height: 1;
}

.expandedRemoveButton {
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 24px;
	min-height: 24px;
	padding: 0;
	background: none;
	border: none;
	cursor: pointer;
	color: var(--color--text--tint-2);

	&:hover {
		color: var(--color--text);
	}
}
</style>
