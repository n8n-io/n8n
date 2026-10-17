<script setup lang="ts">
import { computed } from 'vue';
import type { SkillListItem } from '@n8n/api-types';
import { N8nActionToggle, N8nDataTableServer, N8nText, N8nUserInfo } from '@n8n/design-system';
import type { TableHeader, TableOptions } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@n8n/stores/users.store';

import TimeAgo from '@/app/components/TimeAgo.vue';

import { skillUserName } from '@/features/agents/components/skillVersions/skillVersionDiff.utils';

import SkillAgentsCell from './SkillAgentsCell.vue';
import SkillScopeBadge from './SkillScopeBadge.vue';
import { PREFERENCES_PAGE_SIZES } from '../context.constants';

type SkillAction = 'edit' | 'timeline' | 'compare' | 'delete';

/** Opens the skill with its timeline, or comparing its two newest versions. */
export type SkillOpenView = 'timeline' | 'compare';

/** The fields of the action toggle item that this menu uses. */
type SkillActionItem = {
	value: SkillAction;
	label: string;
	disabled?: boolean;
	tooltip?: string;
	destructive?: boolean;
	divided?: boolean;
};

const props = defineProps<{
	skills: SkillListItem[];
	itemsLength: number;
	loading?: boolean;
	/** The table renders its cover row whenever the slot exists, so the slot is withheld. */
	showEmpty?: boolean;
}>();

const emit = defineEmits<{
	open: [skill: SkillListItem, view?: SkillOpenView];
	delete: [skill: SkillListItem];
	'update:options': [payload: TableOptions];
}>();

const tableOptions = defineModel<TableOptions>('tableOptions', { default: () => ({}) });

const i18n = useI18n();
const usersStore = useUsersStore();

/** The backend refuses to delete a skill that an agent uses, so the action is off before the user tries. */
function canDeleteNow(skill: SkillListItem) {
	return skill.canDelete && skill.usedByAgents === 0;
}

function deleteHint(skill: SkillListItem): string | undefined {
	if (canDeleteNow(skill)) return undefined;
	if (!skill.canDelete) return i18n.baseText('settings.context.skills.readOnly');
	return i18n.baseText('settings.context.skills.delete.inUse', {
		interpolate: { count: skill.usedByAgents },
		adjustToNumber: skill.usedByAgents,
	});
}

function actionsFor(skill: SkillListItem): SkillActionItem[] {
	return [
		{
			value: 'edit',
			// A read-only skill still opens, to read it.
			label: i18n.baseText(
				skill.canEdit
					? 'settings.context.skills.actions.edit'
					: 'settings.context.skills.actions.view',
			),
		},
		{
			value: 'timeline',
			label: i18n.baseText('settings.context.skills.versions.actions.timeline'),
		},
		{
			value: 'compare',
			label: i18n.baseText('settings.context.skills.versions.actions.compare'),
			// One version has nothing to compare with.
			disabled: skill.latestVersion < 2,
		},
		{
			value: 'delete',
			label: i18n.baseText('settings.context.skills.actions.delete'),
			disabled: !canDeleteNow(skill),
			tooltip: deleteHint(skill),
			destructive: true,
			divided: true,
		},
	];
}

function onAction(skill: SkillListItem, action: SkillAction) {
	if (action === 'edit') emit('open', skill);
	else if (action === 'timeline' || action === 'compare') emit('open', skill, action);
	else emit('delete', skill);
}

function onRowClick(_event: MouseEvent, payload: { item: SkillListItem }) {
	emit('open', payload.item);
}

// Sorting is off until the endpoint supports ORDER BY. Pixel widths sum to the table's
// minimum width, so a new column takes its room from the others, not from the page.
const headers = computed<Array<TableHeader<SkillListItem>>>(() => [
	{
		title: i18n.baseText('settings.context.skills.columns.skill'),
		key: 'name',
		width: 280,
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('settings.context.skills.columns.scope'),
		key: 'scope',
		width: 170,
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('settings.context.skills.versions.column'),
		key: 'latestVersion',
		width: 100,
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('settings.context.skills.columns.agents'),
		key: 'usedByAgents',
		width: 90,
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('settings.context.skills.columns.createdBy'),
		key: 'createdBy',
		width: 200,
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('settings.context.skills.columns.updatedAt'),
		key: 'updatedAt',
		width: 140,
		disableSort: true,
		resize: false,
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
			:headers="headers"
			:items="props.skills"
			:items-length="props.itemsLength"
			:loading="props.loading"
			:page-sizes="PREFERENCES_PAGE_SIZES"
			:row-props="{ class: $style.row }"
			@update:options="emit('update:options', $event)"
			@click:row="onRowClick"
		>
			<template v-if="props.showEmpty" #cover>
				<slot name="empty" />
			</template>

			<template #[`item.name`]="{ item }">
				<div :class="$style.skillCell">
					<N8nText size="medium" color="text-dark" data-test-id="skill-name">
						{{ item.name }}
					</N8nText>
					<N8nText size="small" color="text-light" :class="$style.description">
						{{ item.description }}
					</N8nText>
				</div>
			</template>

			<template #[`item.scope`]="{ item }">
				<SkillScopeBadge :skill="item" />
			</template>

			<template #[`item.latestVersion`]="{ item }">
				<div :class="$style.versionCell" data-test-id="skills-table-version">
					<N8nText size="small" color="text-dark">
						{{
							i18n.baseText('settings.context.skills.versions.number', {
								interpolate: { version: String(item.latestVersion) },
							})
						}}
					</N8nText>
					<N8nText
						v-if="item.latestVersionLabel"
						size="small"
						color="text-light"
						:class="$style.description"
						data-test-id="skills-table-version-label"
					>
						{{ item.latestVersionLabel }}
					</N8nText>
				</div>
			</template>

			<template #[`item.usedByAgents`]="{ item }">
				<SkillAgentsCell :skill="item" />
			</template>

			<template #[`item.createdBy`]="{ item }">
				<!-- The same person cell as the users table. -->
				<div v-if="item.createdBy" :class="$style.creator" data-test-id="skill-created-by">
					<N8nUserInfo
						:first-name="item.createdBy.firstName"
						:last-name="item.createdBy.lastName"
						:email="item.createdBy.email"
						:is-current-user="item.createdBy.id === usersStore.currentUserId"
					/>
				</div>
				<N8nText v-else size="small" color="text-light" data-test-id="skill-created-by-none">
					—
				</N8nText>
			</template>

			<template #[`item.updatedAt`]="{ item }">
				<div :class="$style.versionCell">
					<N8nText size="small" color="text-light" data-test-id="skill-updated-at">
						<TimeAgo :date="item.updatedAt" />
					</N8nText>
					<N8nText
						v-if="skillUserName(item.latestVersionSavedBy)"
						size="small"
						color="text-light"
						:class="$style.description"
						data-test-id="skill-updated-by"
					>
						{{
							i18n.baseText('settings.context.skills.versions.savedBy', {
								interpolate: { name: skillUserName(item.latestVersionSavedBy) ?? '' },
							})
						}}
					</N8nText>
				</div>
			</template>

			<template #[`item.actions`]="{ item }">
				<div :class="$style.actions" @click.stop>
					<N8nActionToggle
						:actions="actionsFor(item)"
						icon-orientation="vertical"
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

.versionCell {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.creator {
	padding-block: var(--spacing--2xs);
	min-width: 0;
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
</style>
