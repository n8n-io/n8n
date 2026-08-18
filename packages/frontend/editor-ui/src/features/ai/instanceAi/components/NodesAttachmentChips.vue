<script lang="ts" setup>
import { computed, inject, nextTick, ref } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { INodeTypeDescription } from 'n8n-workflow';
import type { InstanceAiNodesAttachment } from '@n8n/api-types';
import NodeChip from './NodeChip.vue';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { WorkflowIdKey } from '@/app/constants/injectionKeys';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { isNodeChipRemovalKey } from '../constants';

// Per ADO-5770 (N = 4). NOT the legacy CHIP_BUNDLE_THRESHOLD — different semantics:
// this only governs the single-lone-set explode/bundle decision.
const SINGLE_SET_NODE_EXPANSION_THRESHOLD = 4;

const props = defineProps<{ attachment: InstanceAiNodesAttachment; isRemovable?: boolean }>();
const emit = defineEmits<{
	'update:attachment': [attachment: InstanceAiNodesAttachment];
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

// name → node-type, built once per render instead of a linear scan per chip.
const nodeTypeByName = computed(() => {
	const map = new Map<string, INodeTypeDescription | null>();
	for (const node of workflowDocumentStore.value.allNodes) {
		map.set(node.name, nodeTypesStore.getNodeType(node.type));
	}
	return map;
});
const nodeTypeForName = (name: string | undefined) =>
	name ? (nodeTypeByName.value.get(name) ?? null) : null;

/**
 * A single rendered chip. The whole group/bundle/named/explode decision is made
 * here so the template just iterates — one shape, no per-branch markup.
 * `setIndex` (and `nodeIndex` for exploded/panel rows) point back at the source
 * data so removal edits the right slice.
 */
interface ChipVM {
	key: string;
	testid: 'nodes-chip-group' | 'nodes-chip-bundle' | 'nodes-chip-node';
	label: string;
	icon?: 'layers';
	nodeType?: INodeTypeDescription | null;
	setIndex: number;
	/** Present only for exploded single-node chips — removes one node, not the set. */
	nodeIndex?: number;
	/** Bundle-only: the per-node rows shown in the expand panel. */
	panel?: Array<{ id: string; name: string; nodeType: INodeTypeDescription | null }>;
}

const chips = computed<ChipVM[]>(() => {
	const sets = props.attachment.sets;

	// One lone, small, ungrouped set → explode to one chip per node.
	const only = sets[0];
	if (
		sets.length === 1 &&
		!only.canvasGroupId &&
		only.nodes.length < SINGLE_SET_NODE_EXPANSION_THRESHOLD
	) {
		return only.nodes.map((node, nodeIndex) => ({
			key: node.id,
			testid: 'nodes-chip-node',
			label: node.name ?? '',
			nodeType: nodeTypeForName(node.name),
			setIndex: 0,
			nodeIndex,
		}));
	}

	return sets.map((set, setIndex): ChipVM => {
		if (set.canvasGroupId) {
			return {
				key: `set-${setIndex}`,
				testid: 'nodes-chip-group',
				label: set.canvasGroupName ?? '',
				icon: 'layers',
				setIndex,
			};
		}
		// >1 node → bundle with expand panel. (A single small set already
		// exploded above; a single large set has length > 1, so it lands here too.)
		if (set.nodes.length > 1) {
			return {
				key: `set-${setIndex}`,
				testid: 'nodes-chip-bundle',
				label: i18n.baseText('instanceAi.nodeContext.nodesBundle', {
					interpolate: { count: set.nodes.length },
				}),
				icon: 'layers',
				setIndex,
				panel: set.nodes.map((node) => ({
					id: node.id,
					name: node.name ?? '',
					nodeType: nodeTypeForName(node.name),
				})),
			};
		}
		const node = set.nodes[0];
		return {
			key: `set-${setIndex}`,
			testid: 'nodes-chip-node',
			label: node.name ?? '',
			nodeType: nodeTypeForName(node.name),
			setIndex,
		};
	});
});

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

/** A chip's remove button: exploded chips drop one node, everything else drops the set. */
function removeChip(chip: ChipVM) {
	if (chip.nodeIndex !== undefined) removeNode(chip.setIndex, chip.nodeIndex);
	else removeSet(chip.setIndex);
}

// Native <button> already handles Enter/Space for remove; X/Delete/Backspace and
// arrow-key row navigation are wired here. stopPropagation keeps the canvas/logs
// panel's own document-level shortcuts from also firing (see NodeChip.vue).
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
		closePanel(event.currentTarget as HTMLElement);
	}
}

