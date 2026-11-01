<script setup lang="ts">
import { computed, useCssModule } from 'vue';
import type {
	SkillListCollapsedSource,
	SkillListItem,
	SkillSourceListItem,
	SkillUserDto,
} from '@n8n/api-types';
import {
	N8nActionToggle,
	N8nBadge,
	N8nButton,
	N8nDataTableServer,
	N8nIcon,
	N8nStatusDot,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import type { IconName, TableHeader, TableOptions } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@n8n/stores/users.store';

import TimeAgo from '@/app/components/TimeAgo.vue';

import SkillAgentsCell from './SkillAgentsCell.vue';
import SkillScopeBadge from './SkillScopeBadge.vue';
import { PREFERENCES_PAGE_SIZES } from '../context.constants';
import { useSkillDeleteRule } from '../skills.utils';

type SkillAction =
	| 'edit'
	| 'timeline'
	| 'compare'
	| 'download'
	| 'reviewUpdate'
	| 'checkForUpdates'
	| 'stopSyncing'
	| 'delete';

/** The fields of the action toggle item that this menu uses. */
type SkillActionItem = {
	value: SkillAction;
	label: string;
	icon: IconName;
	disabled?: boolean;
	tooltip?: string;
	destructive?: boolean;
};

const props = defineProps<{
	skills: SkillListItem[];
	itemsLength: number;
	loading?: boolean;
	showAssistantAvailability?: boolean;
	/** The table renders its cover row whenever the slot exists, so the slot is withheld. */
	showEmpty?: boolean;
	showMcpAvailability?: boolean;
	/**
	 * The connected sources. When set, the rows group by source: the rows must arrive sorted
	 * by source, as `groupBy: 'source'` sorts them.
	 */
	sources?: SkillSourceListItem[];
	/** Sources with no skills, before the first row. They have no rows to head. */
	emptySources?: SkillSourceListItem[];
	/** The skills that each source gained since the user last imported from it, by source id. */
	newSkillCounts?: Record<string, number>;
	/** The sources that the user folded. */
	collapsedSourceIds?: string[];
	/** The folded sources on this page, each one row in place of its skills, as the server cut it. */
	collapsedSources?: SkillListCollapsedSource[];
}>();

const emit = defineEmits<{
	open: [skill: SkillListItem];
	timeline: [skill: SkillListItem];
	compare: [skill: SkillListItem];
	download: [skill: SkillListItem];
	reviewUpdate: [skill: SkillListItem];
	checkForUpdates: [skill: SkillListItem];
	stopSyncing: [skill: SkillListItem];
	delete: [skill: SkillListItem];
	addMore: [sourceId: string];
	toggleSource: [sourceId: string];
	deleteSource: [source: SkillSourceListItem];
	'update:options': [payload: TableOptions];
}>();

const tableOptions = defineModel<TableOptions>('tableOptions', { default: () => ({}) });

const i18n = useI18n();
const { deleteBlockedReason } = useSkillDeleteRule();
const usersStore = useUsersStore();

function actionsFor(skill: SkillListItem): SkillActionItem[] {
	const deleteBlocked = deleteBlockedReason(skill);
	return [
		{
			value: 'edit',
			// A read-only skill still opens, to read it.
			label: i18n.baseText(
				skill.canEdit
					? 'settings.context.skills.actions.edit'
					: 'settings.context.skills.actions.view',
			),
			icon: skill.canEdit ? 'pencil' : 'eye',
		},
		{
			value: 'timeline',
			label: i18n.baseText('settings.context.skills.actions.timeline'),
			icon: 'history',
		},
		{
			value: 'compare',
			label: i18n.baseText('settings.context.skills.actions.compare'),
			icon: 'file-diff',
			// A skill with one version has nothing to compare.
			disabled: skill.latestVersion < 2,
		},
		{
			value: 'download',
			label: i18n.baseText('settings.context.skills.actions.download'),
			icon: 'download',
		},
		// A synced skill whose source has an update. A user who cannot review reads it.
		...(hasUpdate(skill)
			? [
					{
						value: 'reviewUpdate' as const,
						label: i18n.baseText('settings.context.skills.actions.reviewUpdate'),
						icon: 'list-checks' as const,
					},
				]
			: []),
		// Only a synced skill that the user may change. It checks the whole source.
		...(skill.canCheckForUpdates
			? [
					{
						value: 'checkForUpdates' as const,
						label: i18n.baseText('settings.context.skills.checkForUpdates.action'),
						icon: 'refresh-cw' as const,
					},
				]
			: []),
		// Only a synced skill that the user may stop syncing.
		...(skill.canStopSyncing
			? [
					{
						value: 'stopSyncing' as const,
						label: i18n.baseText('settings.context.skills.stopSyncing.action'),
						icon: 'unlink' as const,
					},
				]
			: []),
		{
			value: 'delete',
			label: i18n.baseText('settings.context.skills.actions.delete'),
			icon: 'trash-2',
			disabled: deleteBlocked !== undefined,
			tooltip: deleteBlocked,
			destructive: true,
		},
	];
}

function onAction(skill: SkillListItem, action: SkillAction) {
	if (action === 'edit') emit('open', skill);
	else if (action === 'timeline') emit('timeline', skill);
	else if (action === 'compare') emit('compare', skill);
	else if (action === 'download') emit('download', skill);
	else if (action === 'reviewUpdate') emit('reviewUpdate', skill);
	else if (action === 'checkForUpdates') emit('checkForUpdates', skill);
	else if (action === 'stopSyncing') emit('stopSyncing', skill);
	else emit('delete', skill);
}

const sourcesById = computed(
	() => new Map((props.sources ?? []).map((source) => [source.id, source])),
);

/** The group of a row: its source. Skills that no source syncs get no group row. */
function groupOf(skill: SkillListItem): string | undefined {
	return skill.sourceId ?? undefined;
}

const $style = useCssModule();

/**
 * The sources that the user folded. The server leaves out their skills and counts each one
 * as a row. Until it answers, the table hides the rows of a source that the user just folded.
 */
const collapsed = computed(() => new Set(props.collapsedSourceIds ?? []));

const emptySourceIds = computed(() => new Set((props.emptySources ?? []).map(({ id }) => id)));

/** A source with no skills has nothing to fold. */
function canFold(sourceId: string): boolean {
	return !emptySourceIds.value.has(sourceId);
}

function toggleCollapsed(sourceId: string) {
	if (canFold(sourceId)) emit('toggleSource', sourceId);
}

function groupRowProps(sourceId: string) {
	return { class: canFold(sourceId) ? $style.groupRowFoldable : undefined };
}

type SourceAction = 'add' | 'open' | 'delete';

function sourceActions(source: SkillSourceListItem) {
	const items: Array<{
		value: SourceAction;
		label: string;
		icon: IconName;
		disabled?: boolean;
		tooltip?: string;
		destructive?: boolean;
	}> = [];
	if (source.canAddSkills) {
		items.push({
			value: 'add',
			label: i18n.baseText('settings.context.skills.more.title'),
			icon: 'plus',
		});
	}
	items.push({
		value: 'open',
		label: i18n.baseText('settings.context.sources.openGithub'),
		icon: 'external-link',
	});
	// A delete takes the skills of the source with it, so no agent may use one of them.
	if (source.canDelete) {
		items.push({
			value: 'delete',
			label: i18n.baseText('settings.context.sources.delete'),
			icon: 'trash-2',
			disabled: source.skillsInUse > 0,
			tooltip:
				source.skillsInUse > 0
					? i18n.baseText('settings.context.sources.delete.inUse', {
							interpolate: { count: source.skillsInUse },
							adjustToNumber: source.skillsInUse,
						})
					: undefined,
			destructive: true,
		});
	}
	return items;
}

function onSourceAction(sourceId: string, action: string) {
	const source = sourcesById.value.get(sourceId);
	if (!source) return;
	if (action === 'add') emit('addMore', source.id);
	else if (action === 'delete') emit('deleteSource', source);
	else window.open(source.webUrl, '_blank', 'noopener,noreferrer');
}

/** `owner/repo · branch`, as the import dialog names a source. */
function sourceName(sourceId: string): string {
	const source = sourcesById.value.get(sourceId);
	if (!source) return i18n.baseText('settings.context.skills.group.unknownSource');
	return [source.label, source.ref].filter(Boolean).join(' · ');
}

function skillCount(sourceId: string): string {
	const count = sourcesById.value.get(sourceId)?.skillCount ?? 0;
	return i18n.baseText('settings.context.skills.count', {
		interpolate: { count },
		adjustToNumber: count,
	});
}

/** The new skills of a source that the user can add to it. Zero hides the link. */
function newSkillCount(sourceId: string): number {
	if (!sourcesById.value.get(sourceId)?.canAddSkills) return 0;
	return props.newSkillCounts?.[sourceId] ?? 0;
}

/** A synced skill sits under the group row of its source. */
function isNested(skill: SkillListItem): boolean {
	return !!props.sources && !!skill.sourceId;
}

/** Empty sources come first. Folded sources sit where the server put them. */
const extraGroups = computed(() => [
	...(props.emptySources ?? []).map(({ id }) => ({ group: id, index: 0 })),
	...(props.collapsedSources ?? []).map(({ sourceId, index }) => ({ group: sourceId, index })),
]);

/** The whole group row folds its source. */
function onGroupClick(_event: MouseEvent, { group }: { group: string }) {
	toggleCollapsed(group);
}

/** The name of the creator, with "(you)" for the current user. */
function creatorName(creator: SkillUserDto): string {
	const name =
		[creator.firstName, creator.lastName].filter(Boolean).join(' ') || creator.email || '';
	return creator.id === usersStore.currentUserId
		? `${name} ${i18n.baseText('settings.context.skills.createdBy.you')}`
		: name;
}

const hasUpdate = (skill: SkillListItem) =>
	skill.syncState === 'update_available' || skill.syncState === 'update_blocked';

/** The badge of a synced skill whose source has new content that waits for review. */
const SYNC_BADGES = {
	update_available: { variant: 'warning', key: 'settings.context.skills.sync.updateAvailable' },
	update_blocked: { variant: 'danger', key: 'settings.context.skills.sync.updateBlocked' },
} as const;

function syncBadgeOf({ syncState }: SkillListItem) {
	if (syncState !== 'update_available' && syncState !== 'update_blocked') return undefined;
	const { variant, key } = SYNC_BADGES[syncState];
	return { variant, label: i18n.baseText(key), tooltip: i18n.baseText(`${key}.tooltip`) };
}

function onRowClick(_event: MouseEvent, payload: { item: SkillListItem }) {
	emit('open', payload.item);
}

// The endpoint sorts by name and by last update only. Pixel widths are the starting
// sizes; the user can resize each column, as in the users table. The actions column stays fixed.
// The other columns fit their content, and the skill column takes the rest of the row.
const headers = computed<Array<TableHeader<SkillListItem>>>(() => [
	{
		title: i18n.baseText('settings.context.skills.columns.skill'),
		key: 'name',
		width: 240,
		grow: true,
	},
	{
		title: i18n.baseText('settings.context.skills.columns.scope'),
		key: 'scope',
		width: 140,
		disableSort: true,
	},
	{
		title: i18n.baseText('settings.context.skills.columns.agents'),
		key: 'usedByAgents',
		width: 90,
		disableSort: true,
	},
	{
		title: i18n.baseText('settings.context.skills.columns.createdBy'),
		key: 'createdBy',
		width: 180,
		disableSort: true,
	},
	{
		title: i18n.baseText('settings.context.skills.columns.updatedAt'),
		key: 'updatedAt',
		width: 120,
	},
	{
		title: '',
		key: 'actions',
		align: 'end',
		width: 64,
		disableSort: true,
		resize: false,
		value: () => undefined,
	},
]);
</script>

<template>
	<div data-test-id="skills-table">
		<N8nDataTableServer
			v-model:page="tableOptions.page"
			v-model:items-per-page="tableOptions.itemsPerPage"
			:sort-by="tableOptions.sortBy"
			:headers="headers"
			:items="props.skills"
			:items-length="props.itemsLength"
			:loading="props.loading"
			:page-sizes="PREFERENCES_PAGE_SIZES"
			:row-props="{ class: $style.row }"
			:group-by="props.sources ? groupOf : undefined"
			:extra-groups="extraGroups"
			:collapsed-groups="props.collapsedSourceIds ?? []"
			:group-row-props="groupRowProps"
			@update:options="emit('update:options', $event)"
			@click:row="onRowClick"
			@click:group="onGroupClick"
		>
			<template v-if="props.showEmpty" #cover>
				<slot name="empty" />
			</template>

			<!-- A source heads its rows. The scope and the actions sit in their own columns. -->
			<template #[`group.name`]="{ group }">
				<div :class="$style.group" data-test-id="skill-group-header">
					<button
						v-if="canFold(group)"
						type="button"
						:class="$style.groupToggle"
						:aria-expanded="!collapsed.has(group)"
						:aria-label="sourceName(group)"
						data-test-id="skill-group-toggle"
						@click.stop="toggleCollapsed(group)"
					>
						<N8nIcon
							:icon="collapsed.has(group) ? 'chevron-right' : 'chevron-down'"
							size="small"
							color="text-light"
						/>
					</button>
					<span v-else :class="$style.groupToggleSpace" />
					<N8nIcon icon="git-branch" size="small" color="text-light" />
					<N8nText
						size="small"
						color="text-light"
						:class="$style.groupName"
						data-test-id="skill-group-title"
					>
						{{ sourceName(group) }}
					</N8nText>
					<!-- Only a source with no skills shows a count. A count that comes and goes on fold
					     would move the row. -->
					<N8nText
						v-if="sourcesById.has(group) && !canFold(group)"
						size="small"
						color="text-light"
						:class="$style.groupCount"
						data-test-id="skill-group-count"
					>
						· {{ skillCount(group) }}
					</N8nText>
					<!-- The new skills follow the source name. Nothing comes after them in the cell, so
					     their late answer moves nothing. -->
					<N8nButton
						v-if="newSkillCount(group) > 0"
						variant="outline"
						size="xsmall"
						:class="$style.newSkills"
						:title="i18n.baseText('settings.context.skills.more.title')"
						:aria-label="
							i18n.baseText('settings.context.skills.group.newSkills.label', {
								interpolate: { count: newSkillCount(group) },
								adjustToNumber: newSkillCount(group),
							})
						"
						data-test-id="skill-group-new-skills"
						@click.stop="emit('addMore', group)"
					>
						<template #icon>
							<N8nStatusDot variant="warning" />
						</template>
						{{
							i18n.baseText('settings.context.skills.group.newSkills', {
								interpolate: { count: newSkillCount(group) },
								adjustToNumber: newSkillCount(group),
							})
						}}
					</N8nButton>
				</div>
			</template>

			<template #[`group.scope`]="{ group }">
				<SkillScopeBadge v-if="sourcesById.get(group)" :skill="sourcesById.get(group)!" />
			</template>

			<!-- The creator cell sets the height of a skill row. A hidden copy keeps the group row
			     as tall, so the rows keep one rhythm. -->
			<template #[`group.createdBy`]>
				<div :class="[$style.creator, $style.heightSpacer]" aria-hidden="true">
					<N8nText size="small">-</N8nText>
					<N8nText size="small">-</N8nText>
				</div>
			</template>

			<template #[`group.actions`]="{ group }">
				<div v-if="sourcesById.has(group)" :class="$style.actions" @click.stop>
					<N8nActionToggle
						:actions="sourceActions(sourcesById.get(group)!)"
						:data-test-id="`skill-source-menu-${group}`"
						@action="(action: string) => onSourceAction(group, action)"
					/>
				</div>
			</template>

			<template #[`item.name`]="{ item }">
				<div :class="[$style.skillCell, isNested(item) && $style.skillCellNested]">
					<div :class="$style.skillTitle">
						<N8nText
							size="medium"
							color="text-dark"
							:class="$style.skillName"
							data-test-id="skill-name"
						>
							{{ item.name }}
						</N8nText>
						<N8nTooltip v-if="syncBadgeOf(item)" :content="syncBadgeOf(item)?.tooltip">
							<!-- The update opens its review, not the skill. -->
							<N8nButton
								variant="outline"
								size="xsmall"
								:class="$style.syncButton"
								:data-test-id="`skill-sync-badge-${item.syncState}`"
								@click.stop="emit('reviewUpdate', item)"
							>
								<template #icon>
									<N8nStatusDot :variant="syncBadgeOf(item)!.variant" />
								</template>
								{{ syncBadgeOf(item)?.label }}
							</N8nButton>
						</N8nTooltip>
						<N8nTooltip
							v-if="props.showAssistantAvailability && item.availableToAssistant"
							:content="i18n.baseText('settings.context.skills.assistant.label')"
						>
							<N8nBadge
								variant="secondary"
								leading-icon="n8n-assistant"
								data-test-id="skill-assistant-badge"
							>
								{{ i18n.baseText('settings.context.skills.assistant.badge') }}
							</N8nBadge>
						</N8nTooltip>
						<N8nTooltip
							v-if="props.showMcpAvailability && item.availableToMCP"
							placement="right"
							:content="i18n.baseText('settings.context.skills.modal.mcp.label')"
						>
							<span
								role="img"
								:aria-label="i18n.baseText('settings.context.skills.modal.mcp.label')"
								data-test-id="skill-available-to-mcp-icon"
							>
								<N8nIcon icon="mcp" size="medium" color="text-light" />
							</span>
						</N8nTooltip>
					</div>
					<N8nText size="small" color="text-light" :class="$style.description">
						{{ item.description }}
					</N8nText>
				</div>
			</template>

			<template #[`item.scope`]="{ item }">
				<!-- A synced skill has the scope of its source, which its group row shows. -->
				<SkillScopeBadge v-if="!isNested(item)" :skill="item" />
			</template>

			<template #[`item.usedByAgents`]="{ item }">
				<SkillAgentsCell :skill="item" />
			</template>

			<template #[`item.createdBy`]="{ item }">
				<div v-if="item.createdBy" :class="$style.creator" data-test-id="skill-created-by">
					<N8nText size="small" color="text-dark" :class="$style.creatorText">
						{{ creatorName(item.createdBy) }}
					</N8nText>
					<N8nText
						v-if="item.createdBy.email"
						size="small"
						color="text-light"
						:class="$style.creatorText"
					>
						{{ item.createdBy.email }}
					</N8nText>
				</div>
				<N8nText v-else size="small" color="text-light" data-test-id="skill-created-by-none">
					—
				</N8nText>
			</template>

			<template #[`item.updatedAt`]="{ item }">
				<N8nText size="small" color="text-light" data-test-id="skill-updated-at">
					<TimeAgo :date="item.updatedAt" />
				</N8nText>
			</template>

			<template #[`item.actions`]="{ item }">
				<div :class="$style.actions" @click.stop>
					<N8nActionToggle
						:actions="actionsFor(item)"
						data-test-id="skill-actions"
						@action="(action: SkillAction) => onAction(item, action)"
					/>
				</div>
			</template>
		</N8nDataTableServer>
	</div>
</template>

<style lang="scss" module>
.skillCell {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

/* The name lines up with the source name: past the chevron and the branch icon, which are
   --spacing--xs wide, each with a --spacing--3xs gap. */
.skillCellNested {
	padding-inline-start: calc(2 * (var(--spacing--xs) + var(--spacing--3xs)));
}

.creator {
	display: flex;
	flex-direction: column;
	padding-block: var(--spacing--2xs);
	min-width: 0;
}

.creatorText {
	overflow: hidden;
	text-overflow: ellipsis;
}

/* The whole row of a source folds it. A source with no skills has nothing to fold. */
.groupRowFoldable {
	cursor: pointer;
}

/* The badges stay on the line of the name. A long name gives way first and ends in an ellipsis. */
.skillTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;

	> * {
		flex-shrink: 0;
	}

	> .skillName {
		flex-shrink: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
}

.description {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.actions {
	display: flex;
	justify-content: flex-end;
}

.row {
	cursor: pointer;
}

.group {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.groupToggle {
	display: flex;
	padding: 0;
	border: 0;
	background: transparent;
	cursor: pointer;

	&:focus-visible {
		outline: var(--focus--border-width, 2px) solid var(--color--primary);
		outline-offset: 2px;
		border-radius: var(--radius);
	}
}

/* An empty source has no rows to fold, so its name keeps the place of the chevron. */
.groupToggleSpace {
	width: var(--spacing--xs);
	flex-shrink: 0;
}

.syncButton {
	flex-shrink: 0;
}

.newSkills {
	flex-shrink: 0;
	margin-inline-start: var(--spacing--2xs);
}

.heightSpacer {
	visibility: hidden;
}

.groupName {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* A long source name gives way first, so the count stays whole on the same line. */
.groupCount {
	flex-shrink: 0;
	white-space: nowrap;
}
</style>
