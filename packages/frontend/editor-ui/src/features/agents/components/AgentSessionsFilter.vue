<script setup lang="ts">
import { N8nBadge, N8nButton, N8nOption, N8nPopover, N8nSelect } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ElDatePicker } from 'element-plus';
import { computed } from 'vue';

import {
	defaultAgentSessionFilters,
	type AgentSessionFilters,
	type AgentSessionOrigin,
	type AgentSessionStatus,
} from '../composables/useAgentThreadsApi';

const DATE_TIME_MASK = 'YYYY-MM-DD HH:mm';

const props = defineProps<{ modelValue: AgentSessionFilters }>();

const emit = defineEmits<{
	filterChanged: [value: AgentSessionFilters];
}>();

const i18n = useI18n();

const statuses: Array<{ id: AgentSessionStatus | 'all'; name: string }> = [
	{ id: 'all', name: i18n.baseText('agentSessions.filters.anyStatus') },
	{ id: 'running', name: i18n.baseText('agentSessions.status.running') },
	{ id: 'waiting', name: i18n.baseText('agentSessions.status.waiting') },
	{ id: 'succeeded', name: i18n.baseText('agentSessions.status.succeeded') },
	{ id: 'error', name: i18n.baseText('agentSessions.status.error') },
	{ id: 'cancelled', name: i18n.baseText('agentSessions.status.cancelled') },
	{ id: 'interrupted', name: i18n.baseText('agentSessions.status.interrupted') },
];

const origins: Array<{ id: AgentSessionOrigin | 'all'; name: string }> = [
	{ id: 'all', name: i18n.baseText('agentSessions.filters.anyOrigin') },
	{ id: 'preview', name: i18n.baseText('agentSessions.origin.preview') },
	{ id: 'instance-ai', name: i18n.baseText('agentSessions.origin.instanceAi') },
	{ id: 'mcp', name: i18n.baseText('agentSessions.origin.mcp') },
	{ id: 'sub-agent', name: i18n.baseText('agentSessions.origin.subAgent') },
	{ id: 'schedule', name: i18n.baseText('agentSessions.origin.schedule') },
	{ id: 'workflow', name: i18n.baseText('agentSessions.origin.workflow') },
	{ id: 'slack', name: i18n.baseText('agentSessions.origin.slack') },
	{ id: 'telegram', name: i18n.baseText('agentSessions.origin.telegram') },
	{ id: 'linear', name: i18n.baseText('agentSessions.origin.linear') },
	{ id: 'discord', name: i18n.baseText('agentSessions.origin.discord') },
];

const activeFilterCount = computed(
	() =>
		[
			props.modelValue.status !== 'all',
			props.modelValue.origin !== 'all',
			Boolean(props.modelValue.startDate),
			Boolean(props.modelValue.endDate),
		].filter(Boolean).length,
);

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
		width="calc(var(--spacing--5xl) + var(--spacing--4xl))"
		:content-class="$style.popoverContent"
		show-arrow
	>
		<template #trigger>
			<N8nButton
				variant="subtle"
				icon-only
				icon="funnel"
				size="medium"
				:aria-label="i18n.baseText('forms.resourceFiltersDropdown.filters')"
				:active="activeFilterCount > 0"
				data-test-id="agent-sessions-filter-button"
				:class="$style.filterButton"
			>
				<template v-if="activeFilterCount > 0" #default>
					<N8nBadge
						theme="primary"
						:class="$style.filterBadge"
						data-test-id="agent-sessions-filter-badge"
					>
						{{ activeFilterCount }}
					</N8nBadge>
				</template>
			</N8nButton>
		</template>

		<template #content>
			<div data-test-id="agent-sessions-filter-form">
				<div :class="$style.group">
					<label for="agent-sessions-filter-status">{{
						i18n.baseText('agentSessions.filters.status')
					}}</label>
					<N8nSelect
						id="agent-sessions-filter-status"
						:model-value="props.modelValue.status"
						data-test-id="agent-sessions-filter-status"
						@update:model-value="updateFilter({ status: $event })"
					>
						<N8nOption
							v-for="status in statuses"
							:key="status.id"
							:label="status.name"
							:value="status.id"
						/>
					</N8nSelect>
				</div>

				<div :class="$style.group">
					<label for="agent-sessions-filter-origin">{{
						i18n.baseText('agentSessions.filters.origin')
					}}</label>
					<N8nSelect
						id="agent-sessions-filter-origin"
						:model-value="props.modelValue.origin"
						data-test-id="agent-sessions-filter-origin"
						@update:model-value="updateFilter({ origin: $event })"
					>
						<N8nOption
							v-for="origin in origins"
							:key="origin.id"
							:label="origin.name"
							:value="origin.id"
						/>
					</N8nSelect>
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

				<N8nButton
					v-if="activeFilterCount > 0"
					variant="ghost"
					size="large"
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

.resetButton {
	margin-top: var(--spacing--xs);
	padding: 0;
}

.filterButton {
	position: relative;
}

.filterBadge {
	position: absolute;
	top: 0;
	right: calc(var(--spacing--4xs) * -1);
	transform: translate(50%, -50%);
}

.popoverContent {
	padding: var(--spacing--sm);
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
