<script lang="ts" setup>
import { computed, inject, nextTick, ref } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { INodeTypeDescription } from 'n8n-workflow';
import type { InstanceAiNodesAttachment } from '@n8n/api-types';
import type { INodeUi } from '@/Interface';
import NodeChip from './NodeChip.vue';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { WorkflowIdKey } from '@/app/constants/injectionKeys';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { isNodeChipRemovalKey } from '../constants';

const SINGLE_SET_NODE_EXPANSION_THRESHOLD = 4;

const props = defineProps<{ attachment: InstanceAiNodesAttachment; isRemovable?: boolean }>();
const emit = defineEmits<{
	'update:attachment': [attachment: InstanceAiNodesAttachment];
	'remove-all': [];
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const injectedWorkflowId = inject(
	WorkflowIdKey,
	computed(() => ''),
);
const workflowDocumentStore = computed(() =>
	useWorkflowDocumentStore(
		createWorkflowDocumentId(props.attachment.workflowId || injectedWorkflowId.value || 'unknown'),
	),
);

interface ResolvedAttachedNode {
	id: string;
	name: string;
	nodeType: INodeTypeDescription | null;
	workflowNode: INodeUi | null;
}

function resolveAttachedNode(node: { id: string; name?: string }): ResolvedAttachedNode {
	const store = workflowDocumentStore.value;
	const workflowNode =
		store.getNodeById(node.id) ?? (node.name ? store.getNodeByName(node.name) : undefined) ?? null;
	const nodeType = workflowNode
		? nodeTypesStore.getNodeType(workflowNode.type, workflowNode.typeVersion)
		: null;
	return {
		id: node.id,
		name: node.name ?? workflowNode?.name ?? '',
		nodeType,
		workflowNode,
	};
}

interface ChipVM {
	key: string;
	testid: 'nodes-chip-group' | 'nodes-chip-bundle' | 'nodes-chip-node';
	label: string;
	icon?: 'layers';
	nodeType?: INodeTypeDescription | null;
	setIndex: number;
	nodeIndex?: number;
	panel?: ResolvedAttachedNode[];
}

const chips = computed<ChipVM[]>(() => {
	const sets = props.attachment.sets;

	const only = sets[0];
	if (
		sets.length === 1 &&
		!only.canvasGroupId &&
		only.nodes.length < SINGLE_SET_NODE_EXPANSION_THRESHOLD
	) {
		return only.nodes.map((node, nodeIndex) => {
			const resolved = resolveAttachedNode(node);
			return {
				key: node.id,
				testid: 'nodes-chip-node',
				label: resolved.name,
				nodeType: resolved.nodeType,
				setIndex: 0,
				nodeIndex,
			};
		});
	}

	return sets.map((set, setIndex): ChipVM => {
		if (set.canvasGroupId) {
			return {
				key: `set-${setIndex}`,
				testid: 'nodes-chip-group',
				// A group without a name would render an empty label; fall back to the
				// node-count bundle label so the chip stays readable and accessible.
				label:
					set.canvasGroupName ||
					i18n.baseText('instanceAi.nodeContext.nodesBundle', {
						interpolate: { count: set.nodes.length },
					}),
				icon: 'layers',
				setIndex,
			};
		}
		if (set.nodes.length > 1) {
			return {
				key: `set-${setIndex}`,
				testid: 'nodes-chip-bundle',
				label: i18n.baseText('instanceAi.nodeContext.nodesBundle', {
					interpolate: { count: set.nodes.length },
				}),
				icon: 'layers',
				setIndex,
				panel: set.nodes.map((node) => resolveAttachedNode(node)),
			};
		}
		const resolved = resolveAttachedNode(set.nodes[0]);
		return {
			key: `set-${setIndex}`,
			testid: 'nodes-chip-node',
			label: resolved.name,
			nodeType: resolved.nodeType,
			setIndex,
		};
	});
});

function removeSet(index: number) {
	const sets = props.attachment.sets.filter((_, i) => i !== index);
	// Later sets shift down one — keep the open panel pointing at the same set.
	if (expandedSetIndex.value !== null) {
		if (expandedSetIndex.value === index) expandedSetIndex.value = null;
		else if (expandedSetIndex.value > index) expandedSetIndex.value -= 1;
	}
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
	// The edited set's head/tail may have changed, so the original chain
	// neighbors no longer apply — send just "these nodes" as context.
	const sets = props.attachment.sets.map((s, i) =>
		i === setIndex ? { ...s, nodes, inputNode: undefined, outputNode: undefined } : s,
	);
	emit('update:attachment', { ...props.attachment, sets });
}

function removeChip(chip: ChipVM) {
	if (chip.nodeIndex !== undefined) removeNode(chip.setIndex, chip.nodeIndex);
	else removeSet(chip.setIndex);
}

// stopPropagation keeps the canvas/logs panel's document-level shortcuts from
// also firing (see NodeChip.vue).
function handlePanelRowKeydown(setIndex: number, nodeIndex: number, event: KeyboardEvent) {
	if (isNodeChipRemovalKey(event.key)) {
		event.preventDefault();
		event.stopPropagation();
		removeNode(setIndex, nodeIndex);
		void focusPanelRowAfterRemoval(nodeIndex);
		return;
	}

	if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
		event.preventDefault();
		event.stopPropagation();
		const direction = event.key === 'ArrowDown' ? 1 : -1;
		focusAdjacentPanelRow(event.currentTarget as HTMLElement, direction);
		return;
	}

	if (event.key === 'Escape') {
		event.preventDefault();
		event.stopPropagation();
		closePanel();
	}
}

