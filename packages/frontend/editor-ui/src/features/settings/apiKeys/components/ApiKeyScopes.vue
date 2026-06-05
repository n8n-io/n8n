<script setup>
import { ref, computed, watch } from 'vue';

import { capitalCase } from 'change-case';
import { useI18n } from '@n8n/i18n';

import { ElOption, ElOptionGroup, ElSelect } from 'element-plus';
import { N8nCheckbox, N8nInputLabel } from '@n8n/design-system';
// Define props
const props = defineProps({
	modelValue: {
		type: Array,
		default: () => [],
	},
	availableScopes: {
		type: Array,
		default: () => [],
	},
});

const emit = defineEmits(['update:modelValue']);
const selectedScopes = ref(props.modelValue);

const i18n = useI18n();

const popperContainer = ref(null);

const allScopesSelected = computed(() => {
	return (
		props.availableScopes.length > 0 && selectedScopes.value.length === props.availableScopes.length
	);
});

const indeterminate = computed(() => {
	return (
		selectedScopes.value.length > 0 && selectedScopes.value.length < props.availableScopes.length
	);
});

const groupedScopes = computed(() => {
	const groups = {};

	props.availableScopes.forEach((scope) => {
		const [resource, action] = scope.split(':');

		if (!groups[resource]) {
			groups[resource] = [];
		}

		if (action) {
			groups[resource].push(action);
		}
	});

	return groups;
});

watch(selectedScopes, (newValue) => {
	emit('update:modelValue', newValue);
});

function onSelectAllScopes(shouldSelectAll) {
	selectedScopes.value = shouldSelectAll ? [...props.availableScopes] : [];
}
</script>

<template>
	<div :class="$style['api-key-scopes']">
		<div ref="popperContainer"></div>
		<N8nInputLabel :label="i18n.baseText('settings.api.scopes.label')" color="text-dark">
			<N8nCheckbox
				:model-value="allScopesSelected"
				:class="$style['scopes-checkbox']"
				:indeterminate="indeterminate"
				:label="i18n.baseText('settings.api.scopes.selectAll')"
				@update:model-value="onSelectAllScopes"
			/>
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
				<template v-for="(actions, resource) in groupedScopes" :key="resource">
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
	margin-bottom: var(--spacing--2xs);
}

.scopes-dropdown-container :global(.el-select-group__wrap::after) {
	display: none;
}
</style>