function focusAdjacentPanelRow(currentRow: HTMLElement, direction: 1 | -1) {
	const rows = Array.from(currentRow.parentElement?.children ?? []) as HTMLElement[];
	const nextRow = rows[rows.indexOf(currentRow) + direction];
	nextRow?.focus(); // out of range → no-op, focus stays on the current row
}

// After a keyboard removal, focus what took the removed row's place — the row
// that shifted up into its index, or the new last row if it was the bottom one.
async function focusPanelRowAfterRemoval(removedIndex: number) {
	await nextTick();
	const rows = Array.from(
		containerRef.value?.querySelectorAll('[data-testid="nodes-chip-panel-row"]') ?? [],
	) as HTMLElement[];

	if (!rows.length) {
		// the set (and its panel) was removed along with the last node
		return;
	}
	const focusIndex = Math.min(removedIndex, rows.length - 1);
	rows[focusIndex]?.focus();
}

// Closes the panel and hands focus back to the chip that opened it (the
// panel's previous sibling within their shared anchor — see the template).
function closePanel(row: HTMLElement) {
	expandedSetIndex.value = null;
	const panel = row.closest('[data-testid="nodes-chip-panel"]');
	(panel?.previousElementSibling as HTMLElement | null)?.focus();
}

// Close the panel once focus leaves the chip+panel pair (e.g. Tab out), so it
// doesn't stay floating open over whatever's focused now. Deferred to a
// macrotask — a keyboard removal destroys the focused row and fires this with
// a null relatedTarget an instant before its own refocus lands.
function handlePanelFocusOut(setIndex: number, event: FocusEvent) {
	if (expandedSetIndex.value !== setIndex) {
		return;
	}
	const anchor = event.currentTarget as HTMLElement;
	setTimeout(() => {
		if (expandedSetIndex.value !== setIndex) {
			return;
		}
		if (anchor.contains(document.activeElement)) {
			return; // focus landed back inside the chip/panel — stays open
		}
		expandedSetIndex.value = null;
	}, 0);
}

// which bundled set's panel is open (index into attachment.sets), null = none open
const expandedSetIndex = ref<number | null>(null);
const containerRef = ref<HTMLElement | null>(null);
function toggleExpanded(index: number) {
	expandedSetIndex.value = expandedSetIndex.value === index ? null : index;
}

// ArrowDown on a collapsed chip: open its panel (if needed) and jump straight
// into the first row, instead of requiring a separate Enter to expand first.
async function enterPanel(setIndex: number) {
	expandedSetIndex.value = setIndex;
	await nextTick();
	containerRef.value?.querySelector<HTMLElement>('[data-testid="nodes-chip-panel-row"]')?.focus();
}

// Collapse/expand toggle only earns its keep once there's enough chips to skim past.
const COLLAPSE_CHIP_THRESHOLD = 6;
const isCollapsed = ref(false);
const showCollapseToggle = computed(() => chips.value.length > COLLAPSE_CHIP_THRESHOLD);
const totalNodeCount = computed(() =>
	props.attachment.sets.reduce((sum, set) => sum + set.nodes.length, 0),
);

// inputNode/outputNode are send-time context only — intentionally never rendered.
</script>

<template>
	<div ref="containerRef" :class="$style.container">
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
			@remove="emit('remove-all')"
		/>
		<template v-else>
			<span
				v-for="chip in chips"
				:key="chip.key"
				:class="$style.chipAnchor"
				@focusout="handlePanelFocusOut(chip.setIndex, $event)"
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
				<div
					v-if="chip.panel && expandedSetIndex === chip.setIndex"
					:class="$style.panel"
					data-testid="nodes-chip-panel"
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
						<NodeIcon v-if="node.nodeType" :node-type="node.nodeType" :size="12" />
						<N8nIcon v-else icon="crosshair" size="xsmall" />
						<span :class="$style.panelRowName">{{ node.name }}</span>
						<button
							v-if="isRemovable"
							:class="$style.panelRemove"
							data-testid="nodes-chip-panel-remove"
							tabindex="-1"
							@click.stop="removeNode(chip.setIndex, nodeIndex)"
						>
							<N8nIcon icon="x" size="xsmall" />
						</button>
					</div>
				</div>
			</span>
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

// Anchors the absolutely-positioned expand panel to its chip.
.chipAnchor {
	position: relative;
	display: inline-flex;
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

.panelRowName {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
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
