<script setup lang="ts" generic="S extends string">
import { computed, ref, watch } from 'vue';

import { capitalCase } from 'change-case';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';

import {
	N8nBadge,
	N8nCheckbox,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nInputLabel,
	N8nRadioGroup,
	N8nRadioGroupItem,
	N8nTooltip,
} from '@n8n/design-system';

import {
	DEFAULT_READ_SCOPE_ACTIONS,
	classifyScope,
	getReadOnlyScopes,
	groupScopes,
	inferSelectionMode,
} from './scopes.utils';
import type { ScopeGroup, ScopeGroupDefinition, ScopeSelectionMode } from './scopes.utils';

const props = withDefaults(
	defineProps<{
		modelValue: S[];
		availableScopes: S[];
		/** Maps `resource:` prefixes to display groups. */
		groups: readonly ScopeGroupDefinition[];
		/**
		 * i18n namespace for all selector texts. Expected keys under the prefix:
		 * `.label`, `.all`, `.readOnly`, `.custom`, `.count`, `.search.placeholder`,
		 * `.toggleGroup`, `.badge.read`, `.badge.write` and `.group.<groupKey>`.
		 */
		i18nKeyPrefix: string;
		rootTestId?: string;
		readActions?: readonly string[];
		disabled?: boolean;
		/**
		 * Tool names each scope unlocks. When provided, group rows show a tool
		 * count pill whose popover lists the tools enabled by the current
		 * selection. Expected i18n keys under the prefix: `.tools.count`,
		 * `.tools.enabledOf`.
		 */
		scopeTools?: Record<string, string[]>;
	}>(),
	{
		rootTestId: 'scopes-selector',
		readActions: () => DEFAULT_READ_SCOPE_ACTIONS,
		disabled: false,
	},
);

const emit = defineEmits<{
	'update:modelValue': [scopes: S[]];
}>();

const i18n = useI18n();

const searchTerm = ref('');
const expandedGroups = ref(new Set<string>());
const userPickedCustom = ref(false);

const mode = ref<ScopeSelectionMode>(
	inferSelectionMode(props.modelValue, props.availableScopes, props.readActions),
);

const treeExpanded = ref(mode.value === 'custom');

