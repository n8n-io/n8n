<script setup lang="ts">
import type { PromotionDirection, PromotionResource } from '@n8n/api-types';
import {
	N8nButton,
	N8nCheckbox,
	N8nIcon,
	N8nText,
	N8nTooltip,
	type IconName,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { usePromotionPreviewLabels } from '../../composables/usePromotionPreviewLabels';
import { blockersOf, type BlockerIndex } from '../../promotionOperation';
import type { PromotionOutsideAccessDependency } from '../../promotions.types';
import {
	availableKeys,
	groupCheck,
	selectionCheck,
	type DisabledKeys,
	type Inclusion,
	type ResourceKey,
	type SelectionGraph,
} from '../../promotionPreview.selection';
import {
	flattenPreviewTree,
	isContainer,
	resourceIcon,
	type PreviewTreeItem,
} from '../../promotionPreview.tree';

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
		/** Dependencies that cannot be promoted or applied. They show last, with a lock. */
		outsideAccess?: PromotionOutsideAccessDependency[];
	}>(),
	{ selectable: true, outsideAccess: () => [] },
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
	return {
		blocked,
		meta: blocked ? undefined : meta,
		outside: outsideMessage(resource, blockers, props.direction),
	};
}

type OutsideRow = {
	key: string;
	name: string;
	icon: IconName;
	text: string;
	/** Nesting, when it differs from the row before. A workflow nests below its project. */
	indent?: number;
};

type DisplayRow = {
	item: PreviewTreeItem;
	indent: number;
	group?: ReturnType<typeof groupCheck>;
	resource?: PromotionResource;
	check?: ReturnType<typeof selectionCheck>;
	marker?: ReturnType<typeof markers>;
	outside?: OutsideRow;
};

