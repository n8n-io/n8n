<script setup lang="ts">
import type { PromotionDirection, PromotionResource } from '@n8n/api-types';
import { N8nButton, N8nCheckbox, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { usePromotionPreviewLabels } from '../../composables/usePromotionPreviewLabels';
import { blockersOf, type BlockerIndex } from '../../promotionOperation';
import {
	availableKeys,
	groupCheck,
	rowHint,
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
		direction: PromotionDirection;
		blockers: BlockerIndex;
		/** False for a list that users only read, such as a review. Rows then only open their card. */
		selectable?: boolean;
	}>(),
	{ selectable: true },
);

const emit = defineEmits<{
	toggle: [key: ResourceKey];
	toggleContainer: [key: ResourceKey];
	toggleGroup: [keys: ResourceKey[]];
	selectAll: [];
	clear: [];
	inspect: [key: ResourceKey];
	showBlockers: [];
}>();

const i18n = useI18n();
const { blockerMessage, outsideMessage, selectLabel } = usePromotionPreviewLabels();

function markers(resource: PromotionResource) {
	const blockers = blockersOf(props.blockers, resource);
	const blocked = blockerMessage(resource, blockers);
	const meta =
		resource.type !== 'workflow' && blockers?.some(({ kind }) => kind === 'warning')
			? i18n.baseText('promotions.preview.marker.warning')
			: undefined;
	return { blocked, meta: blocked ? undefined : meta, outside: outsideMessage(resource, blockers) };
}

/**
 * What the row says about its dependencies, as an icon and a number. The text goes in a tooltip,
 * so a row stays short however many workflows need a resource.
 */
function hintOf(resource: PromotionResource) {
	// A list that users only read has no selection to explain.
	if (!props.selectable) return undefined;
	const hint = rowHint(props.graph, props.inclusion, resource);
	if (!hint) return undefined;
	if (hint.kind === 'uses') {
		return {
			icon: 'link' as const,
			count: hint.count,
			text: i18n.baseText('promotions.preview.tree.hint.uses', {
				adjustToNumber: hint.count,
				interpolate: { count: String(hint.count) },
			}),
		};
	}
	const names = hint.names.join(', ');
	return {
		icon: 'lock' as const,
		count: hint.names.length + hint.more,
		text:
			hint.more > 0
				? i18n.baseText('promotions.preview.tree.hint.requiredByMore', {
						interpolate: { names, count: String(hint.more) },
					})
				: i18n.baseText('promotions.preview.tree.hint.requiredBy', { interpolate: { names } }),
	};
}

