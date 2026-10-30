<script setup lang="ts">
import { computed } from 'vue';
import type { SkillListItem } from '@n8n/api-types';
import {
	N8nActionToggle,
	N8nBadge,
	N8nDataTableServer,
	N8nIcon,
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

type SkillAction = 'edit' | 'timeline' | 'compare' | 'download' | 'stopSyncing' | 'delete';

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
}>();

const emit = defineEmits<{
	open: [skill: SkillListItem];
	timeline: [skill: SkillListItem];
	compare: [skill: SkillListItem];
	download: [skill: SkillListItem];
	stopSyncing: [skill: SkillListItem];
	delete: [skill: SkillListItem];
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
	else if (action === 'stopSyncing') emit('stopSyncing', skill);
	else emit('delete', skill);
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
			@update:options="emit('update:options', $event)"
			@click:row="onRowClick"
		>
			<template v-if="props.showEmpty" #cover>
				<slot name="empty" />
			</template>

			<template #[`item.name`]="{ item }">
				<div :class="$style.skillCell">
					<div :class="$style.skillTitle">
						<N8nText size="medium" color="text-dark" data-test-id="skill-name">
							{{ item.name }}
						</N8nText>
						<N8nTooltip
							v-if="
								props.showAssistantAvailability &&
								item.scope !== 'agent' &&
								item.availableToAssistant
							"
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
							v-if="props.showMcpAvailability && item.scope !== 'agent' && item.availableToMCP"
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
</style>