// Sync the radio to the selection except when the user has explicitly picked Custom —
// in that case we don't want a selection that happens to match "All" or "Read only"
// to silently flip the radio away from Custom.
watch(
	() => [props.modelValue, props.availableScopes],
	() => {
		const inferred = inferSelectionMode(props.modelValue, props.availableScopes, props.readActions);
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

const groupedScopes = computed(() => groupScopes(props.availableScopes, props.groups));

const filteredGroups = computed<Array<{ group: ScopeGroup<S>; visibleScopes: S[] }>>(() => {
	const term = searchTerm.value.trim().toLowerCase();

	if (!term) {
		return groupedScopes.value.map((group) => ({ group, visibleScopes: group.scopes }));
	}

	return groupedScopes.value
		.map((group) => ({
			group,
			visibleScopes: group.scopes.filter((scope) => scope.toLowerCase().includes(term)),
		}))
		.filter((entry) => entry.visibleScopes.length > 0);
});

function baseText(suffix: string, interpolate?: Record<string, string | number>): string {
	return i18n.baseText(`${props.i18nKeyPrefix}.${suffix}` as BaseTextKey, {
		interpolate,
	});
}

function getGroupLabel(group: ScopeGroup<S>): string {
	if (group.isFallback) {
		return capitalCase(group.key);
	}
	return baseText(`group.${group.key}`);
}

function getBadgeLabel(scope: S): string {
	return classifyScope(scope, props.readActions) === 'read'
		? baseText('badge.read')
		: baseText('badge.write');
}

function emitScopes(scopes: S[]) {
	emit('update:modelValue', scopes);
}

type ScopeModeOption = {
	value: ScopeSelectionMode;
	label: string;
	'data-test-id': string;
};

const modeOptions = computed<ScopeModeOption[]>(() => [
	{
		value: 'all',
		label: baseText('all'),
		'data-test-id': 'scopes-mode-all',
	},
	{
		value: 'readOnly',
		label: baseText('readOnly'),
		'data-test-id': 'scopes-mode-read-only',
	},
	{
		value: 'custom',
		label: baseText('custom'),
		'data-test-id': 'scopes-mode-custom',
	},
]);

function onModeChange(newMode: string | undefined) {
	if (newMode === undefined) {
		return;
	}

	userPickedCustom.value = newMode === 'custom';

	if (newMode === 'all') {
		emitScopes([...props.availableScopes]);
	} else if (newMode === 'readOnly') {
		emitScopes(getReadOnlyScopes(props.availableScopes, props.readActions));
	} else if (newMode === 'custom') {
		emitScopes([]);
	}
}

function isGroupExpanded(group: ScopeGroup<S>): boolean {
	return isSearching.value || expandedGroups.value.has(group.key);
}

function toggleGroupExpanded(group: ScopeGroup<S>) {
	const expanded = new Set(expandedGroups.value);
	if (expanded.has(group.key)) {
		expanded.delete(group.key);
	} else {
		expanded.add(group.key);
	}
	expandedGroups.value = expanded;
}

function groupTools(group: ScopeGroup<S>): string[] {
	if (!props.scopeTools) return [];
	const tools = new Set<string>();
	for (const scope of group.scopes) {
		for (const tool of props.scopeTools[scope] ?? []) {
			tools.add(tool);
		}
	}
	return [...tools];
}

function groupEnabledTools(group: ScopeGroup<S>): Set<string> {
	const enabled = new Set<string>();
	if (!props.scopeTools) return enabled;
	for (const scope of group.scopes) {
		if (!selectedSet.value.has(scope)) continue;
		for (const tool of props.scopeTools[scope] ?? []) {
			enabled.add(tool);
		}
	}
	return enabled;
}

function isGroupChecked(group: ScopeGroup<S>): boolean {
	return group.scopes.every((scope) => selectedSet.value.has(scope));
}

function isGroupIndeterminate(group: ScopeGroup<S>): boolean {
	return !isGroupChecked(group) && group.scopes.some((scope) => selectedSet.value.has(scope));
}

function toggleGroup(group: ScopeGroup<S>, checked: boolean) {
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

function toggleScope(scope: S, checked: boolean) {
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
	<div :data-test-id="rootTestId">
		<N8nInputLabel :label="baseText('label')" color="text-dark">
			<N8nRadioGroup
				v-model="mode"
				:disabled="disabled"
				:aria-label="baseText('label')"
				data-test-id="scopes-mode-radio"
				@update:model-value="onModeChange"
			>
				<N8nRadioGroupItem v-for="option in modeOptions" :key="option.value" v-bind="option" />
			</N8nRadioGroup>
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
						baseText('count', {
							selected: modelValue.length,
							total: availableScopes.length,
						})
					}}
				</span>
			</button>

			<template v-if="treeExpanded">
				<N8nInput
					v-model="searchTerm"
					clearable
					:placeholder="baseText('search.placeholder')"
					:aria-label="baseText('search.placeholder')"
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
								:aria-label="baseText('toggleGroup', { group: getGroupLabel(group) })"
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
							<N8nTooltip
								v-if="groupTools(group).length > 0"
								placement="right"
								:show-after="150"
								:content-class="$style['tools-tooltip']"
							>
								<template #content>
									<div
										:class="$style['tools-popover']"
										:data-test-id="`scope-group-tools-popover-${group.key}`"
									>
										<div :class="$style['tools-popover-header']">
											{{
												baseText('tools.enabledOf', {
													enabled: groupEnabledTools(group).size,
													total: groupTools(group).length,
												})
											}}
										</div>
										<div
											v-for="tool in groupTools(group)"
											:key="tool"
											:class="[
												$style['tool-row'],
												{ [$style['tool-row-disabled']]: !groupEnabledTools(group).has(tool) },
											]"
										>
											<N8nIcon
												:icon="groupEnabledTools(group).has(tool) ? 'check' : 'circle'"
												size="xsmall"
												:class="$style['tool-icon']"
											/>
											<span :class="$style['tool-name']">{{ tool }}</span>
										</div>
									</div>
								</template>
								<span
									:class="$style['tools-tag']"
									tabindex="0"
									:data-test-id="`scope-group-tools-${group.key}`"
								>
									<N8nIcon icon="wrench" size="xsmall" />
									{{ baseText('tools.count', { count: groupTools(group).length }) }}
								</span>
							</N8nTooltip>
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
								<N8nBadge
									:theme="classifyScope(scope, readActions) === 'read' ? 'default' : 'success'"
								>
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

.tools-tag {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	margin-left: var(--spacing--2xs);
	padding: var(--spacing--5xs) var(--spacing--2xs);
	border-radius: var(--radius--full);
	border: var(--border);
	background-color: var(--color--background--light-2);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	cursor: default;
	transition:
		color 150ms ease-out,
		border-color 150ms ease-out;

	&:hover,
	&:focus-visible {
		border-color: var(--color--primary);
		color: var(--color--text--shade-1);
	}
}

/* the shared tooltip caps content at 180px and centers it; tool identifiers need more room */
:global(.n8n-tooltip).tools-tooltip {
	max-width: 320px;
	align-items: flex-start;
}

.tools-popover {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	width: max-content;
	max-width: 100%;
	max-height: 320px;
	overflow-y: auto;
	padding: var(--spacing--4xs);
}

.tools-popover-header {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: var(--color--text--tint-1);
	margin-bottom: var(--spacing--4xs);
}

.tool-row {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);

	.tool-icon {
		color: var(--color--primary);
	}
}

.tool-row-disabled {
	.tool-icon,
	.tool-name {
		color: var(--color--text--tint-1);
	}
}

.tool-name {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--3xs);
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
