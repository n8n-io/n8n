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

// A set of this many nodes or more renders as one bundle chip instead of per-node chips.
const NODE_BUNDLE_THRESHOLD = 2;

const props = defineProps<{
	attachment: InstanceAiNodesAttachment;
	isRemovable?: boolean;
	// Greyed-out preview of the current canvas selection: chips render dashed and a
	// click confirms the whole attachment into a real one instead of removing/expanding.
	unconfirmed?: boolean;
}>();
const emit = defineEmits<{
	'update:attachment': [attachment: InstanceAiNodesAttachment];
	'remove-all': [];
	confirm: [];
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
		if (set.nodes.length >= NODE_BUNDLE_THRESHOLD) {
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
	const rows = Array.from(panelRef.value?.querySelectorAll<HTMLElement>('[role="option"]') ?? []);

	if (!rows.length) {
		return;
	}
	const focusIndex = Math.min(removedIndex, rows.length - 1);
	rows[focusIndex]?.focus();
}

function closePanel() {
	expandedSetIndex.value = null;
	openChipRef.value?.focus();
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
// Chip anchors (the wrapper spans) keyed by setIndex — the open one's rect
// positions the teleported panel and scopes the focus-out check.
const chipAnchors = new Map<number, HTMLElement>();
const openChipAnchor = ref<HTMLElement | null>(null);
// The open chip component instance, so we can return focus to it on close.
type NodeChipInstance = { focus: () => void };
const chipRefs = new Map<number, NodeChipInstance>();
const openChipRef = ref<NodeChipInstance | null>(null);
const panelStyle = ref<Record<string, string>>({});

function setChipAnchor(setIndex: number, el: Element | null) {
	if (el) chipAnchors.set(setIndex, el as HTMLElement);
	else chipAnchors.delete(setIndex);
}

function setChipRef(setIndex: number, instance: NodeChipInstance | null) {
	if (instance) chipRefs.set(setIndex, instance);
	else chipRefs.delete(setIndex);
}

function positionPanel(setIndex: number) {
	const anchor = chipAnchors.get(setIndex) ?? null;
	openChipAnchor.value = anchor;
	openChipRef.value = chipRefs.get(setIndex) ?? null;
	if (!anchor) return;
	const rect = anchor.getBoundingClientRect();
	// Cap the panel to the space below the chip so a long list scrolls instead of
	// running off the bottom of the viewport and getting clipped.
	const maxHeight = Math.max(0, window.innerHeight - rect.bottom - 12);
	panelStyle.value = {
		top: `${rect.bottom + 4}px`,
		left: `${rect.left}px`,
		maxHeight: `${maxHeight}px`,
	};
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
	panelRef.value?.querySelector<HTMLElement>('[role="option"]')?.focus();
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
			:removable="!unconfirmed && isRemovable"
			:unconfirmed="unconfirmed"
			:expanded="null"
			@remove="emit('remove-all')"
			@confirm="emit('confirm')"
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
					:ref="(el) => setChipRef(chip.setIndex, el as NodeChipInstance | null)"
					:label="chip.label"
					:testid="chip.testid"
					:icon="chip.icon"
					:node-type="chip.nodeType"
					:removable="!unconfirmed && isRemovable"
					:unconfirmed="unconfirmed"
					:expanded="!unconfirmed && chip.panel ? expandedSetIndex === chip.setIndex : null"
					@remove="removeChip(chip)"
					@toggle-expand="toggleExpanded(chip.setIndex)"
					@enter-panel="enterPanel(chip.setIndex)"
					@confirm="emit('confirm')"
				/>
				<!-- Teleported to <body>: the chip lives inside the chat input's
				overflow-clipped `.leading` slot, which would otherwise crop the panel. -->
				<Teleport to="body">
					<div
						v-if="!unconfirmed && chip.panel && expandedSetIndex === chip.setIndex"
						:ref="(el) => (panelRef = el as HTMLElement | null)"
						:class="$style.panel"
						:style="panelStyle"
						data-test-id="nodes-chip-panel"
						@focusout="handlePanelFocusOut(chip.setIndex)"
					>
						<div
							v-for="(node, nodeIndex) in chip.panel"
							:key="node.id"
							:class="$style.panelRow"
							data-test-id="nodes-chip-panel-row"
							tabindex="-1"
							role="option"
							:aria-label="node.name"
							@keydown="handlePanelRowKeydown(chip.setIndex, nodeIndex, $event)"
						>
							<!-- Leading icon doubles as the remove control: node icon at rest, X on hover. -->
							<button
								v-if="isRemovable"
								type="button"
								:class="$style.panelRemove"
								data-test-id="nodes-chip-panel-remove"
								tabindex="-1"
								:aria-label="i18n.baseText('generic.delete')"
								@click.stop="removeNode(chip.setIndex, nodeIndex)"
							>
								<span :class="$style.panelRemoveX"><N8nIcon icon="x" size="large" /></span>
								<span :class="$style.panelRowLeadingIcon">
									<NodeIcon
										v-if="node.nodeType"
										:node-type="node.nodeType"
										:node="node.workflowNode ?? undefined"
										:size="16"
									/>
									<N8nIcon v-else icon="crosshair" size="large" />
								</span>
							</button>
							<template v-else>
								<NodeIcon
									v-if="node.nodeType"
									:node-type="node.nodeType"
									:node="node.workflowNode ?? undefined"
									:size="16"
									:class="$style.panelRowIcon"
								/>
								<N8nIcon v-else icon="crosshair" size="xsmall" />
							</template>
							<span :class="$style.panelRowName">{{ node.name }}</span>
						</div>
					</div>
				</Teleport>
			</span>
		</template>
		<button
			v-if="showCollapseToggle"
			type="button"
			:class="$style.collapseToggle"
			data-test-id="nodes-chips-collapse"
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
	overflow-y: auto;
}

.panelRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs) 0;
	font-size: var(--font-size--2xs);
	color: var(--color--text--shade-1);

	&:focus-visible {
		outline: var(--spacing--5xs) solid var(--color--primary);
		outline-offset: var(--spacing--5xs);
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
	position: relative;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: var(--spacing--sm);
	height: var(--spacing--sm);
	border: none;
	background: none;
	padding: 0;
	cursor: pointer;
	color: var(--color--text--shade-1);
}

.panelRemoveX,
.panelRowLeadingIcon {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
}

.panelRemoveX {
	opacity: 0;
}

// Hover/focus the row reveals the X and hides the resting node icon.
.panelRow:hover,
.panelRow:focus-visible {
	.panelRemoveX {
		opacity: 1;
	}

	.panelRowLeadingIcon {
		opacity: 0;
	}
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
