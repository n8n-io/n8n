<script lang="ts" setup>
import { computed, ref } from 'vue';

import { capitalCase } from 'change-case';
import { useI18n } from '@n8n/i18n';
import type { ApiKeyScope } from '@n8n/permissions';

import { ElOption, ElOptionGroup, ElSelect } from 'element-plus';
import { N8nButton, N8nCheckbox, N8nIcon, N8nInput, N8nInputLabel } from '@n8n/design-system';

const props = withDefaults(
	defineProps<{
		modelValue?: ApiKeyScope[];
		availableScopes?: ApiKeyScope[];
	}>(),
	{
		modelValue: () => [],
		availableScopes: () => [],
	},
);

const emit = defineEmits<{
	'update:modelValue': [value: ApiKeyScope[]];
}>();

const i18n = useI18n();
const popperContainer = ref<HTMLDivElement | null>(null);
const searchText = ref('');

const selectedScopes = computed({
	get: () => props.modelValue,
	set: (val: ApiKeyScope[]) => emit('update:modelValue', val),
});

const COMMON_OPERATIONS_ORDER = ['read', 'list', 'create', 'update', 'delete'] as const;

const scopesByOperation = computed<Record<string, ApiKeyScope[]>>(() => {
	const map: Record<string, ApiKeyScope[]> = {};
	for (const scope of props.availableScopes) {
		const action = scope.split(':')[1];
		if (!action) continue;
		if (!map[action]) map[action] = [];
		map[action].push(scope);
	}
	return map;
});

const availableOperations = computed<string[]>(() => {
	const ops = Object.keys(scopesByOperation.value);
	const commonSet = new Set<string>(COMMON_OPERATIONS_ORDER);
	const common = COMMON_OPERATIONS_ORDER.filter((op) => ops.includes(op));
	const rest = ops.filter((op) => !commonSet.has(op)).sort();
	return [...common, ...rest];
});

function operationState(op: string): 'all' | 'some' | 'none' {
	const opScopes = scopesByOperation.value[op] ?? [];
	if (opScopes.length === 0) return 'none';
	const selected = new Set(selectedScopes.value);
	const selectedCount = opScopes.filter((s) => selected.has(s)).length;
	if (selectedCount === 0) return 'none';
	if (selectedCount === opScopes.length) return 'all';
	return 'some';
}

function operationVariant(op: string): 'solid' | 'subtle' | 'outline' {
	const state = operationState(op);
	if (state === 'all') return 'solid';
	if (state === 'some') return 'subtle';
	return 'outline';
}

function toggleOperation(op: string) {
	const opScopes = scopesByOperation.value[op] ?? [];
	if (opScopes.length === 0) return;
	const state = operationState(op);
	if (state === 'all') {
		const opSet = new Set(opScopes);
		selectedScopes.value = selectedScopes.value.filter((s) => !opSet.has(s));
	} else {
		const set = new Set(selectedScopes.value);
		for (const s of opScopes) set.add(s);
		selectedScopes.value = Array.from(set);
	}
}

const filteredScopes = computed<ApiKeyScope[]>(() => {
	const q = searchText.value.trim().toLowerCase();
	if (!q) return props.availableScopes;
	return props.availableScopes.filter((s) => s.toLowerCase().includes(q));
});

const filteredGroupedScopes = computed<Record<string, string[]>>(() => {
	const groups: Record<string, string[]> = {};
	for (const scope of filteredScopes.value) {
		const [resource, action] = scope.split(':');
		if (!action) continue;
		if (!groups[resource]) groups[resource] = [];
		groups[resource].push(action);
	}
	return groups;
});

const isFiltering = computed(() => searchText.value.trim().length > 0);

const checkAllState = computed(() => {
	const target = isFiltering.value ? filteredScopes.value : props.availableScopes;
	if (target.length === 0) return { all: false, indeterminate: false };
	const selected = new Set(selectedScopes.value);
	const selectedInTarget = target.filter((s) => selected.has(s)).length;
	if (selectedInTarget === 0) return { all: false, indeterminate: false };
	if (selectedInTarget === target.length) return { all: true, indeterminate: false };
	return { all: false, indeterminate: true };
});

function onCheckAllChange(checked: boolean) {
	const target = isFiltering.value ? filteredScopes.value : props.availableScopes;
	if (checked) {
		const set = new Set(selectedScopes.value);
		for (const s of target) set.add(s);
		selectedScopes.value = Array.from(set);
	} else {
		if (isFiltering.value) {
			const targetSet = new Set(target);
			selectedScopes.value = selectedScopes.value.filter((s) => !targetSet.has(s));
		} else {
			selectedScopes.value = [];
		}
	}
}

