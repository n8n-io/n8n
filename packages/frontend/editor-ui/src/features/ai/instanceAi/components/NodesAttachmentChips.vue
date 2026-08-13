<script lang="ts" setup>
import { computed, inject, ref } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiNodesAttachment } from '@n8n/api-types';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { WorkflowIdKey } from '@/app/constants/injectionKeys';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { SINGLE_SET_NODE_EXPANSION_THRESHOLD } from './nodesAttachmentChips.constants';

type NodesAttachment = InstanceAiNodesAttachment;
type NodeSet = NodesAttachment['sets'][number];

const props = defineProps<{ attachment: NodesAttachment; isRemovable?: boolean }>();
const emit = defineEmits<{
	'update:attachment': [attachment: NodesAttachment];
	'remove-all': [];
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
// Plain `inject` (not the strict composable) — this chip can render before a
// workflow id is provided (e.g. history playback), so fall back to ''.
const workflowId = inject(
	WorkflowIdKey,
	computed(() => ''),
);
const workflowDocumentStore = computed(() =>
	useWorkflowDocumentStore(createWorkflowDocumentId(workflowId.value || 'unknown')),
);

function nodeTypeForName(name: string | undefined) {
	if (!name) return null;
	const wfNode = workflowDocumentStore.value.allNodes.find((n) => n.name === name);
	return wfNode ? nodeTypesStore.getNodeType(wfNode.type) : null;
}

const setCount = computed(() => props.attachment.sets.length);

// One-set-lone-small → explode per node (unless grouped).
const explodeSingleSet = computed(
	() =>
		setCount.value === 1 &&
		!props.attachment.sets[0].canvasGroupId &&
		props.attachment.sets[0].nodes.length < SINGLE_SET_NODE_EXPANSION_THRESHOLD,
);

function kindOf(set: NodeSet): 'group' | 'bundle' | 'named' {
	if (set.canvasGroupId) return 'group';
	if (setCount.value === 1) {
		return set.nodes.length >= SINGLE_SET_NODE_EXPANSION_THRESHOLD ? 'bundle' : 'named';
	}
	return set.nodes.length > 1 ? 'bundle' : 'named';
}

const truncatedName = (name: string) => (name.length <= 20 ? name : `${name.substring(0, 19)}...`);

function removeSet(index: number) {
	const sets = props.attachment.sets.filter((_, i) => i !== index);
	if (!sets.length) {
		emit('remove-all');
		return;
	}
	emit('update:attachment', { ...props.attachment, sets });
}

function removeNode(setIndex: number, nodeIndex: number) {
	const set = props.attachment.sets[setIndex];
	const nodes = set.nodes.filter((_, i) => i !== nodeIndex);
	if (!nodes.length) {
		removeSet(setIndex);
		return;
	}
	const sets = props.attachment.sets.map((s, i) => (i === setIndex ? { ...s, nodes } : s));
	emit('update:attachment', { ...props.attachment, sets });
}

// which bundled set's panel is open (index into attachment.sets), null = none open
const expandedSetIndex = ref<number | null>(null);
function toggleExpanded(index: number) {
	expandedSetIndex.value = expandedSetIndex.value === index ? null : index;
}

// Collapse/expand toggle only earns its keep once there's enough chips to skim past.
const COLLAPSE_CHIP_THRESHOLD = 6;
const isCollapsed = ref(false);
const visibleChipCount = computed(() =>
	explodeSingleSet.value ? props.attachment.sets[0].nodes.length : setCount.value,
);
const showCollapseToggle = computed(() => visibleChipCount.value > COLLAPSE_CHIP_THRESHOLD);
const totalNodeCount = computed(() =>
	props.attachment.sets.reduce((sum, set) => sum + set.nodes.length, 0),
);

// inputNode/outputNode are send-time context only — intentionally never rendered.
</script>

<template>
	<div :class="$style.container">
		<span
			v-if="isCollapsed"
			:class="$style.resourceChip"
			data-testid="nodes-chips-collapsed-summary"
		>
			<N8nIcon icon="layers" size="xsmall" />
			<span :class="$style.resourceName">
				{{
					i18n.baseText('instanceAi.nodeContext.nodesBundle', {
						interpolate: { count: totalNodeCount },
					})
				}}
			</span>
		</span>
		<template v-if="!isCollapsed">
			<template v-if="explodeSingleSet">
				<span
					v-for="(node, nodeIndex) in attachment.sets[0].nodes"
					:key="node.id"
					:class="$style.resourceChip"
					data-testid="nodes-chip-node"
				>
					<NodeIcon
						v-if="nodeTypeForName(node.name)"
						:node-type="nodeTypeForName(node.name)"
						:size="12"
					/>
					<N8nIcon v-else icon="crosshair" size="xsmall" />
					<span :class="$style.resourceName">{{ truncatedName(node.name ?? '') }}</span>
					<button
						v-if="isRemovable"
						:class="$style.removeBtn"
						data-testid="nodes-chip-remove"
						@click.stop="removeNode(0, nodeIndex)"
					>
						<N8nIcon icon="x" size="xsmall" />
					</button>
				</span>
			</template>
			<template v-else>
				<template v-for="(set, setIndex) in attachment.sets" :key="setIndex">
					<span
						v-if="kindOf(set) === 'group'"
						:class="$style.resourceChip"
						data-testid="nodes-chip-group"
					>
						<N8nIcon icon="layers" size="xsmall" />
						<span :class="$style.resourceName">{{ set.canvasGroupName }}</span>
						<button
							v-if="isRemovable"
							:class="$style.removeBtn"
							data-testid="nodes-chip-remove"
							@click.stop="removeSet(setIndex)"
						>
							<N8nIcon icon="x" size="xsmall" />
						</button>
					</span>
					<span
						v-else-if="kindOf(set) === 'bundle'"
						:class="$style.resourceChip"
						data-testid="nodes-chip-bundle"
					>
						<N8nIcon icon="layers" size="xsmall" />
						<span :class="$style.resourceName">
							{{
								i18n.baseText('instanceAi.nodeContext.nodesBundle', {
									interpolate: { count: set.nodes.length },
								})
							}}
						</span>
						<button
							:class="$style.caretBtn"
							data-testid="nodes-chip-expand"
							@click.stop="toggleExpanded(setIndex)"
						>
							<N8nIcon
								:icon="expandedSetIndex === setIndex ? 'chevron-up' : 'chevron-down'"
								size="xsmall"
							/>
						</button>
						<button
							v-if="isRemovable"
							:class="$style.removeBtn"
							data-testid="nodes-chip-remove"
							@click.stop="removeSet(setIndex)"
						>
							<N8nIcon icon="x" size="xsmall" />
						</button>
						<div
							v-if="expandedSetIndex === setIndex"
							:class="$style.panel"
							data-testid="nodes-chip-panel"
						>
							<div v-for="node in set.nodes" :key="node.id" :class="$style.panelRow">
								{{ node.name }}
							</div>
						</div>
					</span>
					<span v-else :class="$style.resourceChip" data-testid="nodes-chip-node">
						<NodeIcon
							v-if="nodeTypeForName(set.nodes[0].name)"
							:node-type="nodeTypeForName(set.nodes[0].name)"
							:size="12"
						/>
						<N8nIcon v-else icon="crosshair" size="xsmall" />
						<span :class="$style.resourceName">{{ truncatedName(set.nodes[0].name ?? '') }}</span>
						<button
							v-if="isRemovable"
							:class="$style.removeBtn"
							data-testid="nodes-chip-remove"
							@click.stop="removeSet(setIndex)"
						>
							<N8nIcon icon="x" size="xsmall" />
						</button>
					</span>
				</template>
			</template>
		</template>
		<button
			v-if="showCollapseToggle"
			:class="$style.collapseToggle"
			data-testid="nodes-chips-collapse"
			@click.stop="isCollapsed = !isCollapsed"
		>
			{{
				isCollapsed
					? i18n.baseText('instanceAi.nodeContext.expand')
					: i18n.baseText('instanceAi.nodeContext.collapse')
			}}
		</button>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--4xs);
}

.resourceChip {
	position: relative;
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	max-width: 220px;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	background: var(--color--foreground--tint-2);
	font-size: var(--font-size--2xs);
	color: var(--color--text--shade-1);
}

.resourceName {
	// `min-width: 0` lets the flex item shrink below its content so the ellipsis
	// kicks in within the chip's max-width instead of overflowing.
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.removeBtn,
.caretBtn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border: none;
	background: none;
	padding: 0;
	cursor: pointer;
	color: var(--color--text--shade-1);
}

.panel {
	position: absolute;
	top: 100%;
	left: 0;
	z-index: 1;
	margin-top: var(--spacing--4xs);
	padding: var(--spacing--3xs);
	border: var(--border);
	border-radius: var(--radius);
	background: var(--color--background--light-3);
	box-shadow: var(--shadow--sm);
	min-width: 160px;
}

.panelRow {
	padding: var(--spacing--4xs) 0;
	font-size: var(--font-size--2xs);
	color: var(--color--text--shade-1);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.collapseToggle {
	border: none;
	background: none;
	padding: 0;
	cursor: pointer;
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	text-decoration: underline;
}
</style>
