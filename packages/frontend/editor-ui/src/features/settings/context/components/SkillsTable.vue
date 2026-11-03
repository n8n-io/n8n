<script setup lang="ts">
import { computed, useCssModule } from 'vue';
import type { SkillListItem, SkillSourceListItem } from '@n8n/api-types';
import {
	N8nActionToggle,
	N8nBadge,
	N8nDataTableServer,
	N8nIcon,
	N8nSpinner,
	N8nText,
	N8nTooltip,
	N8nUserInfo,
} from '@n8n/design-system';
import type { IconName, TableHeader, TableOptions } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@n8n/stores/users.store';

import TimeAgo from '@/app/components/TimeAgo.vue';

import SkillAgentsCell from './SkillAgentsCell.vue';
import SkillScopeBadge from './SkillScopeBadge.vue';
import { PREFERENCES_PAGE_SIZES } from '../context.constants';
import { useSkillDeleteRule } from '../skills.utils';

type SkillAction = 'edit' | 'timeline' | 'download' | 'stopSyncing' | 'delete';

type SourceAction = 'checkNow' | 'openInGitHub';

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
	 * The connected sources the user can see. When set, each source heads its synced skills as
	 * a group row, and the rows must arrive grouped, as `groupBy: 'source'` lists them.
	 */
	sources?: SkillSourceListItem[];
	/** Sources with no synced skills, shown as rows of their own before the other rows. */
	emptySources?: SkillSourceListItem[];
	/** The sources that the user folded. */
	collapsedSourceIds?: string[];
	/** Where each folded source sits on the page, as the server placed it. */
	collapsedSources?: Array<{ sourceId: string; index: number }>;
	/** The sources with a check that runs, so their rows show progress. */
	checkingSourceIds?: string[];
}>();

const emit = defineEmits<{
	open: [skill: SkillListItem];
	timeline: [skill: SkillListItem];
	download: [skill: SkillListItem];
	toggleSource: [sourceId: string];
	checkSource: [source: SkillSourceListItem];
	stopSyncing: [skill: SkillListItem];
	delete: [skill: SkillListItem];
	'update:options': [payload: TableOptions];
}>();

const tableOptions = defineModel<TableOptions>('tableOptions', { default: () => ({}) });

const i18n = useI18n();
const $style = useCssModule();
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
			value: 'download',
			label: i18n.baseText('settings.context.skills.actions.download'),
			icon: 'download',
		},
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
	else if (action === 'download') emit('download', skill);
	else if (action === 'stopSyncing') emit('stopSyncing', skill);
	else emit('delete', skill);
}

/** The badge of a synced skill whose source has new content that waits for review. */
const SYNC_BADGES = {
	update_available: { variant: 'info', key: 'settings.context.skills.sync.updateAvailable' },
	update_blocked: { variant: 'danger', key: 'settings.context.skills.sync.updateBlocked' },
} as const;

function syncBadgeOf({ syncState }: SkillListItem) {
	if (syncState !== 'update_available' && syncState !== 'update_blocked') return undefined;
	const { variant, key } = SYNC_BADGES[syncState];
	return { variant, label: i18n.baseText(key), tooltip: i18n.baseText(`${key}.tooltip`) };
}

const sourcesById = computed(
	() =>
		new Map(
			[...(props.sources ?? []), ...(props.emptySources ?? [])].map((source) => [
				source.id,
				source,
			]),
		),
);

const collapsed = computed(() => new Set(props.collapsedSourceIds ?? []));

const emptySourceIds = computed(() => new Set((props.emptySources ?? []).map(({ id }) => id)));

/** The group of a row: its source. A skill that no source syncs has no group row. */
function groupOf(skill: SkillListItem): string | undefined {
	return skill.sourceId ?? undefined;
}

/** Empty sources come first. Folded sources sit where the server put them. */
const extraGroups = computed(() => [
	...(props.emptySources ?? []).map(({ id }) => ({ group: id, index: 0 })),
	...(props.collapsedSources ?? []).map(({ sourceId, index }) => ({ group: sourceId, index })),
]);