const rows = computed(() =>
	flattenPreviewTree(props.tree).map(({ item, indent }) => {
		const resource = props.graph.resources.get(item.id);
		return {
			item,
			indent,
			group: item.memberKeys
				? groupCheck(props.graph, props.inclusion, item.memberKeys, props.disabled)
				: undefined,
			hint: resource ? hintOf(resource) : undefined,
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
		<template v-if="selectable">
			<div :class="$style.row">
				<N8nCheckbox
					:model-value="allState === 'checked'"
					:indeterminate="allState === 'indeterminate'"
					:disabled="locked || (available.length === 0 && allState === 'unchecked')"
					:aria-label="i18n.baseText('promotions.preview.tree.selectAll')"
					data-test-id="promotion-preview-select-all"
					@update:model-value="allState === 'checked' ? emit('clear') : emit('selectAll')"
				/>
				<N8nText step="xs" bold color="text-dark" :class="$style.selectAllLabel">
					{{ i18n.baseText('promotions.preview.tree.selectAll') }}
				</N8nText>
				<!-- Short on screen, in full for screen readers. -->
				<N8nText
					step="xs"
					color="text-light"
					role="img"
					:aria-label="
						i18n.baseText('promotions.preview.tree.selectedOfTotal', {
							interpolate: { selected: String(includedChanges), total: String(totalChanges) },
						})
					"
					data-test-id="promotion-preview-counts"
				>
					{{
						i18n.baseText('promotions.preview.tree.count', {
							interpolate: { selected: String(includedChanges), total: String(totalChanges) },
						})
					}}
				</N8nText>
			</div>
			<span :class="$style.separator" aria-hidden="true" />
		</template>

		<ul :class="$style.list" role="list">
			<template
				v-for="({ item, indent, resource, check, marker, group, hint }, index) in rows"
				:key="item.id"
			>
				<li
					v-if="item.kind === 'section' && index > 0"
					:class="$style.separatorItem"
					role="presentation"
				>
					<span :class="$style.separator" aria-hidden="true" />
				</li>
				<li
					v-if="item.kind === 'section'"
					:class="$style.heading"
					data-test-id="promotion-preview-tree-group"
					:data-group-id="item.id"
				>
					<N8nCheckbox
						v-if="selectable && group"
						:model-value="group.state === 'checked'"
						:indeterminate="group.state === 'indeterminate'"
						:disabled="locked || !group.canToggle"
						:aria-label="
							i18n.baseText('promotions.preview.tree.group.select', {
								interpolate: { group: item.label },
							})
						"
						data-test-id="promotion-preview-group-checkbox"
						@update:model-value="emit('toggleGroup', item.memberKeys ?? [])"
					/>
					<N8nText step="xs" bold color="text-dark" :class="$style.groupLabel">
						{{ item.label }}
					</N8nText>
					<N8nText
						v-if="selectable && group"
						step="2xs"
						color="text-light"
						role="img"
						:aria-label="
							i18n.baseText('promotions.preview.tree.group.count', {
								interpolate: { included: String(group.included), total: String(group.total) },
							})
						"
						data-test-id="promotion-preview-group-count"
					>
						{{
							i18n.baseText('promotions.preview.tree.count', {
								interpolate: { selected: String(group.included), total: String(group.total) },
							})
						}}
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
						<!-- Plain text: a workflow name is not HTML. -->
						<N8nTooltip v-if="hint && !marker.blocked" placement="right" as-child>
							<template #content>{{ hint.text }}</template>
							<span
								role="img"
								:aria-label="hint.text"
								:class="$style.hint"
								data-test-id="promotion-preview-tree-hint"
							>
								<N8nIcon :icon="hint.icon" size="xsmall" />
								<N8nText step="2xs" color="text-light">{{ hint.count }}</N8nText>
							</span>
						</N8nTooltip>
					</button>
					<!-- Only Apply has a Blockers tab to open, so Promote shows a plain marker. As the
					trigger itself, each one opens the tooltip on keyboard focus. -->
					<N8nTooltip v-if="marker.blocked" placement="right" as-child>
						<!-- Plain text: a personal project name such as `Name <email>` is not HTML. -->
						<template #content>{{ marker.blocked }}</template>
						<N8nButton
							v-if="direction === 'apply'"
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
						<span
							v-else
							role="img"
							tabindex="0"
							:aria-label="marker.blocked"
							:class="$style.blockerMarker"
							data-test-id="promotion-preview-tree-blocker"
						>
							<N8nIcon icon="circle-alert" size="small" color="warning" />
						</span>
					</N8nTooltip>
					<!-- A dependency outside the access of the user does not stop the workflow, so the row
					keeps its colors and gets a quiet marker. It opens the Issues tab like the other one. -->
					<N8nTooltip v-else-if="marker.outside" placement="right" as-child>
						<template #content>{{ marker.outside }}</template>
						<N8nButton
							variant="ghost"
							size="xsmall"
							icon-only
							:aria-label="marker.outside"
							data-test-id="promotion-preview-tree-outside"
							@click="emit('showBlockers')"
						>
							<template #icon>
								<N8nIcon icon="lock" size="small" color="text-light" />
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
.resource {
	padding-left: calc(var(--spacing--2xs) + var(--spacing--xs));
}

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
	gap: var(--spacing--2xs);
	min-height: var(--height--sm);
	padding: 0 var(--spacing--2xs);
}

.groupLabel {
	flex: 1;
	font-weight: var(--font-weight--bold);
}

.summary {
	padding: 0 var(--spacing--2xs) var(--spacing--3xs);
}

.hint {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	flex-shrink: 0;
	margin-left: auto;
	color: var(--text-color--subtler);
	white-space: nowrap;
}

.selectAllLabel {
	flex: 1;
}

.separator {
	display: block;
	height: var(--border-width);
	margin: var(--spacing--2xs) 0;
	background-color: var(--border-color);
}

.separatorItem {
	list-style: none;
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

.blockerMarker {
	display: inline-flex;
	align-items: center;
	padding: var(--spacing--5xs);

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--outline-color);
	}
}

.meta {
	flex-shrink: 0;
	white-space: nowrap;
}
</style>
