<script setup lang="ts">
import { computed } from 'vue';
import type { HubSkillListItem } from '@n8n/api-types';
import { N8nButton, N8nDataTableServer, N8nText, N8nTooltip } from '@n8n/design-system';
import type { TableHeader, TableOptions } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import SkillScopeBadge from './SkillScopeBadge.vue';
import { PREFERENCES_PAGE_SIZES } from '../context.constants';

const props = defineProps<{
	skills: HubSkillListItem[];
	itemsLength: number;
	loading?: boolean;
	/** The table renders its cover row whenever the slot exists, so the slot is withheld. */
	showEmpty?: boolean;
}>();

const emit = defineEmits<{
	open: [skill: HubSkillListItem];
	delete: [skill: HubSkillListItem];
	'update:options': [payload: TableOptions];
}>();

const tableOptions = defineModel<TableOptions>('tableOptions', { default: () => ({}) });

const i18n = useI18n();

const readOnlyHint = computed(() => i18n.baseText('settings.context.skills.readOnly.tooltip'));

function onRowClick(_event: MouseEvent, payload: { item: HubSkillListItem }) {
	emit('open', payload.item);
}

/** The backend refuses to delete a used skill, so the button is off before the user tries. */
function canDeleteNow(skill: HubSkillListItem) {
	return skill.canDelete && skill.usedByAgents === 0;
}

function deleteHint(skill: HubSkillListItem) {
	if (!skill.canDelete) return readOnlyHint.value;
	return i18n.baseText('settings.context.skills.delete.inUse.tooltip', {
		interpolate: { count: skill.usedByAgents },
		adjustToNumber: skill.usedByAgents,
	});
}

function usedByLabel(skill: HubSkillListItem) {
	if (skill.usedByAgents === 0) return i18n.baseText('settings.context.skills.usedBy.none');
	return i18n.baseText('settings.context.skills.usedBy.agents', {
		interpolate: { count: skill.usedByAgents },
		adjustToNumber: skill.usedByAgents,
	});
}

// Sorting is off until the endpoint supports ORDER BY. Pixel widths sum to the table's
// minimum width, so a new column takes its room from the others, not from the page.
const headers = computed<Array<TableHeader<HubSkillListItem>>>(() => [
	{
		title: i18n.baseText('settings.context.skills.columns.skill'),
		key: 'name',
		width: 440,
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('settings.context.skills.columns.scope'),
		key: 'scope',
		width: 300,
		disableSort: true,
		resize: false,
	},
	{
		title: i18n.baseText('settings.context.skills.columns.usedBy'),
		key: 'usedByAgents',
		width: 260,
		disableSort: true,
		resize: false,
	},
	{
		title: '',
		key: 'actions',
		align: 'end',
		width: 184,
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
					<N8nText size="medium" color="text-dark" bold data-test-id="skill-name">
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

			<template #[`item.usedByAgents`]="{ item }">
				<N8nText size="small" color="text-base" data-test-id="skill-used-by">
					{{ usedByLabel(item) }}
				</N8nText>
			</template>

			<template #[`item.actions`]="{ item }">
				<div :class="$style.actions" @click.stop>
					<N8nTooltip :disabled="item.canEdit" :content="readOnlyHint">
						<span>
							<N8nButton
								variant="outline"
								size="small"
								:disabled="!item.canEdit"
								:label="i18n.baseText('settings.context.skills.actions.edit')"
								data-test-id="skill-edit-button"
								@click="emit('open', item)"
							/>
						</span>
					</N8nTooltip>
					<N8nTooltip :disabled="canDeleteNow(item)" :content="deleteHint(item)">
						<span>
							<N8nButton
								variant="outline"
								size="small"
								:disabled="!canDeleteNow(item)"
								:label="i18n.baseText('settings.context.skills.actions.delete')"
								data-test-id="skill-delete-button"
								@click="emit('delete', item)"
							/>
						</span>
					</N8nTooltip>
				</div>
			</template>
		</N8nDataTableServer>
	</div>
</template>

<style lang="scss" module>
.skillCell {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
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
	gap: var(--spacing--2xs);
	/* Revealed on hover, per the row-action pattern; focus keeps it reachable by keyboard. */
	opacity: 0;
	transition: opacity 0.1s ease-in;
}

.row {
	cursor: pointer;

	&:hover .actions,
	&:focus-within .actions {
		opacity: 1;
	}
}
</style>
