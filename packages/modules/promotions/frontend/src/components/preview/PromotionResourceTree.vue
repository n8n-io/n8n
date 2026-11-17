<script setup lang="ts">
import type { PromotionDirection, PromotionResource } from '@n8n/api-types';
import { N8nButton, N8nCheckbox, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { usePromotionPreviewLabels } from '../../composables/usePromotionPreviewLabels';
import type { OwnerMoveNote } from '../../promotionMoves';
import { blockersOf, type BlockerIndex } from '../../promotionOperation';
import { projectSelectableKeys, type ChangesProject } from '../../promotionPreview.projects';
import {
	availableKeys,
	keysCheckState,
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
		/** Only for the changes view of an environment: the projects that head the groups. */
		projects?: readonly ChangesProject[];
		/** The rows that a gap of the dependency report names: referenced, and not in the operation. */
		gapKeys?: ReadonlySet<ResourceKey>;
		/** Apply: the credentials whose owner changes on this instance, with the sentence that says so. */
		ownerMoves?: ReadonlyMap<ResourceKey, OwnerMoveNote>;
		/** The workflows that the Apply of the whole instance keeps, although the branch lacks them. */
		keptKeys?: ReadonlySet<ResourceKey>;
	}>(),
	{
		selectable: true,
		projects: () => [],
		gapKeys: () => new Set<ResourceKey>(),
		ownerMoves: () => new Map<ResourceKey, OwnerMoveNote>(),
		keptKeys: () => new Set<ResourceKey>(),
	},
);

const emit = defineEmits<{
	toggle: [key: ResourceKey];
	toggleContainer: [key: ResourceKey];
	/** The checkbox of a project group: every change of the project that users can add. */
	toggleKeys: [keys: ResourceKey[]];
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
	// A gap or a waiting project matters more than a warning of the check.
	const gap = props.gapKeys.has(resource.key)
		? i18n.baseText('promotions.preview.marker.gap')
		: undefined;
	const moves = props.ownerMoves.get(resource.key)?.allowed
		? i18n.baseText('promotions.preview.marker.ownerMove')
		: undefined;
	const kept = props.keptKeys.has(resource.key)
		? i18n.baseText('promotions.preview.marker.kept')
		: undefined;
	const needed = resource.neededByBranch
		? i18n.baseText('promotions.preview.marker.neededByBranch')
		: undefined;
	return { blocked, meta: blocked ? undefined : (gap ?? kept ?? moves ?? needed ?? meta), gap: !blocked && !!gap };
}

/** The header of a project group: its select-all checkbox, and why users cannot select in it. */
function projectHeader(projectId: string | undefined) {
	const project = props.projects.find(({ id }) => id === projectId);
	if (!project) return undefined;
	const keys = projectSelectableKeys(props.graph, project.id);
	const state = keysCheckState(keys, props.selected, props.disabled);
	const canAdd = keys.some((key) => !props.disabled.has(key));
	// The header stands for the project, so the count holds the items inside it. A project
	// whose only change is the project itself counts that one.
	const inside = keys.filter((key) => key !== `project:${project.id}`);
	const counted = inside.length > 0 ? inside : keys;
	return {
		project,
		keys,
		state,
		total: counted.length,
		selectedCount: counted.filter((key) => props.selected.has(key)).length,
		disabled: props.locked || (!canAdd && state === 'unchecked'),
		notice: !project.canOperate
			? i18n.baseText(`promotions.preview.tree.project.readOnly.${props.direction}`)
			: project.blocker
				? i18n.baseText('promotions.preview.tree.project.reviewOpen')
				: undefined,
	};
}

const rows = computed(() =>
	flattenPreviewTree(props.tree).map(({ item, indent }) => {
		const resource = props.graph.resources.get(item.id);
		return {
			item,
			indent,
			resource,
			header: item.kind === 'project' ? projectHeader(item.projectId) : undefined,
			// A project with a change of its own has a card. Its header opens it.
			hasCard: !!resource && resource.change !== 'unchanged',
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
			<template
				v-for="{ item, indent, resource, check, marker, header, hasCard } in rows"
				:key="item.id"
			>
				<li
					v-if="item.kind === 'section'"
					:class="$style.heading"
					:style="{ '--preview-tree--indent': indent }"
				>
					<N8nText step="2xs" bold color="text-base">
						{{ item.label }}
					</N8nText>
				</li>
				<li
					v-else-if="item.kind === 'project' && header"
					:class="[
						$style.row,
						$style.project,
						{ [$style.inspected]: inspectedKey === item.id, [$style.resource]: hasCard },
					]"
					data-test-id="promotion-preview-tree-project"
					:data-project-id="header.project.id"
				>
					<N8nCheckbox
						v-if="selectable"
						:model-value="header.state === 'checked'"
						:indeterminate="header.state === 'indeterminate'"
						:disabled="header.disabled"
						:aria-label="
							i18n.baseText('promotions.preview.tree.project.select', {
								interpolate: { project: header.project.name },
							})
						"
						data-test-id="promotion-preview-tree-project-checkbox"
						@update:model-value="emit('toggleKeys', header.keys)"
					/>
					<component
						:is="hasCard ? 'button' : 'span'"
						:type="hasCard ? 'button' : undefined"
						:class="[$style.name, { [$style.static]: !hasCard }]"
						:style="{ '--preview-tree--indent': 0 }"
						:aria-current="inspectedKey === item.id ? 'true' : undefined"
						@click="hasCard && emit('inspect', item.id)"
					>
						<N8nIcon v-if="item.icon" :icon="item.icon" size="small" :class="$style.icon" />
						<span :class="$style.text">
							<N8nText step="xs" bold color="text-dark" :class="$style.label">
								{{ item.label }}
							</N8nText>
						</span>
					</component>
					<N8nText
						step="2xs"
						color="text-light"
						:class="$style.meta"
						data-test-id="promotion-preview-tree-project-count"
					>
						{{
							header.keys.length === 0
								? i18n.baseText('promotions.preview.tree.project.empty')
								: i18n.baseText('promotions.preview.tree.project.count', {
										interpolate: {
											selected: String(header.selectedCount),
											total: String(header.total),
										},
									})
						}}
					</N8nText>
					<N8nTooltip v-if="header.notice" placement="right" as-child>
						<template #content>{{ header.notice }}</template>
						<span
							role="img"
							tabindex="0"
							:aria-label="header.notice"
							:class="$style.blockerMarker"
							data-test-id="promotion-preview-tree-project-notice"
						>
							<N8nIcon
								:icon="header.project.canOperate ? 'circle-alert' : 'lock'"
								size="small"
								:color="header.project.canOperate ? 'warning' : 'text-light'"
							/>
						</span>
					</N8nTooltip>
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
							<N8nText
								v-if="marker.meta"
								step="2xs"
								:color="marker.gap ? 'warning' : 'text-light'"
								:class="$style.meta"
								data-test-id="promotion-preview-tree-meta"
							>
								{{ marker.meta }}
							</N8nText>
						</span>
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
	padding-left: calc(var(--spacing--2xs) + var(--preview-tree--indent, 0) * var(--spacing--lg));
}

/* A project heads its group, so it stands apart from the group above it. */
.project:not(:first-child) {
	margin-top: var(--spacing--xs);
}

.static {
	cursor: default;
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