const checkAllLabel = computed(() => {
	if (!isFiltering.value) return i18n.baseText('settings.api.scopes.selectAll');
	return i18n.baseText('settings.api.scopes.selectAllMatching', {
		interpolate: { count: String(filteredScopes.value.length) },
	});
});
</script>

<template>
	<div :class="$style['api-key-scopes']">
		<div ref="popperContainer"></div>
		<N8nInputLabel :label="i18n.baseText('settings.api.scopes.label')" color="text-dark">
			<ElSelect
				v-model="selectedScopes"
				data-test-id="scopes-select"
				:popper-class="$style['scopes-dropdown-container']"
				:teleported="true"
				multiple
				collapse-tags
				:max-collapse-tags="10"
				placement="top"
				:reserve-keyword="false"
				:placeholder="i18n.baseText('settings.api.scopes.placeholder')"
				:append-to="popperContainer"
			>
				<template #header>
					<div :class="$style['header-content']">
						<N8nCheckbox
							:class="$style['scopes-checkbox']"
							:model-value="checkAllState.all"
							:indeterminate="checkAllState.indeterminate"
							:label="checkAllLabel"
							data-test-id="scopes-select-all"
							@update:model-value="onCheckAllChange"
						/>
						<div :class="$style['chip-row']" data-test-id="scopes-chips">
							<span :class="$style['chip-row-label']">
								{{ i18n.baseText('settings.api.scopes.quickSelect') }}
							</span>
							<N8nButton
								v-for="op in availableOperations"
								:key="op"
								:variant="operationVariant(op)"
								size="mini"
								:label="capitalCase(op)"
								:data-test-id="`scope-chip-${op}`"
								@click="toggleOperation(op)"
							/>
						</div>
						<N8nInput
							v-model="searchText"
							:class="$style['search-row']"
							size="small"
							:placeholder="i18n.baseText('settings.api.scopes.search')"
							clearable
							data-test-id="scopes-search"
							@click.stop
							@keydown.stop
						>
							<template #prefix>
								<N8nIcon icon="search" size="small" />
							</template>
						</N8nInput>
					</div>
				</template>

				<ElOption
					v-if="filteredScopes.length === 0"
					:label="i18n.baseText('settings.api.scopes.noMatches')"
					value=""
					disabled
					data-test-id="scopes-empty"
				/>

				<template v-for="(actions, resource) in filteredGroupedScopes" :key="resource">
					<ElOptionGroup :label="capitalCase(resource).toUpperCase()">
						<ElOption
							v-for="action in actions"
							:key="`${resource}:${action}`"
							:label="`${resource}:${action}`"
							:value="`${resource}:${action}`"
						/>
					</ElOptionGroup>
				</template>
			</ElSelect>
		</N8nInputLabel>
	</div>
</template>

<style module>
.api-key-scopes :global(.el-tag) {
	padding: var(--spacing--3xs);
}

.api-key-scopes :global(.el-tag__close) {
	color: white;
	margin-left: var(--spacing--3xs);
	background-color: var(--color--text);
}

.scopes-dropdown-container :global(.el-select-group__title) {
	font-size: var(--font-size--2xs);
	color: var(--color--text--shade-1);
	font-weight: var(--font-weight--bold);
	border-bottom: var(--spacing--5xs) solid var(--color--text--tint-2);
	padding-left: var(--spacing--xs);
}

.scopes-dropdown-container :global(.el-select-dropdown__item) {
	color: var(--color--text);
	font-weight: var(--font-weight--regular);
	padding-left: var(--spacing--xs);
}

.scopes-dropdown-container
	:global(.el-select-dropdown.is-multiple .el-select-dropdown__item.selected) {
	font-weight: var(--font-weight--bold);
}

.scopes-dropdown-container :global(.el-select-group__wrap:not(:last-of-type)) {
	padding: 0;
	margin-bottom: var(--spacing--xs);
}

.scopes-dropdown-container :global(.el-select-dropdown__header) {
	margin-top: var(--spacing--xs);
	padding-bottom: var(--spacing--xs);
	border-bottom: var(--spacing--5xs) solid var(--color--text--tint-2);
}

.scopes-checkbox {
	display: flex;
	margin-left: var(--spacing--2xs);
}

.scopes-dropdown-container :global(.el-select-group__wrap::after) {
	display: none;
}

.header-content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.chip-row {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: 0 var(--spacing--2xs);
}

.chip-row-label {
	font-size: var(--font-size--2xs);
	color: var(--color--text--shade-1);
	font-weight: var(--font-weight--bold);
	margin-right: var(--spacing--2xs);
}

.search-row {
	padding: 0 var(--spacing--2xs);
}
</style>