const rows = computed<DisplayRow[]>(() =>
	flattenPreviewTree(props.tree).map(({ item, indent }) => {
		const resource = props.graph.resources.get(item.id);
		return {
			item,
			indent,
			group: item.memberKeys ? groupCheck(props.inclusion, item.memberKeys) : undefined,
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

// A dependency outside the access of the user is not in the project, so the tree does not hold it.
// It becomes the last item of the group for its type, muted, with a disabled box and a lock. It
// counts in the group, although users cannot select it.
const SECTION_OF = {
	workflow: 'section:workflows',
	credential: 'group:credential',
	variable: 'group:variable',
} as const;

function rowOf(dependency: PromotionOutsideAccessDependency, indent?: number): OutsideRow {
	return {
		key: `${dependency.kind}:${dependency.name}`,
		name: dependency.name,
		icon: resourceIcon(dependency.kind),
		text: i18n.baseText(
			dependency.reason === 'personal'
				? `promotions.preview.tree.outside.row.personal.${props.direction}`
				: `promotions.preview.tree.outside.row.outside.${props.direction}`,
		),
		indent,
	};
}

/**
 * Workflows nest below the project that holds them, like the other workflows. Where the project is
 * hidden, they share one row, "Other projects".
 */
function workflowRows(dependencies: readonly PromotionOutsideAccessDependency[]): OutsideRow[] {
	const byProject = new Map<string, PromotionOutsideAccessDependency[]>();
	for (const dependency of dependencies) {
		const key = dependency.project?.id ?? '';
		byProject.set(key, [...(byProject.get(key) ?? []), dependency]);
	}
	// The known projects come first, in the order they appear. The hidden ones come last.
	const ordered = [...byProject].sort(([a], [b]) => Number(a === '') - Number(b === ''));
	return ordered.flatMap(([id, list]) => [
		{
			key: `project:${id || 'other'}`,
			name: id
				? (list[0]?.project?.name ?? '')
				: i18n.baseText('promotions.preview.tree.outside.unknownProject'),
			icon: resourceIcon('project'),
			text: i18n.baseText(
				`promotions.preview.tree.outside.project.${id ? 'known' : 'unknown'}.${props.direction}`,
			),
			indent: 0,
		},
		...list.map((dependency) => rowOf(dependency, 1)),
	]);
}

const outsideBySection = computed(() => {
	const bySection = new Map<string, OutsideRow[]>();
	for (const kind of ['workflow', 'credential', 'variable'] as const) {
		const list = props.outsideAccess.filter((dependency) => dependency.kind === kind);
		if (list.length === 0) continue;
		bySection.set(
			SECTION_OF[kind],
			kind === 'workflow' ? workflowRows(list) : list.map((d) => rowOf(d)),
		);
	}
	return bySection;
});

// A project row does not count. Only the dependencies do.
const outsideCount = (sectionId: string) =>
	props.outsideAccess.filter((dependency) => SECTION_OF[dependency.kind] === sectionId).length;

function sectionLabel(sectionId: string) {
	return sectionId === SECTION_OF.workflow
		? i18n.baseText('promotions.preview.tree.section.workflows')
		: i18n.baseText(
				sectionId === SECTION_OF.credential
					? 'promotions.preview.tree.group.credential'
					: 'promotions.preview.tree.group.variable',
			);
}

/** The rows, with the outside dependencies at the end of their groups. */
const displayRows = computed(() => {
	const remaining = new Map(outsideBySection.value);
	const result: DisplayRow[] = [];
	let current: string | undefined;
	let indent = 0;
	const flush = () => {
		for (const outside of (current && remaining.get(current)) || []) {
			result.push({
				item: { id: outside.key, label: outside.name, kind: 'resource' },
				indent: outside.indent ?? indent,
				outside,
			});
		}
		if (current) remaining.delete(current);
	};
	for (const row of rows.value) {
		if (row.item.kind === 'section') {
			flush();
			current = row.item.id;
		} else {
			indent = row.indent;
		}
		result.push(row);
	}
	flush();
	// A group that holds only outside dependencies has no row of its own yet.
	for (const [sectionId, list] of remaining) {
		result.push({
			item: { id: sectionId, label: sectionLabel(sectionId), kind: 'section' },
			indent: 0,
		});
		for (const outside of list) {
			result.push({
				item: { id: outside.key, label: outside.name, kind: 'resource' },
				indent: outside.indent ?? 0,
				outside,
			});
		}
	}
	return result;
});

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
					:disabled="locked"
					:aria-label="i18n.baseText('promotions.preview.tree.selectAll')"
					data-test-id="promotion-preview-select-all"
					@update:model-value="allState === 'checked' ? emit('clear') : emit('selectAll')"
				/>
				<N8nText step="xs" bold color="text-dark" :class="$style.selectAllLabel">
					{{ i18n.baseText('promotions.preview.tree.selectAll') }}
				</N8nText>
			</div>
			<span :class="$style.separator" aria-hidden="true" />
		</template>

		<ul :class="$style.list" role="list">
			<template
				v-for="({ item, indent, resource, check, marker, group, outside }, index) in displayRows"
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
						:disabled="locked"
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
						<!-- Inside the label, so the count looks like the title. -->
						<span
							v-if="group || outsideCount(item.id) > 0"
							data-test-id="promotion-preview-group-total"
							>({{ (group?.total ?? 0) + outsideCount(item.id) }})</span
						>
					</N8nText>
				</li>
				<li
					v-else-if="resource && check && marker"
					:class="[$style.row, $style.resource, { [$style.inspected]: inspectedKey === item.id }]"
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
								<N8nIcon icon="triangle-alert" size="small" color="warning" />
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
							<N8nIcon icon="triangle-alert" size="small" color="warning" />
						</span>
					</N8nTooltip>
					<!-- A dependency that cannot be promoted or applied does not block the operation, so the row
					keeps its colors and gets a muted warning at the right edge, unlike the amber marker of an issue to resolve. It opens
					the Issues tab. -->
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
								<N8nIcon icon="triangle-alert" size="small" color="text-light" />
							</template>
						</N8nButton>
					</N8nTooltip>
				</li>
				<li
					v-else-if="outside"
					:class="[$style.row, $style.resource, $style.outsideRow]"
					data-test-id="promotion-preview-tree-outside-row"
				>
					<N8nCheckbox
						v-if="selectable"
						:model-value="false"
						:disabled="true"
						:aria-label="
							i18n.baseText('promotions.preview.select', { interpolate: { name: outside.name } })
						"
						data-test-id="promotion-preview-tree-outside-checkbox"
					/>
					<span :class="$style.name" :style="{ '--preview-tree--indent': indent }">
						<N8nIcon :icon="outside.icon" size="small" :class="$style.icon" />
						<N8nText step="xs" color="text-light" :class="$style.label">{{ outside.name }}</N8nText>
					</span>
					<N8nTooltip placement="right" as-child>
						<template #content>{{ outside.text }}</template>
						<span
							role="img"
							tabindex="0"
							:aria-label="outside.text"
							:class="$style.outsideLock"
							data-test-id="promotion-preview-tree-outside-lock"
						>
							<N8nIcon icon="lock" size="small" />
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

.heading {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-height: var(--height--sm);
	padding: 0 var(--spacing--2xs);
}

.groupLabel {
	font-weight: var(--font-weight--bold);
}

.summary {
	padding: 0 var(--spacing--2xs) var(--spacing--3xs);
}

.outsideLock {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	// The size of the icon-only button of the warning markers, so the icons line up.
	width: var(--height--xs);
	height: var(--height--xs);
	color: var(--text-color--subtler);
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