/** A source with no synced skills has nothing to fold. */
function canFold(sourceId: string): boolean {
	return !emptySourceIds.value.has(sourceId);
}

function toggleSource(sourceId: string) {
	if (canFold(sourceId)) emit('toggleSource', sourceId);
}

/** `owner/repository · branch`, the one format for a repository everywhere. */
function sourceName(sourceId: string): string {
	const source = sourcesById.value.get(sourceId);
	// A source of a type that this build cannot read, or one that has not loaded yet.
	if (!source) return i18n.baseText('settings.context.skills.sources.unknown');
	return [source.label, source.ref].filter(Boolean).join(' · ');
}

/** The scope badge reads the fields of a skill. A source is never one agent's. */
function scopeOf(source: SkillSourceListItem) {
	return {
		scope: source.projectId ? ('project' as const) : ('instance' as const),
		projectId: source.projectId,
		projectName: source.projectName,
		projectType: source.projectType,
		agentName: null,
	};
}

/** The updates that wait for review. Users without update rights see no count. */
function updateCount(source: SkillSourceListItem): number {
	return source.canReview ? source.updatesAvailable + source.updatesBlocked : 0;
}

function sourceActions(source: SkillSourceListItem) {
	const items: Array<{ value: SourceAction; label: string; icon: IconName }> = [];
	if (source.canReview) {
		items.push({
			value: 'checkNow',
			label: i18n.baseText('settings.context.skills.checkForUpdates.action'),
			icon: 'refresh-cw',
		});
	}
	items.push({
		value: 'openInGitHub',
		label: i18n.baseText('settings.context.skills.sources.openInGitHub'),
		icon: 'external-link',
	});
	return items;
}

function onSourceAction(source: SkillSourceListItem, action: SourceAction) {
	if (action === 'checkNow') emit('checkSource', source);
	else window.open(source.webUrl, '_blank', 'noopener,noreferrer');
}

/** A synced skill sits under the group row of its source, so its name is indented. */
function isNested(skill: SkillListItem): boolean {
	return !!props.sources && !!skill.sourceId;
}

function groupRowProps(sourceId: string) {
	return { class: canFold(sourceId) ? $style.groupRowFoldable : undefined };
}

function onRowClick(_event: MouseEvent, payload: { item: SkillListItem }) {
	emit('open', payload.item);
}

