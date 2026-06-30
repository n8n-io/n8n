<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { capitalCase } from 'change-case';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';
import type { ApiKeyScope } from '@n8n/permissions';

import {
	N8nBadge,
	N8nCheckbox,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nInputLabel,
	N8nRadioGroup,
} from '@n8n/design-system';
import type { RadioGroupOption } from '@n8n/design-system';

import {
	classifyScope,
	getReadOnlyScopes,
	groupScopes,
	inferSelectionMode,
} from '../apiKeys.utils';
import type { ApiKeyScopeGroup, ApiKeyScopeSelectionMode } from '../apiKeys.utils';

const props = withDefaults(
	defineProps<{
		modelValue: ApiKeyScope[];
		availableScopes: ApiKeyScope[];
		disabled?: boolean;
	}>(),
	{ disabled: false },
);

const emit = defineEmits<{
	'update:modelValue': [scopes: ApiKeyScope[]];
}>();

const i18n = useI18n();

const searchTerm = ref('');
const expandedGroups = ref(new Set<string>());
const userPickedCustom = ref(false);

const mode = ref<ApiKeyScopeSelectionMode>(
	inferSelectionMode(props.modelValue, props.availableScopes),
);

const treeExpanded = ref(mode.value === 'custom');

// Sync the radio to the selection except when the user has explicitly picked Custom —
// in that case we don't want a selection that happens to match "All" or "Read only"
// to silently flip the radio away from Custom.
watch(
	() => [props.modelValue, props.availableScopes],
	() => {
		const inferred = inferSelectionMode(props.modelValue, props.availableScopes);
		if (userPickedCustom.value && inferred !== 'custom') return;
		mode.value = inferred;
	},
);

// The tree is open only for Custom. Driving this off `mode` keeps it in sync whether
// the mode changed from a user radio click or a programmatic re-sync in the watch above.
// The header chevron can still override this for the current mode.
watch(mode, (newMode) => {
	treeExpanded.value = newMode === 'custom';
});

const isSearching = computed(() => searchTerm.value.trim() !== '');

const selectedSet = computed(() => new Set(props.modelValue));

const groups = computed(() => groupScopes(props.availableScopes));

const filteredGroups = computed<Array<{ group: ApiKeyScopeGroup; visibleScopes: ApiKeyScope[] }>>(
	() => {
		const term = searchTerm.value.trim().toLowerCase();

		if (!term) {
			return groups.value.map((group) => ({ group, visibleScopes: group.scopes }));
		}

		return groups.value
			.map((group) => ({
				group,
				visibleScopes: group.scopes.filter((scope) => scope.toLowerCase().includes(term)),
			}))
			.filter((entry) => entry.visibleScopes.length > 0);
	},
);

function getGroupLabel(group: ApiKeyScopeGroup): string {
	if (group.isFallback) {
		return capitalCase(group.key);
	}
	return i18n.baseText(`settings.api.scopes.group.${group.key}` as BaseTextKey);
}

function getBadgeLabel(scope: ApiKeyScope): string {
	return classifyScope(scope) === 'read'
		? i18n.baseText('settings.api.scopes.badge.read')
		: i18n.baseText('settings.api.scopes.badge.write');
}

function emitScopes(scopes: ApiKeyScope[]) {
	emit('update:modelValue', scopes);
}

const modeOptions = computed<Array<RadioGroupOption<ApiKeyScopeSelectionMode>>>(() => [
	{ value: 'all', label: i18n.baseText('settings.api.scopes.all'), testId: 'scopes-mode-all' },
	{
		value: 'readOnly',
		label: i18n.baseText('settings.api.scopes.readOnly'),
		testId: 'scopes-mode-read-only',
	},
	{
		value: 'custom',
		label: i18n.baseText('settings.api.scopes.custom'),
		testId: 'scopes-mode-custom',
	},
]);

function onModeChange(newMode: ApiKeyScopeSelectionMode) {
	userPickedCustom.value = newMode === 'custom';

	if (newMode === 'all') {
		emitScopes([...props.availableScopes]);
	} else if (newMode === 'readOnly') {
		emitScopes(getReadOnlyScopes(props.availableScopes));
	} else if (newMode === 'custom') {
		emitScopes([]);
	}
}

function isGroupExpanded(group: ApiKeyScopeGroup): boolean {
	return isSearching.value || expandedGroups.value.has(group.key);
}

function toggleGroupExpanded(group: ApiKeyScopeGroup) {
	const expanded = new Set(expandedGroups.value);
	if (expanded.has(group.key)) {
		expanded.delete(group.key);
	} else {
		expanded.add(group.key);
	}
	expandedGroups.value = expanded;
}

