<script setup lang="ts">
import { N8nIcon, N8nIconButton } from '@n8n/design-system';

import PaneShell from './PaneShell.vue';
import type { OutlineRow } from '../composables/useOutline';

/**
 * The document as a list. Depth is an indent, region headings appear only where
 * a component has more than one drop point, and the root has no controls
 * because it can be neither moved nor deleted.
 */
defineOptions({ name: 'OutlinePane' });

defineProps<{
	rows: OutlineRow[];
	count: number;
	selectedId?: string;
	selectedRegion?: { id: string; region: string };
	disabled?: boolean;
	indentOf: (depth: number) => Record<string, string>;
}>();

const emit = defineEmits<{
	select: [id: string];
	selectRegion: [ref: { id: string; region: string }];
	move: [id: string, delta: number];
	remove: [id: string];
	toggleCollapsed: [id: string];
}>();
</script>

<template>
	<PaneShell title="Outline" flush>
		<template #header>
			<span class="ui-outline__count">{{ count }}</span>
		</template>

		<template v-for="row in rows" :key="row.key">
			<div v-if="row.kind === 'region'" class="ui-outline__region" :style="indentOf(row.depth)">
				{{ row.label }}
			</div>

			<!--
				A fixed pseudo-component (the frame's header, pages or footer): a full
				peer of the node row below it, disclosure, icon and bold label
				included, but selects a region rather than a node and offers no
				move/delete controls, the same as the root.
			-->
			<div
				v-else-if="row.kind === 'pseudo'"
				class="ui-outline__row"
				:class="{
					'ui-outline__row--selected':
						selectedRegion?.id === row.nodeId && selectedRegion?.region === row.region,
				}"
			>
				<button
					type="button"
					class="ui-outline__label"
					:style="indentOf(row.depth)"
					@click="emit('selectRegion', { id: row.nodeId, region: row.region })"
				>
					<N8nIconButton
						v-if="row.hasChildren"
						variant="ghost"
						size="xsmall"
						:icon="row.collapsed ? 'chevron-right' : 'chevron-down'"
						:aria-label="row.collapsed ? 'Expand' : 'Collapse'"
						class="ui-outline__disclosure"
						@click.stop="emit('toggleCollapsed', row.key)"
					/>
					<span v-else class="ui-outline__disclosure-spacer" />
					<N8nIcon v-if="row.icon" :icon="row.icon" size="small" class="ui-outline__icon" />
					<span class="ui-outline__name">{{ row.label }}</span>
				</button>
			</div>

			<div
				v-else
				class="ui-outline__row"
				:class="{ 'ui-outline__row--selected': row.id === selectedId }"
			>
				<button
					type="button"
					class="ui-outline__label"
					:style="indentOf(row.depth)"
					@click="emit('select', row.id)"
				>
					<N8nIconButton
						v-if="row.hasChildren"
						variant="ghost"
						size="xsmall"
						:icon="row.collapsed ? 'chevron-right' : 'chevron-down'"
						:aria-label="row.collapsed ? 'Expand' : 'Collapse'"
						class="ui-outline__disclosure"
						@click.stop="emit('toggleCollapsed', row.id)"
					/>
					<span v-else class="ui-outline__disclosure-spacer" />
					<N8nIcon v-if="row.icon" :icon="row.icon" size="small" class="ui-outline__icon" />
					<span class="ui-outline__name">{{ row.label }}</span>
					<span class="ui-outline__id">{{ row.id }}</span>
				</button>

				<div v-if="!row.isRoot" class="ui-outline__actions">
					<N8nIconButton
						variant="ghost"
						size="xsmall"
						icon="chevron-up"
						aria-label="Move up"
						:disabled="disabled || !row.canMoveUp"
						@click="emit('move', row.id, -1)"
					/>
					<N8nIconButton
						variant="ghost"
						size="xsmall"
						icon="chevron-down"
						aria-label="Move down"
						:disabled="disabled || !row.canMoveDown"
						@click="emit('move', row.id, 1)"
					/>
					<N8nIconButton
						variant="ghost"
						size="xsmall"
						icon="trash-2"
						aria-label="Delete"
						:disabled="disabled"
						@click="emit('remove', row.id)"
					/>
				</div>
			</div>
		</template>
	</PaneShell>
</template>

<style scoped>
.ui-outline__count {
	font-variant-numeric: tabular-nums;
}

.ui-outline__row {
	display: flex;
	align-items: center;
}

.ui-outline__row:hover {
	background-color: var(--background--hover);
}

.ui-outline__row:hover .ui-outline__actions,
.ui-outline__row:focus-within .ui-outline__actions {
	visibility: visible;
}

/*
 * Compounded with the row rather than standing alone, so a selected row still
 * reads as selected while the pointer is over it.
 */
.ui-outline__row.ui-outline__row--selected {
	background-color: var(--background--active);
}

.ui-outline__row--selected .ui-outline__actions {
	visibility: visible;
}

.ui-outline__label {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--3xs);
	flex: 1;
	min-width: 0;
	padding: var(--spacing--5xs) var(--spacing--2xs);
	border: none;
	background: none;
	color: inherit;
	font-size: var(--font-size--2xs);
	text-align: left;
	cursor: pointer;
}

.ui-outline__name {
	white-space: nowrap;
}

/*
 * Sized to the disclosure button it stands in for, so a leaf row's label
 * lines up with an expandable one instead of shifting left.
 */
.ui-outline__disclosure,
.ui-outline__disclosure-spacer {
	flex-shrink: 0;
}

.ui-outline__disclosure-spacer {
	width: var(--height--xs);
}

/*
 * An icon marks a row that is fixed rather than composed: the app frame, and
 * its header/pages/footer pseudo-components below it.
 */
.ui-outline__icon {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.ui-outline__row:has(.ui-outline__icon) .ui-outline__name {
	font-weight: var(--font-weight--medium);
}

.ui-outline__id {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--3xs);
}

/* Held in the layout rather than removed, so rows do not jump on hover. */
.ui-outline__actions {
	display: flex;
	align-items: center;
	flex-shrink: 0;
	padding-right: var(--spacing--4xs);
	visibility: hidden;
}

.ui-outline__region {
	padding: var(--spacing--4xs) var(--spacing--2xs) var(--spacing--5xs);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.04em;
}
</style>
