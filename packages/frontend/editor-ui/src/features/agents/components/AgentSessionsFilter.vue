<script setup lang="ts">
import {
	N8nButton,
	N8nPopover,
	N8nSelect2 as N8nSelect,
	N8nTagsInput2 as N8nTagsInput,
	type TagsInputValue,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ElDatePicker } from 'element-plus';
import { computed } from 'vue';
import type { SelectItem, SelectValue } from '@n8n/design-system/v2/components/Select/Select.types';

import {
	defaultAgentSessionFilters,
	type AgentSessionFilters,
} from '../composables/useAgentThreadsApi';

const DATE_TIME_MASK = 'YYYY-MM-DD HH:mm';

const props = defineProps<{ modelValue: AgentSessionFilters }>();

const emit = defineEmits<{
	filterChanged: [value: AgentSessionFilters];
}>();

const i18n = useI18n();

const statuses: Array<{ id: AgentSessionFilters['status']; name: string }> = [
	{ id: 'all', name: i18n.baseText('agentSessions.filters.anyStatus') },
	{ id: 'running', name: i18n.baseText('agentSessions.status.running') },
	{ id: 'succeeded', name: i18n.baseText('agentSessions.status.succeeded') },
	{ id: 'error', name: i18n.baseText('agentSessions.status.error') },
	{ id: 'cancelled', name: i18n.baseText('agentSessions.status.cancelled') },
	{ id: 'interrupted', name: i18n.baseText('agentSessions.status.interrupted') },
	{ id: 'awaiting', name: i18n.baseText('agentSessions.status.awaiting') },
];

const origins: Array<{ id: AgentSessionFilters['origin']; name: string }> = [
	{ id: 'all', name: i18n.baseText('agentSessions.filters.anyOrigin') },
	{ id: 'preview', name: i18n.baseText('agentSessions.origin.preview') },
	{ id: 'instance-ai', name: i18n.baseText('agentSessions.origin.instanceAi') },
	{ id: 'mcp', name: i18n.baseText('agentSessions.origin.mcp') },
	{ id: 'sub-agent', name: i18n.baseText('agentSessions.origin.subAgent') },
	{ id: 'schedule', name: i18n.baseText('agentSessions.origin.schedule') },
	{ id: 'workflow', name: i18n.baseText('agentSessions.origin.workflow') },
	{ id: 'n8n_chat_production', name: i18n.baseText('agentSessions.origin.n8nChat') },
	{ id: 'slack', name: i18n.baseText('agentSessions.origin.slack') },
	{ id: 'telegram', name: i18n.baseText('agentSessions.origin.telegram') },
	{ id: 'linear', name: i18n.baseText('agentSessions.origin.linear') },
	{ id: 'discord', name: i18n.baseText('agentSessions.origin.discord') },
	{ id: 'whatsapp', name: i18n.baseText('agentSessions.origin.whatsapp') },
	{ id: 'teams', name: i18n.baseText('agentSessions.origin.teams') },
	{ id: 'webhook', name: i18n.baseText('agentSessions.origin.webhook') },
];

const statusItems: SelectItem[] = statuses.map(({ id, name }) => ({ value: id, label: name }));
const originItems: SelectItem[] = origins.map(({ id, name }) => ({ value: id, label: name }));

function onStatusChange(value: SelectValue | undefined) {
	const status = statuses.find((item) => item.id === value)?.id;
	if (status) updateFilter({ status });
}

function onOriginChange(value: SelectValue | undefined) {
	const origin = origins.find((item) => item.id === value)?.id;
	if (origin) updateFilter({ origin });
}

const activeFilterCount = computed(
	() =>
		[
			props.modelValue.status !== 'all',
			props.modelValue.origin !== 'all',
			Boolean(props.modelValue.startDate),
			Boolean(props.modelValue.endDate),
			props.modelValue.sessionIds !== undefined,
		].filter(Boolean).length,
);

/** Removing the last ID clears the filter. An empty list would match no sessions. */
function onSessionIdsChange(values: TagsInputValue[]) {
	const sessionIds = [
		...new Set(values.filter((value) => typeof value === 'string').map((value) => value.trim())),
	].filter(Boolean);
	updateFilter({ sessionIds: sessionIds.length > 0 ? sessionIds : undefined });
}

function updateFilter(value: Partial<AgentSessionFilters>) {
	emit('filterChanged', { ...props.modelValue, ...value });
}

function reset() {
	emit('filterChanged', defaultAgentSessionFilters());
}
</script>