function isGroupChecked(group: ApiKeyScopeGroup): boolean {
	return group.scopes.every((scope) => selectedSet.value.has(scope));
}

function isGroupIndeterminate(group: ApiKeyScopeGroup): boolean {
	return !isGroupChecked(group) && group.scopes.some((scope) => selectedSet.value.has(scope));
}

function toggleGroup(group: ApiKeyScopeGroup, checked: boolean) {
	const selected = new Set(selectedSet.value);
	for (const scope of group.scopes) {
		if (checked) {
			selected.add(scope);
		} else {
			selected.delete(scope);
		}
	}
	emitScopes(props.availableScopes.filter((scope) => selected.has(scope)));
}

function toggleScope(scope: ApiKeyScope, checked: boolean) {
	const selected = new Set(selectedSet.value);
	if (checked) {
		selected.add(scope);
	} else {
		selected.delete(scope);
	}
	emitScopes(props.availableScopes.filter((s) => selected.has(s)));
}
</script>

<template>
	<div data-test-id="api-key-scopes">
		<N8nInputLabel :label="i18n.baseText('settings.api.scopes.label')" color="text-dark">
			<N8nRadioGroup
				v-model="mode"
				:options="modeOptions"
				:disabled="disabled"
				:aria-label="i18n.baseText('settings.api.scopes.label')"
				data-test-id="scopes-mode-radio"
				@update:model-value="onModeChange"
			/>
		</N8nInputLabel>

		<div :class="$style.customSection">
			<button
				type="button"
				:class="$style.treeHeader"
				:aria-expanded="treeExpanded"
				data-test-id="scopes-tree-toggle"
				@click="treeExpanded = !treeExpanded"
			>
				<N8nIcon :icon="treeExpanded ? 'chevron-down' : 'chevron-right'" size="small" />
				<span data-test-id="scopes-count">
					{{
						i18n.baseText('settings.api.scopes.count', {
							interpolate: {
								selected: modelValue.length,
								total: availableScopes.length,
							},
						})
					}}
				</span>
			</button>

			<template v-if="treeExpanded">
				<N8nInput
					v-model="searchTerm"
					clearable
					:placeholder="i18n.baseText('settings.api.scopes.search.placeholder')"
					:aria-label="i18n.baseText('settings.api.scopes.search.placeholder')"
					data-test-id="scopes-search"
				>
					<template #prefix>
						<N8nIcon icon="search" />
					</template>
				</N8nInput>

				<div :class="$style.groups">
					<div v-for="{ group, visibleScopes } in filteredGroups" :key="group.key">
						<div :class="$style.groupHeader">
							<N8nIconButton
								v-if="!isSearching"
								:icon="isGroupExpanded(group) ? 'chevron-down' : 'chevron-right'"
								variant="ghost"
								size="small"
								:aria-expanded="isGroupExpanded(group)"
								:aria-label="
									i18n.baseText('settings.api.scopes.toggleGroup', {
										interpolate: { group: getGroupLabel(group) },
									})
								"
								:data-test-id="`scope-group-toggle-${group.key}`"
								@click="toggleGroupExpanded(group)"
							/>
							<N8nCheckbox
								:model-value="isGroupChecked(group)"
								:indeterminate="isGroupIndeterminate(group)"
								:label="getGroupLabel(group)"
								:disabled="disabled"
								:data-test-id="`scope-group-${group.key}`"
								@update:model-value="(checked: boolean) => toggleGroup(group, checked)"
							/>
						</div>
						<div v-if="isGroupExpanded(group)" :class="$style.scopeList">
							<div v-for="scope in visibleScopes" :key="scope" :class="$style.scopeRow">
								<N8nCheckbox
									:model-value="selectedSet.has(scope)"
									:label="scope"
									:disabled="disabled"
									:data-test-id="`scope-checkbox-${scope}`"
									@update:model-value="(checked: boolean) => toggleScope(scope, checked)"
								/>
								<N8nBadge :theme="classifyScope(scope) === 'read' ? 'default' : 'success'">
									{{ getBadgeLabel(scope) }}
								</N8nBadge>
							</div>
						</div>
					</div>
				</div>
			</template>
		</div>
	</div>
</template>

<style module lang="scss">
.customSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--xs);
}

.treeHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: 0;
	background: transparent;
	border: none;
	cursor: pointer;
	color: var(--color--text);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--regular);
	text-align: left;

	&:focus-visible {
		outline: var(--border--width--medium) solid var(--color--primary);
		outline-offset: 2px;
	}
}

.groups {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	max-height: 320px;
	overflow-y: auto;
}

.groupHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.scopeList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xs) 0 var(--spacing--2xs) var(--spacing--2xl);
}

.scopeRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}
</style>
