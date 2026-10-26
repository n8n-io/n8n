<script setup lang="ts">
import type { PromotionResource } from '@n8n/api-types';
import { N8nButton, N8nCheckbox, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { usePromotionPreviewLabels } from '../../composables/usePromotionPreviewLabels';
import { blockersOf, type BlockerIndex } from '../../promotionOperation';
import {
	availableKeys,
	selectionCheck,
	type DisabledKeys,
	type Inclusion,
	type ResourceKey,
	type SelectionGraph,
} from '../../promotionPreview.selection';
import { flattenPreviewTree, isContainer, type PreviewTreeItem } from '../../promotionPreview.tree';

const props = withDefaults(
	defineProps<{
		tree: PreviewTreeItem[];
		graph: SelectionGraph;
		selected: ReadonlySet<ResourceKey>;
		inclusion: Inclusion;
		/** Included changes, out of the total in the tab above the tree. */
		includedChanges: number;
		totalChanges: number;
		inspectedKey?: ResourceKey;
		/** Blocked workflows, which users cannot add. */
		disabled: DisabledKeys;
		locked: boolean;
		blockers: BlockerIndex;
		/** False for a list that users only read, such as a review. Rows then only open their card. */
		selectable?: boolean;
	}>(),
	{ selectable: true },
);

const emit = defineEmits<{
	toggle: [key: ResourceKey];
	toggleContainer: [key: ResourceKey];
	selectAll: [];
	clear: [];
	inspect: [key: ResourceKey];
	showBlockers: [];
}>();

const i18n = useI18n();
const { blockerMessage, selectLabel } = usePromotionPreviewLabels();

function markers(resource: PromotionResource) {
	const blockers = blockersOf(props.blockers, resource);
	const blocked = blockerMessage(resource, blockers);
	const meta =
		resource.type !== 'workflow' && blockers?.some(({ kind }) => kind === 'warning')
			? i18n.baseText('promotions.preview.marker.warning')
			: undefined;
	return { blocked, meta: blocked ? undefined : meta };
}

const rows = computed(() =>
	flattenPreviewTree(props.tree).map(({ item, indent }) => {
		const resource = props.graph.resources.get(item.id);
		return {
			item,
			indent,
			resource,
			check: resource
				? selectionCheck(props.graph, resource, {
						selected: props.selected,
						inclusion: props.inclusion,
						disabled: props.disabled,
						locked: props.locked,
					})
				: undefined,
			marker: resource ? markers(resource) : undefined,
		};
	}),
);

const available = computed(() => availableKeys(props.graph, props.disabled));

const allState = computed(() => {
	if (props.selected.size === 0) return 'unchecked';
	return available.value.every((key) => props.selected.has(key)) ? 'checked' : 'indeterminate';
});

function onToggle(resource: PromotionResource) {
	if (isContainer(resource)) emit('toggleContainer', resource.key);
	else emit('toggle', resource.key);
}
</script>

<template>
	<div :class="$style.tree" data-test-id="promotion-preview-tree">
		<div v-if="selectable" :class="$style.row">
			<N8nCheckbox
				:model-value="allState === 'checked'"
				:indeterminate="allState === 'indeterminate'"
				:disabled="locked || (available.length === 0 && allState === 'unchecked')"
				:aria-label="i18n.baseText('promotions.preview.tree.selectAll')"
				data-test-id="promotion-preview-select-all"
				@update:model-value="allState === 'checked' ? emit('clear') : emit('selectAll')"
			/>
			<N8nText step="xs" color="text-base" data-test-id="promotion-preview-counts">
				{{
					i18n.baseText('promotions.preview.tree.selectedOfTotal', {
						adjustToNumber: totalChanges,
						interpolate: {
							selected: String(includedChanges),
							total: String(totalChanges),
						},
					})
				}}
			</N8nText>
		</div>

		<ul :class="$style.list" role="list">
			<template v-for="{ item, indent, resource, check, marker } in rows" :key="item.id">
				<li v-if="item.kind === 'section'" :class="$style.heading">
					<N8nText step="2xs" bold color="text-base">
						{{ item.label }}
					</N8nText>
				</li>
				<li
					v-else-if="resource && check && marker"
					:class="[
						$style.row,
						$style.resource,
						{ [$style.inspected]: inspectedKey === item.id, [$style.blocked]: marker.blocked },
					]"
					data-test-id="promotion-preview-tree-row"
					:data-resource-key="item.id"
				>
					<N8nCheckbox
						v-if="selectable"
						:model-value="check.checked"
						:indeterminate="check.indeterminate"
						:disabled="check.disabled"
						:aria-label="selectLabel(resource)"
						data-test-id="promotion-preview-tree-checkbox"
						@update:model-value="onToggle(resource)"
					/>
					<button
						type="button"
						:class="$style.name"
						:style="{ '--preview-tree--indent': indent }"
						:aria-current="inspectedKey === item.id ? 'true' : undefined"
						@click="emit('inspect', item.id)"
					>
						<N8nIcon v-if="item.icon" :icon="item.icon" size="small" :class="$style.icon" />
						<span :class="$style.text">
							<N8nText step="xs" color="text-dark" :class="$style.label">{{ item.label }}</N8nText>
							<N8nText v-if="marker.meta" step="2xs" color="text-light" :class="$style.meta">
								{{ marker.meta }}
							</N8nText>
						</span>
					</button>
					<N8nTooltip v-if="marker.blocked" :content="marker.blocked" placement="right">
						<N8nButton
							variant="ghost"
							size="xsmall"
							icon-only
							:aria-label="marker.blocked"
							data-test-id="promotion-preview-tree-blocker"
							@click="emit('showBlockers')"
						>
							<template #icon>
								<N8nIcon icon="circle-alert" size="small" color="warning" />
							</template>
						</N8nButton>
					</N8nTooltip>
				</li>
			</template>
		</ul>
	</div>
</template>

<style module lang="scss">
.tree {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	overflow-y: auto;
	padding: var(--spacing--xs) var(--spacing--2xs);
}

.list {
	margin: 0;
	padding: 0;
	list-style: none;
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-height: var(--height--md);
	padding: 0 var(--spacing--2xs);
	border-radius: var(--radius--3xs);
}

/* The same hover and selection as the inbox list. Both colors are transparent, so they show on
   any page background. */
.resource:hover {
	background-color: var(--background--hover);
}

.inspected,
.inspected:hover {
	background-color: var(--background--active);
}

.resource.blocked {
	background-color: var(--callout--color--background--warning);
}

.heading {
	display: flex;
	align-items: center;
	min-height: var(--height--sm);
	padding: 0 var(--spacing--2xs);
}

.heading:not(:first-child) {
	margin-top: var(--spacing--xs);
}

.name {
	display: flex;
	flex: 1;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
	align-self: stretch;
	padding: 0;
	padding-left: calc(var(--preview-tree--indent) * var(--spacing--xs));
	border: none;
	background: none;
	text-align: left;
	cursor: pointer;

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--outline-color);
		outline-offset: calc(-1 * var(--focus--border-width));
	}
}

.icon {
	flex-shrink: 0;
	color: var(--icon-color);
}

.text {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.label {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.meta {
	flex-shrink: 0;
	white-space: nowrap;
}
</style>