// The endpoint sorts by name and by last update only. Pixel widths are the starting
// sizes; the user can resize each column, as in the users table. The actions column stays fixed.
const headers = computed<Array<TableHeader<SkillListItem>>>(() => [
	{
		title: i18n.baseText('settings.context.skills.columns.skill'),
		key: 'name',
		width: 300,
	},
	{
		title: i18n.baseText('settings.context.skills.columns.scope'),
		key: 'scope',
		width: 220,
		disableSort: true,
	},
	{
		title: i18n.baseText('settings.context.skills.columns.agents'),
		key: 'usedByAgents',
		width: 110,
		disableSort: true,
	},
	{
		title: i18n.baseText('settings.context.skills.columns.createdBy'),
		key: 'createdBy',
		width: 220,
		disableSort: true,
	},
	{
		title: i18n.baseText('settings.context.skills.columns.updatedAt'),
		key: 'updatedAt',
		width: 130,
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
			@click:group="(_event: MouseEvent, { group }: { group: string }) => toggleSource(group)"
		>
			<!-- A source heads its synced skills. Its scope and its actions sit in their columns. -->
			<template #[`group.name`]="{ group }">
				<div :class="$style.group" data-test-id="skill-group-header">
					<button
						v-if="canFold(group)"
						type="button"
						:class="$style.groupToggle"
						:aria-expanded="!collapsed.has(group)"
						:aria-label="sourceName(group)"
						data-test-id="skill-group-toggle"
						@click.stop="toggleSource(group)"
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
						color="text-dark"
						bold
						:class="$style.groupTitle"
						:title="sourceName(group)"
						data-test-id="skill-group-title"
					>
						{{ sourceName(group) }}
					</N8nText>
					<N8nText
						v-if="!canFold(group)"
						size="small"
						color="text-light"
						:class="$style.groupNote"
						data-test-id="skill-group-empty"
					>
						· {{ i18n.baseText('settings.context.skills.sources.noSyncedSkills') }}
					</N8nText>
				</div>
			</template>

			<template #[`group.scope`]="{ group }">
				<SkillScopeBadge v-if="sourcesById.get(group)" :skill="scopeOf(sourcesById.get(group)!)" />
			</template>

			<!-- The update count and the progress sit in the empty cell of the source row, left of its menu. -->
			<template #[`group.updatedAt`]="{ group }">
				<div v-if="sourcesById.get(group)" :class="$style.sourceStatus">
					<N8nSpinner
						v-if="props.checkingSourceIds?.includes(group)"
						size="small"
						data-test-id="skill-group-checking"
					/>
					<N8nBadge
						v-else-if="updateCount(sourcesById.get(group)!) > 0"
						:variant="sourcesById.get(group)!.updatesAvailable > 0 ? 'warning' : 'danger'"
						data-test-id="skill-group-updates"
					>
						{{
							i18n.baseText('settings.context.skills.sources.updates', {
								interpolate: { count: updateCount(sourcesById.get(group)!) },
								adjustToNumber: updateCount(sourcesById.get(group)!),
							})
						}}
					</N8nBadge>
				</div>
			</template>

			<template #[`group.actions`]="{ group }">
				<div v-if="sourcesById.get(group)" :class="$style.actions" @click.stop>
					<N8nActionToggle
						:actions="sourceActions(sourcesById.get(group)!)"
						data-test-id="skill-group-actions"
						@action="(action: SourceAction) => onSourceAction(sourcesById.get(group)!, action)"
					/>
				</div>
			</template>

			<template v-if="props.showEmpty" #cover>
				<slot name="empty" />
			</template>

			<template #[`item.name`]="{ item }">
				<div :class="[$style.skillCell, isNested(item) && $style.nested]">
					<div :class="$style.skillTitle">
						<N8nText size="medium" color="text-dark" data-test-id="skill-name">
							{{ item.name }}
						</N8nText>
						<N8nTooltip v-if="syncBadgeOf(item)" :content="syncBadgeOf(item)?.tooltip">
							<N8nBadge
								:variant="syncBadgeOf(item)?.variant"
								:data-test-id="`skill-sync-badge-${item.syncState}`"
							>
								{{ syncBadgeOf(item)?.label }}
							</N8nBadge>
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
				<SkillScopeBadge :skill="item" />
			</template>

			<template #[`item.usedByAgents`]="{ item }">
				<SkillAgentsCell :skill="item" />
			</template>

			<template #[`item.createdBy`]="{ item }">
				<div v-if="item.createdBy" :class="$style.creator" data-test-id="skill-created-by">
					<N8nUserInfo
						:first-name="item.createdBy.firstName"
						:last-name="item.createdBy.lastName"
						:email="item.createdBy.email"
						:is-current-user="item.createdBy.id === usersStore.currentUserId"
						hide-avatar
					/>
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

.creator {
	padding-block: var(--spacing--2xs);
	min-width: 0;
}

.skillTitle {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
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
.nested {
	padding-left: var(--spacing--lg);
}

.group {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

/* One line: the repository shortens with an ellipsis, and the note keeps its words. */
.groupTitle {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.groupNote {
	flex-shrink: 0;
	white-space: nowrap;
}

.groupToggle {
	display: inline-flex;
	padding: 0;
	border: none;
	background: none;
	cursor: pointer;
}

.groupToggleSpace {
	display: inline-block;
	width: var(--spacing--sm);
}

.groupRowFoldable {
	cursor: pointer;
}

.sourceStatus {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
