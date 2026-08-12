<script setup lang="ts">
import type {
	OperatorLogFilter,
	OperatorLogHost,
	OperatorLogLevel,
	OperatorLogRole,
} from '@n8n/api-types';
import { OPERATOR_LOG_LEVELS } from '@n8n/api-types';
import { computed, ref, watch } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';
import {
	N8nBadge,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
} from '@n8n/design-system';
import { DEBOUNCE_TIME } from '@/app/constants';
import { getDebounceTime } from '@n8n/composables/useDebounce';

import { OPERATOR_LOG_ROLES } from '../operatorConsole.constants';

const props = defineProps<{
	filter: OperatorLogFilter;
	hosts: OperatorLogHost[];
	scopes: string[];
	disabled?: boolean;
}>();

const emit = defineEmits<{ change: [patch: Partial<OperatorLogFilter>] }>();

/** `LogScope` lives in `@n8n/config`, a backend package the editor must not pull in. */
type OperatorLogScope = NonNullable<OperatorLogFilter['scopes']>[number];

const i18n = useI18n();

const grep = ref(props.filter.grep ?? '');

watch(
	() => props.filter.grep,
	(value) => {
		if ((value ?? '') !== grep.value) grep.value = value ?? '';
	},
);

const emitGrep = useDebounceFn((value: string) => {
	emit('change', { grep: value === '' ? undefined : value });
}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

function onGrepInput(value: string) {
	grep.value = value;
	void emitGrep(value);
}

const levelOptions = computed(() =>
	OPERATOR_LOG_LEVELS.map((level) => ({
		value: level,
		label: i18n.baseText(`operatorConsole.level.${level}`),
	})),
);

const roleOptions = computed(() =>
	OPERATOR_LOG_ROLES.map((role) => ({
		value: role,
		label: i18n.baseText(`operatorConsole.role.${role}`),
	})),
);

const selectedLevel = computed(() => props.filter.minLevel ?? '');
const selectedScopes = computed(() => props.filter.scopes ?? []);
const selectedHosts = computed(() => props.filter.hostIds ?? []);
const selectedRoles = computed(() => props.filter.roles ?? []);

function onLevelChange(value: OperatorLogLevel | '') {
	emit('change', { minLevel: value === '' ? undefined : value });
}

function onScopesChange(value: OperatorLogScope[]) {
	emit('change', { scopes: value.length ? value : undefined });
}

function onHostsChange(value: string[]) {
	emit('change', { hostIds: value.length ? value : undefined });
}

function onRolesChange(value: OperatorLogRole[]) {
	emit('change', { roles: value.length ? value : undefined });
}

function clearExecutionFilter() {
	emit('change', { executionId: undefined });
}
</script>

<template>
	<div :class="$style.bar" data-test-id="operator-console-filter-bar">
		<N8nInputLabel :label="i18n.baseText('operatorConsole.filter.level')" :class="$style.field">
			<N8nSelect
				:model-value="selectedLevel"
				:disabled="disabled"
				size="small"
				data-test-id="operator-console-filter-level"
				@update:model-value="onLevelChange"
			>
				<N8nOption :label="i18n.baseText('operatorConsole.filter.level.all')" value="" />
				<N8nOption
					v-for="option in levelOptions"
					:key="option.value"
					:label="option.label"
					:value="option.value"
				/>
			</N8nSelect>
		</N8nInputLabel>

		<N8nInputLabel :label="i18n.baseText('operatorConsole.filter.roles')" :class="$style.field">
			<N8nSelect
				:model-value="selectedRoles"
				:disabled="disabled"
				multiple
				size="small"
				:placeholder="i18n.baseText('operatorConsole.filter.roles.placeholder')"
				data-test-id="operator-console-filter-roles"
				@update:model-value="onRolesChange"
			>
				<N8nOption
					v-for="option in roleOptions"
					:key="option.value"
					:label="option.label"
					:value="option.value"
				/>
			</N8nSelect>
		</N8nInputLabel>

		<N8nInputLabel :label="i18n.baseText('operatorConsole.filter.hosts')" :class="$style.fieldWide">
			<N8nSelect
				:model-value="selectedHosts"
				:disabled="disabled"
				multiple
				filterable
				size="small"
				:placeholder="i18n.baseText('operatorConsole.filter.hosts.placeholder')"
				data-test-id="operator-console-filter-hosts"
				@update:model-value="onHostsChange"
			>
				<N8nOption
					v-for="host in hosts"
					:key="host.hostId"
					:label="host.hostId"
					:value="host.hostId"
				>
					<span>{{ host.hostId }}</span>
					<N8nBadge size="small" theme="tertiary">{{
						i18n.baseText(`operatorConsole.role.${host.role}`)
					}}</N8nBadge>
				</N8nOption>
			</N8nSelect>
		</N8nInputLabel>

		<N8nInputLabel
			:label="i18n.baseText('operatorConsole.filter.scopes')"
			:class="$style.fieldWide"
		>
			<N8nSelect
				:model-value="selectedScopes"
				:disabled="disabled"
				multiple
				filterable
				allow-create
				size="small"
				:placeholder="i18n.baseText('operatorConsole.filter.scopes.placeholder')"
				data-test-id="operator-console-filter-scopes"
				@update:model-value="onScopesChange"
			>
				<N8nOption v-for="scope in scopes" :key="scope" :label="scope" :value="scope" />
			</N8nSelect>
		</N8nInputLabel>

		<N8nInputLabel :label="i18n.baseText('operatorConsole.filter.grep')" :class="$style.fieldWide">
			<N8nInput
				:model-value="grep"
				:disabled="disabled"
				size="small"
				clearable
				:placeholder="i18n.baseText('operatorConsole.filter.grep.placeholder')"
				data-test-id="operator-console-filter-grep"
				@update:model-value="onGrepInput"
			>
				<template #prefix>
					<N8nIcon icon="search" size="xsmall" />
				</template>
			</N8nInput>
		</N8nInputLabel>

		<button
			v-if="filter.executionId"
			type="button"
			:class="$style.executionChip"
			:disabled="disabled"
			data-test-id="operator-console-filter-execution"
			@click="clearExecutionFilter"
		>
			{{
				i18n.baseText('operatorConsole.filter.executionId', {
					interpolate: { executionId: filter.executionId },
				})
			}}
			<N8nIcon icon="x" size="xsmall" />
		</button>
	</div>
</template>

<style module lang="scss">
.bar {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-end;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs);
	border-bottom: var(--border);
	background-color: var(--background--subtle);
}

.field {
	flex: 0 0 auto;
	width: 10rem;
}

.fieldWide {
	flex: 1 1 14rem;
	min-width: 12rem;
}

.executionChip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius--full);
	background-color: var(--background--info);
	color: var(--text-color--info);
	font-size: var(--font-size--2xs);
	cursor: pointer;
}
</style>