<template>
	<N8nPopover
		side="bottom"
		align="end"
		position-strategy="absolute"
		width="calc(var(--spacing--5xl) + var(--spacing--2xl))"
	>
		<template #trigger>
			<N8nButton
				variant="outline"
				icon-only
				icon="funnel"
				size="medium"
				:aria-label="i18n.baseText('forms.resourceFiltersDropdown.filters')"
				:active="activeFilterCount > 0"
				data-test-id="agent-sessions-filter-button"
				:class="$style.filterButton"
			>
				<template v-if="activeFilterCount > 0" #default>
					<span :class="$style.filterDot" data-test-id="agent-sessions-filter-dot" />
				</template>
			</N8nButton>
		</template>

		<template #content>
			<div :class="$style.form" data-test-id="agent-sessions-filter-form">
				<div :class="$style.group">
					<label for="agent-sessions-filter-status">{{
						i18n.baseText('agentSessions.filters.status')
					}}</label>
					<N8nSelect
						id="agent-sessions-filter-status"
						:model-value="props.modelValue.status"
						data-test-id="agent-sessions-filter-status"
						:items="statusItems"
						size="large"
						@update:model-value="onStatusChange"
					/>
				</div>

				<div :class="$style.group">
					<label for="agent-sessions-filter-origin">{{
						i18n.baseText('agentSessions.filters.origin')
					}}</label>
					<N8nSelect
						id="agent-sessions-filter-origin"
						:model-value="props.modelValue.origin"
						data-test-id="agent-sessions-filter-origin"
						:items="originItems"
						size="large"
						@update:model-value="onOriginChange"
					/>
				</div>

				<div :class="$style.group">
					<label for="agent-sessions-filter-session-ids">{{
						i18n.baseText('agentSessions.filters.sessionIds')
					}}</label>
					<N8nTagsInput
						id="agent-sessions-filter-session-ids"
						:model-value="props.modelValue.sessionIds ?? []"
						:placeholder="i18n.baseText('agentSessions.filters.sessionIdsPlaceholder')"
						:class="$style.sessionIdFilter"
						add-on-paste
						add-on-blur
						data-test-id="agent-sessions-filter-session-ids"
						@update:model-value="onSessionIdsChange"
					/>
				</div>

				<div :class="$style.group">
					<label for="agent-sessions-filter-start-date">{{
						i18n.baseText('agentSessions.filters.lastActivity')
					}}</label>
					<div :class="$style.dates">
						<ElDatePicker
							id="agent-sessions-filter-start-date"
							:model-value="props.modelValue.startDate"
							type="datetime"
							:format="DATE_TIME_MASK"
							:placeholder="i18n.baseText('agentSessions.filters.earliest')"
							data-test-id="agent-sessions-filter-start-date"
							@change="updateFilter({ startDate: $event ?? '' })"
						/>
						<span :class="$style.divider">{{ i18n.baseText('agentSessions.filters.to') }}</span>
						<ElDatePicker
							id="agent-sessions-filter-end-date"
							:model-value="props.modelValue.endDate"
							type="datetime"
							:format="DATE_TIME_MASK"
							:placeholder="i18n.baseText('agentSessions.filters.latest')"
							data-test-id="agent-sessions-filter-end-date"
							@change="updateFilter({ endDate: $event ?? '' })"
						/>
					</div>
				</div>
			</div>
			<div v-if="activeFilterCount > 0" :class="$style.resetContainer">
				<N8nButton
					variant="outline"
					:class="$style.resetButton"
					data-test-id="agent-sessions-filter-reset"
					@click="reset"
				>
					{{ i18n.baseText('agentSessions.filters.reset') }}
				</N8nButton>
			</div>
		</template>
	</N8nPopover>
</template>

<style module lang="scss">
.group {
	label {
		display: inline-block;
		margin: var(--spacing--sm) 0 var(--spacing--3xs);
		color: var(--color--text--shade-1);
		font-size: var(--font-size--2xs);
	}
}

.dates {
	display: flex;
	align-items: center;
	border: var(--border);
	border-radius: var(--radius);
	white-space: nowrap;
}

.divider {
	padding: 0 var(--spacing--md);
	line-height: 100%;
}

.resetContainer {
	padding: var(--spacing--xs) var(--spacing--md);
	border-top: 1px solid var(--border-color--subtle);
}

.resetButton {
	width: 100%;
}

.filterButton {
	position: relative;
}

.filterDot {
	position: absolute;
	inset-block-start: var(--spacing--5xs);
	inset-inline-end: var(--spacing--5xs);
	width: var(--spacing--3xs);
	height: var(--spacing--3xs);
	border-radius: 50%;
	background-color: var(--background--brand);
	outline: 1px solid var(--background--surface);
	pointer-events: none;
}

// The popover scroll area clips its content, so keep the padding inside it. This leaves room
// for the focus rings of the full-width controls.
.form {
	padding-inline: var(--spacing--sm);
	padding-block-end: var(--spacing--sm);
}

.sessionIdFilter {
	max-height: 8rem;
}
</style>

<style scoped lang="scss">
:deep(.el-date-editor) {
	input {
		height: var(--height--md);
		padding-right: 0;
		border: 0;
	}

	&:last-of-type {
		input {
			padding-left: 0;
		}

		.el-input__prefix {
			display: none;
		}
	}
}
</style>