function focusAdjacentPanelRow(currentRow: HTMLElement, direction: 1 | -1) {
	const rows = Array.from(currentRow.parentElement?.children ?? []) as HTMLElement[];
	const nextRow = rows[rows.indexOf(currentRow) + direction];
	nextRow?.focus(); // out of range → no-op, focus stays on the current row
}

async function focusPanelRowAfterRemoval(removedIndex: number) {
	await nextTick();
	const rows = Array.from(
		panelRef.value?.querySelectorAll('[data-testid="nodes-chip-panel-row"]') ?? [],
	) as HTMLElement[];

	if (!rows.length) {
		return;
	}
	const focusIndex = Math.min(removedIndex, rows.length - 1);
	rows[focusIndex]?.focus();
}

function closePanel() {
	expandedSetIndex.value = null;
	openChipAnchor.value?.querySelector<HTMLElement>('[data-testid]')?.focus();
}

// Deferred to a macrotask: a keyboard removal destroys the focused row and
// fires this with a null relatedTarget an instant before its own refocus lands.
// The panel is teleported out to <body>, so "inside" means the chip anchor OR
// the panel — not a single DOM subtree.
function handlePanelFocusOut(setIndex: number) {
	if (expandedSetIndex.value !== setIndex) {
		return;
	}
	setTimeout(() => {
		if (expandedSetIndex.value !== setIndex) {
			return;
		}
		const active = document.activeElement;
		if (openChipAnchor.value?.contains(active) || panelRef.value?.contains(active)) {
			return; // focus landed back inside the chip/panel — stays open
		}
		expandedSetIndex.value = null;
	}, 0);
}

const expandedSetIndex = ref<number | null>(null);
const panelRef = ref<HTMLElement | null>(null);
// Chip anchors keyed by setIndex — the open one's rect positions the teleported
// panel, and it's where focus returns on close.
const chipAnchors = new Map<number, HTMLElement>();
const openChipAnchor = ref<HTMLElement | null>(null);
const panelStyle = ref<Record<string, string>>({});

function setChipAnchor(setIndex: number, el: Element | null) {
	if (el) chipAnchors.set(setIndex, el as HTMLElement);
	else chipAnchors.delete(setIndex);
}

function positionPanel(setIndex: number) {
	const anchor = chipAnchors.get(setIndex) ?? null;
	openChipAnchor.value = anchor;
	if (!anchor) return;
	const rect = anchor.getBoundingClientRect();
	panelStyle.value = { top: `${rect.bottom + 4}px`, left: `${rect.left}px` };
}

function toggleExpanded(index: number) {
	if (expandedSetIndex.value === index) {
		expandedSetIndex.value = null;
		return;
	}
	positionPanel(index);
	expandedSetIndex.value = index;
}

async function enterPanel(setIndex: number) {
	positionPanel(setIndex);
	expandedSetIndex.value = setIndex;
	await nextTick();
	panelRef.value?.querySelector<HTMLElement>('[data-testid="nodes-chip-panel-row"]')?.focus();
}

const COLLAPSE_CHIP_THRESHOLD = 6;
const isCollapsed = ref(false);
const showCollapseToggle = computed(() => chips.value.length > COLLAPSE_CHIP_THRESHOLD);
const totalNodeCount = computed(() =>
	props.attachment.sets.reduce((sum, set) => sum + set.nodes.length, 0),
);

// inputNode/outputNode are send-time context only — intentionally never rendered.
</script>

<template>
	<div :class="$style.container">
		<NodeChip
			v-if="isCollapsed"
			testid="nodes-chips-collapsed-summary"
			:label="
				i18n.baseText('instanceAi.nodeContext.nodesBundle', {
					interpolate: { count: totalNodeCount },
				})
			"
			icon="layers"
			:removable="isRemovable"
			:expanded="null"
			@remove="emit('remove-all')"
		/>
		<template v-else>
			<span
				v-for="chip in chips"
				:key="chip.key"
				:ref="(el) => setChipAnchor(chip.setIndex, el as Element | null)"
				:class="$style.chipAnchor"
				@focusout="handlePanelFocusOut(chip.setIndex)"
			>
				<NodeChip
					:label="chip.label"
					:testid="chip.testid"
					:icon="chip.icon"
					:node-type="chip.nodeType"
					:removable="isRemovable"
					:expanded="chip.panel ? expandedSetIndex === chip.setIndex : null"
					@remove="removeChip(chip)"
					@toggle-expand="toggleExpanded(chip.setIndex)"
					@enter-panel="enterPanel(chip.setIndex)"
				/>
				<!-- Teleported to <body>: the chip lives inside the chat input's
				overflow-clipped `.leading` slot, which would otherwise crop the panel. -->
				<Teleport to="body">
					<div
						v-if="chip.panel && expandedSetIndex === chip.setIndex"
						:ref="(el) => (panelRef = el as HTMLElement | null)"
						:class="$style.panel"
						:style="panelStyle"
						data-testid="nodes-chip-panel"
						@focusout="handlePanelFocusOut(chip.setIndex)"
					>
						<div
							v-for="(node, nodeIndex) in chip.panel"
							:key="node.id"
							:class="$style.panelRow"
							data-testid="nodes-chip-panel-row"
							tabindex="-1"
							role="option"
							:aria-label="node.name"
							@keydown="handlePanelRowKeydown(chip.setIndex, nodeIndex, $event)"
						>
							<NodeIcon
								v-if="node.nodeType"
								:node-type="node.nodeType"
								:node="node.workflowNode ?? undefined"
								:size="16"
								:class="$style.panelRowIcon"
							/>
							<N8nIcon v-else icon="crosshair" size="xsmall" />
							<span :class="$style.panelRowName">{{ node.name }}</span>
							<button
								v-if="isRemovable"
								type="button"
								:class="$style.panelRemove"
								data-testid="nodes-chip-panel-remove"
								tabindex="-1"
								:aria-label="i18n.baseText('generic.delete')"
								@click.stop="removeNode(chip.setIndex, nodeIndex)"
							>
								<N8nIcon icon="x" size="xsmall" />
							</button>
						</div>
					</div>
				</Teleport>
			</span>
		</template>
		<button
			v-if="showCollapseToggle"
			type="button"
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

.chipAnchor {
	display: inline-flex;
}

.panel {
	// Teleported to <body>; positioned via inline top/left from the chip's rect.
	position: fixed;
	z-index: 9999;
	padding: var(--spacing--3xs);
	border: var(--border);
	border-radius: var(--radius);
	background: var(--background--surface);
	box-shadow: var(--shadow--sm);
	min-width: 160px;
}

.panelRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs) 0;
	font-size: var(--font-size--2xs);
	color: var(--color--text--shade-1);

	&:focus-visible {
		outline: 2px solid var(--color--primary);
		outline-offset: 2px;
	}
}

.panelRowIcon {
	flex-shrink: 0;
}

.panelRowName {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	// overflow:hidden clips the bottom ~1px of descenders when line-height == font-size
	line-height: var(--line-height--md);
}

.panelRemove {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border: none;
	background: none;
	padding: 0;
	cursor: pointer;
	color: var(--color--text--shade-1);
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
